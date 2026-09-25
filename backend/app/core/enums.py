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
    GARDEN = "garden"
    HORIZON = "horizon"
    CANDLELIGHT = "candlelight"
    HERITAGE = "heritage"


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
    MEMORIAL_DELETED = "MEMORIAL_DELETED"
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
    PROVIDER_APPROVED = "PROVIDER_APPROVED"
    PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED"
    REFUND_APPROVED = "REFUND_APPROVED"
    ADMIN_LOGIN = "ADMIN_LOGIN"
    AUTHORIZATION_DENIED = "AUTHORIZATION_DENIED"
