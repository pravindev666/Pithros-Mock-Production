"""Contributor and invitation schemas.

Field names follow the frontend's existing `FamilyMember` shape where they
overlap, so the dashboard contributor list keeps working.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import EmailStr, Field

from app.core.enums import ContributorRole, ContributorStatus, MemorialPermission
from app.core.schemas import CamelModel, StrictModel


class ContributorInviteRequest(StrictModel):
    """Invite someone to a memorial.

    Only a role is accepted here, not explicit permissions: `memorial_permissions`
    is keyed on `user_id`, which does not exist until the invitation is accepted.
    Fine-grained grants are made afterwards through the update endpoint.
    """

    email: EmailStr
    role: ContributorRole = ContributorRole.VIEWER
    relationship: str | None = Field(default=None, max_length=120)
    display_name: str | None = Field(default=None, max_length=200)


class ContributorUpdateRequest(StrictModel):
    role: ContributorRole | None = None
    relationship: str | None = Field(default=None, max_length=120)
    display_name: str | None = Field(default=None, max_length=200)
    permissions: list[MemorialPermission] | None = None


class InvitationTokenRequest(StrictModel):
    token: str = Field(min_length=16, max_length=512)


class ContributorOut(CamelModel):
    id: str
    user_id: str | None = None
    name: str
    email: str | None = None
    avatar: str | None = None
    relationship: str | None = None
    role: str
    status: str
    permissions: list[str] = Field(default_factory=list)
    is_invitation_pending: bool = False
    invited_at: datetime
    accepted_at: datetime | None = None
    invitation_expires_at: datetime | None = None


class InvitationCreatedOut(CamelModel):
    contributor: ContributorOut
    invitation_url: str
    expires_at: datetime | None = None
    # Only populated when EXPOSE_INVITATION_TOKENS is on (development). In
    # production the token travels by email and this field is null.
    invitation_token: str | None = None


class MyInvitationOut(CamelModel):
    id: str
    memorial_id: str
    memorial_name: str
    memorial_slug: str
    role: str
    invited_by: str | None = None
    expires_at: datetime | None = None


def status_is_pending(status: str) -> bool:
    return status == ContributorStatus.INVITED.value
