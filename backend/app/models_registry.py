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
from app.offerings.models import Offering
from app.tributes.models import Tribute
from app.users.models import User
from app.verification.models import (
    VerificationDecisionRecord,
    VerificationEvidence,
    VerificationSubmission,
)
from app.workers.models import TaskFailure

__all__ = [
    "AuditLog",
    "BillingAccount",
    "DigitalLegacyLink",
    "IdempotencyKey",
    "Invoice",
    "MediaItem",
    "Memorial",
    "MemorialContributor",
    "MemorialEntitlement",
    "MemorialPermissionGrant",
    "MemorialSteward",
    "Offering",
    "Payment",
    "Plan",
    "PlanPrice",
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

