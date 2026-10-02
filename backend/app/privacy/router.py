"""Account-deletion API.

Self-service by design: the PRD forbids telling a person to "contact support" when
a safe mechanism can exist. Re-authentication is enforced from the Firebase token's
`auth_time`, never from a client-supplied flag.
"""

from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, require_admin_role
from app.core.database import get_db
from app.core.enums import AdminSubRole
from app.core.rate_limit import user_rate_limit
from app.privacy import service
from app.privacy.schemas import (
    AdminDeletionRow,
    DeletionRequestCreate,
    DeletionRequestOut,
    DispositionUpdate,
)
from app.users.models import User

router = APIRouter(tags=["Privacy"])
admin_router = APIRouter(tags=["Admin"])

DbSession = Annotated[Session, Depends(get_db)]
AdminDep = Annotated[
    User, Depends(require_admin_role(AdminSubRole.SUPER_ADMIN, AdminSubRole.SUPPORT_AGENT))
]


def _auth_time(request: Request) -> int | None:
    identity = getattr(request.state, "firebase_identity", None)
    return getattr(identity, "auth_time", None)


@router.get("/me/deletion-request", response_model=DeletionRequestOut | None)
def get_deletion_request(user: CurrentUser, db: DbSession) -> DeletionRequestOut | None:
    """The caller's in-progress deletion request, if any."""
    return service.get_current(user, db)


@router.post("/me/deletion-request", response_model=DeletionRequestOut, status_code=201)
def request_deletion(
    payload: DeletionRequestCreate,
    request: Request,
    user: CurrentUser,
    db: DbSession,
    _: Annotated[
        None,
        Depends(user_rate_limit("me_deletion_request", limit=5, window_seconds=3600)),
    ],
) -> DeletionRequestOut:
    """Start account deletion. Requires recent re-authentication and email confirmation."""
    return service.request_deletion(
        user,
        confirm_email=payload.confirm_email,
        reason=payload.reason,
        auth_time=_auth_time(request),
        db=db,
    )


@router.post("/me/deletion-request/cancel", response_model=DeletionRequestOut)
def cancel_deletion(user: CurrentUser, db: DbSession) -> DeletionRequestOut:
    """Cancel a pending deletion during the grace period."""
    return service.cancel_deletion(user, db)


@router.post("/me/deletion-request/{request_id}/disposition", response_model=DeletionRequestOut)
def set_disposition(
    request_id: uuid.UUID,
    payload: DispositionUpdate,
    user: CurrentUser,
    db: DbSession,
) -> DeletionRequestOut:
    """Choose what happens to a memorial whose only steward is leaving."""
    return service.set_disposition(user, request_id, payload, db)


@admin_router.get(
    "/admin/deletion-requests",
    response_model=list[AdminDeletionRow],
    summary="Deletion queue for administrators",
)
def list_deletion_requests(admin_user: AdminDep, db: DbSession) -> list[AdminDeletionRow]:
    return service.admin_list(db)


@admin_router.post(
    "/admin/deletion-requests/process",
    summary="Execute deletion requests whose grace period has elapsed",
)
def process_deletion_requests(admin_user: AdminDep, db: DbSession) -> dict[str, Any]:
    executed = service.execute_due(db)
    return {
        "processed": len(executed),
        "ids": [str(item.id) for item in executed],
    }
