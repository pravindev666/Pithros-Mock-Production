"""Background-task bookkeeping.

`task_failures` is the dead-letter record the worker had none of. With
`acks_late` and `task_reject_on_worker_lost` enabled, a task that exhausts its
retries is otherwise dropped silently — the exception reaches the log and nothing
else. Recording it makes failures countable, queryable, and recoverable.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.models import UUIDPrimaryKeyMixin


class TaskFailure(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "task_failures"
    __table_args__ = (
        Index("ix_task_failures_task_name_created", "task_name", "created_at"),
        Index("ix_task_failures_unresolved", "resolved_at"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    task_name: Mapped[str] = mapped_column(String(200), nullable=False)
    task_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    args: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    error: Mapped[str] = mapped_column(Text, nullable=False)
    error_class: Mapped[str | None] = mapped_column(String(120), nullable=True)
    retries: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<TaskFailure {self.task_name} retries={self.retries}>"
