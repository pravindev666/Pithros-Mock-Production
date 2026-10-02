"""Domain enumerations shared across models, schemas, and authorization.

Stored as strings with CHECK constraints rather than native PostgreSQL enums:
adding a value later is a plain migration instead of an ALTER TYPE dance.
"""

from __future__ import annotations

from enum import StrEnum


class UserRole(StrEnum):
    VISITOR = "visitor"
    FAMILY_STEWARD = "family_steward"
    FAMILY_CONTRIBUTOR = "family_contributor"
    PARTNER = "partner"
    ADMIN = "admin"


class AdminSubRole(StrEnum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    VERIFICATION_REVIEWER = "verification_reviewer"
    MODERATOR = "moderator"
    PROVIDER_MANAGER = "provider_manager"
    SUPPORT_AGENT = "support_agent"
    FINANCE = "finance"


class UserStatus(StrEnum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"


class PrivacyLevel(StrEnum):
    PRIVATE = "private"
    FAMILY = "family"
    UNLISTED = "unlisted"
    PUBLIC = "public"


class PublicationState(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class VerificationState(StrEnum):
    """Kept strictly separate from publication state."""

    DRAFT = "draft"
    SUBMITTED = "submitted"
    VERIFICATION_PENDING = "verification_pending"
    VERIFICATION_REVIEW = "verification_review"
    APPROVED = "approved"
    NEEDS_MORE_INFORMATION = "needs_more_information"
    REJECTED = "rejected"
    APPEAL = "appeal"


# Legal transitions. Anything not listed here is a 409, not a silent write — an
# illegal jump would let a submission reach APPROVED without ever being reviewed.
VERIFICATION_TRANSITIONS: dict[VerificationState, frozenset[VerificationState]] = {
    VerificationState.DRAFT: frozenset({VerificationState.SUBMITTED}),
    VerificationState.SUBMITTED: frozenset({VerificationState.VERIFICATION_PENDING}),
    VerificationState.VERIFICATION_PENDING: frozenset({VerificationState.VERIFICATION_REVIEW}),
    VerificationState.VERIFICATION_REVIEW: frozenset(
        {
            VerificationState.APPROVED,
            VerificationState.REJECTED,
            VerificationState.NEEDS_MORE_INFORMATION,
        }
    ),
    # The submitter can act on a request for more information.
    VerificationState.NEEDS_MORE_INFORMATION: frozenset(
        {VerificationState.SUBMITTED, VerificationState.DRAFT}
    ),
    VerificationState.REJECTED: frozenset({VerificationState.APPEAL}),
    VerificationState.APPEAL: frozenset({VerificationState.VERIFICATION_REVIEW}),
    # Terminal.
    VerificationState.APPROVED: frozenset(),
}


class VerificationDecision(StrEnum):
    # Recorded in the history alongside reviewer decisions, so the timeline of a
    # submission reads correctly from the submitter's side too.
    SUBMITTED = "submitted"
    APPEALED = "appealed"
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_MORE_INFORMATION = "needs_more_information"


class VerificationDocumentType(StrEnum):
    DEATH_CERTIFICATE = "death_certificate"
    OBITUARY = "obituary"
    FUNERAL_NOTICE = "funeral_notice"
    IDENTITY_PROOF = "identity_proof"
    RELATIONSHIP_PROOF = "relationship_proof"
    OTHER = "other"


class MemorialTheme(StrEnum):
    CLASSIC = "classic"
    IVORY = "ivory"
    MIDNIGHT = "midnight"
    HERITAGE = "heritage"
    GARDEN = "garden"
    MONUMENT = "monument"
    HORIZON = "horizon"
    CANDLELIGHT = "candlelight"


# Themes a free memorial may use. The rest are part of a paid plan, which is what
# `assert_can_use_premium_theme` enforces on the theme-update path.
FREE_THEMES: frozenset[MemorialTheme] = frozenset(
    {MemorialTheme.CLASSIC, MemorialTheme.IVORY, MemorialTheme.HERITAGE}
)


class ContributorRole(StrEnum):
    STEWARD = "steward"
    BIOGRAPHER = "biographer"
    PHOTO_ARCHIVIST = "photo_archivist"
    MEMORY_CONTRIBUTOR = "memory_contributor"
    GUEST_REVIEWER = "guest_reviewer"
    VIEWER = "viewer"


class ContributorStatus(StrEnum):
    INVITED = "invited"
    ACTIVE = "active"
    REVOKED = "revoked"


class MemorialPermission(StrEnum):
    VIEW = "view"
    EDIT_DETAILS = "edit_details"
    EDIT_STORY = "edit_story"
    MANAGE_TIMELINE = "manage_timeline"
    MANAGE_MEDIA = "manage_media"
    MANAGE_CONTRIBUTORS = "manage_contributors"
    MANAGE_TRIBUTES = "manage_tributes"
    MANAGE_PRIVACY = "manage_privacy"
    CHANGE_THEME = "change_theme"
    SUBMIT_VERIFICATION = "submit_verification"
    PUBLISH = "publish"
    ARCHIVE = "archive"
    EXPORT_ARCHIVE = "export_archive"
    TRANSFER_STEWARDSHIP = "transfer_stewardship"
    DELETE = "delete"


class MediaKind(StrEnum):
    PHOTO = "photo"
    VIDEO = "video"
    VOICE = "voice"
    DOCUMENT = "document"


class MediaStatus(StrEnum):
    PENDING = "pending"
    READY = "ready"
    REJECTED = "rejected"


class StorageTier(StrEnum):
    """Logical bucket separation required for private and sensitive content."""

    PUBLIC = "public"
    PRIVATE = "private"
    SENSITIVE = "sensitive"


class TributeStatus(StrEnum):
    PENDING_MODERATION = "pending_moderation"
    APPROVED = "approved"
    REJECTED = "rejected"
    HIDDEN = "hidden"


class OfferingType(StrEnum):
    DOVE = "dove"
    FLOWER = "flower"
    HANDS = "hands"
    LIGHT = "light"
    STAR = "star"
    HEART = "heart"
    HONOR = "honor"
    MEMORY = "memory"
    PRAYER = "prayer"


class TimelineCategory(StrEnum):
    BIRTH = "birth"
    MILESTONE = "milestone"
    FAMILY = "family"
    CAREER = "career"
    MEMORY = "memory"
    PASSING = "passing"


class LegacyPlatform(StrEnum):
    YOUTUBE = "youtube"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    WEBSITE = "website"
    OTHER = "other"


class AuditResult(StrEnum):
    SUCCESS = "success"
    DENIED = "denied"
    FLAGGED = "flagged"


class AuditAction(StrEnum):
    USER_REGISTERED = "USER_REGISTERED"
    USER_CREATED_MEMORIAL = "USER_CREATED_MEMORIAL"
    MEMORIAL_VIEWED = "MEMORIAL_VIEWED"
    MEMORIAL_UPDATED = "MEMORIAL_UPDATED"
    MEMORIAL_PRIVACY_CHANGED = "MEMORIAL_PRIVACY_CHANGED"
    MEMORIAL_PUBLISHED = "MEMORIAL_PUBLISHED"
    MEMORIAL_ARCHIVED = "MEMORIAL_ARCHIVED"
    MEMORIAL_EXPORTED = "MEMORIAL_EXPORTED"
    MEMORIAL_DELETED = "MEMORIAL_DELETED"
    MEMORIAL_COLLISION_DETECTED = "MEMORIAL_COLLISION_DETECTED"
    MEMORIAL_MERGED = "MEMORIAL_MERGED"
    DISPUTE_CLAIM_SUBMITTED = "DISPUTE_CLAIM_SUBMITTED"
    DISPUTE_STATUS_UPDATED = "DISPUTE_STATUS_UPDATED"
    STEWARD_TRANSFERRED = "STEWARD_TRANSFERRED"
    CONTRIBUTOR_INVITED = "CONTRIBUTOR_INVITED"
    CONTRIBUTOR_REVOKED = "CONTRIBUTOR_REVOKED"
    TRIBUTE_MODERATED = "TRIBUTE_MODERATED"
    TRIBUTE_DELETED = "TRIBUTE_DELETED"
    MEDIA_UPLOAD_STARTED = "MEDIA_UPLOAD_STARTED"
    MEDIA_UPLOADED = "MEDIA_UPLOADED"
    MEDIA_DELETED = "MEDIA_DELETED"
    VERIFICATION_SUBMITTED = "VERIFICATION_SUBMITTED"
    VERIFICATION_APPROVED = "VERIFICATION_APPROVED"
    VERIFICATION_REJECTED = "VERIFICATION_REJECTED"
    SENSITIVE_DOCUMENT_ACCESSED = "SENSITIVE_DOCUMENT_ACCESSED"
    REPORT_RESOLVED = "REPORT_RESOLVED"
    PROVIDER_SUBMITTED = "PROVIDER_SUBMITTED"
    PROVIDER_APPROVED = "PROVIDER_APPROVED"
    PROVIDER_REJECTED = "PROVIDER_REJECTED"
    PROVIDER_SUSPENDED = "PROVIDER_SUSPENDED"
    PROVIDER_UPDATED = "PROVIDER_UPDATED"
    PROVIDER_MEDIA_CHANGED = "PROVIDER_MEDIA_CHANGED"
    LEAD_SUBMITTED = "LEAD_SUBMITTED"
    LEAD_STATUS_CHANGED = "LEAD_STATUS_CHANGED"
    PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED"
    PAYMENT_ATTEMPTED = "PAYMENT_ATTEMPTED"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    REFUND_APPROVED = "REFUND_APPROVED"
    REFUND_REQUESTED = "REFUND_REQUESTED"
    SUBSCRIPTION_CREATED = "SUBSCRIPTION_CREATED"
    SUBSCRIPTION_ACTIVATED = "SUBSCRIPTION_ACTIVATED"
    SUBSCRIPTION_RENEWED = "SUBSCRIPTION_RENEWED"
    SUBSCRIPTION_CANCELLED = "SUBSCRIPTION_CANCELLED"
    SUBSCRIPTION_STATE_CHANGED = "SUBSCRIPTION_STATE_CHANGED"
    MEMORIAL_SLOT_ASSIGNED = "MEMORIAL_SLOT_ASSIGNED"
    MEMORIAL_SLOT_RELEASED = "MEMORIAL_SLOT_RELEASED"
    SPONSORSHIP_CREATED = "SPONSORSHIP_CREATED"
    SPONSORSHIP_REDEEMED = "SPONSORSHIP_REDEEMED"
    ADMIN_ENTITLEMENT_GRANTED = "ADMIN_ENTITLEMENT_GRANTED"
    ADMIN_ENTITLEMENT_EXTENDED = "ADMIN_ENTITLEMENT_EXTENDED"
    ADMIN_ENTITLEMENT_REVOKED = "ADMIN_ENTITLEMENT_REVOKED"
    ADMIN_LOGIN = "ADMIN_LOGIN"
    AUTHORIZATION_DENIED = "AUTHORIZATION_DENIED"
    USER_DELETION_REQUESTED = "USER_DELETION_REQUESTED"
    USER_DELETION_VERIFIED = "USER_DELETION_VERIFIED"
    USER_DELETION_CANCELLED = "USER_DELETION_CANCELLED"
    USER_DELETION_EXECUTED = "USER_DELETION_EXECUTED"
    MEMORIAL_TRANSFERRED = "MEMORIAL_TRANSFERRED"
    DATA_EXPORT_GENERATED = "DATA_EXPORT_GENERATED"
    CONSENT_WITHDRAWN = "CONSENT_WITHDRAWN"
    LEGAL_HOLD_APPLIED = "LEGAL_HOLD_APPLIED"


class PlanCode(StrEnum):
    MEMORIAL_CARE = "MEMORIAL_CARE"
    FAMILY_ARCHIVE = "FAMILY_ARCHIVE"
    ADDITIONAL_MEMORIAL = "ADDITIONAL_MEMORIAL"


class BillingInterval(StrEnum):
    MONTHLY = "monthly"
    HALF_YEARLY = "half_yearly"
    ANNUAL = "annual"


class SubscriptionStatus(StrEnum):
    PENDING = "pending"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    GRACE = "grace"
    EXPIRED_READ_ONLY = "expired_read_only"
    CANCELLED = "cancelled"
    TERMINATED = "terminated"
    PAUSED = "paused"
    PAYMENT_PROCESSING = "payment_processing"
    RETRYING = "retrying"


SUBSCRIPTION_TRANSITIONS: dict[SubscriptionStatus, frozenset[SubscriptionStatus]] = {
    SubscriptionStatus.PENDING: frozenset(
        {SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED, SubscriptionStatus.TERMINATED}
    ),
    SubscriptionStatus.ACTIVE: frozenset(
        {
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.CANCELLED,
            SubscriptionStatus.TERMINATED,
            SubscriptionStatus.EXPIRED_READ_ONLY,
            SubscriptionStatus.PAUSED,
        }
    ),
    SubscriptionStatus.PAST_DUE: frozenset(
        {
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.GRACE,
            SubscriptionStatus.RETRYING,
            SubscriptionStatus.PAYMENT_PROCESSING,
            SubscriptionStatus.CANCELLED,
            SubscriptionStatus.EXPIRED_READ_ONLY,
            SubscriptionStatus.TERMINATED,
        }
    ),
    SubscriptionStatus.RETRYING: frozenset(
        {
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.GRACE,
            SubscriptionStatus.PAYMENT_PROCESSING,
            SubscriptionStatus.CANCELLED,
            SubscriptionStatus.EXPIRED_READ_ONLY,
            SubscriptionStatus.TERMINATED,
        }
    ),
    SubscriptionStatus.PAYMENT_PROCESSING: frozenset(
        {
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.GRACE,
            SubscriptionStatus.EXPIRED_READ_ONLY,
            SubscriptionStatus.TERMINATED,
        }
    ),
    SubscriptionStatus.GRACE: frozenset(
        {
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.EXPIRED_READ_ONLY,
            SubscriptionStatus.CANCELLED,
            SubscriptionStatus.TERMINATED,
        }
    ),
    SubscriptionStatus.EXPIRED_READ_ONLY: frozenset(
        {
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TERMINATED,
        }
    ),
    SubscriptionStatus.CANCELLED: frozenset(
        {
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.EXPIRED_READ_ONLY,
            SubscriptionStatus.TERMINATED,
        }
    ),
    SubscriptionStatus.PAUSED: frozenset(
        {
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TERMINATED,
            SubscriptionStatus.EXPIRED_READ_ONLY,
        }
    ),
    SubscriptionStatus.TERMINATED: frozenset(),
}


class MemorialEntitlementStatus(StrEnum):
    ASSIGNED = "assigned"
    RELEASED = "released"
    RESERVED = "reserved"


class PaymentStatus(StrEnum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    FLAGGED = "flagged"
    REFUNDED = "refunded"
    DISPUTED = "disputed"


class InvoiceStatus(StrEnum):
    DRAFT = "draft"
    ISSUED = "issued"
    PAID = "paid"
    VOID = "void"
    UNCOLLECTIBLE = "uncollectible"


class RefundStatus(StrEnum):
    PENDING = "pending"
    PROCESSED = "processed"
    FAILED = "failed"


class WebhookProcessingStatus(StrEnum):
    RECEIVED = "received"
    PROCESSED = "processed"
    FAILED = "failed"
    IGNORED = "ignored"


class SponsorshipStatus(StrEnum):
    ACTIVE = "active"
    REDEEMED = "redeemed"
    EXPIRED = "expired"
    REVOKED = "revoked"


class NotificationType(StrEnum):
    """In-app notification kinds.

    Email delivery does not exist yet (no provider is configured), so every
    notification here is an in-app record. The catalogue spans the full
    lifecycle so later stages can start emitting without a schema migration.
    """

    WELCOME = "welcome"
    VERIFICATION_SUBMITTED = "verification_submitted"
    VERIFICATION_APPEALED = "verification_appealed"
    VERIFICATION_APPROVED = "verification_approved"
    VERIFICATION_REJECTED = "verification_rejected"
    VERIFICATION_NEEDS_INFO = "verification_needs_info"
    TRIBUTE_PENDING = "tribute_pending"
    PAYMENT_SUCCEEDED = "payment_succeeded"
    PAYMENT_FAILED = "payment_failed"
    ENTITLEMENT_GRANTED = "entitlement_granted"
    ENTITLEMENT_REVOKED = "entitlement_revoked"
    PROVIDER_LEAD_RECEIVED = "provider_lead_received"
    LEAD_STATUS_UPDATED = "lead_status_updated"
    PROVIDER_APPROVED = "provider_approved"
    PROVIDER_SUSPENDED = "provider_suspended"
    ACCOUNT_DELETION_REQUESTED = "account_deletion_requested"
    ACCOUNT_DELETION_COMPLETED = "account_deletion_completed"
    ACCOUNT_DELETION_CANCELLED = "account_deletion_cancelled"


class ProviderStatus(StrEnum):
    """Operational state of a Farewell Network partner.

    Separate from `VerificationState` on purpose, mirroring memorials: a provider
    can be approved and later suspended without its credential review changing.
    Only `approved` providers are ever publicly discoverable.
    """

    PENDING = "pending"
    APPROVED = "approved"
    SUSPENDED = "suspended"
    REJECTED = "rejected"


class LeadStatus(StrEnum):
    """Canonical lifecycle of a family enquiry.

    The two frontends speak different vocabularies (the partner console says
    "Provider Contacted", the family view says "contacted"). Both map onto this
    single set, so the stored truth is one value.
    """

    SUBMITTED = "submitted"
    CONTACTED = "contacted"
    QUOTED = "quoted"
    IN_DISCUSSION = "in_discussion"
    BOOKED = "booked"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# Legal transitions. Anything else is a 409 rather than a silent write, so a lead
# cannot jump straight to BOOKED without the partner having made contact.
LEAD_TRANSITIONS: dict[LeadStatus, frozenset[LeadStatus]] = {
    LeadStatus.SUBMITTED: frozenset({LeadStatus.CONTACTED, LeadStatus.CANCELLED}),
    LeadStatus.CONTACTED: frozenset(
        {LeadStatus.QUOTED, LeadStatus.BOOKED, LeadStatus.COMPLETED, LeadStatus.CANCELLED}
    ),
    LeadStatus.QUOTED: frozenset(
        {LeadStatus.IN_DISCUSSION, LeadStatus.BOOKED, LeadStatus.CANCELLED}
    ),
    LeadStatus.IN_DISCUSSION: frozenset({LeadStatus.BOOKED, LeadStatus.CANCELLED}),
    LeadStatus.BOOKED: frozenset({LeadStatus.COMPLETED, LeadStatus.CANCELLED}),
    LeadStatus.COMPLETED: frozenset(),
    LeadStatus.CANCELLED: frozenset(),
}


class DeletionStatus(StrEnum):
    """Data-lifecycle state machine (PRD §32), separate from payment state.

    A deletion request never borrows a billing status and a payment failure never
    advances this machine. `BLOCKED_BY_DISPOSITION` is the honest resting state
    for a sole-steward account until the memorial's fate is decided, rather than a
    failure — the person's request is valid, the disposition is not yet chosen.
    """

    REQUESTED = "REQUESTED"
    VERIFIED = "VERIFIED"
    SCHEDULED = "SCHEDULED"
    EXECUTING = "EXECUTING"
    COMPLETED = "COMPLETED"
    BLOCKED_BY_DISPOSITION = "BLOCKED_BY_DISPOSITION"
    LEGAL_HOLD = "LEGAL_HOLD"
    REJECTED_WITH_REASON = "REJECTED_WITH_REASON"
    CANCELLED = "CANCELLED"


class MemorialDisposition(StrEnum):
    """What happens to a memorial whose only steward is deleting their account."""

    TRANSFER = "transfer"
    DELETE = "delete"
    ORPHAN = "orphan"


class DispositionStatus(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
