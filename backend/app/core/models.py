"""Reusable column mixins shared by every table."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, Integer, func, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, declared_attr, mapped_column


def allowed_values(enum_cls: type[StrEnum]) -> str:
    """Render an enum's values as a SQL IN-list body for CHECK constraints."""
    return ", ".join(f"'{member.value}'" for member in enum_cls)


class UUIDPrimaryKeyMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class SoftDeleteMixin:
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None


class ActorMixin:
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


class VersionMixin:
    """Optimistic concurrency.

    SQLAlchemy appends `AND version = <old>` to every UPDATE and raises
    `StaleDataError` when no row matches — so two editors cannot silently
    overwrite each other. The check happens in the database, not in Python,
    which is what makes it race-free.
    """

    version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default=text("1"),
    )

    @declared_attr.directive
    def __mapper_args__(cls) -> dict[str, object]:
        return {"version_id_col": cls.__table__.c.version}  # type: ignore[attr-defined]
