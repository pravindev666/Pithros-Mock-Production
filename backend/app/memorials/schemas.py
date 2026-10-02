"""Wire schemas.

Two deliberate conventions here:

1. Responses are camelCase, matching the existing frontend contract exactly, so
   wiring the client required no view changes. Request bodies accept camelCase too.
2. `MemorialPublicOut` is an explicit allowlist. It is the boundary that keeps
   private data out of anonymous responses, so it is built by hand rather than by
   attribute reflection — and a test freezes its exact key set.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field

from app.core.enums import (
    ContributorRole,
    LegacyPlatform,
    MemorialTheme,
    PrivacyLevel,
)
from app.core.schemas import CamelModel, StrictModel, to_camel

__all__ = [
    "CamelModel",
    "CandidateMatchSummary",
    "DigitalLegacyLinkIn",
    "DigitalLegacyLinkOut",
    "DigitalLegacyLinkUpdate",
    "DigitalLegacyLinksReplace",
    "DuplicateScreeningOut",
    "DuplicateScreeningRequest",
    "FamilyMemberOut",
    "MediaItemOut",
    "MemorialCreate",
    "MemorialDetailOut",
    "MemorialMergeRequest",
    "MemorialPublicOut",
    "MemorialPublishRequest",
    "MemorialSummaryOut",
    "MemorialUpdate",
    "OfferingOut",
    "PaginatedSearchOut",
    "PermissionCatalogOut",
    "SearchResultOut",
    "StoryIn",
    "StoryOut",
    "StrictModel",
    "TimelineEventIn",
    "TimelineEventOut",
    "TributeOut",
    "to_camel",
]


# ─── Nested value objects ───────────────────────────────────────────────────


class StoryOut(CamelModel):
    overview: str = ""
    early_life: str | None = None
    passions_and_values: str | None = None
    enduring_legacy: str | None = None
    favorite_quotes: list[str] = Field(default_factory=list)


class StoryIn(StrictModel):
    overview: str = ""
    early_life: str | None = None
    passions_and_values: str | None = None
    enduring_legacy: str | None = None
    favorite_quotes: list[str] = Field(default_factory=list)


class TimelineEventOut(CamelModel):
    id: str
    year: str = ""
    date_str: str | None = None
    title: str
    description: str = ""
    location: str | None = None
    media_url: str | None = None
    category: str | None = None


class TimelineEventIn(StrictModel):
    year: str = ""
    date_str: str | None = None
    title: str = Field(min_length=1, max_length=200)
    description: str = ""
    location: str | None = None
    media_url: str | None = None
    category: str | None = None


class MediaItemOut(CamelModel):
    id: str
    type: str
    title: str = ""
    url: str
    thumbnail_url: str | None = None
    caption: str | None = None
    year: str | None = None
    uploaded_by: str | None = None
    is_private: bool = False
    is_public: bool = False


class DigitalLegacyLinkIn(StrictModel):
    platform: LegacyPlatform = LegacyPlatform.WEBSITE
    label: str = Field(min_length=1, max_length=200)
    url: str = Field(min_length=1, max_length=2000)
    notes: str | None = None


class DigitalLegacyLinkUpdate(StrictModel):
    platform: LegacyPlatform | None = None
    label: str | None = Field(default=None, min_length=1, max_length=200)
    url: str | None = Field(default=None, min_length=1, max_length=2000)
    notes: str | None = None


class DigitalLegacyLinksReplace(StrictModel):
    links: list[DigitalLegacyLinkIn] = Field(default_factory=list)


class DigitalLegacyLinkOut(CamelModel):
    id: str
    platform: str
    label: str
    url: str
    notes: str | None = None


class TributeOut(CamelModel):
    id: str
    author_name: str
    relationship: str | None = None
    message: str
    date: str
    avatar_url: str | None = None
    photo_url: str | None = None
    is_approved: bool = False
    is_pinned: bool = False


class OfferingOut(CamelModel):
    id: str
    type: str
    sender_name: str
    message: str | None = None
    timestamp: str


class FamilyMemberOut(CamelModel):
    id: str
    name: str
    relationship: str | None = None
    status: str | None = None
    avatar: str | None = None
    email: str | None = None
    role: str = ContributorRole.VIEWER.value
    permissions: list[str] = Field(default_factory=list)


# ─── Memorial projections ───────────────────────────────────────────────────


class MemorialPublicOut(CamelModel):
    """The anonymous-safe projection.

    Deliberately absent: internal UUID, steward email, steward id, private media,
    verification evidence, moderation notes, completeness tracking.

    `id` carries the memorial's slug. The slug *is* the public identifier, and the
    public endpoints accept it wherever an id is expected — so the internal UUID
    is never disclosed.
    """

    id: str
    slug: str
    full_name: str
    preferred_name: str | None = None
    birth_date: str = ""
    death_date: str = ""
    birth_place: str = ""
    resting_place: str | None = None
    short_epitaph: str = ""
    portrait_url: str | None = None
    cover_url: str | None = None
    story: StoryOut
    privacy: str
    verification_status: str
    verification_badge_type: str | None = None
    theme: str
    timeline: list[TimelineEventOut] = Field(default_factory=list)
    media: list[MediaItemOut] = Field(default_factory=list)
    tributes: list[TributeOut] = Field(default_factory=list)
    offerings: list[OfferingOut] = Field(default_factory=list)
    legacy_links: list[DigitalLegacyLinkOut] = Field(default_factory=list)
    steward_name: str | None = None
    steward_relationship: str | None = None
    created_at: datetime
    updated_at: datetime


class MemorialDetailOut(CamelModel):
    """The full projection, returned only to callers who passed `can_view_memorial`."""

    id: uuid.UUID
    slug: str
    full_name: str
    preferred_name: str | None = None
    birth_date: str = ""
    death_date: str = ""
    birth_place: str = ""
    resting_place: str | None = None
    short_epitaph: str = ""
    portrait_url: str | None = None
    cover_url: str | None = None
    story: StoryOut
    privacy: str
    publication_state: str
    verification_status: str
    verification_badge_type: str | None = None
    theme: str
    completeness_percent: int = 0
    # Optimistic concurrency token. Callers echo it back in `If-Match` on write.
    version: int = 1
    timeline: list[TimelineEventOut] = Field(default_factory=list)
    family: list[FamilyMemberOut] = Field(default_factory=list)
    media: list[MediaItemOut] = Field(default_factory=list)
    tributes: list[TributeOut] = Field(default_factory=list)
    offerings: list[OfferingOut] = Field(default_factory=list)
    legacy_links: list[DigitalLegacyLinkOut] = Field(default_factory=list)
    steward_id: str | None = None
    steward_name: str | None = None
    steward_relationship: str | None = None
    steward_email: str | None = None
    my_role: str | None = None
    my_permissions: list[str] = Field(default_factory=list)
    duplicate_held: bool = False
    dispute_status: str | None = None
    merged_into_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class MemorialSummaryOut(CamelModel):
    id: uuid.UUID
    slug: str
    full_name: str
    preferred_name: str | None = None
    portrait_url: str | None = None
    birth_date: str = ""
    death_date: str = ""
    privacy: str
    publication_state: str
    verification_status: str
    completeness_percent: int = 0
    updated_at: datetime


# ─── Requests ───────────────────────────────────────────────────────────────


class MemorialCreate(StrictModel):
    """Note there is no steward field: the creator is resolved from the verified
    token and becomes the primary steward in the same transaction."""

    full_name: str = Field(min_length=1, max_length=200)
    preferred_name: str | None = Field(default=None, max_length=200)
    birth_date: str = Field(default="", max_length=32)
    death_date: str = Field(default="", max_length=32)
    birth_place: str = Field(default="", max_length=200)
    resting_place: str | None = Field(default=None, max_length=200)
    short_epitaph: str = ""
    portrait_url: str | None = None
    cover_url: str | None = None
    story: StoryIn | None = None
    privacy: PrivacyLevel = PrivacyLevel.PRIVATE
    theme: MemorialTheme = MemorialTheme.CLASSIC


class MemorialUpdate(StrictModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    preferred_name: str | None = Field(default=None, max_length=200)
    birth_date: str | None = Field(default=None, max_length=32)
    death_date: str | None = Field(default=None, max_length=32)
    birth_place: str | None = Field(default=None, max_length=200)
    resting_place: str | None = Field(default=None, max_length=200)
    short_epitaph: str | None = None
    portrait_url: str | None = None
    cover_url: str | None = None
    portrait_media_id: uuid.UUID | None = None
    cover_media_id: uuid.UUID | None = None
    story: StoryIn | None = None
    privacy: PrivacyLevel | None = None
    theme: MemorialTheme | None = None


class MemorialPublishRequest(StrictModel):
    publication_state: Literal["draft", "published", "archived"]


class SearchResultOut(CamelModel):
    slug: str
    full_name: str
    birth_date: str = ""
    death_date: str = ""
    birth_place: str = ""
    resting_place: str | None = None
    short_epitaph: str = ""
    portrait_url: str | None = None
    verification_status: str
    verification_badge_type: str | None = None


class PaginatedSearchOut(CamelModel):
    results: list[SearchResultOut]
    total_returned: int
    total_count: int = 0
    limit: int
    offset: int


# ─── Permissions ────────────────────────────────────────────────────────────


class PermissionCatalogOut(CamelModel):
    """Serialises the authorisation model for the frontend, so the UI can hide what
    the server would refuse — a convenience layer on top of enforcement, never a
    substitute for it."""

    my_role: str | None
    my_permissions: list[str]
    role_permissions: dict[str, list[str]]
    available_permissions: list[str]


# ─── Archive Export ────────────────────────────────────────────────────────


class ArchiveExportOut(CamelModel):
    task_id: str
    status: str
    memorial_id: str
    download_url: str | None = None
    file_size: int | None = None


class ArchiveExportStatusOut(CamelModel):
    task_id: str
    status: str
    download_url: str | None = None
    file_size: int | None = None
    error: str | None = None


# ─── Identity Screening & Collision Resolution ─────────────────────────────


class DuplicateScreeningRequest(StrictModel):
    full_name: str = Field(min_length=1, max_length=200)
    birth_date: str | None = Field(default=None, max_length=64)
    death_date: str | None = Field(default=None, max_length=64)
    birth_place: str | None = Field(default=None, max_length=200)
    resting_place: str | None = Field(default=None, max_length=200)


class CandidateMatchSummary(CamelModel):
    id: str
    full_name: str
    birth_date: str
    death_date: str
    birth_place: str
    similarity_score: float
    confidence_tier: str
    publication_state: str
    privacy: str


class DuplicateScreeningOut(CamelModel):
    has_potential_collision: bool
    confidence_tier: str
    requires_admin_review: bool
    privacy_safe_message: str
    candidate_matches: list[CandidateMatchSummary] = Field(default_factory=list)


class MemorialMergeRequest(StrictModel):
    canonical_memorial_id: uuid.UUID
    duplicate_memorial_id: uuid.UUID
    reason: str = Field(min_length=5, max_length=500)
    carry_over_tributes: bool = True
    carry_over_media: bool = True
    carry_over_timeline: bool = True
    co_stewardship: bool = True


class StewardTransferRequest(CamelModel):
    target_user_id: uuid.UUID | None = None
    target_email: str | None = None
    reason: str = Field(min_length=3, max_length=500)
    retain_as_co_steward: bool = True
