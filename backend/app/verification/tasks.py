"""Verification preparation.

The automated pass over submitted documents — validation, OCR, field extraction,
consistency checks, risk signals — belongs in this module. **None of it is
implemented yet**, and this docstring says so rather than dressing up a no-op as
analysis. The spec is explicit that automated output must never be presented as
legal certification.

What the task *does* do is move a submission through its queued states so it
reaches a human reviewer. That much of the lifecycle is real.
"""

from __future__ import annotations

import logging
import uuid

from app.core.database import SessionLocal
from app.verification.service import mark_processing, mark_ready_for_review
from app.workers.base import RETRY_POLICY, RecordedTask
from app.workers.celery_app import celery_app, enqueue

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.workers.tasks.verification_tasks.prepare_verification",
    base=RecordedTask,
    **RETRY_POLICY,
)
def prepare_verification(submission_id: str) -> dict[str, str]:
    """SUBMITTED -> VERIFICATION_PENDING -> VERIFICATION_REVIEW.

    Idempotent: both transitions are guarded by the state machine, so re-running
    a task whose submission already advanced is a no-op rather than an error.
    """
    identifier = uuid.UUID(submission_id)

    with SessionLocal() as db:
        submission = mark_processing(db, identifier)
        if submission.state == "verification_pending":
            submission = mark_ready_for_review(db, identifier)

        logger.info(
            "verification_prepared",
            extra={"submission_id": submission_id, "state": submission.state},
        )
        return {"status": submission.state}


def queue_verification_preparation(submission_id: uuid.UUID) -> str | None:
    return enqueue(prepare_verification, submission_id=str(submission_id))
