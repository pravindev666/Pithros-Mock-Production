"""Tributes. Never auto-approved — every submission passes moderation policy."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import TributeStatus
from app.core.models import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin, allowed_values

_allowed = allowed_values


class Tribute(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "tributes"
    __table_args__ = (
        CheckConstraint(f"status IN ({_allowed(TributeStatus)})", name="status_valid"),
        Index("ix_tributes_memorial_status", "memorial_id", "status"),
    )

    memorial_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("memorials.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    author_name: Mapped[str] = mapped_column(String(200), nullable=False)
    author_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    relationship: Mapped[str | None] = mapped_column(String(120), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=TributeStatus.PENDING_MODERATION.value
    )
    is_pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    submitted_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    moderated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    moderated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    moderation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    submitted_ip_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    @property
    def is_visible(self) -> bool:
        return self.status == TributeStatus.APPROVED and self.deleted_at is None
