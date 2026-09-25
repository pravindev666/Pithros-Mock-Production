"""Memorial core: the memorial itself, its people, and its permission grants."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import (
    ContributorRole,
    ContributorStatus,
    MemorialPermission,
    MemorialTheme,
    PrivacyLevel,
    PublicationState,
    TimelineCategory,
    VerificationState,
)
from app.core.models import (
    SoftDeleteMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    VersionMixin,
    allowed_values,
)
from app.users.models import User

_allowed = allowed_values


class Memorial(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, VersionMixin, Base):
    __tablename__ = "memorials"
    __table_args__ = (
        CheckConstraint(f"privacy IN ({_allowed(PrivacyLevel)})", name="privacy_valid"),
        CheckConstraint(
            f"publication_state IN ({_allowed(PublicationState)})",
            name="publication_state_valid",
        ),
        CheckConstraint(
            f"verification_state IN ({_allowed(VerificationState)})",
            name="verification_state_valid",
        ),
        CheckConstraint(f"theme IN ({_allowed(MemorialTheme)})", name="theme_valid"),
        CheckConstraint(
            "completeness_percent >= 0 AND completeness_percent <= 100",
            name="completeness_percent_range",
        ),
        CheckConstraint("slug = lower(slug)", name="slug_lowercase"),
        Index(
            "ix_memorials_public_discovery",
            "publication_state",
            "privacy",
            "search_index_enabled",
        ),
    )

    slug: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    preferred_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    birth_date: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    death_date: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    birth_place: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    resting_place: Mapped[str | None] = mapped_column(String(200), nullable=True)

    short_epitaph: Mapped[str] = mapped_column(Text, nullable=False, default="")
    portrait_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    privacy: Mapped[str] = mapped_column(
        String(32), nullable=False, default=PrivacyLevel.PRIVATE.value
    )
    publication_state: Mapped[str] = mapped_column(
        String(32), nullable=False, default=PublicationState.DRAFT.value
    )
    verification_state: Mapped[str] = mapped_column(
        String(32), nullable=False, default=VerificationState.DRAFT.value
    )
    verification_badge_type: Mapped[str | None] = mapped_column(String(64), nullable=True)

    theme: Mapped[str] = mapped_column(
        String(32), nullable=False, default=MemorialTheme.CLASSIC.value
    )
    completeness_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    search_index_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    stewards: Mapped[list[MemorialSteward]] = relationship(
        back_populates="memorial",
        cascade="all, delete-orphan",
    )
    contributors: Mapped[list[MemorialContributor]] = relationship(
        back_populates="memorial",
        cascade="all, delete-orphan",
    )
    permission_grants: Mapped[list[MemorialPermissionGrant]] = relationship(
        back_populates="memorial",
        cascade="all, delete-orphan",
    )
    story: Mapped[Story | None] = relationship(
        back_populates="memorial",
        cascade="all, delete-orphan",
        uselist=False,
    )
    timeline_events: Mapped[list[TimelineEvent]] = relationship(
        back_populates="memorial",
        cascade="all, delete-orphan",
        order_by="TimelineEvent.sort_order",
    )
    legacy_links: Mapped[list[DigitalLegacyLink]] = relationship(
        back_populates="memorial",
        cascade="all, delete-orphan",
    )

    @property
    def is_published(self) -> bool:
        return self.publication_state == PublicationState.PUBLISHED

    @property
    def is_publicly_discoverable(self) -> bool:
        return (
            self.is_published
            and self.privacy == PrivacyLevel.PUBLIC
            and self.search_index_enabled
            and self.deleted_at is None
        )

    @property
    def primary_steward(self) -> MemorialSteward | None:
        for steward in self.stewards:
            if steward.is_primary:
                return steward
        return None

    def __repr__(self) -> str:
        return f"<Memorial {self.id} slug={self.slug!r} privacy={self.privacy}>"


class MemorialSteward(UUIDPrimaryKeyMixin, Base):
    """Ownership is a relation to users.id — never a name on the memorial row."""

    __tablename__ = "memorial_stewards"
    __table_args__ = (
        UniqueConstraint("memorial_id", "user_id", name="memorial_user"),
        # The composite above is (memorial_id, user_id), so it cannot serve a
        # lookup by user alone — which is exactly what every membership check does.
        Index("ix_memorial_stewards_user_id", "user_id"),
        Index(
            "uq_memorial_stewards_one_primary_per_memorial",
            "memorial_id",
            unique=True,
            postgresql_where=text("is_primary"),
        ),
    )

    memorial_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("memorials.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    memorial: Mapped[Memorial] = relationship(back_populates="stewards")
    user: Mapped[User] = relationship(back_populates="stewardships")

    def __repr__(self) -> str:
        return (
            f"<MemorialSteward memorial={self.memorial_id} "
            f"user={self.user_id} primary={self.is_primary}>"
        )


class MemorialContributor(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Invited family members. user_id stays null until the invite is accepted."""

    __tablename__ = "memorial_contributors"
    __table_args__ = (
        CheckConstraint(f"role IN ({_allowed(ContributorRole)})", name="role_valid"),
        CheckConstraint(f"status IN ({_allowed(ContributorStatus)})", name="status_valid"),
        CheckConstraint(
            "user_id IS NOT NULL OR invited_email IS NOT NULL",
            name="user_or_invited_email_present",
        ),
        Index("ix_memorial_contributors_invited_email", "invited_email"),
    )

    memorial_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("memorials.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    role: Mapped[str] = mapped_column(
        String(32), nullable=False, default=ContributorRole.VIEWER.value
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=ContributorStatus.INVITED.value
    )

    invited_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    invited_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    invitation_token_hash: Mapped[str | None] = mapped_column(
        String(128), nullable=True, index=True
    )
    invitation_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    relationship_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    memorial: Mapped[Memorial] = relationship(back_populates="contributors")
    user: Mapped[User | None] = relationship(
        back_populates="contributorships",
        foreign_keys=[user_id],
    )

    @property
    def is_active_member(self) -> bool:
        return self.status == ContributorStatus.ACTIVE and self.user_id is not None

    def __repr__(self) -> str:
        return (
            f"<MemorialContributor memorial={self.memorial_id} "
            f"role={self.role} status={self.status}>"
        )


class MemorialPermissionGrant(UUIDPrimaryKeyMixin, Base):
    """Explicit per-memorial, per-user permission beyond the role baseline."""

    __tablename__ = "memorial_permissions"
    __table_args__ = (
        CheckConstraint(
            f"permission IN ({_allowed(MemorialPermission)})",
            name="permission_valid",
        ),
        UniqueConstraint("memorial_id", "user_id", "permission", name="memorial_user_permission"),
        Index("ix_memorial_permissions_user", "user_id"),
    )

    memorial_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("memorials.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    permission: Mapped[str] = mapped_column(String(64), nullable=False)
    granted_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    memorial: Mapped[Memorial] = relationship(back_populates="permission_grants")


class Story(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "stories"

    memorial_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("memorials.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    overview: Mapped[str] = mapped_column(Text, nullable=False, default="")
    early_life: Mapped[str | None] = mapped_column(Text, nullable=True)
    passions_and_values: Mapped[str | None] = mapped_column(Text, nullable=True)
    enduring_legacy: Mapped[str | None] = mapped_column(Text, nullable=True)
    favorite_quotes: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)

    memorial: Mapped[Memorial] = relationship(back_populates="story")


class TimelineEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "timeline_events"
    __table_args__ = (
        CheckConstraint(
            f"category IS NULL OR category IN ({_allowed(TimelineCategory)})",
            name="category_valid",
        ),
    )

    memorial_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("memorials.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    year: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    date_str: Mapped[str | None] = mapped_column(String(64), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    media_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(32), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    memorial: Mapped[Memorial] = relationship(back_populates="timeline_events")


class DigitalLegacyLink(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "digital_legacy_links"
    __table_args__ = (
        CheckConstraint(
            "platform IN ('youtube', 'facebook', 'instagram', 'linkedin', 'website', 'other')",
            name="platform_valid",
        ),
    )

    memorial_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("memorials.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    platform: Mapped[str] = mapped_column(String(32), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    memorial: Mapped[Memorial] = relationship(back_populates="legacy_links")
