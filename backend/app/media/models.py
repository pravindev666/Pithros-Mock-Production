"""Uploaded memorial media. Bytes live in object storage; this table is the index."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import MediaKind, MediaStatus, PrivacyLevel, StorageTier
from app.core.models import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin, allowed_values
from app.memorials.models import Memorial
from app.users.models import User

_allowed = allowed_values


class MediaItem(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "memorial_media"
    __table_args__ = (
        CheckConstraint(f"kind IN ({_allowed(MediaKind)})", name="kind_valid"),
        CheckConstraint(f"status IN ({_allowed(MediaStatus)})", name="status_valid"),
        CheckConstraint(f"privacy IN ({_allowed(PrivacyLevel)})", name="privacy_valid"),
        CheckConstraint(f"storage_tier IN ({_allowed(StorageTier)})", name="storage_tier_valid"),
        CheckConstraint("size_bytes >= 0", name="size_non_negative"),
        # A media row belongs to exactly one owner: a memorial or a Farewell
        # Network provider. Never both, never neither.
        CheckConstraint(
            "(memorial_id IS NOT NULL AND provider_id IS NULL) "
            "OR (memorial_id IS NULL AND provider_id IS NOT NULL)",
            name="exactly_one_owner",
        ),
        Index("ix_memorial_media_memorial_status", "memorial_id", "status"),
        Index("ix_memorial_media_provider_status", "provider_id", "status"),
    )

    memorial_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("memorials.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Farewell Network gallery/verification objects. Nullable for memorial media.
    provider_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("providers.id", ondelete="CASCADE"),
        nullable=True,
    )

    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=MediaStatus.PENDING.value
    )
    privacy: Mapped[str] = mapped_column(
        String(32), nullable=False, default=PrivacyLevel.PRIVATE.value
    )
    storage_tier: Mapped[str] = mapped_column(String(32), nullable=False)

    storage_bucket: Mapped[str] = mapped_column(String(128), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
    thumbnail_key: Mapped[str | None] = mapped_column(String(512), nullable=True)

    original_filename: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    checksum_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)

    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    year: Mapped[str | None] = mapped_column(String(16), nullable=True)

    uploaded_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Three FK paths now link memorials and memorial_media (ownership plus the
    # portrait/cover references), so the join column must be stated explicitly.
    # Provider media is queried by `provider_id` directly; no relationship is
    # declared here to avoid an import cycle with the provider module.
    memorial: Mapped[Memorial | None] = relationship(foreign_keys="MediaItem.memorial_id")
    uploaded_by: Mapped[User | None] = relationship()

    @property
    def is_public(self) -> bool:
        return (
            self.privacy == PrivacyLevel.PUBLIC
            and self.status == MediaStatus.READY
            and self.deleted_at is None
        )

    def __repr__(self) -> str:
        return f"<MediaItem {self.id} kind={self.kind} status={self.status}>"
