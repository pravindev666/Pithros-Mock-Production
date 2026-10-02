"""Media post-processing.

Tasks take ids, never ORM objects, and are written to be safe if they run twice
for the same media item.
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.enums import MediaKind, MediaStatus, StorageTier
from app.media.models import MediaItem
from app.media.storage import get_storage
from app.workers.base import RecordedTask
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)

THUMBNAIL_MAX_EDGE = 480


@celery_app.task(
    name="app.workers.tasks.media_tasks.process_uploaded_media",
    base=RecordedTask,
    bind=True,
    max_retries=3,
)
def process_uploaded_media(self: Any, media_id: str) -> dict[str, str]:
    """Generate a thumbnail and record image dimensions.

    Idempotent: re-running overwrites the same derived keys.
    """
    with SessionLocal() as db:
        item = db.scalar(
            select(MediaItem).where(
                MediaItem.id == uuid.UUID(media_id),
                # A row soft-deleted between upload and processing must not be
                # thumbnailed — that would resurrect storage for deleted media.
                MediaItem.deleted_at.is_(None),
            )
        )
        if item is None:
            logger.warning("media_task_missing_row", extra={"media_id": media_id})
            return {"status": "missing"}

        if item.status != MediaStatus.READY.value:
            return {"status": "skipped", "reason": item.status}

        if item.kind != MediaKind.PHOTO.value:
            item.processed_at = datetime.now(UTC)
            db.commit()
            return {"status": "skipped", "reason": "not a photo"}

        try:
            storage = get_storage()
            raw = storage.get_bytes(tier=StorageTier(item.storage_tier), key=item.storage_key)

            from io import BytesIO

            from PIL import Image

            with Image.open(BytesIO(raw)) as image:
                item.width, item.height = image.size

                # Strip dangerous EXIF metadata (GPS, camera serials, timestamps)
                # for privacy & security
                clean_buffer = BytesIO()
                clean_mode = "RGB" if image.mode not in ("RGB", "L") else image.mode
                clean_image = image.convert(clean_mode) if image.mode != clean_mode else image
                save_fmt = (
                    "JPEG"
                    if item.mime_type in ("image/jpeg", "image/jpg")
                    else (image.format or "JPEG")
                )
                clean_image.save(clean_buffer, format=save_fmt, quality=92, optimize=True)

                # Overwrite raw storage object with EXIF-sanitized bytes
                sanitized_data = clean_buffer.getvalue()
                storage.put_bytes(
                    tier=StorageTier(item.storage_tier),
                    key=item.storage_key,
                    data=sanitized_data,
                    content_type=item.mime_type,
                )
                item.size_bytes = len(sanitized_data)

                thumbnail = clean_image.copy()
                thumbnail.thumbnail((THUMBNAIL_MAX_EDGE, THUMBNAIL_MAX_EDGE))

                buffer = BytesIO()
                if thumbnail.mode not in ("RGB", "L"):
                    thumbnail = thumbnail.convert("RGB")
                thumbnail.save(buffer, format="JPEG", quality=82, optimize=True)

            thumbnail_key = f"{item.storage_key}.thumb.jpg"
            storage.put_bytes(
                tier=StorageTier(item.storage_tier),
                key=thumbnail_key,
                data=buffer.getvalue(),
                content_type="image/jpeg",
            )

            item.thumbnail_key = thumbnail_key
            item.processed_at = datetime.now(UTC)
            db.commit()

            return {"status": "ok", "thumbnail": thumbnail_key}

        except Exception as exc:
            db.rollback()
            logger.exception("media_processing_failed", extra={"media_id": media_id})
            raise self.retry(exc=exc, countdown=30) from exc


@celery_app.task(
    name="app.workers.tasks.media_tasks.purge_abandoned_uploads",
    base=RecordedTask,
    bind=True,
    max_retries=3,
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def purge_abandoned_uploads(self: Any, max_age_hours: int = 24) -> dict[str, int]:
    """Remove upload rows whose browser never confirmed the transfer.

    Without this, every abandoned upload would leave an orphaned metadata row and
    a stray object in storage.
    """
    cutoff = datetime.now(UTC) - timedelta(hours=max_age_hours)
    removed = 0

    with SessionLocal() as db:
        stale = list(
            db.scalars(
                select(MediaItem).where(
                    MediaItem.status == MediaStatus.PENDING.value,
                    MediaItem.created_at < cutoff,
                    # Explicit, not incidental: this sweep hard-deletes abandoned
                    # uploads. Soft-deleted rows are the retention workflow's
                    # business and are deliberately left alone.
                    MediaItem.deleted_at.is_(None),
                )
            )
        )
        storage = get_storage()

        for item in stale:
            try:
                storage.delete(tier=StorageTier(item.storage_tier), key=item.storage_key)
            except Exception:
                logger.warning("orphan_object_delete_failed", extra={"media_id": str(item.id)})
            db.delete(item)
            removed += 1

        db.commit()

    return {"removed": removed}
