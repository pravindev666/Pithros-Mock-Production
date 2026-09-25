"""Append-only audit trail for sensitive operations."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import AuditResult
from app.core.models import UUIDPrimaryKeyMixin, allowed_values

_allowed = allowed_values


class AuditLog(UUIDPrimaryKeyMixin, Base):
    """Written on every sensitive operation.

    The application only ever INSERTs here; there is no update or delete path.
    """

    __tablename__ = "audit_logs"
    __table_args__ = (
        CheckConstraint(f"result IN ({_allowed(AuditResult)})", name="result_valid"),
        Index("ix_audit_logs_entity", "entity", "entity_id"),
        Index("ix_audit_logs_actor_created", "actor_id", "created_at"),
        Index("ix_audit_logs_action_created", "action", "created_at"),
        # Admin audit filtering is almost always "this entity, newest first" or a
        # plain time range; neither was servable by the indexes above.
        Index("ix_audit_logs_entity_created", "entity", "created_at"),
        Index("ix_audit_logs_created_at", "created_at"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    actor_label: Mapped[str] = mapped_column(String(200), nullable=False, default="system")
    actor_role: Mapped[str] = mapped_column(String(64), nullable=False, default="system")

    action: Mapped[str] = mapped_column(String(64), nullable=False)
    entity: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    result: Mapped[str] = mapped_column(
        String(32), nullable=False, default=AuditResult.SUCCESS.value
    )
    detail: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    # Required by the audit specification: what changed, and why. Kept separate
    # from `detail` so a before/after diff is queryable rather than buried in prose.
    old_value: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    new_value: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ip_masked: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} entity={self.entity} result={self.result}>"
