"""Verification submissions, their evidence, and the decisions taken on them.

Three tables rather than one because they have genuinely different lifetimes:

* a submission is the request and its current state
* evidence points at uploaded documents in the sensitive storage tier
* decisions are an append-only history — who decided what, when, and why

Nothing here presents itself as legal certification. Automated processing (OCR,
field extraction) is deferred; the state machine and human review are real.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import (
    VerificationDecision,
    VerificationDocumentType,
    VerificationState,
)
from app.core.models import TimestampMixin, UUIDPrimaryKeyMixin, allowed_values

_allowed = allowed_values

_CURRENT_STATES = ", ".join(f"'{state.value}'" for state in VerificationState)


class VerificationSubmission(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "verification_submissions"
    __table_args__ = (
        CheckConstraint(f"state IN ({_CURRENT_STATES})", name="state_valid"),
        Index("ix_verification_submissions_memorial", "memorial_id", "created_at"),
        # The reviewer queue scans by state across memorials.
        Index("ix_verification_submissions_state", "state"),
    )

    memorial_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("memorials.id", ondelete="CASCADE"),
        nullable=False,
        # No standalone index: `ix_verification_submissions_memorial` already
        # covers memorial_id as its leading column.
    )

    state: Mapped[str] = mapped_column(
        String(32), nullable=False, default=VerificationState.DRAFT.value
    )

    submitted_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    decision_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Reserved for the deferred automated pass. Recorded, never presented as a
    # legal conclusion.
    automated_result: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    risk_signals: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    evidence: Mapped[list[VerificationEvidence]] = relationship(
        back_populates="submission",
        cascade="all, delete-orphan",
    )
    decisions: Mapped[list[VerificationDecisionRecord]] = relationship(
        back_populates="submission",
        cascade="all, delete-orphan",
    )

    @property
    def current_state(self) -> VerificationState:
        return VerificationState(self.state)

    def __repr__(self) -> str:
        return f"<VerificationSubmission {self.id} state={self.state}>"


class VerificationEvidence(UUIDPrimaryKeyMixin, Base):
    """A document attached to a submission.

    Deliberately points at `memorial_media` rather than duplicating storage
    handling: documents already land in the sensitive tier through the media
    pipeline, and that path is tested.
    """

    __tablename__ = "verification_evidence"
    __table_args__ = (
        CheckConstraint(
            f"document_type IN ({_allowed(VerificationDocumentType)})",
            name="document_type_valid",
        ),
        Index("ix_verification_evidence_submission", "submission_id"),
    )

    submission_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("verification_submissions.id", ondelete="CASCADE"),
        nullable=False,
    )
    media_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("memorial_media.id", ondelete="CASCADE"),
        nullable=False,
    )

    document_type: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str | None] = mapped_column(String(200), nullable=True)
    uploaded_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    submission: Mapped[VerificationSubmission] = relationship(back_populates="evidence")


class VerificationDecisionRecord(UUIDPrimaryKeyMixin, Base):
    """Append-only. A decision is never edited, only superseded by a later one."""

    __tablename__ = "verification_decisions"
    __table_args__ = (
        CheckConstraint(f"decision IN ({_allowed(VerificationDecision)})", name="decision_valid"),
        Index("ix_verification_decisions_submission", "submission_id", "created_at"),
    )

    submission_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("verification_submissions.id", ondelete="CASCADE"),
        nullable=False,
    )

    decision: Mapped[str] = mapped_column(String(32), nullable=False)
    previous_state: Mapped[str] = mapped_column(String(32), nullable=False)
    new_state: Mapped[str] = mapped_column(String(32), nullable=False)

    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewer_label: Mapped[str] = mapped_column(String(200), nullable=False, default="system")
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    submission: Mapped[VerificationSubmission] = relationship(back_populates="decisions")
