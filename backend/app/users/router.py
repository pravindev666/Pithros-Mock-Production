"""Current-user endpoints.

`GET /api/v1/me` is the single call the frontend makes after Firebase sign-in to
learn who it is talking to. It resolves — and on first login provisions — the
Pithros account.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, require_role
from app.core.database import get_db, transaction
from app.core.enums import UserRole
from app.core.rate_limit import user_rate_limit
from app.users.models import User
from app.users.schemas import UserOut, UserUpdate

router = APIRouter(tags=["Users"])

DbSession = Annotated[Session, Depends(get_db)]


def serialize_user(user: User) -> UserOut:
    return UserOut(
        id=str(user.id),
        firebase_uid=user.firebase_uid,
        name=user.name,
        email=user.email,
        role=user.role,
        admin_subrole=user.admin_subrole,
        avatar=user.avatar,
        phone=user.phone,
        status=user.status,
        email_verified=user.email_verified,
        phone_verified=user.phone_verified,
        mfa_enabled=user.mfa_enabled,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("/me", response_model=UserOut)
def read_me(user: CurrentUser, db: DbSession) -> UserOut:
    """Resolve the caller, provisioning their Pithros account on first sign-in."""
    db.commit()
    return serialize_user(user)


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    user: CurrentUser,
    db: DbSession,
    _: Annotated[None, Depends(user_rate_limit("me_update", limit=30, window_seconds=3600))],
) -> UserOut:
    changes = payload.model_dump(exclude_unset=True)
    with transaction(db):
        for field, value in changes.items():
            if value is not None:
                setattr(user, field, value)
        db.flush()
    db.refresh(user)
    return serialize_user(user)


@router.get("/admin/users", summary="List users for admin")
def list_admin_users(
    admin_user: Annotated[User, Depends(require_role(UserRole.ADMIN))],
    db: DbSession,
    query: str | None = None,
) -> list[dict[str, Any]]:
    stmt = select(User).where(User.deleted_at.is_(None)).order_by(User.created_at.desc())
    if query:
        stmt = stmt.where((User.email.ilike(f"%{query}%")) | (User.name.ilike(f"%{query}%")))
    users = db.execute(stmt).scalars().all()
    out = []
    for u in users:
        steward_count = len(u.stewardships)
        out.append(
            {
                "id": str(u.id),
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "adminSubrole": u.admin_subrole,
                "emailVerified": u.email_verified,
                "mfaEnabled": u.mfa_enabled,
                "status": u.status,
                "memorialCount": steward_count,
                "createdDate": u.created_at.strftime("%b %d, %Y") if u.created_at else "",
                "lastActive": u.last_seen_at.strftime("%b %d, %Y")
                if u.last_seen_at
                else "Active recently",
            }
        )
    return out
