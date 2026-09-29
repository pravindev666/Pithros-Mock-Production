"""Single Celery application for all background work."""

from __future__ import annotations

import logging
from typing import Any

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

logger = logging.getLogger(__name__)

celery_app = Celery(
    "pithros",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.workers.tasks.media_tasks",
        "app.workers.tasks.maintenance_tasks",
        "app.verification.tasks",
        "app.workers.tasks.archive_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_max_tasks_per_child=200,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    task_always_eager=settings.celery_task_always_eager,
    task_eager_propagates=settings.celery_task_always_eager,
    task_store_eager_result=True,
    result_expires=3600,
    beat_schedule={
        "purge-expired-media-intents": {
            "task": "app.workers.tasks.media_tasks.purge_abandoned_uploads",
            "schedule": crontab(hour=3, minute=15),
        },
        "purge-expired-idempotency-keys": {
            "task": "app.workers.tasks.maintenance_tasks.purge_expired_idempotency_keys",
            "schedule": crontab(hour=3, minute=45),
        },
    },
)


def enqueue(task: Any, **kwargs: Any) -> str | None:
    """Queue a task without letting a broker outage break the request.

    Media uploads and other user actions must not fail because Redis is briefly
    unreachable; the work is simply retried or reconciled later.
    """
    try:
        result = task.delay(**kwargs)
        return str(result.id)
    except Exception:
        logger.exception("task_enqueue_failed", extra={"task": getattr(task, "name", str(task))})
        return None
