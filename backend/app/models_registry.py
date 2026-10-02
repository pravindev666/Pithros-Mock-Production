"""Single import point for every model, so Alembic autogenerate sees them all.

Importing this module (and nothing else) is enough to populate Base.metadata.
"""

from app.audit.models import AuditLog
from app.billing.models import (
    BillingAccount,
    Invoice,
    MemorialEntitlement,
    Payment,
    Plan,
    PlanPrice,
    Refund,
    SponsorshipLink,
    Subscription,
    SubscriptionEntitlement,
    WebhookEvent,
)
from app.core.idempotency import IdempotencyKey
from app.media.models import MediaItem
from app.memorials.models import (
    DigitalLegacyLink,
    Memorial,
    MemorialContributor,
    MemorialPermissionGrant,
    MemorialSteward,
    Story,
    TimelineEvent,
)
from app.notifications.models import Notification
from app.offerings.models import Offering
from app.privacy.models import AccountDeletionRequest, MemorialDispositionEntry
from app.providers.models import (
    FarewellLead,
    Provider,
    ProviderService,
    ProviderVerification,
)
from app.tributes.models import Tribute
from app.users.models import User
from app.verification.models import (
    VerificationDecisionRecord,
    VerificationEvidence,
    VerificationSubmission,
)
from app.workers.models import TaskFailure

__all__ = [
    "AccountDeletionRequest",
    "AuditLog",
    "BillingAccount",
    "DigitalLegacyLink",
    "FarewellLead",
    "IdempotencyKey",
    "Invoice",
    "MediaItem",
    "Memorial",
    "MemorialContributor",
    "MemorialDispositionEntry",
    "MemorialEntitlement",
    "MemorialPermissionGrant",
    "MemorialSteward",
    "Notification",
    "Offering",
    "Payment",
    "Plan",
    "PlanPrice",
    "Provider",
    "ProviderService",
    "ProviderVerification",
    "Refund",
    "SponsorshipLink",
    "Story",
    "Subscription",
    "SubscriptionEntitlement",
    "TaskFailure",
    "TimelineEvent",
    "Tribute",
    "User",
    "VerificationDecisionRecord",
    "VerificationEvidence",
    "VerificationSubmission",
    "WebhookEvent",
]
