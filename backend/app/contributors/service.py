"""Family contributor invitations and membership.

Flow: a steward invites an email, the recipient receives a single-use token, signs
in, and accepts. Acceptance is what creates the membership — nothing before it
grants access, which is why the token is stored hashed and cleared on use.

The read side of authorization already existed and was tested before any of this
was written: `resolve_access` ignores contributors whose status is not ACTIVE, and
explicit grants only apply while membership holds. This module is the write side
that keeps those invariants true.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from starlette.requests import Request

from app.audit.service import record as audit_record
from app.audit.service import record_independently
from app.contributors.schemas import (
    ContributorInviteRequest,
    ContributorOut,
    ContributorUpdateRequest,
    InvitationCreatedOut,
    MyInvitationOut,
)
from app.core.config import settings
from app.core.database import transaction
from app.core.enums import (
    AuditAction,
    AuditResult,
    ContributorRole,
    ContributorStatus,
    MemorialPermission,
)
from app.core.errors import ConflictError, ForbiddenError, NotFoundError
from app.core.security import generate_token, hash_token
from app.memorials.models import Memorial, MemorialContributor, MemorialPermissionGrant
from app.memorials.permissions import ROLE_PERMISSIONS, MemorialAccess
from app.users.models import User

MAX_CONTRIBUTORS = 200


def _expiry() -> datetime:
    return datetime.now(UTC) + timedelta(hours=settings.invite_token_ttl_hours)


def _effective_permissions(
    db: Session, memorial_id: uuid.UUID, contributor: MemorialContributor
) -> list[str]:
    """Role baseline plus explicit grants, mirroring `resolve_access`."""
    permissions = set(ROLE_PERMISSIONS.get(contributor.role, frozenset()))
    if contributor.user_id is not None:
        grants = db.scalars(
            select(MemorialPermissionGrant).where(
                MemorialPermissionGrant.memorial_id == memorial_id,
                MemorialPermissionGrant.user_id == contributor.user_id,
            )
        )
        permissions |= {MemorialPermission(g.permission) for g in grants}
    return sorted(permission.value for permission in permissions)


def to_out(db: Session, memorial_id: uuid.UUID, contributor: MemorialContributor) -> ContributorOut:
    name: str
    email: str | None
    avatar: str | None

    if contributor.user is not None:
        name = contributor.user.name
        email = contributor.user.email
        avatar = contributor.user.avatar
    else:
        # Not yet accepted: fall back to what the steward supplied.
        name = contributor.display_name or contributor.invited_email or "Invited member"
        email = contributor.invited_email
        avatar = None

    return ContributorOut(
        id=str(contributor.id),
        user_id=str(contributor.user_id) if contributor.user_id else None,
        name=name,
        email=email,
        avatar=avatar,
        relationship=contributor.relationship_label,
        role=contributor.role,
        status=contributor.status,
        permissions=_effective_permissions(db, memorial_id, contributor),
        is_invitation_pending=contributor.status == ContributorStatus.INVITED.value,
        invited_at=contributor.created_at,
        accepted_at=contributor.accepted_at,
        invitation_expires_at=contributor.invitation_expires_at,
    )


def list_contributors(db: Session, memorial: Memorial) -> list[MemorialContributor]:
    stmt = (
        select(MemorialContributor)
        .where(MemorialContributor.memorial_id == memorial.id)
        .options(selectinload(MemorialContributor.user))
        .order_by(MemorialContributor.created_at.asc())
        .limit(MAX_CONTRIBUTORS)
    )
    return list(db.scalars(stmt))


def invite(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    payload: ContributorInviteRequest,
    request: Request | None = None,
) -> tuple[MemorialContributor, str]:
    from app.billing.entitlements import assert_can_add_contributor
    from app.core.errors import ValidationError

    allowed, reason = assert_can_add_contributor(memorial.id, db)
    if not allowed:
        raise ValidationError(
            reason or "This plan's contributor limit has been reached.",
            details={"entitlementGated": True},
        )

    email = payload.email.strip().lower()

    if payload.role == ContributorRole.STEWARD:
        # Stewardship is transferred by an explicit workflow, not handed out in an
        # invitation — otherwise a memorial could quietly gain two owners.
        raise ConflictError("Stewardship is transferred, not granted by invitation.")

    primary = memorial.primary_steward
    if primary is not None and primary.user is not None and primary.user.email == email:
        raise ConflictError("That person already stewards this memorial.")

    # Rotating the token on re-invite makes this double as "resend".
    token = generate_token()
    expires_at = _expiry()

    with transaction(db):
        existing = db.scalar(
            select(MemorialContributor).where(
                MemorialContributor.memorial_id == memorial.id,
                MemorialContributor.invited_email == email,
                MemorialContributor.status == ContributorStatus.INVITED.value,
            )
        )

        contributor = existing or MemorialContributor(
            memorial_id=memorial.id,
            invited_email=email,
            status=ContributorStatus.INVITED.value,
        )
        if existing is None:
            db.add(contributor)

        contributor.role = payload.role.value
        contributor.relationship_label = payload.relationship
        contributor.display_name = payload.display_name
        contributor.invited_by_id = access.user.id if access.user else None
        contributor.invitation_token_hash = hash_token(token)
        contributor.invitation_expires_at = expires_at
        contributor.accepted_at = None

        db.flush()

        audit_record(
            db,
            action=AuditAction.CONTRIBUTOR_INVITED,
            entity="memorial_contributor",
            entity_id=contributor.id,
            actor=access.user,
            detail={
                "memorialId": str(memorial.id),
                "role": payload.role.value,
                "resent": existing is not None,
            },
            request=request,
        )

    db.refresh(contributor)

    # Deliver the invitation after the row is committed, so the recipient can
    # never receive a link to an invitation that was rolled back. Enqueue is
    # best-effort: a broker outage must not fail the invite.
    from app.workers.celery_app import enqueue
    from app.workers.tasks.email_tasks import send_contributor_invitation_email

    enqueue(
        send_contributor_invitation_email,
        contributor_id=str(contributor.id),
        token=token,
    )

    return contributor, token


def invitation_payload(
    db: Session, memorial: Memorial, contributor: MemorialContributor, token: str
) -> InvitationCreatedOut:
    return InvitationCreatedOut(
        contributor=to_out(db, memorial.id, contributor),
        invitation_url=f"{settings.frontend_base_url.rstrip('/')}/invite/{token}",
        expires_at=contributor.invitation_expires_at,
        invitation_token=token if settings.expose_invitation_tokens else None,
    )


def _load_pending_by_token(db: Session, token: str) -> MemorialContributor:
    digest = hash_token(token)
    contributor = db.scalar(
        select(MemorialContributor)
        .where(MemorialContributor.invitation_token_hash == digest)
        .options(selectinload(MemorialContributor.user))
    )
    if contributor is None:
        raise NotFoundError("This invitation is not valid.")

    if contributor.status != ContributorStatus.INVITED.value:
        # The hash is cleared on acceptance, so this means revoked or already used.
        raise ConflictError("This invitation is no longer valid.")

    if contributor.invitation_expires_at is not None and (
        contributor.invitation_expires_at <= datetime.now(UTC)
    ):
        raise ConflictError("This invitation has expired. Ask the steward to resend it.")

    return contributor


def accept(
    db: Session,
    *,
    token: str,
    actor: User,
    request: Request | None = None,
) -> MemorialContributor:
    """Turn an invitation into a membership.

    The token proves control of the invited address, but the accepting account must
    actually be that address — otherwise a forwarded token would let anyone join a
    private memorial. Mismatches are recorded rather than silently allowed.
    """
    contributor = _load_pending_by_token(db, token)

    actor_email = (actor.email or "").strip().lower()
    invited_email = (contributor.invited_email or "").strip().lower()

    if invited_email and actor_email != invited_email:
        record_independently(
            action=AuditAction.AUTHORIZATION_DENIED,
            entity="memorial_contributor",
            entity_id=contributor.id,
            actor=actor,
            result=AuditResult.DENIED,
            detail={
                "reason": "invitation_email_mismatch",
                "memorialId": str(contributor.memorial_id),
            },
            request=request,
        )
        raise ForbiddenError(
            "This invitation was sent to a different email address. "
            "Sign in with that account, or ask the steward to resend it."
        )

    if contributor.user_id is not None and contributor.user_id != actor.id:
        raise ConflictError("This invitation has already been accepted.")

    with transaction(db):
        contributor.user_id = actor.id
        contributor.status = ContributorStatus.ACTIVE.value
        contributor.accepted_at = datetime.now(UTC)

        # Single use: clearing the hash is what makes a replay impossible.
        contributor.invitation_token_hash = None
        contributor.invitation_expires_at = None

        db.flush()

        audit_record(
            db,
            action=AuditAction.CONTRIBUTOR_INVITED,
            entity="memorial_contributor",
            entity_id=contributor.id,
            actor=actor,
            detail={
                "memorialId": str(contributor.memorial_id),
                "accepted": True,
                "role": contributor.role,
            },
            request=request,
        )

    db.refresh(contributor)
    return contributor


def reject(
    db: Session,
    *,
    token: str,
    actor: User,
    request: Request | None = None,
) -> None:
    """Decline an invitation. The row is kept so the steward can see it was declined."""
    contributor = _load_pending_by_token(db, token)

    invited_email = (contributor.invited_email or "").strip().lower()
    if invited_email and (actor.email or "").strip().lower() != invited_email:
        raise ForbiddenError("This invitation was sent to a different email address.")

    with transaction(db):
        contributor.status = ContributorStatus.REVOKED.value
        contributor.invitation_token_hash = None
        contributor.invitation_expires_at = None
        db.flush()

        audit_record(
            db,
            action=AuditAction.CONTRIBUTOR_REVOKED,
            entity="memorial_contributor",
            entity_id=contributor.id,
            actor=actor,
            detail={"memorialId": str(contributor.memorial_id), "declined": True},
            request=request,
        )


def update_contributor(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    contributor_id: uuid.UUID,
    payload: ContributorUpdateRequest,
    request: Request | None = None,
) -> MemorialContributor:
    contributor = _get_in_memorial(db, memorial, contributor_id)

    if contributor.role == ContributorRole.STEWARD.value:
        # Stewardship moves through an explicit transfer workflow, not this one.
        raise ConflictError("Stewardship is transferred, not edited here.")

    with transaction(db):
        if payload.role is not None:
            contributor.role = payload.role.value
        if payload.relationship is not None:
            contributor.relationship_label = payload.relationship
        if payload.display_name is not None:
            contributor.display_name = payload.display_name

        if payload.permissions is not None:
            if contributor.user_id is None:
                raise ConflictError(
                    "This invitation has not been accepted yet, so permissions "
                    "cannot be granted. Change the role instead."
                )
            _replace_grants(
                db,
                memorial_id=memorial.id,
                user_id=contributor.user_id,
                permissions=payload.permissions,
                granted_by_id=access.user.id if access.user else None,
            )

        db.flush()

        audit_record(
            db,
            action=AuditAction.MEMORIAL_UPDATED,
            entity="memorial_contributor",
            entity_id=contributor.id,
            actor=access.user,
            detail={"memorialId": str(memorial.id), "fields": sorted(payload.model_fields_set)},
            request=request,
        )

    db.refresh(contributor)
    return contributor


def revoke(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    contributor_id: uuid.UUID,
    request: Request | None = None,
) -> None:
    """Remove a member's access.

    Takes effect immediately: `resolve_access` only honours ACTIVE contributors, and
    dropping the explicit grants means a revoked member cannot keep an extra
    permission they were given earlier.
    """
    contributor = _get_in_memorial(db, memorial, contributor_id)

    with transaction(db):
        contributor.status = ContributorStatus.REVOKED.value
        contributor.invitation_token_hash = None
        contributor.invitation_expires_at = None

        if contributor.user_id is not None:
            _replace_grants(
                db,
                memorial_id=memorial.id,
                user_id=contributor.user_id,
                permissions=[],
                granted_by_id=access.user.id if access.user else None,
            )

        db.flush()

        audit_record(
            db,
            action=AuditAction.CONTRIBUTOR_REVOKED,
            entity="memorial_contributor",
            entity_id=contributor.id,
            actor=access.user,
            detail={"memorialId": str(memorial.id), "role": contributor.role},
            request=request,
        )


def my_invitations(db: Session, actor: User) -> list[MyInvitationOut]:
    """Pending invitations addressed to the signed-in user's email."""
    email = (actor.email or "").strip().lower()
    if not email:
        return []

    rows = db.execute(
        select(MemorialContributor, Memorial)
        .join(Memorial, Memorial.id == MemorialContributor.memorial_id)
        .where(
            MemorialContributor.invited_email == email,
            MemorialContributor.status == ContributorStatus.INVITED.value,
            Memorial.deleted_at.is_(None),
        )
    ).all()

    invitations: list[MyInvitationOut] = []
    for contributor, memorial in rows:
        invited_by = None
        if contributor.invited_by_id is not None:
            inviter = db.get(User, contributor.invited_by_id)
            invited_by = inviter.name if inviter else None

        invitations.append(
            MyInvitationOut(
                id=str(contributor.id),
                memorial_id=str(memorial.id),
                memorial_name=memorial.full_name,
                memorial_slug=memorial.slug,
                role=contributor.role,
                invited_by=invited_by,
                expires_at=contributor.invitation_expires_at,
            )
        )
    return invitations


def _get_in_memorial(
    db: Session, memorial: Memorial, contributor_id: uuid.UUID
) -> MemorialContributor:
    contributor = db.scalar(
        select(MemorialContributor)
        .where(
            MemorialContributor.id == contributor_id,
            MemorialContributor.memorial_id == memorial.id,
        )
        .options(selectinload(MemorialContributor.user))
    )
    if contributor is None:
        raise NotFoundError("Contributor not found")
    return contributor


def _replace_grants(
    db: Session,
    *,
    memorial_id: uuid.UUID,
    user_id: uuid.UUID,
    permissions: list[MemorialPermission],
    granted_by_id: uuid.UUID | None,
) -> None:
    for existing in db.scalars(
        select(MemorialPermissionGrant).where(
            MemorialPermissionGrant.memorial_id == memorial_id,
            MemorialPermissionGrant.user_id == user_id,
        )
    ):
        db.delete(existing)
    db.flush()

    for permission in set(permissions):
        db.add(
            MemorialPermissionGrant(
                memorial_id=memorial_id,
                user_id=user_id,
                permission=permission.value,
                granted_by_id=granted_by_id,
            )
        )
    db.flush()
