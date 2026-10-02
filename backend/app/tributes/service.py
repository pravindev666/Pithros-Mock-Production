"""Tribute submission and moderation.

Tributes are never auto-approved. The steward's moderation preference may decide
whether a tribute appears immediately, but the backend applies that policy — the
client cannot mark its own submission approved.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.audit.service import record as audit_record
from app.core.database import transaction
from app.core.enums import AuditAction, NotificationType, TributeStatus
from app.core.errors import NotFoundError
from app.core.pagination import DEFAULT_LIMIT, Cursor, Page, PageParams, paginate
from app.memorials.cache import invalidate_public_memorial_cache
from app.memorials.models import Memorial
from app.memorials.permissions import MemorialAccess
from app.notifications.service import notify_memorial_stewards
from app.tributes.models import Tribute
from app.tributes.schemas import TributeModerationRequest, TributeSubmissionRequest


def submit_tribute(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    payload: TributeSubmissionRequest,
    request: Request | None = None,
) -> Tribute:
    """Persist a tribute in PENDING_MODERATION.

    A member of the memorial has their own contribution approved immediately —
    they are already trusted with its content — but everyone else waits for a
    steward or moderator. The client never chooses this.
    """
    is_trusted = access.is_member

    with transaction(db):
        tribute = Tribute(
            memorial_id=memorial.id,
            author_name=payload.author_name.strip()[:200],
            author_email=payload.author_email or None,
            relationship=payload.relationship,
            message=payload.message.strip(),
            avatar_url=payload.avatar_url,
            photo_url=payload.photo_url,
            status=(
                TributeStatus.APPROVED.value
                if is_trusted
                else TributeStatus.PENDING_MODERATION.value
            ),
            submitted_by_id=access.user.id if access.user else None,
            moderated_at=datetime.now(UTC) if is_trusted else None,
        )
        db.add(tribute)
        db.flush()

        if not is_trusted:
            notify_memorial_stewards(
                db,
                memorial=memorial,
                notification_type=NotificationType.TRIBUTE_PENDING,
                title="New tribute awaiting review",
                body=(
                    f"{tribute.author_name} left a remembrance for {memorial.full_name}. "
                    "Approve it to make it visible on the public memorial."
                ),
                payload={"tributeId": str(tribute.id), "memorialSlug": memorial.slug},
            )

    db.refresh(tribute)
    if is_trusted:
        invalidate_public_memorial_cache(memorial.slug)
    return tribute


def _get_tribute(db: Session, *, memorial_id: uuid.UUID, tribute_id: uuid.UUID) -> Tribute:
    tribute = db.scalar(
        select(Tribute).where(
            Tribute.id == tribute_id,
            Tribute.memorial_id == memorial_id,
            Tribute.deleted_at.is_(None),
        )
    )
    if tribute is None:
        raise NotFoundError("Tribute not found")
    return tribute


def moderate_tribute(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    tribute_id: uuid.UUID,
    payload: TributeModerationRequest,
    request: Request | None = None,
) -> Tribute:
    tribute = _get_tribute(db, memorial_id=memorial.id, tribute_id=tribute_id)

    with transaction(db):
        tribute.status = payload.status.value
        tribute.is_pinned = (
            payload.is_pinned if payload.is_pinned is not None else tribute.is_pinned
        )
        tribute.moderation_reason = payload.reason
        tribute.moderated_by_id = access.user.id if access.user else None
        tribute.moderated_at = datetime.now(UTC)

        audit_record(
            db,
            action=AuditAction.TRIBUTE_MODERATED,
            entity="tribute",
            entity_id=tribute.id,
            actor=access.user,
            detail={
                "memorialId": str(memorial.id),
                "status": payload.status.value,
                "reason": payload.reason,
            },
            request=request,
        )

    db.refresh(tribute)
    invalidate_public_memorial_cache(memorial.slug)
    return tribute


def delete_tribute(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    tribute_id: uuid.UUID,
    request: Request | None = None,
) -> None:
    """Soft delete. A removed tribute may be needed to resolve a moderation dispute."""
    tribute = _get_tribute(db, memorial_id=memorial.id, tribute_id=tribute_id)

    with transaction(db):
        tribute.deleted_at = datetime.now(UTC)
        audit_record(
            db,
            action=AuditAction.TRIBUTE_DELETED,
            entity="tribute",
            entity_id=tribute.id,
            actor=access.user,
            detail={"memorialId": str(memorial.id), "status": tribute.status},
            request=request,
        )

    invalidate_public_memorial_cache(memorial.slug)


def list_for_moderation(
    db: Session,
    *,
    memorial_id: uuid.UUID,
    status: TributeStatus | None = None,
    limit: int | None = None,
    cursor: Cursor | None = None,
) -> Page:
    """Moderation queue for one memorial, optionally filtered by status."""
    stmt = select(Tribute).where(Tribute.memorial_id == memorial_id, Tribute.deleted_at.is_(None))
    if status is not None:
        stmt = stmt.where(Tribute.status == status.value)

    return paginate(
        db,
        stmt,
        model=Tribute,
        params=PageParams(limit=limit or DEFAULT_LIMIT, cursor=cursor),
    )
