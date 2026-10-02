"""Account-deletion lifecycle records.

A request carries the state machine; a disposition carries the decision for each
memorial whose only steward is leaving. Both are append-honest: states only move
forward, and cancellation is recorded rather than erasing the attempt.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import DeletionStatus, DispositionStatus, MemorialDisposition
from app.core.models import TimestampMixin, UUIDPrimaryKeyMixin, allowed_values

if TYPE_CHECKING:
    from app.memorials.models import Memorial

_allowed = allowed_values


class AccountDeletionRequest(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "account_deletion_requests"
    __table_args__ = (
        CheckConstraint(f"status IN ({_allowed(DeletionStatus)})", name="deletion_status_valid"),
        Index("ix_account_deletion_user_status", "user_id", "status"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=DeletionStatus.REQUESTED.value,
        server_default=text(f"'{DeletionStatus.REQUESTED.value}'"),
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    executed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    dispositions: Mapped[list[MemorialDispositionEntry]] = relationship(
        back_populates="request",
        cascade="all, delete-orphan",
    )


class MemorialDispositionEntry(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "memorial_dispositions"
    __table_args__ = (
        UniqueConstraint(
            "deletion_request_id",
            "memorial_id",
            name="uq_memorial_disposition_request_memorial",
        ),
        CheckConstraint(
            f"disposition IN ({_allowed(MemorialDisposition)})", name="disposition_valid"
        ),
        CheckConstraint(
            f"status IN ({_allowed(DispositionStatus)})", name="disposition_status_valid"
        ),
    )

    deletion_request_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(
            "account_deletion_requests.id",
            ondelete="CASCADE",
            # The convention-generated name would exceed Postgres's 63-character
            # identifier limit, so it is spelled out here and in the migration.
            name="fk_memorial_dispositions_request",
        ),
        nullable=False,
        index=True,
    )
    memorial_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("memorials.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    disposition: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default=DispositionStatus.PENDING.value,
        server_default=text(f"'{DispositionStatus.PENDING.value}'"),
    )
    successor_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    request: Mapped[AccountDeletionRequest] = relationship(back_populates="dispositions")
    memorial: Mapped[Memorial] = relationship()
