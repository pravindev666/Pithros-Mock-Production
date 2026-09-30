"""Pydantic schemas for the PITHROS billing system."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PlanPriceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    billing_interval: str = Field(alias="billingInterval")
    interval_count: int = Field(alias="intervalCount")
    amount_minor: int = Field(alias="amountMinor")
    currency: str
    is_primary: bool = Field(alias="isPrimary")
    savings_copy: str | None = Field(default=None, alias="savingsCopy")
    monthly_equivalent_minor: int | None = Field(default=None, alias="monthlyEquivalentMinor")


class PlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    code: str
    name: str
    description: str
    product_type: str = Field(alias="productType")
    prices: list[PlanPriceRead] = []


class FreeTierSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    max_memorials: int = Field(alias="maxMemorials")
    max_photos: int = Field(alias="maxPhotos")
    max_media_bytes: int = Field(alias="maxMediaBytes")
    max_file_bytes: int = Field(alias="maxFileBytes")
    max_video_bytes: int = Field(alias="maxVideoBytes")
    max_audio_bytes: int = Field(alias="maxAudioBytes")
    max_audio_file_bytes: int = Field(default=0, alias="maxAudioFileBytes")
    max_contributors: int = Field(alias="maxContributors")
    max_timeline_events: int = Field(alias="maxTimelineEvents")
    max_daily_upload_attempts: int = Field(default=10, alias="maxDailyUploadAttempts")
    archive_export_enabled: bool = Field(alias="archiveExportEnabled")


class PricingCatalogResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    plans: list[PlanRead]
    free_tier: FreeTierSummary = Field(alias="freeTier")


class BillingAccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    billing_email: str = Field(alias="billingEmail")
    billing_name: str = Field(alias="billingName")
    country: str
    currency: str
    status: str


class CreateOrderRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    plan_price_id: str = Field(alias="planPriceId")
    memorial_id: uuid.UUID | None = Field(default=None, alias="memorialId")
    sponsorship_token: str | None = Field(default=None, alias="sponsorshipToken")


class CreateOrderResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    internal_order_id: str = Field(alias="internalOrderId")
    amount_minor: int = Field(alias="amountMinor")
    currency: str
    plan_name: str = Field(alias="planName")
    plan_code: str = Field(alias="planCode")
    price_id: str = Field(alias="priceId")
    gateway: str
    gateway_order_id: str | None = Field(default=None, alias="gatewayOrderId")
    payment_session_id: str | None = Field(default=None, alias="paymentSessionId")
    environment: str


class VerifyPaymentRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    internal_order_id: str = Field(alias="internalOrderId")
    gateway_payment_id: str | None = Field(default=None, alias="gatewayPaymentId")
    gateway_order_id: str | None = Field(default=None, alias="gatewayOrderId")
    payment_method_type: str | None = Field(default=None, alias="paymentMethodType")


class VerifyPaymentResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    success: bool
    subscription_id: uuid.UUID = Field(alias="subscriptionId")
    status: str
    current_period_end: datetime = Field(alias="currentPeriodEnd")
    assigned_memorial_id: uuid.UUID | None = Field(default=None, alias="assignedMemorialId")
    invoice_number: str | None = Field(default=None, alias="invoiceNumber")


class MemorialSlotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    slot_number: int = Field(alias="slotNumber")
    memorial_id: uuid.UUID = Field(alias="memorialId")
    status: str
    assigned_at: datetime = Field(alias="assignedAt")


class SubscriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    plan_id: uuid.UUID = Field(alias="planId")
    plan_name: str = Field(alias="planName")
    plan_code: str = Field(alias="planCode")
    price_id: str = Field(alias="priceId")
    status: str
    current_period_start: datetime = Field(alias="currentPeriodStart")
    current_period_end: datetime = Field(alias="currentPeriodEnd")
    auto_renew: bool = Field(alias="autoRenew")
    cancel_at_period_end: bool = Field(alias="cancelAtPeriodEnd")
    max_memorials: int = Field(alias="maxMemorials")
    slots: list[MemorialSlotRead] = []


class AssignSlotRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    memorial_id: uuid.UUID = Field(alias="memorialId")


class CreateSponsorshipRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    memorial_id: uuid.UUID = Field(alias="memorialId")
    plan_price_id: str = Field(alias="planPriceId")


class SponsorshipResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    token: str
    shareable_url: str = Field(alias="shareableUrl")
    memorial_id: uuid.UUID = Field(alias="memorialId")
    plan_name: str = Field(alias="planName")
    amount_minor: int = Field(alias="amountMinor")
    currency: str
    expires_at: datetime = Field(alias="expiresAt")


class InvoiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    invoice_number: str = Field(alias="invoiceNumber")
    amount_minor: int = Field(alias="amountMinor")
    tax_minor: int = Field(alias="taxMinor")
    total_minor: int = Field(alias="totalMinor")
    currency: str
    status: str
    issued_at: datetime = Field(alias="issuedAt")
    paid_at: datetime | None = Field(default=None, alias="paidAt")
