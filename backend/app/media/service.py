"""Media upload orchestration.

The browser uploads bytes straight to object storage; FastAPI only authorizes,
issues a one-shot URL, and records metadata. Nothing large passes through the
application server.
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from typing import cast

from redis.exceptions import RedisError
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.audit.service import record as audit_record
from app.billing.entitlements import assert_can_upload_media, resolve_memorial_entitlements
from app.core.config import settings
from app.core.database import transaction
from app.core.enums import AuditAction, MediaKind, MediaStatus, PrivacyLevel, StorageTier
from app.core.errors import (
    ConflictError,
    NotFoundError,
    RateLimitedError,
    StorageError,
    ValidationError,
)
from app.core.redis import get_redis
from app.media.models import MediaItem
from app.media.schemas import UploadIntentRequest
from app.media.storage import build_media_key, extension_of, get_storage
from app.media.validation import rule_for_extension, validate_content, validate_declaration
from app.memorials.cache import invalidate_public_memorial_cache
from app.memorials.models import Memorial
from app.memorials.permissions import MemorialAccess
from app.workers.celery_app import enqueue
from app.workers.tasks.media_tasks import process_uploaded_media

logger = logging.getLogger(__name__)


def _tier_for(*, kind: MediaKind) -> StorageTier:
    """Verification documents always live in the sensitive tier.

    Everything else starts in the private tier even when the uploader intends to
    publish it: promoting an object into the public bucket is a separate,
    deliberate step, so a later privacy change can never expose bytes that were
    never placed there.
    """
    if kind == MediaKind.DOCUMENT:
        return StorageTier.SENSITIVE
    return StorageTier.PRIVATE


def create_upload_intent(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    payload: UploadIntentRequest,
    request: Request | None = None,
) -> tuple[MediaItem, str]:
    # Enforce authoritative commercial tier & storage limits
    can_upload, gate_reason = assert_can_upload_media(
        memorial.id, payload.kind, payload.size_bytes or 0, db
    )
    if not can_upload:
        raise ValidationError(
            gate_reason or "Upload limit reached",
            details={"entitlementGated": True, "kind": payload.kind.value},
        )

    # Abuse Prevention: Check daily upload attempt quota
    ent = resolve_memorial_entitlements(memorial.id, db)
    max_daily = getattr(ent.limits, "max_daily_upload_attempts", 50)
    try:
        r = get_redis()
        attempt_key = f"pithros:daily_upload_attempts:{memorial.id}"
        daily_attempts = int(cast(int, r.incr(attempt_key)))
        if daily_attempts == 1:
            r.expire(attempt_key, 86400)
        if daily_attempts > max_daily:
            raise RateLimitedError(
                f"Daily upload attempt limit reached ({max_daily} attempts/day). "
                "Please try again tomorrow.",
                details={
                    "retryAfterSeconds": max(int(cast(int, r.ttl(attempt_key))), 0),
                    "dailyLimit": max_daily,
                },
            )
    except RedisError:
        # Fail open: the quota is a safety valve, not a correctness gate.
        logger.warning("daily_upload_quota_unavailable", exc_info=True)

    rule = validate_declaration(
        filename=payload.filename,
        declared_mime=payload.content_type,
        declared_size=payload.size_bytes,
    )

    tier = _tier_for(kind=payload.kind)
    storage = get_storage()
    key = build_media_key(
        memorial_id=memorial.id,
        kind=payload.kind.value,
        extension=extension_of(payload.filename) or rule.extension,
    )

    upload_url = storage.presigned_put_url(tier=tier, key=key, content_type=rule.mime)

    with transaction(db):
        item = MediaItem(
            memorial_id=memorial.id,
            kind=payload.kind.value,
            status=MediaStatus.PENDING.value,
            privacy=payload.privacy.value,
            storage_tier=tier.value,
            storage_bucket=storage.bucket_for(tier),
            storage_key=key,
            original_filename=payload.filename[:255],
            mime_type=rule.mime,
            size_bytes=max(payload.size_bytes or 0, 0),
            title=payload.title,
            caption=payload.caption,
            year=payload.year,
            uploaded_by_id=access.user.id if access.user else None,
        )
        db.add(item)
        db.flush()

        audit_record(
            db,
            action=AuditAction.MEDIA_UPLOAD_STARTED,
            entity="memorial_media",
            entity_id=item.id,
            actor=access.user,
            detail={"memorialId": str(memorial.id), "kind": payload.kind.value},
            request=request,
        )

    db.refresh(item)
    return item, upload_url


def complete_upload(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    media_id: uuid.UUID,
    request: Request | None = None,
) -> MediaItem:
    """Verify the object really landed and really is what it claimed to be."""
    item = db.scalar(
        select(MediaItem).where(
            MediaItem.id == media_id,
            MediaItem.memorial_id == memorial.id,
            MediaItem.deleted_at.is_(None),
        )
    )
    if item is None:
        raise NotFoundError("Upload not found")

    if item.status == MediaStatus.READY.value:
        return item

    storage = get_storage()
    tier = StorageTier(item.storage_tier)

    stored = storage.head(tier=tier, key=item.storage_key)
    head = storage.get_bytes(tier=tier, key=item.storage_key, max_bytes=4096)

    rule = rule_for_extension(extension_of(item.original_filename) or "")
    if rule is None or rule.mime != item.mime_type:
        raise ValidationError("This file type is not accepted.")

    validate_content(head=head, rule=rule, actual_size=stored.size)

    # Server-side re-verification of actual uploaded object size against entitlements
    # (Never blindly trust client-declared size)
    can_upload_actual, actual_gate_reason = assert_can_upload_media(
        memorial.id, MediaKind(item.kind), stored.size, db
    )
    if not can_upload_actual:
        try:
            storage.delete(tier=tier, key=item.storage_key)
        except Exception:
            logger.warning("rejected_upload_object_delete_failed", exc_info=True)
        with transaction(db):
            item.status = MediaStatus.REJECTED.value
            item.deleted_at = datetime.now(UTC)
        raise ValidationError(
            actual_gate_reason or "Uploaded object exceeds allowed storage or tier limits.",
            details={"entitlementGated": True},
        )

    with transaction(db):
        item.status = MediaStatus.READY.value
        item.size_bytes = stored.size
        audit_record(
            db,
            action=AuditAction.MEDIA_UPLOADED,
            entity="memorial_media",
            entity_id=item.id,
            actor=access.user,
            detail={"memorialId": str(memorial.id), "bytes": stored.size},
            request=request,
        )

    db.refresh(item)
    enqueue(process_uploaded_media, media_id=str(item.id))
    invalidate_public_memorial_cache(memorial.slug)
    return item


def delete_media(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    media_id: uuid.UUID,
    request: Request | None = None,
) -> None:
    item = _get_media(db, memorial_id=memorial.id, media_id=media_id)

    with transaction(db):
        item.deleted_at = datetime.now(UTC)
        item.status = MediaStatus.REJECTED.value
        audit_record(
            db,
            action=AuditAction.MEDIA_DELETED,
            entity="memorial_media",
            entity_id=item.id,
            actor=access.user,
            detail={"memorialId": str(memorial.id)},
            request=request,
        )

    invalidate_public_memorial_cache(memorial.slug)


def _copy_object(item: MediaItem, *, target_tier: StorageTier) -> None:
    """Move stored bytes between tiers.

    Copy-then-delete: a failure never leaves the only copy in a bucket that is
    about to be abandoned. Thumbnails follow the original when they exist.
    """
    storage = get_storage()
    source = StorageTier(item.storage_tier)
    if source == target_tier:
        return

    data = storage.get_bytes(tier=source, key=item.storage_key, max_bytes=settings.max_upload_bytes)
    storage.put_bytes(
        tier=target_tier,
        key=item.storage_key,
        data=data,
        content_type=item.mime_type or "application/octet-stream",
    )

    if item.thumbnail_key:
        try:
            thumb = storage.get_bytes(
                tier=source, key=item.thumbnail_key, max_bytes=settings.max_upload_bytes
            )
            storage.put_bytes(
                tier=target_tier, key=item.thumbnail_key, data=thumb, content_type="image/jpeg"
            )
        except StorageError:
            # A missing thumbnail is regenerable; the original is the payload.
            logger.warning("media_thumbnail_copy_failed", exc_info=True)

    storage.delete(tier=source, key=item.storage_key)
    item.storage_tier = target_tier.value
    item.storage_bucket = storage.bucket_for(target_tier)


def _promote_media_object(item: MediaItem) -> None:
    """Copy a photo or voice memory into the public bucket.

    Only these kinds are ever promotable — verification evidence is refused
    outright, so a stray flag can never move a death certificate into a
    publicly-served bucket.
    """
    if item.kind not in (MediaKind.PHOTO.value, MediaKind.VOICE.value):
        raise ValidationError(
            "Only photographs and voice memories can appear on the public memorial."
        )
    if item.status != MediaStatus.READY.value:
        raise ConflictError("That file has not finished uploading yet.")
    _copy_object(item, target_tier=StorageTier.PUBLIC)


def _demote_media_object(item: MediaItem) -> None:
    """Bring a previously-promoted object back to the private bucket."""
    if item.storage_tier == StorageTier.PUBLIC.value:
        _copy_object(item, target_tier=StorageTier.PRIVATE)


def update_media(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    media_id: uuid.UUID,
    updates: dict,
    request: Request | None = None,
) -> MediaItem:
    item = _get_media(db, memorial_id=memorial.id, media_id=media_id)

    with transaction(db):
        requested_privacy = updates.get("privacy")
        if requested_privacy is not None:
            value = (
                requested_privacy.value
                if isinstance(requested_privacy, PrivacyLevel)
                else str(requested_privacy)
            )
            if value not in (PrivacyLevel.PRIVATE.value, PrivacyLevel.PUBLIC.value):
                raise ValidationError("Unknown visibility setting.")
            if value == PrivacyLevel.PUBLIC.value:
                _promote_media_object(item)
                item.privacy = value
            else:
                _demote_media_object(item)
                item.privacy = value

        for field in ("title", "caption", "year"):
            if updates.get(field) is not None:
                setattr(item, field, updates[field])

        db.flush()
        audit_record(
            db,
            action=AuditAction.MEMORIAL_UPDATED,
            entity="memorial_media",
            entity_id=item.id,
            actor=access.user,
            detail={"memorialId": str(memorial.id), "fields": sorted(updates)},
            request=request,
        )

    db.refresh(item)
    invalidate_public_memorial_cache(memorial.slug)
    return item


def _get_media(db: Session, *, memorial_id: uuid.UUID, media_id: uuid.UUID) -> MediaItem:
    item = db.scalar(
        select(MediaItem).where(
            MediaItem.id == media_id,
            MediaItem.memorial_id == memorial_id,
            MediaItem.deleted_at.is_(None),
        )
    )
    if item is None:
        raise NotFoundError("Media not found")
    return item


def max_upload_bytes() -> int:
    return settings.max_upload_bytes
