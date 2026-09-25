"""Single import point for every model, so Alembic autogenerate sees them all.

Importing this module (and nothing else) is enough to populate Base.metadata.
"""

from app.audit.models import AuditLog
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

__all__ = [
    "AuditLog",
    "DigitalLegacyLink",
    "MediaItem",
    "Memorial",
    "MemorialContributor",
    "MemorialPermissionGrant",
    "MemorialSteward",
    "Offering",
    "Story",
    "TimelineEvent",
    "Tribute",
    "User",
]
