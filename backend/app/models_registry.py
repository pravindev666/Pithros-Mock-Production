"""Single import point for every model, so Alembic autogenerate sees them all.

Importing this module (and nothing else) is enough to populate Base.metadata.
"""

from app.audit.models import AuditLog
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
    "DigitalLegacyLink",
    "IdempotencyKey",
    "MediaItem",
    "Memorial",
    "MemorialContributor",
    "MemorialPermissionGrant",
    "MemorialSteward",
    "Offering",
    "Story",
    "TaskFailure",
    "TimelineEvent",
    "Tribute",
    "User",
    "VerificationDecisionRecord",
    "VerificationEvidence",
    "VerificationSubmission",
]
