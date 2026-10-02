"""Billing, subscriptions, plans, entitlements, payments, invoices and refunds models."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import (
    BillingInterval,
    InvoiceStatus,
    MemorialEntitlementStatus,
    PaymentStatus,
    PlanCode,
    RefundStatus,
    SponsorshipStatus,
    SubscriptionStatus,
    WebhookProcessingStatus,
)
from app.core.models import (
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    VersionMixin,
    allowed_values,
)
from app.memorials.models import Memorial
from app.users.models import User

_allowed = allowed_values


class Plan(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Product catalog: Memorial Care, Family Archive, Additional Memorial Slot."""

    __tablename__ = "plans"
    __table_args__ = (CheckConstraint(f"code IN ({_allowed(PlanCode)})", name="plan_code_valid"),)

    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    product_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )

    # Relationships
    prices: Mapped[list[PlanPrice]] = relationship(
        back_populates="plan", cascade="all, delete-orphan", order_by="PlanPrice.amount_minor"
    )
    subscriptions: Mapped[list[Subscription]] = relationship(back_populates="plan")


class PlanPrice(TimestampMixin, Base):
    """Immutable price snapshot with versioning, billing intervals, and savings display."""

    __tablename__ = "plan_prices"
    __table_args__ = (
        CheckConstraint(
            f"billing_interval IN ({_allowed(BillingInterval)})", name="billing_interval_valid"
        ),
        CheckConstraint("amount_minor > 0", name="amount_positive"),
        CheckConstraint("interval_count > 0", name="interval_count_positive"),
    )

    # Human-meaningful slug ID as specified in PRD (e.g. memorial_care_annual_v1)
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    billing_interval: Mapped[str] = mapped_column(String(32), nullable=False)
    interval_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    amount_minor: Mapped[int] = mapped_column(
        Integer, nullable=False
    )  # Amount in paise (e.g. 99900 = ₹999.00)
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="INR", server_default=text("'INR'")
    )
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )
    active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    is_primary: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    savings_copy: Mapped[str | None] = mapped_column(String(255), nullable=True)
    monthly_equivalent_minor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    valid_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    plan: Mapped[Plan] = relationship(back_populates="prices")
    subscriptions: Mapped[list[Subscription]] = relationship(back_populates="price")


class BillingAccount(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Billing entity owning subscriptions and payment instruments.
    1-to-1 default with User in V1, ready for family accounts and organizations.
    """

    __tablename__ = "billing_accounts"

    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
        index=True,
    )
    billing_email: Mapped[str] = mapped_column(String(255), nullable=False)
    billing_name: Mapped[str] = mapped_column(String(255), nullable=False)
    country: Mapped[str] = mapped_column(
        String(2), nullable=False, default="IN", server_default=text("'IN'")
    )
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="INR", server_default=text("'INR'")
    )
    tax_profile_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="active", server_default=text("'active'")
    )

    # Relationships
    owner_user: Mapped[User] = relationship()
    subscriptions: Mapped[list[Subscription]] = relationship(
        back_populates="billing_account", cascade="all, delete-orphan"
    )
    memorial_entitlements: Mapped[list[MemorialEntitlement]] = relationship(
        back_populates="billing_account", cascade="all, delete-orphan"
    )
    payments: Mapped[list[Payment]] = relationship(back_populates="billing_account")
    invoices: Mapped[list[Invoice]] = relationship(back_populates="billing_account")


class Subscription(UUIDPrimaryKeyMixin, TimestampMixin, VersionMixin, Base):
    """Recurring subscription contract governed by the PITHROS state machine."""

    __tablename__ = "subscriptions"
    __table_args__ = (
        CheckConstraint(
            f"status IN ({_allowed(SubscriptionStatus)})", name="subscription_status_valid"
        ),
        Index("ix_subscriptions_billing_status", "billing_account_id", "status"),
    )

    billing_account_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("billing_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("plans.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    price_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("plan_prices.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=SubscriptionStatus.PENDING,
        index=True,
    )
    gateway: Mapped[str] = mapped_column(
        String(32), nullable=False, default="cashfree", server_default=text("'cashfree'")
    )
    gateway_subscription_id: Mapped[str | None] = mapped_column(
        String(128), nullable=True, index=True
    )
    gateway_schedule_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    current_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_period_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    auto_renew: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    grace_period_start: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    grace_period_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cancel_at_period_end: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    billing_account: Mapped[BillingAccount] = relationship(back_populates="subscriptions")
    plan: Mapped[Plan] = relationship(back_populates="subscriptions")
    price: Mapped[PlanPrice] = relationship(back_populates="subscriptions")
    entitlements: Mapped[SubscriptionEntitlement | None] = relationship(
        back_populates="subscription", uselist=False, cascade="all, delete-orphan"
    )
    memorial_slots: Mapped[list[MemorialEntitlement]] = relationship(
        back_populates="subscription", cascade="all, delete-orphan"
    )
    payments: Mapped[list[Payment]] = relationship(back_populates="subscription")
    invoices: Mapped[list[Invoice]] = relationship(back_populates="subscription")


class SubscriptionEntitlement(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Numeric limits and feature toggles unlocked by an active subscription."""

    __tablename__ = "subscription_entitlements"

    subscription_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    max_memorials: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    max_photos: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    max_media_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=300 * 1024 * 1024,
        server_default=text("1073741824"),
    )  # 300 MB applied by the service; DB fallback 1 GB
    max_file_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=10 * 1024 * 1024,
        server_default=text("10485760"),
    )  # 10 MB per file
    max_video_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)  # Roadmap
    max_audio_bytes: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=100 * 1024 * 1024
    )  # 100 MB (~60 minutes audio)
    max_audio_file_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=50 * 1024 * 1024,
        server_default=text("52428800"),
    )  # 50 MB per audio file
    max_documents: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    max_contributors: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    max_timeline_events: Mapped[int] = mapped_column(
        Integer, nullable=False, default=50, server_default=text("50")
    )
    max_daily_upload_attempts: Mapped[int] = mapped_column(
        Integer, nullable=False, default=50, server_default=text("50")
    )
    verification_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    archive_export_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    anniversary_notifications_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    legacy_links_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    premium_theme_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )

    # Relationships
    subscription: Mapped[Subscription] = relationship(back_populates="entitlements")


class MemorialEntitlement(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Slot-based mapping between subscription capacity and memorials.
    Separates subscription ownership from individual memorial identities.
    """

    __tablename__ = "memorial_entitlements"
    __table_args__ = (
        CheckConstraint(
            f"status IN ({_allowed(MemorialEntitlementStatus)})",
            name="memorial_entitlement_status_valid",
        ),
        UniqueConstraint("subscription_id", "slot_number", name="uq_subscription_slot_number"),
        Index("ix_memorial_entitlement_active", "memorial_id", "status"),
    )

    billing_account_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("billing_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subscription_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    memorial_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("memorials.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    slot_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=MemorialEntitlementStatus.ASSIGNED,
        server_default=text("'assigned'"),
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    billing_account: Mapped[BillingAccount] = relationship(back_populates="memorial_entitlements")
    subscription: Mapped[Subscription] = relationship(back_populates="memorial_slots")
    memorial: Mapped[Memorial] = relationship()


class Payment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Immutable ledger of payment attempts, successes, and gateway metadata."""

    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint(f"status IN ({_allowed(PaymentStatus)})", name="payment_status_valid"),
    )

    billing_account_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("billing_accounts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    plan_price_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("plan_prices.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    memorial_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("memorials.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    internal_order_id: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )
    gateway: Mapped[str] = mapped_column(
        String(32), nullable=False, default="cashfree", server_default=text("'cashfree'")
    )
    gateway_order_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    gateway_payment_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="INR", server_default=text("'INR'")
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=PaymentStatus.PENDING, index=True
    )
    payment_method_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    payment_method_masked: Mapped[str | None] = mapped_column(String(64), nullable=True)
    failure_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    billing_account: Mapped[BillingAccount] = relationship(back_populates="payments")
    subscription: Mapped[Subscription | None] = relationship(back_populates="payments")
    price: Mapped[PlanPrice] = relationship()
    memorial: Mapped[Memorial | None] = relationship()
    invoices: Mapped[list[Invoice]] = relationship(back_populates="payment")
    refunds: Mapped[list[Refund]] = relationship(back_populates="payment")


class Invoice(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Official tax and accounting invoice record. Immutable once finalized."""

    __tablename__ = "invoices"
    __table_args__ = (
        CheckConstraint(f"status IN ({_allowed(InvoiceStatus)})", name="invoice_status_valid"),
    )

    billing_account_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("billing_accounts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    payment_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("payments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    invoice_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    tax_minor: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    total_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="INR", server_default=text("'INR'")
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=InvoiceStatus.PAID, server_default=text("'paid'")
    )
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pdf_object_key: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Relationships
    billing_account: Mapped[BillingAccount] = relationship(back_populates="invoices")
    subscription: Mapped[Subscription | None] = relationship(back_populates="invoices")
    payment: Mapped[Payment | None] = relationship(back_populates="invoices")


class Refund(UUIDPrimaryKeyMixin, Base):
    """Refund record linking gateway transaction to internal audit trail."""

    __tablename__ = "refunds"
    __table_args__ = (
        CheckConstraint(f"status IN ({_allowed(RefundStatus)})", name="refund_status_valid"),
    )

    payment_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("payments.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    gateway_refund_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="INR", server_default=text("'INR'")
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=RefundStatus.PENDING, server_default=text("'pending'")
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    requested_by: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    payment: Mapped[Payment] = relationship(back_populates="refunds")


class WebhookEvent(UUIDPrimaryKeyMixin, Base):
    """Idempotent audit record of all gateway webhook deliveries and execution outcomes."""

    __tablename__ = "webhook_events"
    __table_args__ = (
        CheckConstraint(
            f"processing_status IN ({_allowed(WebhookProcessingStatus)})",
            name="webhook_processing_status_valid",
        ),
    )

    gateway: Mapped[str] = mapped_column(
        String(32), nullable=False, default="cashfree", server_default=text("'cashfree'")
    )
    event_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    signature_valid: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    processing_status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=WebhookProcessingStatus.RECEIVED,
        server_default=text("'received'"),
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    retry_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)


class SponsorshipLink(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Family sponsorship link allowing any family member to pay for Memorial Care."""

    __tablename__ = "sponsorship_links"
    __table_args__ = (
        CheckConstraint(
            f"status IN ({_allowed(SponsorshipStatus)})", name="sponsorship_status_valid"
        ),
    )

    memorial_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("memorials.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    plan_price_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("plan_prices.id", ondelete="RESTRICT"),
        nullable=False,
    )
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=SponsorshipStatus.ACTIVE,
        server_default=text("'active'"),
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    redeemed_by_billing_account_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("billing_accounts.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    memorial: Mapped[Memorial] = relationship()
    price: Mapped[PlanPrice] = relationship()
