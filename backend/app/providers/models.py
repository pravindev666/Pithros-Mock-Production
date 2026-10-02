"""Farewell Network domain: providers, their services, credentials and leads.

Four tables, each with a distinct lifetime:

* `providers` is the partner organisation and its current operational state
* `provider_services` is the catalogue the partner publishes
* `provider_verifications` is the credential review, one per provider
* `farewell_leads` is a family enquiry and where it got to

Documents and gallery images are not modelled here: they are ordinary
`memorial_media` rows owned by `provider_id`, so provider media reuses the same
storage, validation and lifecycle as memorial media. Only `approved` providers
are ever publicly visible, which is what gates their media too.
"""

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
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import LeadStatus, ProviderStatus, VerificationState
from app.core.models import (
    SoftDeleteMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    allowed_values,
)

_allowed = allowed_values


class Provider(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    """A Farewell Network partner organisation."""

    __tablename__ = "providers"
    __table_args__ = (
        CheckConstraint(f"status IN ({_allowed(ProviderStatus)})", name="status_valid"),
        CheckConstraint(
            f"verification_state IN ({_allowed(VerificationState)})",
            name="verification_state_valid",
        ),
        # The public directory scans approved rows by city/category.
        Index("ix_providers_status_city", "status", "city"),
        Index("ix_providers_status_category", "status", "category"),
    )

    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    slug: Mapped[str] = mapped_column(String(180), nullable=False, unique=True)
    business_name: Mapped[str] = mapped_column(String(200), nullable=False)
    contact_name: Mapped[str] = mapped_column(
        String(200), nullable=False, default="", server_default=text("''")
    )
    tagline: Mapped[str] = mapped_column(
        String(240), nullable=False, default="", server_default=text("''")
    )
    category: Mapped[str] = mapped_column(
        String(80), nullable=False, default="", server_default=text("''")
    )
    city: Mapped[str] = mapped_column(
        String(120), nullable=False, default="", server_default=text("''")
    )

    # Comma-separated so a small list needs no join table; the API returns a list.
    service_areas: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )
    description: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )

    phone: Mapped[str] = mapped_column(
        String(40), nullable=False, default="", server_default=text("''")
    )
    whatsapp: Mapped[str] = mapped_column(
        String(40), nullable=False, default="", server_default=text("''")
    )
    email: Mapped[str] = mapped_column(
        String(255), nullable=False, default="", server_default=text("''")
    )
    address: Mapped[str] = mapped_column(
        String(300), nullable=False, default="", server_default=text("''")
    )
    operating_hours: Mapped[str] = mapped_column(
        String(160), nullable=False, default="", server_default=text("''")
    )

    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=ProviderStatus.PENDING.value,
        server_default=text(f"'{ProviderStatus.PENDING.value}'"),
    )
    verification_state: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=VerificationState.DRAFT.value,
        server_default=text(f"'{VerificationState.DRAFT.value}'"),
    )
    status_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # A single cover/logo image, referenced by media id (no FK cascade here so a
    # gallery deletion never removes the provider; the service clears the pointer).
    logo_media_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), nullable=True)

    services: Mapped[list[ProviderService]] = relationship(
        back_populates="provider",
        cascade="all, delete-orphan",
        order_by="ProviderService.sort",
    )

    @property
    def service_area_list(self) -> list[str]:
        return [part.strip() for part in self.service_areas.split(",") if part.strip()]

    @property
    def is_publicly_visible(self) -> bool:
        return self.status == ProviderStatus.APPROVED.value and self.deleted_at is None

    def __repr__(self) -> str:
        return f"<Provider {self.id} slug={self.slug} status={self.status}>"


class ProviderService(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One entry in a partner's published catalogue."""

    __tablename__ = "provider_services"
    __table_args__ = (Index("ix_provider_services_provider", "provider_id", "sort"),)

    provider_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("providers.id", ondelete="CASCADE"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )
    price_note: Mapped[str] = mapped_column(
        String(120), nullable=False, default="", server_default=text("''")
    )
    estimated_time: Mapped[str] = mapped_column(
        String(80), nullable=False, default="", server_default=text("''")
    )
    # Newline-separated bullet list; the API returns a list.
    includes: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )
    active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))

    provider: Mapped[Provider] = relationship(back_populates="services")

    @property
    def include_list(self) -> list[str]:
        return [line.strip() for line in self.includes.splitlines() if line.strip()]

    def __repr__(self) -> str:
        return f"<ProviderService {self.id} name={self.name!r} active={self.active}>"


class ProviderVerification(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Credential review for a partner. One row per provider, updated in place.

    The decision history lives in the audit log rather than a parallel table:
    partner credentials turn over rarely, and an audit entry with actor and reason
    is the record that matters.
    """

    __tablename__ = "provider_verifications"
    __table_args__ = (
        CheckConstraint(f"state IN ({_allowed(VerificationState)})", name="state_valid"),
        Index("ix_provider_verifications_provider", "provider_id", "created_at"),
        # The admin queue scans by state across providers.
        Index("ix_provider_verifications_state", "state"),
    )

    provider_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("providers.id", ondelete="CASCADE"),
        nullable=False,
    )
    state: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=VerificationState.DRAFT.value,
        server_default=text(f"'{VerificationState.DRAFT.value}'"),
    )

    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    decision_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    provider: Mapped[Provider] = relationship()

    @property
    def current_state(self) -> VerificationState:
        return VerificationState(self.state)

    def __repr__(self) -> str:
        return f"<ProviderVerification {self.id} state={self.state}>"


class FarewellLead(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A family enquiry to a partner and its current status."""

    __tablename__ = "farewell_leads"
    __table_args__ = (
        CheckConstraint(f"status IN ({_allowed(LeadStatus)})", name="status_valid"),
        # The partner console lists its own leads, newest first, filtered by status.
        Index("ix_farewell_leads_provider_status", "provider_id", "status", "created_at"),
    )

    provider_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("providers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    service_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("provider_services.id", ondelete="SET NULL"),
        nullable=True,
    )
    family_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    memorial_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("memorials.id", ondelete="SET NULL"), nullable=True
    )

    contact_name: Mapped[str] = mapped_column(String(200), nullable=False)
    contact_phone: Mapped[str] = mapped_column(String(40), nullable=False)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str] = mapped_column(
        String(120), nullable=False, default="", server_default=text("''")
    )

    service_needed: Mapped[str] = mapped_column(String(240), nullable=False)
    message: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=text("''")
    )
    date_needed: Mapped[str | None] = mapped_column(String(40), nullable=True)
    urgency: Mapped[str] = mapped_column(
        String(60), nullable=False, default="", server_default=text("''")
    )

    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=LeadStatus.SUBMITTED.value,
        server_default=text(f"'{LeadStatus.SUBMITTED.value}'"),
    )
    quoted_amount: Mapped[str | None] = mapped_column(String(120), nullable=True)

    provider: Mapped[Provider] = relationship()

    def __repr__(self) -> str:
        return f"<FarewellLead {self.id} provider={self.provider_id} status={self.status}>"
