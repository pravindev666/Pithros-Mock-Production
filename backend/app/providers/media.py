"""Provider media: gallery photographs and credential documents.

Reuses the memorial media pipeline (same storage port, same two-stage content
validation, same `memorial_media` table) rather than inventing a parallel one.

Gallery photos go to the public bucket, because a partner publishes them
deliberately and their exposure is gated by the provider's approved status in
every read path. Credential documents go to the sensitive tier and are only ever
served through short-lived signed URLs.
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.audit.service import record as audit_record
from app.core.enums import AuditAction, MediaKind, MediaStatus, PrivacyLevel, StorageTier
from app.core.errors import NotFoundError, ValidationError
from app.media.models import MediaItem
from app.media.storage import build_provider_media_key, extension_of, get_storage
from app.media.validation import rule_for_extension, validate_content, validate_declaration
from app.providers.models import Provider
from app.providers.service import MAX_GALLERY_PHOTOS, MAX_VERIFICATION_DOCUMENTS

logger = logging.getLogger(__name__)

_ALLOWED_KINDS = (MediaKind.PHOTO, MediaKind.DOCUMENT)


def _tier_for(kind: MediaKind) -> StorageTier:
    if kind == MediaKind.DOCUMENT:
        return StorageTier.SENSITIVE
    return StorageTier.PUBLIC


def _limit_for(kind: MediaKind) -> int:
    return MAX_VERIFICATION_DOCUMENTS if kind == MediaKind.DOCUMENT else MAX_GALLERY_PHOTOS


def _count(db: Session, provider: Provider, kind: MediaKind) -> int:
    return int(
        db.scalar(
            select(func.count())
            .select_from(MediaItem)
            .where(
                MediaItem.provider_id == provider.id,
                MediaItem.kind == kind.value,
                MediaItem.deleted_at.is_(None),
            )
        )
        or 0
    )


def create_intent(
    db: Session,
    *,
    provider: Provider,
    payload: object,
    actor: object,
    request: Request | None = None,
) -> tuple[MediaItem, str]:
    """Authorize one provider upload and issue a one-shot URL."""
    kind = payload.kind  # type: ignore[attr-defined]
    if kind not in _ALLOWED_KINDS:
        raise ValidationError("Only photographs and credential documents can be uploaded here.")
    if _count(db, provider, kind) >= _limit_for(kind):
        raise ValidationError("You have reached the upload limit for this section.")

    rule = validate_declaration(
        filename=payload.filename,  # type: ignore[attr-defined]
        declared_mime=payload.content_type,  # type: ignore[attr-defined]
        declared_size=payload.size_bytes,  # type: ignore[attr-defined]
    )
    if kind == MediaKind.DOCUMENT and rule.kind not in (MediaKind.DOCUMENT, MediaKind.PHOTO):
        raise ValidationError("Credential documents must be a PDF or an image.")
    if kind == MediaKind.PHOTO and rule.kind != MediaKind.PHOTO:
        raise ValidationError("Gallery uploads must be images.")

    tier = _tier_for(kind)
    storage = get_storage()
    key = build_provider_media_key(
        provider_id=provider.id,
        kind=kind.value,
        extension=extension_of(payload.filename) or rule.extension,  # type: ignore[attr-defined]
    )
    upload_url = storage.presigned_put_url(tier=tier, key=key, content_type=rule.mime)

    item = MediaItem(
        memorial_id=None,
        provider_id=provider.id,
        kind=kind.value,
        status=MediaStatus.PENDING.value,
        privacy=(
            PrivacyLevel.PUBLIC.value if kind == MediaKind.PHOTO else PrivacyLevel.PRIVATE.value
        ),
        storage_tier=tier.value,
        storage_bucket=storage.bucket_for(tier),
        storage_key=key,
        original_filename=payload.filename[:255],  # type: ignore[attr-defined]
        mime_type=rule.mime,
        size_bytes=max(payload.size_bytes or 0, 0),  # type: ignore[attr-defined]
        title=payload.title,  # type: ignore[attr-defined]
        uploaded_by_id=actor.id,  # type: ignore[attr-defined]
    )
    db.add(item)
    db.flush()
    audit_record(
        db,
        action=AuditAction.PROVIDER_MEDIA_CHANGED,
        entity="memorial_media",
        entity_id=item.id,
        actor=actor,  # type: ignore[arg-type]
        detail={"providerId": str(provider.id), "kind": kind.value, "phase": "intent"},
        request=request,
    )
    return item, upload_url


def complete_upload(
    db: Session,
    *,
    provider: Provider,
    media_id: uuid.UUID,
    actor: object,
    request: Request | None = None,
) -> MediaItem:
    """Verify the object really landed and really is what it claimed to be."""
    item = db.scalar(
        select(MediaItem).where(
            MediaItem.id == media_id,
            MediaItem.provider_id == provider.id,
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

    item.status = MediaStatus.READY.value
    item.size_bytes = stored.size
    audit_record(
        db,
        action=AuditAction.PROVIDER_MEDIA_CHANGED,
        entity="memorial_media",
        entity_id=item.id,
        actor=actor,  # type: ignore[arg-type]
        detail={"providerId": str(provider.id), "bytes": stored.size, "phase": "complete"},
        request=request,
    )
    db.flush()
    return item


def list_media(
    db: Session, provider: Provider, *, kind: MediaKind | None = None
) -> list[MediaItem]:
    stmt = select(MediaItem).where(
        MediaItem.provider_id == provider.id,
        MediaItem.deleted_at.is_(None),
    )
    if kind is not None:
        stmt = stmt.where(MediaItem.kind == kind.value)
    return list(db.scalars(stmt.order_by(MediaItem.created_at)))


def delete_media(
    db: Session,
    *,
    provider: Provider,
    media_id: uuid.UUID,
    actor: object,
    request: Request | None = None,
) -> None:
    item = db.scalar(
        select(MediaItem).where(
            MediaItem.id == media_id,
            MediaItem.provider_id == provider.id,
            MediaItem.deleted_at.is_(None),
        )
    )
    if item is None:
        raise NotFoundError("Upload not found")

    item.deleted_at = datetime.now(UTC)
    item.status = MediaStatus.REJECTED.value
    if provider.logo_media_id == item.id:
        provider.logo_media_id = None

    audit_record(
        db,
        action=AuditAction.PROVIDER_MEDIA_CHANGED,
        entity="memorial_media",
        entity_id=item.id,
        actor=actor,  # type: ignore[arg-type]
        detail={"providerId": str(provider.id), "phase": "deleted"},
        request=request,
    )
    db.flush()
