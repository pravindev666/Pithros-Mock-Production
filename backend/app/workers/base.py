"""Celery task base class and failure recording.

With `acks_late` and `task_reject_on_worker_lost` enabled, a task that exhausts
its retries is dropped — the exception reaches the log and nothing else. There was
no dead-letter record at all, so a failed archive export or media job simply
vanished. `RecordedTask` writes it down.
"""

from __future__ import annotations

import logging
from typing import Any

from celery import Task

from app.core.database import SessionLocal
from app.workers.models import TaskFailure

logger = logging.getLogger(__name__)

# Applied to every task: exponential backoff with jitter so a burst of retries
# from many workers does not hit a recovering dependency in lockstep.
RETRY_POLICY: dict[str, Any] = {
    "autoretry_for": (Exception,),
    "retry_backoff": True,
    "retry_backoff_max": 600,
    "retry_jitter": True,
    "max_retries": 3,
}


def record_task_failure(
    *,
    task_name: str,
    task_id: str | None,
    kwargs: dict[str, Any],
    exc: BaseException,
    retries: int,
) -> None:
    """Persist a task failure. Never raises — it runs inside failure handling."""
    try:
        with SessionLocal() as db:
            db.add(
                TaskFailure(
                    task_name=task_name,
                    task_id=task_id,
                    args={k: str(v) for k, v in kwargs.items()},
                    error=str(exc)[:4000],
                    error_class=type(exc).__name__,
                    retries=retries,
                )
            )
            db.commit()
    except Exception:
        # A failure to record a failure must not mask the original error.
        logger.exception("task_failure_record_failed", extra={"task": task_name})


class RecordedTask(Task):
    """Base task that leaves a queryable trail when it gives up."""

    def on_failure(
        self,
        exc: BaseException,
        task_id: str,
        args: tuple[Any, ...],
        kwargs: dict[str, Any],
        einfo: Any,
    ) -> None:
        record_task_failure(
            task_name=self.name,
            task_id=task_id,
            kwargs=kwargs,
            exc=exc,
            retries=getattr(self.request, "retries", 0) or 0,
        )
        super().on_failure(exc, task_id, args, kwargs, einfo)
