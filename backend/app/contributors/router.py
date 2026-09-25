"""Contributor endpoints.

Management routes carry the `MANAGE_CONTRIBUTORS` dependency, so a viewer or a
biographer is refused before the handler runs. The two invitation routes are
token-based and only require being signed in — the token is the proof, and the
accepting account must match the invited address.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser
from app.contributors import service
from app.contributors.schemas import (
    ContributorInviteRequest,
    ContributorOut,
    ContributorUpdateRequest,
    InvitationCreatedOut,
    InvitationTokenRequest,
    MyInvitationOut,
)
from app.core.database import get_db
from app.core.enums import MemorialPermission
from app.core.rate_limit import user_rate_limit
from app.memorials.models import Memorial
from app.memorials.permissions import authorized, resolve_access

router = APIRouter(prefix="/memorials/{memorial_id}/contributors", tags=["Contributors"])
invitation_router = APIRouter(prefix="/contributors", tags=["Contributors"])
me_router = APIRouter(prefix="/me", tags=["Contributors"])

DbSession = Annotated[Session, Depends(get_db)]

ManageLimit = Annotated[
    None, Depends(user_rate_limit("contributor_invite", limit=100, window_seconds=3600))
]


@router.get("", response_model=list[ContributorOut])
def list_contributors(
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.MANAGE_CONTRIBUTORS))],
    db: DbSession,
) -> list[ContributorOut]:
    return [
        service.to_out(db, memorial.id, contributor)
        for contributor in service.list_contributors(db, memorial)
    ]


@router.post("", response_model=InvitationCreatedOut, status_code=status.HTTP_201_CREATED)
def invite_contributor(
    payload: ContributorInviteRequest,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.MANAGE_CONTRIBUTORS))],
    user: CurrentUser,
    db: DbSession,
    _: ManageLimit,
) -> InvitationCreatedOut:
    """Invite someone by email.

    Re-inviting a pending address rotates the token, so this doubles as "resend".
    The token is returned only when EXPOSE_INVITATION_TOKENS is on; production
    refuses to start with that enabled.
    """
    access = resolve_access(db, memorial, user)
    contributor, token = service.invite(
        db, memorial=memorial, access=access, payload=payload, request=request
    )
    return service.invitation_payload(db, memorial, contributor, token)


@router.patch("/{contributor_id}", response_model=ContributorOut)
def update_contributor(
    contributor_id: uuid.UUID,
    payload: ContributorUpdateRequest,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.MANAGE_CONTRIBUTORS))],
    user: CurrentUser,
    db: DbSession,
) -> ContributorOut:
    access = resolve_access(db, memorial, user)
    contributor = service.update_contributor(
        db,
        memorial=memorial,
        access=access,
        contributor_id=contributor_id,
        payload=payload,
        request=request,
    )
    return service.to_out(db, memorial.id, contributor)


@router.delete("/{contributor_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_contributor(
    contributor_id: uuid.UUID,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.MANAGE_CONTRIBUTORS))],
    user: CurrentUser,
    db: DbSession,
) -> Response:
    access = resolve_access(db, memorial, user)
    service.revoke(
        db, memorial=memorial, access=access, contributor_id=contributor_id, request=request
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@invitation_router.post("/accept", response_model=ContributorOut)
def accept_invitation(
    payload: InvitationTokenRequest,
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> ContributorOut:
    """Accept an invitation and become a member of the memorial."""
    contributor = service.accept(db, token=payload.token, actor=user, request=request)
    return service.to_out(db, contributor.memorial_id, contributor)


@invitation_router.post("/reject", status_code=status.HTTP_204_NO_CONTENT)
def reject_invitation(
    payload: InvitationTokenRequest,
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> Response:
    service.reject(db, token=payload.token, actor=user, request=request)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@me_router.get("/invitations", response_model=list[MyInvitationOut])
def my_invitations(user: CurrentUser, db: DbSession) -> list[MyInvitationOut]:
    """Pending invitations addressed to the signed-in user."""
    return service.my_invitations(db, user)
