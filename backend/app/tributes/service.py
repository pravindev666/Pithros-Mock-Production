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
from app.core.enums import AuditAction, TributeStatus
from app.core.errors import NotFoundError
from app.memorials.models import Memorial
from app.memorials.permissions import MemorialAccess
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

    db.refresh(tribute)
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
    tribute = db.scalar(
        select(Tribute).where(
            Tribute.id == tribute_id,
            Tribute.memorial_id == memorial.id,
            Tribute.deleted_at.is_(None),
        )
    )
    if tribute is None:
        raise NotFoundError("Tribute not found")

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
            action=AuditAction.MEMORIAL_UPDATED,
            entity="tribute",
            entity_id=tribute.id,
            actor=access.user,
            detail={"memorialId": str(memorial.id), "status": payload.status.value},
            request=request,
        )

    db.refresh(tribute)
    return tribute
