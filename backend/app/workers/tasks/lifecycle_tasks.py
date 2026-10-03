"""Scheduled lifecycle sweeps.

These close gaps where a state transition only had a manual trigger:

- subscriptions past their paid period are moved to EXPIRED_READ_ONLY (billing
  access only — never data deletion);
- account-deletion requests whose grace period has elapsed are executed;
- soft-deleted media past its recovery window is reaped from storage.

Each is idempotent and safe to run twice.
"""

from __future__ import annotations

import logging

from app.billing import service as billing_service
from app.core.database import SessionLocal
from app.media import service as media_service
from app.privacy import service as privacy_service
from app.workers.base import RETRY_POLICY, RecordedTask
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.workers.tasks.lifecycle_tasks.expire_due_subscriptions",
    base=RecordedTask,
    **RETRY_POLICY,
)
def expire_due_subscriptions_task(grace_days: int = 7) -> dict[str, int]:
    with SessionLocal() as db:
        expired = billing_service.expire_due_subscriptions(db, grace_days=grace_days)
    logger.info("subscriptions_expired", extra={"count": expired})
    return {"expired": expired}


@celery_app.task(
    name="app.workers.tasks.lifecycle_tasks.execute_due_account_deletions",
    base=RecordedTask,
    **RETRY_POLICY,
)
def execute_due_account_deletions_task() -> dict[str, int]:
    with SessionLocal() as db:
        executed = privacy_service.execute_due(db)
    logger.info("account_deletions_executed", extra={"count": len(executed)})
    return {"executed": len(executed)}


@celery_app.task(
    name="app.workers.tasks.lifecycle_tasks.purge_soft_deleted_media",
    base=RecordedTask,
    **RETRY_POLICY,
)
def purge_soft_deleted_media_task(older_than_days: int = 30) -> dict[str, int]:
    with SessionLocal() as db:
        result = media_service.purge_soft_deleted_media(db, older_than_days=older_than_days)
    logger.info("soft_deleted_media_purged", extra=result)
    return result
