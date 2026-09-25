"""Current-user endpoints.

`GET /api/v1/me` is the single call the frontend makes after Firebase sign-in to
learn who it is talking to. It resolves — and on first login provisions — the
Pithros account.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser
from app.core.database import get_db, transaction
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
def update_me(payload: UserUpdate, user: CurrentUser, db: DbSession) -> UserOut:
    changes = payload.model_dump(exclude_unset=True)
    with transaction(db):
        for field, value in changes.items():
            if value is not None:
                setattr(user, field, value)
        db.flush()
    db.refresh(user)
    return serialize_user(user)
