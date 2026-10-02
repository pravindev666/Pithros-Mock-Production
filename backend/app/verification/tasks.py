"""Verification preparation with automated document analysis.

The automated pass over submitted documents — OCR, field extraction,
consistency checks, risk signals — runs here as an *assistant* to the human
reviewer.  The spec is explicit: automated output is never presented as legal
certification and never blocks a submission from reaching review.

Pipeline:
1. Move submission to VERIFICATION_PENDING (picked up by worker).
2. Load each evidence document from the SENSITIVE storage tier.
3. Run OCR (Tesseract for images, pypdf for PDFs) to extract text.
4. Run consistency checks: fuzzy-match extracted names and dates against the
   memorial's stored fields.
5. Write results to ``automated_result`` and ``risk_signals`` on the
   VerificationSubmission row.
6. Advance to VERIFICATION_REVIEW so a human can act on the results.

If any step in 2-5 fails, the submission still advances to VERIFICATION_REVIEW.
The human reviewer simply sees "AI analysis unavailable" instead of a risk
report.  AI failure must never stall the queue.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy.orm import selectinload

from app.core.database import SessionLocal
from app.core.enums import StorageTier
from app.media.models import MediaItem
from app.media.storage import get_storage
from app.memorials.models import Memorial
from app.verification.models import VerificationSubmission
from app.verification.service import mark_processing, mark_ready_for_review
from app.workers.base import RETRY_POLICY, RecordedTask
from app.workers.celery_app import celery_app, enqueue

logger = logging.getLogger(__name__)

# Maximum bytes to download from storage for OCR.  Death certificates are
# typically under 5 MB; capping prevents a corrupt row from pulling gigabytes.
_MAX_EVIDENCE_BYTES = 10 * 1024 * 1024  # 10 MB


def _run_document_analysis(
    submission: VerificationSubmission,
    memorial: Memorial,
    db: Any,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Run OCR + consistency checks on all evidence documents.

    Returns (automated_result, risk_signals).  Never raises — all exceptions
    are caught and recorded in the result dicts so the caller can proceed.
    """
    from app.verification.consistency import check_consistency
    from app.verification.ocr import ExtractionResult, extract_text

    storage = get_storage()
    all_extractions: list[dict[str, Any]] = []
    combined_text = ""
    combined_dates: list[str] = []
    combined_names: list[str] = []
    combined_keywords: list[str] = []
    combined_reg_numbers: list[str] = []
    ocr_engine = "none"
    errors: list[str] = []

    for evidence in submission.evidence:
        try:
            media = db.get(MediaItem, evidence.media_id)
            if media is None or media.deleted_at is not None:
                errors.append(f"Evidence {evidence.id}: media not found")
                continue

            tier = StorageTier(media.storage_tier)
            data = storage.get_bytes(
                tier=tier, key=media.storage_key, max_bytes=_MAX_EVIDENCE_BYTES
            )

            result: ExtractionResult = extract_text(data, media.mime_type)

            if result.error:
                errors.append(f"Evidence {evidence.id}: {result.error}")

            combined_text += result.text + "\n"
            combined_dates.extend(result.dates_found)
            combined_names.extend(result.names_found)
            combined_keywords.extend(result.keywords_found)
            combined_reg_numbers.extend(result.registration_numbers)
            if result.ocr_engine and result.ocr_engine != "none":
                ocr_engine = result.ocr_engine

            all_extractions.append(
                {
                    "evidence_id": str(evidence.id),
                    "document_type": evidence.document_type,
                    **result.to_dict(),
                }
            )

        except Exception as exc:
            logger.exception(
                "evidence_analysis_failed",
                extra={"evidence_id": str(evidence.id)},
            )
            errors.append(f"Evidence {evidence.id}: {type(exc).__name__}: {str(exc)[:200]}")

    # De-duplicate.
    combined_dates = sorted(set(combined_dates))
    combined_keywords = sorted(set(combined_keywords))
    combined_reg_numbers = list(dict.fromkeys(combined_reg_numbers))
    # Names: keep unique, longest first.
    seen_names: set[str] = set()
    unique_names: list[str] = []
    for name in combined_names:
        key = name.upper()
        if key not in seen_names:
            seen_names.add(key)
            unique_names.append(name)
    unique_names.sort(key=len, reverse=True)

    automated_result: dict[str, Any] = {
        "ocr_engine": ocr_engine,
        "text_extracted": bool(combined_text.strip()),
        "text_length": len(combined_text.strip()),
        "document_keywords_found": combined_keywords,
        "registration_numbers": combined_reg_numbers,
        "dates_found": combined_dates,
        "names_found": unique_names[:10],
        "raw_text_preview": combined_text.strip()[:500],
        "evidence_count": len(submission.evidence),
        "evidence_analysed": len(all_extractions),
        "errors": errors if errors else None,
    }

    # Build a synthetic ExtractionResult for the consistency checker.
    from app.verification.ocr import ExtractionResult as ER

    merged = ER(
        text=combined_text.strip(),
        text_length=len(combined_text.strip()),
        dates_found=combined_dates,
        names_found=unique_names[:10],
        keywords_found=combined_keywords,
        registration_numbers=combined_reg_numbers,
        ocr_engine=ocr_engine,
    )

    consistency = check_consistency(
        merged,
        memorial_full_name=memorial.full_name,
        memorial_death_date=memorial.death_date,
    )

    return automated_result, consistency.to_dict()


@celery_app.task(
    name="app.workers.tasks.verification_tasks.prepare_verification",
    base=RecordedTask,
    **RETRY_POLICY,
)
def prepare_verification(submission_id: str) -> dict[str, str]:
    """SUBMITTED -> VERIFICATION_PENDING -> VERIFICATION_REVIEW.

    Runs OCR and consistency checks between state transitions.  If analysis
    fails, the submission still advances — human review must never be blocked
    by an AI error.

    Idempotent: both transitions are guarded by the state machine, so re-running
    a task whose submission already advanced is a no-op rather than an error.
    """
    identifier = uuid.UUID(submission_id)

    with SessionLocal() as db:
        submission = mark_processing(db, identifier)

        if submission.state == "verification_pending":
            # ── Run document analysis while in VERIFICATION_PENDING ─────
            try:
                # Reload with relationships for evidence access.
                from sqlalchemy import select

                reloaded = db.scalar(
                    select(VerificationSubmission)
                    .where(VerificationSubmission.id == identifier)
                    .options(selectinload(VerificationSubmission.evidence))
                )
                if reloaded is not None:
                    submission = reloaded

                memorial = db.get(Memorial, submission.memorial_id)

                if submission and memorial and submission.evidence:
                    automated_result, risk_signals = _run_document_analysis(
                        submission, memorial, db
                    )
                    submission.automated_result = automated_result
                    submission.risk_signals = risk_signals
                    db.commit()

                    logger.info(
                        "verification_analysis_complete",
                        extra={
                            "submission_id": submission_id,
                            "risk": risk_signals.get("overall_risk", "unknown"),
                            "text_extracted": automated_result.get("text_extracted", False),
                        },
                    )
                else:
                    logger.warning(
                        "verification_analysis_skipped",
                        extra={
                            "submission_id": submission_id,
                            "reason": "missing submission, memorial, or evidence",
                        },
                    )

            except Exception:
                # AI failure is non-blocking. Log and continue to review.
                logger.exception(
                    "verification_analysis_failed",
                    extra={"submission_id": submission_id},
                )
                db.rollback()

            # ── Advance to VERIFICATION_REVIEW regardless of AI outcome ─
            submission = mark_ready_for_review(db, identifier)

        logger.info(
            "verification_prepared",
            extra={"submission_id": submission_id, "state": submission.state},
        )
        return {"status": submission.state}


def queue_verification_preparation(submission_id: uuid.UUID) -> str | None:
    return enqueue(prepare_verification, submission_id=str(submission_id))
