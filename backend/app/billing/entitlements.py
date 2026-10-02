"""Entitlement engine: resolves effective capabilities and enforces limits.

Follows the PITHROS commercial rule:
- Free Tier is genuinely useful (25 photos, 10 timeline events, 3 contributors).
- Active subscription on a slot unlocks expanded capabilities (1000+ photos, audio,
  HD video, PDF archive).
- EXPIRED_READ_ONLY keeps all existing media and data completely safe — it only
  gates new additions beyond free limits.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.billing.catalog import FREE_TIER_LIMITS, MEMORIAL_CARE_LIMITS, TierLimits
from app.billing.models import (
    MemorialEntitlement,
    Subscription,
)
from app.core.enums import (
    MediaKind,
    MemorialEntitlementStatus,
    SubscriptionStatus,
)
from app.media.models import MediaItem
from app.memorials.models import MemorialContributor, TimelineEvent

logger = logging.getLogger(__name__)


@dataclass
class MemorialEntitlementsReport:
    memorial_id: uuid.UUID
    is_premium: bool
    subscription_status: str | None
    subscription_id: uuid.UUID | None
    slot_number: int | None
    plan_name: str | None
    limits: TierLimits
    # Usage counters
    photos_count: int
    photo_bytes: int
    audio_bytes: int
    video_bytes: int
    total_media_bytes: int
    documents_count: int
    contributors_count: int
    timeline_events_count: int
    # Permissions
    can_upload_photo: bool
    can_upload_voice: bool
    can_upload_video: bool
    can_upload_document: bool
    can_add_contributor: bool
    can_add_timeline_event: bool
    can_export_archive: bool
    can_manage_legacy_links: bool
    can_use_premium_theme: bool
    status_notice: str | None


def get_active_subscription_for_memorial(
    memorial_id: uuid.UUID, db: Session
) -> tuple[Subscription | None, MemorialEntitlement | None]:
    """Find if a memorial is currently assigned to an active or grace period subscription slot."""
    stmt = (
        select(MemorialEntitlement, Subscription)
        .join(Subscription, MemorialEntitlement.subscription_id == Subscription.id)
        .where(
            MemorialEntitlement.memorial_id == memorial_id,
            MemorialEntitlement.status == MemorialEntitlementStatus.ASSIGNED,
            Subscription.status.in_(
                [
                    SubscriptionStatus.ACTIVE,
                    SubscriptionStatus.PAST_DUE,
                    SubscriptionStatus.GRACE,
                ]
            ),
        )
    )
    res = db.execute(stmt).first()
    if res:
        entitlement, subscription = res
        return subscription, entitlement
    return None, None


def get_effective_tier_limits(subscription: Subscription | None) -> TierLimits:
    """Return numeric limits and capability flags based on the subscription entitlements."""
    if not subscription or subscription.status not in (
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.PAST_DUE,
        SubscriptionStatus.GRACE,
    ):
        return FREE_TIER_LIMITS

    ent = subscription.entitlements
    if not ent:
        return MEMORIAL_CARE_LIMITS

    return TierLimits(
        max_memorials=ent.max_memorials,
        max_photos=ent.max_photos,
        max_media_bytes=getattr(ent, "max_media_bytes", MEMORIAL_CARE_LIMITS.max_media_bytes),
        max_file_bytes=getattr(ent, "max_file_bytes", MEMORIAL_CARE_LIMITS.max_file_bytes),
        max_video_bytes=ent.max_video_bytes,
        max_audio_bytes=ent.max_audio_bytes,
        max_audio_file_bytes=getattr(
            ent, "max_audio_file_bytes", MEMORIAL_CARE_LIMITS.max_audio_file_bytes
        ),
        max_documents=ent.max_documents,
        max_contributors=ent.max_contributors,
        max_timeline_events=getattr(
            ent, "max_timeline_events", 50 if ent.max_memorials == 1 else 250
        ),
        max_daily_upload_attempts=getattr(
            ent, "max_daily_upload_attempts", 50 if ent.max_memorials == 1 else 100
        ),
        verification_enabled=ent.verification_enabled,
        archive_export_enabled=ent.archive_export_enabled,
        anniversary_notifications_enabled=ent.anniversary_notifications_enabled,
        legacy_links_enabled=ent.legacy_links_enabled,
        premium_theme_enabled=ent.premium_theme_enabled,
    )


def resolve_memorial_entitlements(
    memorial_id: uuid.UUID, db: Session
) -> MemorialEntitlementsReport:
    """Compute comprehensive entitlements and usage statistics for a memorial."""
    subscription, slot = get_active_subscription_for_memorial(memorial_id, db)
    limits = get_effective_tier_limits(subscription)
    is_premium = subscription is not None

    # Compute actual usage from the database
    # Photos count
    photos_count = (
        db.execute(
            select(func.count(MediaItem.id)).where(
                MediaItem.memorial_id == memorial_id,
                MediaItem.kind == MediaKind.PHOTO,
                MediaItem.deleted_at.is_(None),
            )
        ).scalar()
        or 0
    )

    # Photo bytes used
    photo_bytes = (
        db.execute(
            select(func.coalesce(func.sum(MediaItem.size_bytes), 0)).where(
                MediaItem.memorial_id == memorial_id,
                MediaItem.kind == MediaKind.PHOTO,
                MediaItem.deleted_at.is_(None),
            )
        ).scalar()
        or 0
    )

    # Audio bytes used
    audio_bytes = (
        db.execute(
            select(func.coalesce(func.sum(MediaItem.size_bytes), 0)).where(
                MediaItem.memorial_id == memorial_id,
                MediaItem.kind == MediaKind.VOICE,
                MediaItem.deleted_at.is_(None),
            )
        ).scalar()
        or 0
    )

    # Video bytes used
    video_bytes = (
        db.execute(
            select(func.coalesce(func.sum(MediaItem.size_bytes), 0)).where(
                MediaItem.memorial_id == memorial_id,
                MediaItem.kind == MediaKind.VIDEO,
                MediaItem.deleted_at.is_(None),
            )
        ).scalar()
        or 0
    )

    # Total media bytes across all active media items for this memorial
    total_media_bytes = (
        db.execute(
            select(func.coalesce(func.sum(MediaItem.size_bytes), 0)).where(
                MediaItem.memorial_id == memorial_id,
                MediaItem.deleted_at.is_(None),
            )
        ).scalar()
        or 0
    )

    # Documents count
    documents_count = (
        db.execute(
            select(func.count(MediaItem.id)).where(
                MediaItem.memorial_id == memorial_id,
                MediaItem.kind == MediaKind.DOCUMENT,
                MediaItem.deleted_at.is_(None),
            )
        ).scalar()
        or 0
    )

    # Contributors count
    contributors_count = (
        db.execute(
            select(func.count(MemorialContributor.id)).where(
                MemorialContributor.memorial_id == memorial_id
            )
        ).scalar()
        or 0
    )

    # Timeline events count
    timeline_events_count = (
        db.execute(
            select(func.count(TimelineEvent.id)).where(TimelineEvent.memorial_id == memorial_id)
        ).scalar()
        or 0
    )

    status_notice = None
    if subscription:
        if subscription.status == SubscriptionStatus.PAST_DUE:
            status_notice = (
                "Your Memorial Care renewal did not complete. Your memorial remains fully safe and "
                "accessible while recovery is in progress."
            )
        elif subscription.status == SubscriptionStatus.GRACE:
            status_notice = (
                "Your Memorial Care renewal is in the grace period. "
                "All memories remain preserved and safe."
            )

    can_upload_photo = (
        photos_count < limits.max_photos and total_media_bytes < limits.max_media_bytes
    )
    can_upload_voice = (
        limits.max_audio_bytes > 0
        and audio_bytes < limits.max_audio_bytes
        and total_media_bytes < limits.max_media_bytes
    )
    can_upload_video = (
        limits.max_video_bytes > 0
        and video_bytes < limits.max_video_bytes
        and total_media_bytes < limits.max_media_bytes
    )
    can_upload_document = limits.max_documents > 0 and documents_count < limits.max_documents
    can_add_contributor = contributors_count < limits.max_contributors
    can_add_timeline_event = timeline_events_count < limits.max_timeline_events

    return MemorialEntitlementsReport(
        memorial_id=memorial_id,
        is_premium=is_premium,
        subscription_status=subscription.status if subscription else None,
        subscription_id=subscription.id if subscription else None,
        slot_number=slot.slot_number if slot else None,
        plan_name=subscription.plan.name if subscription and subscription.plan else None,
        limits=limits,
        photos_count=photos_count,
        photo_bytes=photo_bytes,
        audio_bytes=audio_bytes,
        video_bytes=video_bytes,
        total_media_bytes=total_media_bytes,
        documents_count=documents_count,
        contributors_count=contributors_count,
        timeline_events_count=timeline_events_count,
        can_upload_photo=can_upload_photo,
        can_upload_voice=can_upload_voice,
        can_upload_video=can_upload_video,
        can_upload_document=can_upload_document,
        can_add_contributor=can_add_contributor,
        can_add_timeline_event=can_add_timeline_event,
        can_export_archive=limits.archive_export_enabled,
        can_manage_legacy_links=limits.legacy_links_enabled,
        can_use_premium_theme=limits.premium_theme_enabled,
        status_notice=status_notice,
    )


def assert_can_upload_media(
    memorial_id: uuid.UUID, kind: MediaKind, size_bytes: int, db: Session
) -> tuple[bool, str | None]:
    """Check if the memorial can accept an upload of the given kind and size.
    Enforces simultaneous limits:
    - Per-file size ceiling (5 MB Free / 10 MB Paid)
    - Total media bytes ceiling (25 MB Free / 1 GB Care / 5 GB Family)
    - Item count limits (5 photos Free / 100 Care / 500 Family)
    - Audio storage ceiling (0 Free / 500 MB Care / 2 GB Family)
    Whichever is hit first triggers the gate / upgrade message.
    Returns (True, None) if permitted, or (False, user_friendly_message) if gated.
    """
    ent = resolve_memorial_entitlements(memorial_id, db)

    # 1. Per-file limit
    if kind == MediaKind.VOICE:
        if not ent.limits.max_audio_bytes:
            return (
                False,
                "Voice memories are preserved with PITHROS Memorial Care. "
                "Preserve up to 60 minutes of voice memories (100 MB) along with "
                "archival downloads and family preservation.",
            )
        max_audio_file_bytes = getattr(ent.limits, "max_audio_file_bytes", 50 * 1024 * 1024)
        if size_bytes > max_audio_file_bytes:
            max_audio_file_mb = max_audio_file_bytes // (1024 * 1024)
            return (
                False,
                f"Audio file size exceeds the maximum allowed limit of {max_audio_file_mb} MB "
                "per recording.",
            )
    else:
        if size_bytes > ent.limits.max_file_bytes:
            max_file_mb = ent.limits.max_file_bytes // (1024 * 1024)
            if not ent.is_premium:
                return (
                    False,
                    f"File size exceeds the {max_file_mb} MB limit for Free Memorials. "
                    "Upgrade to Memorial Care to upload photos up to 10 MB.",
                )
            return (
                False,
                f"File size exceeds the maximum allowed limit of {max_file_mb} MB per file.",
            )

    # 2. Total media bytes allowance
    if ent.total_media_bytes + size_bytes > ent.limits.max_media_bytes:
        max_allowance = (
            f"{ent.limits.max_media_bytes // (1024 * 1024)} MB"
            if ent.limits.max_media_bytes < 1024 * 1024 * 1024
            else f"{ent.limits.max_media_bytes // (1024 * 1024 * 1024)} GB"
        )
        if not ent.is_premium:
            return (
                False,
                f"This memorial has reached its {max_allowance} media storage allowance. "
                "Upgrade to Memorial Care for 300 MB media storage and voice memories.",
            )
        return (
            False,
            f"This memorial has reached its total media storage allowance ({max_allowance}).",
        )

    # 3. Kind-specific rules
    if kind == MediaKind.PHOTO:
        if ent.photos_count >= ent.limits.max_photos:
            if not ent.is_premium:
                return (
                    False,
                    f"Free Memorial includes {ent.limits.max_photos} photographs. "
                    "Upgrade to Memorial Care to preserve up to 30 photographs, along with "
                    "voice memories, archival downloads, and family preservation features.",
                )
            return (
                False,
                f"This memorial has reached the limit of {ent.limits.max_photos} photographs.",
            )
    elif kind == MediaKind.VOICE:
        if not ent.limits.max_audio_bytes:
            return (
                False,
                "Voice memories are preserved with PITHROS Memorial Care. "
                "Preserve up to 60 minutes of voice memories (100 MB) along with "
                "archival downloads and family preservation.",
            )
        if ent.audio_bytes + size_bytes > ent.limits.max_audio_bytes:
            max_audio_mb = ent.limits.max_audio_bytes // (1024 * 1024)
            return (
                False,
                f"The voice/audio storage limit ({max_audio_mb} MB) for this memorial has "
                "been reached.",
            )
    elif kind == MediaKind.VIDEO:
        return (
            False,
            "Video preservation is on the product roadmap. PITHROS currently focuses on "
            "archival photograph preservation and voice memories.",
        )
    elif kind == MediaKind.DOCUMENT:
        if not ent.limits.max_documents:
            return (
                False,
                "Archival documents are available with PITHROS Memorial Care.",
            )
        if not ent.can_upload_document:
            return (
                False,
                f"This memorial has reached the document limit of {ent.limits.max_documents}.",
            )

    return True, None


def assert_can_export_archive(memorial_id: uuid.UUID, db: Session) -> tuple[bool, str | None]:
    """Check if PDF / digital archive export is permitted."""
    ent = resolve_memorial_entitlements(memorial_id, db)
    if not ent.limits.archive_export_enabled:
        return (
            False,
            "Digital archive export (high-resolution PDF & keepsake package) is included "
            "with Memorial Care.",
        )
    return True, None


def assert_can_add_contributor(memorial_id: uuid.UUID, db: Session) -> tuple[bool, str | None]:
    """Check if the memorial can invite another family contributor."""
    ent = resolve_memorial_entitlements(memorial_id, db)
    if not ent.can_add_contributor:
        return (
            False,
            "Free Memorial includes 1 additional contributor. "
            "Upgrade to Memorial Care for expanded family collaboration and custom roles.",
        )
    return True, None


def assert_can_add_timeline_event(memorial_id: uuid.UUID, db: Session) -> tuple[bool, str | None]:
    """Check if the memorial can add another timeline milestone."""
    ent = resolve_memorial_entitlements(memorial_id, db)
    if not ent.can_add_timeline_event:
        return (
            False,
            f"Free Memorial includes up to {ent.limits.max_timeline_events} timeline milestones. "
            "Upgrade to Memorial Care to construct their complete life story.",
        )
    return True, None


def assert_can_use_premium_theme(
    memorial_id: uuid.UUID, theme: str, db: Session
) -> tuple[bool, str | None]:
    """Premium themes belong to a paid plan; the free themes always work."""
    from app.core.enums import FREE_THEMES, MemorialTheme

    try:
        parsed = MemorialTheme(theme)
    except ValueError:
        return False, "That theme does not exist."

    if parsed in FREE_THEMES:
        return True, None

    entitlements = resolve_memorial_entitlements(memorial_id, db)
    if not entitlements.limits.premium_theme_enabled:
        return (
            False,
            "This theme is part of a paid plan. Upgrade to unlock the full theme collection.",
        )
    return True, None


def assert_steward_can_use_premium_theme(
    user_id: uuid.UUID, theme: str, db: Session
) -> tuple[bool, str | None]:
    """Creation-time check.

    A memorial being created has no entitlements of its own yet, so the question
    is whether *this family's* plan includes premium themes.
    """
    from app.billing.models import BillingAccount, Subscription, SubscriptionEntitlement
    from app.core.enums import FREE_THEMES, MemorialTheme, SubscriptionStatus

    try:
        parsed = MemorialTheme(theme)
    except ValueError:
        return False, "That theme does not exist."

    if parsed in FREE_THEMES:
        return True, None

    flags = (
        db.execute(
            select(SubscriptionEntitlement.premium_theme_enabled)
            .join(Subscription, Subscription.id == SubscriptionEntitlement.subscription_id)
            .join(BillingAccount, BillingAccount.id == Subscription.billing_account_id)
            .where(
                BillingAccount.owner_user_id == user_id,
                Subscription.status.in_(
                    [SubscriptionStatus.ACTIVE.value, SubscriptionStatus.GRACE.value]
                ),
            )
        )
        .scalars()
        .all()
    )
    if not any(flags):
        return (
            False,
            "This theme is part of a paid plan. Upgrade to unlock the full theme collection.",
        )
    return True, None


def assert_can_manage_legacy_links(memorial_id: uuid.UUID, db: Session) -> tuple[bool, str | None]:
    """Check if external digital legacy links can be added."""
    ent = resolve_memorial_entitlements(memorial_id, db)
    if not ent.limits.legacy_links_enabled:
        return (
            False,
            "Digital legacy links (YouTube, social profiles, websites) are included with "
            "Memorial Care.",
        )
    return True, None
