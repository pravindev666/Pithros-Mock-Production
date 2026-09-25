"""User accounts. Identity comes from Firebase; Pithros owns the profile and role."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import AdminSubRole, UserRole, UserStatus
from app.core.models import (
    SoftDeleteMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    allowed_values,
)

if TYPE_CHECKING:
    from app.memorials.models import MemorialContributor, MemorialSteward

_allowed = allowed_values


class User(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(f"role IN ({_allowed(UserRole)})", name="role_valid"),
        CheckConstraint(
            f"admin_subrole IS NULL OR admin_subrole IN ({_allowed(AdminSubRole)})",
            name="admin_subrole_valid",
        ),
        CheckConstraint(f"status IN ({_allowed(UserStatus)})", name="status_valid"),
        CheckConstraint("email = lower(email)", name="email_lowercase"),
        Index("ix_users_role", "role"),
    )

    firebase_uid: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)

    role: Mapped[str] = mapped_column(String(32), nullable=False, default=UserRole.VISITOR.value)
    admin_subrole: Mapped[str | None] = mapped_column(String(32), nullable=True)

    avatar: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)

    status: Mapped[str] = mapped_column(String(32), nullable=False, default=UserStatus.ACTIVE.value)
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    phone_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    stewardships: Mapped[list[MemorialSteward]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    contributorships: Mapped[list[MemorialContributor]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        # MemorialContributor points at users twice (member, and inviter), so the
        # join column has to be named explicitly.
        foreign_keys="MemorialContributor.user_id",
    )

    @property
    def is_active(self) -> bool:
        return self.status == UserStatus.ACTIVE and self.deleted_at is None

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN

    def __repr__(self) -> str:
        return f"<User {self.id} {self.email!r} role={self.role}>"
