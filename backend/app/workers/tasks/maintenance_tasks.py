"""Housekeeping tasks.

Small, frequent, and safe to run twice — none of them should be the reason a
scheduled sweep needs human attention.
"""

from __future__ import annotations

import logging

from app.core.idempotency import purge_expired as purge_expired_idempotency_keys
from app.workers.base import RETRY_POLICY, RecordedTask
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.workers.tasks.maintenance_tasks.purge_expired_idempotency_keys",
    base=RecordedTask,
    **RETRY_POLICY,
)
def purge_idempotency_keys(batch: int = 1000) -> dict[str, int]:
    """Delete idempotency keys past their window.

    Without this the table grows without bound — one row per retryable write.
    """
    removed = purge_expired_idempotency_keys(batch=batch)
    logger.info("idempotency_keys_purged", extra={"removed": removed})
    return {"removed": removed}
