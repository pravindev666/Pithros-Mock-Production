"""Remembrance offerings. Real rows — never a client-side counter."""

from __future__ import annotations

import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import OfferingType
from app.core.models import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin, allowed_values

_allowed = allowed_values


class Offering(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "offerings"
    __table_args__ = (
        CheckConstraint(f"offering_type IN ({_allowed(OfferingType)})", name="offering_type_valid"),
        Index("ix_offerings_memorial_type", "memorial_id", "offering_type"),
    )

    memorial_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("memorials.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    offering_type: Mapped[str] = mapped_column(String(32), nullable=False)
    sender_name: Mapped[str] = mapped_column(String(200), nullable=False, default="Anonymous")
    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    sender_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    submitted_ip_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
