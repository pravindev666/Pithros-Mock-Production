"""Celery task for archival memorial book PDF export."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.audit.service import record as audit_record
from app.core.database import SessionLocal
from app.core.enums import AuditAction, StorageTier, TributeStatus
from app.media.storage import get_storage
from app.memorials.models import Memorial
from app.memorials.pdf_export import generate_memorial_pdf
from app.memorials.qr import build_memorial_url, generate_qr_code
from app.tributes.models import Tribute
from app.users.models import User
from app.workers.base import RETRY_POLICY, RecordedTask
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.workers.tasks.archive_tasks.generate_memorial_pdf_export",
    base=RecordedTask,
    bind=True,
    **RETRY_POLICY,
)
def generate_memorial_pdf_export(
    self: Any,
    memorial_id: str,
    requested_by_user_id: str | None = None,
) -> dict[str, Any]:
    """Generate a printable archival PDF memorial book and write it to object storage."""
    m_id = uuid.UUID(memorial_id)
    actor_id = uuid.UUID(requested_by_user_id) if requested_by_user_id else None

    with SessionLocal() as db:
        memorial = db.scalar(
            select(Memorial)
            .where(Memorial.id == m_id, Memorial.deleted_at.is_(None))
            .options(
                selectinload(Memorial.story),
                selectinload(Memorial.timeline_events),
                selectinload(Memorial.contributors),
            )
        )
        if memorial is None:
            logger.warning("archive_export_missing_memorial", extra={"memorial_id": memorial_id})
            return {"status": "missing", "memorial_id": memorial_id}

        actor = db.get(User, actor_id) if actor_id else None

        # Fetch approved tributes
        tributes = list(
            db.scalars(
                select(Tribute)
                .where(
                    Tribute.memorial_id == m_id,
                    Tribute.status == TributeStatus.APPROVED.value,
                    Tribute.deleted_at.is_(None),
                )
                .order_by(Tribute.created_at.asc())
            )
        )

        # Generate QR code for memorial URL
        memorial_url = build_memorial_url(memorial.slug)
        qr_bytes = generate_qr_code(memorial_url, format="png", box_size=6, border=2)

        # Compile PDF bytes
        pdf_bytes = generate_memorial_pdf(
            memorial=memorial,
            story=memorial.story,
            timeline_events=memorial.timeline_events,
            contributors=memorial.contributors,
            tributes=tributes,
            qr_png_bytes=qr_bytes,
        )

        storage = get_storage()
        export_uuid = uuid.uuid4().hex
        storage_key = f"memorials/{memorial.id}/exports/{export_uuid}.pdf"

        storage.put_bytes(
            tier=StorageTier.PRIVATE,
            key=storage_key,
            data=pdf_bytes,
            content_type="application/pdf",
        )

        download_url = storage.presigned_get_url(
            tier=StorageTier.PRIVATE,
            key=storage_key,
            expires_in=86400,  # 24 hours
        )

        audit_record(
            db,
            action=AuditAction.MEMORIAL_EXPORTED,
            entity="memorial_archive_export",
            entity_id=str(memorial.id),
            actor=actor,
            detail={
                "memorialId": str(memorial.id),
                "storageKey": storage_key,
                "bytes": len(pdf_bytes),
                "format": "pdf",
            },
        )
        db.commit()

        return {
            "status": "ready",
            "memorial_id": str(memorial.id),
            "storage_key": storage_key,
            "download_url": download_url,
            "file_size": len(pdf_bytes),
        }
