"""Remembrance offerings. Stored as real rows — the frontend never counts locally."""

from __future__ import annotations

from sqlalchemy.orm import Session
from starlette.requests import Request

from app.core.database import transaction
from app.memorials.cache import invalidate_public_memorial_cache
from app.memorials.models import Memorial
from app.memorials.permissions import MemorialAccess
from app.offerings.models import Offering
from app.offerings.schemas import OfferingSubmissionRequest


def submit_offering(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    payload: OfferingSubmissionRequest,
    request: Request | None = None,
) -> Offering:
    with transaction(db):
        offering = Offering(
            memorial_id=memorial.id,
            offering_type=payload.type.value,
            sender_name=(payload.sender_name or "Anonymous").strip()[:200] or "Anonymous",
            message=payload.message,
            sender_user_id=access.user.id if access.user else None,
        )
        db.add(offering)
        db.flush()

    db.refresh(offering)
    invalidate_public_memorial_cache(memorial.slug)
    return offering
