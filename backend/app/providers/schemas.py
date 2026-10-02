"""Wire schemas for the Farewell Network.

Two vocabularies on purpose: the partner console and the public/family view were
built against different shapes, and both keep their existing contract. The stored
lead status is canonical; the mappers translate on the way out.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.core.enums import LeadStatus, MediaKind, ProviderStatus, VerificationState
from app.core.schemas import CamelModel, StrictModel

# ─── Partner-facing: profile and services ───────────────────────────────────


class ProviderProfileUpdate(StrictModel):
    business_name: str | None = Field(default=None, min_length=1, max_length=200)
    contact_name: str | None = Field(default=None, max_length=200)
    tagline: str | None = Field(default=None, max_length=240)
    category: str | None = Field(default=None, max_length=80)
    city: str | None = Field(default=None, max_length=120)
    service_areas: list[str] | None = None
    description: str | None = Field(default=None, max_length=4000)
    phone: str | None = Field(default=None, max_length=40)
    whatsapp: str | None = Field(default=None, max_length=40)
    email: str | None = Field(default=None, max_length=255)
    address: str | None = Field(default=None, max_length=300)
    operating_hours: str | None = Field(default=None, max_length=160)
    logo_media_id: str | None = None


class ProviderServiceIn(StrictModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    price_note: str = Field(default="", max_length=120)
    estimated_time: str = Field(default="", max_length=80)
    includes: list[str] = Field(default_factory=list)
    active: bool = True
    sort: int = 0


class ProviderServiceUpdate(StrictModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    price_note: str | None = Field(default=None, max_length=120)
    estimated_time: str | None = Field(default=None, max_length=80)
    includes: list[str] | None = None
    active: bool | None = None
    sort: int | None = None


class ProviderServiceOut(CamelModel):
    id: str
    name: str
    description: str = ""
    price_note: str = ""
    estimated_time: str = ""
    includes: list[str] = Field(default_factory=list)
    active: bool = True
    sort: int = 0


class ProviderMediaIntentIn(StrictModel):
    """Gallery photo or credential document upload intent."""

    filename: str = Field(min_length=1, max_length=255)
    content_type: str | None = Field(default=None, max_length=128)
    size_bytes: int | None = Field(default=None, ge=0)
    kind: MediaKind = MediaKind.PHOTO
    title: str = Field(default="", max_length=200)


class ProviderMediaOut(CamelModel):
    id: str
    url: str
    title: str = ""
    status: str
    created_at: datetime


class ProviderVerificationOut(CamelModel):
    state: str
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    decision_reason: str | None = None
    documents: list[ProviderMediaOut] = Field(default_factory=list)


class ProviderProfileOut(CamelModel):
    id: str
    slug: str
    business_name: str
    contact_name: str = ""
    tagline: str = ""
    category: str = ""
    city: str = ""
    service_areas: list[str] = Field(default_factory=list)
    description: str = ""
    phone: str = ""
    whatsapp: str = ""
    email: str = ""
    address: str = ""
    operating_hours: str = ""
    status: str
    verification_state: str
    status_reason: str | None = None
    logo_url: str | None = None
    photos: list[ProviderMediaOut] = Field(default_factory=list)
    services: list[ProviderServiceOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ProviderSubmitOut(CamelModel):
    state: str
    message: str


# ─── Partner-facing: leads ──────────────────────────────────────────────────


class PartnerLeadOut(CamelModel):
    id: str
    provider_id: str
    provider_name: str
    service_category: str
    requester_name: str
    phone: str
    email: str | None = None
    city: str = ""
    date_needed: str | None = None
    urgency: str = ""
    description: str = ""
    status: str
    quoted_amount: str | None = None
    created_at: datetime
    updated_at: datetime


class LeadStatusUpdate(StrictModel):
    status: str = Field(min_length=1, max_length=40)
    quoted_amount: str | None = Field(default=None, max_length=120)


class LeadListOut(CamelModel):
    leads: list[PartnerLeadOut] = Field(default_factory=list)
    total: int = 0


# ─── Public-facing: discovery and enquiries ─────────────────────────────────


class PublicProviderServiceOut(CamelModel):
    id: str
    name: str
    starting_price: str = ""
    description: str = ""
    estimated_time: str = ""
    included: list[str] = Field(default_factory=list)


class PublicProviderOut(CamelModel):
    """Matches the existing `ServiceProvider` frontend contract exactly.

    Fields with no backend source (rating, reviewCount, reviews, faqs) are
    returned as honest empties rather than invented values — the interface hides
    those sections when there is nothing real to show.
    """

    id: str
    slug: str
    name: str = ""
    business_name: str
    tagline: str = ""
    category: str = ""
    city: str = ""
    service_areas: list[str] = Field(default_factory=list)
    rating: float = 0.0
    review_count: int = 0
    response_time: str = ""
    phone: str = ""
    whatsapp: str = ""
    verified_badges: list[str] = Field(default_factory=list)
    description: str = ""
    photo_url: str = ""
    logo_url: str | None = None
    starting_price: str = ""
    operating_hours: str = ""
    photos: list[str] = Field(default_factory=list)
    services: list[PublicProviderServiceOut] = Field(default_factory=list)
    reviews: list[dict] = Field(default_factory=list)
    rating_distribution: dict[str, int] = Field(default_factory=dict)
    faqs: list[dict] = Field(default_factory=list)
    address: str = ""


class PublicProviderListOut(CamelModel):
    providers: list[PublicProviderOut] = Field(default_factory=list)
    total: int = 0


class LeadCreateIn(StrictModel):
    contact_name: str = Field(min_length=1, max_length=200)
    contact_phone: str = Field(min_length=3, max_length=40)
    contact_email: str | None = Field(default=None, max_length=255)
    city: str = Field(default="", max_length=120)
    service_needed: str = Field(min_length=1, max_length=240)
    message: str = Field(default="", max_length=4000)
    date_needed: str | None = Field(default=None, max_length=40)
    urgency: str = Field(default="", max_length=60)
    service_id: str | None = None
    memorial_id: str | None = None


class LeadCreateOut(CamelModel):
    id: str
    provider_id: str
    status: str
    created_at: datetime


# ─── Admin-facing ───────────────────────────────────────────────────────────


class AdminProviderOut(CamelModel):
    id: str
    slug: str
    business_name: str
    contact_name: str = ""
    category: str = ""
    city: str = ""
    phone: str = ""
    email: str = ""
    status: str
    verification_state: str
    status_reason: str | None = None
    service_count: int = 0
    open_lead_count: int = 0
    submitted_at: datetime | None = None
    created_at: datetime


class AdminProviderListOut(CamelModel):
    providers: list[AdminProviderOut] = Field(default_factory=list)
    total: int = 0


class ProviderDecisionIn(StrictModel):
    reason: str | None = Field(default=None, max_length=2000)


class AdminLeadOut(CamelModel):
    id: str
    provider_id: str
    provider_name: str
    contact_name: str
    contact_phone: str
    contact_email: str | None = None
    city: str = ""
    service_needed: str
    message: str = ""
    status: str
    created_at: datetime
    updated_at: datetime


class AdminLeadListOut(CamelModel):
    leads: list[AdminLeadOut] = Field(default_factory=list)
    total: int = 0


__all__ = [
    "AdminLeadListOut",
    "AdminLeadOut",
    "AdminProviderListOut",
    "AdminProviderOut",
    "LeadCreateIn",
    "LeadCreateOut",
    "LeadListOut",
    "LeadStatus",
    "LeadStatusUpdate",
    "PartnerLeadOut",
    "ProviderDecisionIn",
    "ProviderMediaIntentIn",
    "ProviderMediaOut",
    "ProviderProfileOut",
    "ProviderProfileUpdate",
    "ProviderServiceIn",
    "ProviderServiceOut",
    "ProviderServiceUpdate",
    "ProviderStatus",
    "ProviderSubmitOut",
    "ProviderVerificationOut",
    "PublicProviderListOut",
    "PublicProviderOut",
    "PublicProviderServiceOut",
    "VerificationState",
]
