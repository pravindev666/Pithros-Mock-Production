"""Turn memorial ORM objects into the two wire projections.

Built by hand rather than by attribute reflection: the public projection is a
security boundary, and an allowlist is auditable in a way that a recursive
serialiser is not.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.enums import (
    ContributorStatus,
    MediaKind,
    MediaStatus,
    MemorialPermission,
    OfferingType,
    PrivacyLevel,
    StorageTier,
    TributeStatus,
)
from app.media.models import MediaItem
from app.media.storage import get_storage
from app.memorials.models import (
    DigitalLegacyLink,
    Memorial,
    Story,
    TimelineEvent,
)
from app.memorials.permissions import MemorialAccess
from app.memorials.schemas import (
    DigitalLegacyLinkOut,
    FamilyMemberOut,
    MediaItemOut,
    MemorialDetailOut,
    MemorialPublicOut,
    MemorialSummaryOut,
    OfferingOut,
    StoryOut,
    TimelineEventOut,
    TributeOut,
)
from app.offerings.models import Offering
from app.tributes.models import Tribute

TRIBUTE_DISPLAY_LIMIT = 200
OFFERING_DISPLAY_LIMIT = 200
MEDIA_DISPLAY_LIMIT = 300


def _relative_time(moment: datetime) -> str:
    """Human phrasing the public memorial page already renders."""
    seconds = int((datetime.now(UTC) - moment).total_seconds())
    if seconds < 60:
        return "Just now"
    if seconds < 3600:
        minutes = seconds // 60
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    if seconds < 86400:
        hours = seconds // 3600
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    days = seconds // 86400
    if days < 30:
        return f"{days} day{'s' if days != 1 else ''} ago"
    return moment.strftime("%d %b %Y")


def _story_out(story: Story | None) -> StoryOut:
    if story is None:
        return StoryOut()
    return StoryOut(
        overview=story.overview or "",
        early_life=story.early_life,
        passions_and_values=story.passions_and_values,
        enduring_legacy=story.enduring_legacy,
        favorite_quotes=list(story.favorite_quotes or []),
    )


def _timeline_out(events: Sequence[TimelineEvent]) -> list[TimelineEventOut]:
    return [
        TimelineEventOut(
            id=str(event.id),
            year=event.year or "",
            date_str=event.date_str,
            title=event.title,
            description=event.description or "",
            location=event.location,
            media_url=event.media_url,
            category=event.category,
        )
        for event in events
    ]


def _legacy_out(links: Sequence[DigitalLegacyLink]) -> list[DigitalLegacyLinkOut]:
    return [
        DigitalLegacyLinkOut(
            id=str(link.id),
            platform=link.platform,
            label=link.label,
            url=link.url,
            notes=link.notes,
        )
        for link in links
    ]


def media_out(item: MediaItem, *, include_private: bool) -> MediaItemOut | None:
    """Public delivery is keyed off the *storage tier*, not the privacy flag.

    An object uploaded into the private bucket stays signed-URL-only even if its
    privacy is later set to public, so flipping a flag can never expose bytes that
    were never placed in the public bucket.
    """
    storage = get_storage()
    tier = StorageTier(item.storage_tier)
    in_public_bucket = tier == StorageTier.PUBLIC
    declared_public = item.privacy == PrivacyLevel.PUBLIC.value

    if in_public_bucket and declared_public:
        url = storage.public_url(key=item.storage_key) or storage.presigned_get_url(
            tier=tier, key=item.storage_key
        )
    elif include_private:
        url = storage.presigned_get_url(tier=tier, key=item.storage_key)
    else:
        return None

    is_public = in_public_bucket and declared_public
    thumbnail_url = (
        storage.public_url(key=item.thumbnail_key) if item.thumbnail_key and is_public else None
    )

    return MediaItemOut(
        id=str(item.id),
        type=item.kind,
        title=item.title or "",
        url=url,
        thumbnail_url=thumbnail_url,
        caption=item.caption,
        year=item.year,
        uploaded_by=item.uploaded_by.name if item.uploaded_by else None,
        is_private=not is_public,
        is_public=is_public,
    )


def _media_list(items: Sequence[MediaItem], *, include_private: bool) -> list[MediaItemOut]:
    projected = (media_out(item, include_private=include_private) for item in items)
    return [out for out in projected if out is not None]


def load_media(
    db: Session,
    memorial_id: uuid.UUID,
    *,
    include_private: bool,
    kinds: Sequence[MediaKind] | None = None,
) -> list[MediaItem]:
    stmt = (
        select(MediaItem)
        .where(
            MediaItem.memorial_id == memorial_id,
            MediaItem.status == MediaStatus.READY.value,
            MediaItem.deleted_at.is_(None),
        )
        .options(selectinload(MediaItem.uploaded_by))
        .order_by(MediaItem.created_at.desc())
        .limit(MEDIA_DISPLAY_LIMIT)
    )
    if not include_private:
        stmt = stmt.where(MediaItem.privacy == PrivacyLevel.PUBLIC.value)
    if kinds:
        stmt = stmt.where(MediaItem.kind.in_([kind.value for kind in kinds]))

    return list(db.scalars(stmt))


def load_tributes(
    db: Session, memorial_id: uuid.UUID, *, include_unapproved: bool
) -> list[Tribute]:
    stmt = select(Tribute).where(Tribute.memorial_id == memorial_id, Tribute.deleted_at.is_(None))
    if not include_unapproved:
        stmt = stmt.where(Tribute.status == TributeStatus.APPROVED.value)
    stmt = stmt.order_by(Tribute.is_pinned.desc(), Tribute.created_at.desc()).limit(
        TRIBUTE_DISPLAY_LIMIT
    )
    return list(db.scalars(stmt))


def load_offerings(db: Session, memorial_id: uuid.UUID) -> list[Offering]:
    stmt = (
        select(Offering)
        .where(Offering.memorial_id == memorial_id, Offering.deleted_at.is_(None))
        .order_by(Offering.created_at.desc())
        .limit(OFFERING_DISPLAY_LIMIT)
    )
    return list(db.scalars(stmt))


def tribute_out(tribute: Tribute) -> TributeOut:
    return TributeOut(
        id=str(tribute.id),
        author_name=tribute.author_name,
        relationship=tribute.relationship,
        message=tribute.message,
        date=_relative_time(tribute.created_at),
        avatar_url=tribute.avatar_url,
        photo_url=tribute.photo_url,
        is_approved=tribute.status == TributeStatus.APPROVED.value,
        is_pinned=tribute.is_pinned,
    )


def offering_out(offering: Offering) -> OfferingOut:
    valid = {member.value for member in OfferingType}
    offering_type = (
        offering.offering_type if offering.offering_type in valid else OfferingType.FLOWER.value
    )
    return OfferingOut(
        id=str(offering.id),
        type=offering_type,
        sender_name=offering.sender_name,
        message=offering.message,
        timestamp=_relative_time(offering.created_at),
    )


def _family_out(memorial: Memorial, access: MemorialAccess) -> list[FamilyMemberOut]:
    """Members only. Emails are included because only members ever see this list."""
    members: list[FamilyMemberOut] = []

    for steward in memorial.stewards:
        if steward.user is None:
            continue
        members.append(
            FamilyMemberOut(
                id=str(steward.user_id),
                name=steward.user.name,
                relationship="Steward",
                status=ContributorStatus.ACTIVE.value,
                avatar=steward.user.avatar,
                email=steward.user.email,
                role="steward",
                permissions=[],
            )
        )

    for contributor in memorial.contributors:
        if contributor.status == ContributorStatus.REVOKED.value:
            continue
        display = (
            contributor.user.name
            if contributor.user
            else (contributor.display_name or contributor.invited_email or "Invited member")
        )
        members.append(
            FamilyMemberOut(
                id=str(contributor.id),
                name=display,
                relationship=contributor.relationship_label,
                status=contributor.status,
                avatar=contributor.user.avatar if contributor.user else None,
                email=contributor.user.email if contributor.user else contributor.invited_email,
                role=contributor.role,
                permissions=[],
            )
        )

    return members


def memorial_public_out(
    db: Session,
    memorial: Memorial,
    *,
    story: Story | None,
    timeline: Sequence[TimelineEvent],
    legacy_links: Sequence[DigitalLegacyLink],
) -> MemorialPublicOut:
    """The anonymous-safe projection.

    Absent by design: the internal UUID (id carries the slug instead), the
    steward's email address, private media, verification evidence, moderation
    state, and completeness tracking.
    """
    primary = memorial.primary_steward

    return MemorialPublicOut(
        id=memorial.slug,
        slug=memorial.slug,
        full_name=memorial.full_name,
        preferred_name=memorial.preferred_name,
        birth_date=memorial.birth_date or "",
        death_date=memorial.death_date or "",
        birth_place=memorial.birth_place or "",
        resting_place=memorial.resting_place,
        short_epitaph=memorial.short_epitaph or "",
        portrait_url=memorial.portrait_url,
        cover_url=memorial.cover_url,
        story=_story_out(story),
        privacy=memorial.privacy,
        verification_status=memorial.verification_state,
        verification_badge_type=memorial.verification_badge_type,
        theme=memorial.theme,
        timeline=_timeline_out(timeline),
        media=_media_list(
            load_media(db, memorial.id, include_private=False), include_private=False
        ),
        tributes=[tribute_out(t) for t in load_tributes(db, memorial.id, include_unapproved=False)],
        offerings=[offering_out(o) for o in load_offerings(db, memorial.id)],
        legacy_links=_legacy_out(legacy_links),
        steward_name=primary.user.name if primary and primary.user else None,
        steward_relationship=None,
        created_at=memorial.created_at,
        updated_at=memorial.updated_at,
    )


def memorial_detail_out(
    db: Session,
    memorial: Memorial,
    access: MemorialAccess,
    *,
    story: Story | None,
    timeline: Sequence[TimelineEvent],
    legacy_links: Sequence[DigitalLegacyLink],
) -> MemorialDetailOut:
    """The full projection. Only ever returned after an access check has passed."""
    primary = memorial.primary_steward
    can_moderate = access.has(MemorialPermission.MANAGE_TRIBUTES)

    return MemorialDetailOut(
        id=memorial.id,
        slug=memorial.slug,
        full_name=memorial.full_name,
        preferred_name=memorial.preferred_name,
        birth_date=memorial.birth_date or "",
        death_date=memorial.death_date or "",
        birth_place=memorial.birth_place or "",
        resting_place=memorial.resting_place,
        short_epitaph=memorial.short_epitaph or "",
        portrait_url=memorial.portrait_url,
        cover_url=memorial.cover_url,
        story=_story_out(story),
        privacy=memorial.privacy,
        publication_state=memorial.publication_state,
        verification_status=memorial.verification_state,
        verification_badge_type=memorial.verification_badge_type,
        theme=memorial.theme,
        completeness_percent=memorial.completeness_percent,
        timeline=_timeline_out(timeline),
        family=_family_out(memorial, access),
        media=_media_list(load_media(db, memorial.id, include_private=True), include_private=True),
        tributes=[
            tribute_out(t) for t in load_tributes(db, memorial.id, include_unapproved=can_moderate)
        ],
        offerings=[offering_out(o) for o in load_offerings(db, memorial.id)],
        legacy_links=_legacy_out(legacy_links),
        steward_id=str(primary.user_id) if primary else None,
        steward_name=primary.user.name if primary and primary.user else None,
        steward_relationship=None,
        steward_email=primary.user.email if primary and primary.user else None,
        my_role=access.role,
        my_permissions=sorted(permission.value for permission in access.permissions),
        created_at=memorial.created_at,
        updated_at=memorial.updated_at,
    )


def memorial_summary_out(memorial: Memorial) -> MemorialSummaryOut:
    return MemorialSummaryOut(
        id=memorial.id,
        slug=memorial.slug,
        full_name=memorial.full_name,
        preferred_name=memorial.preferred_name,
        portrait_url=memorial.portrait_url,
        birth_date=memorial.birth_date or "",
        death_date=memorial.death_date or "",
        privacy=memorial.privacy,
        publication_state=memorial.publication_state,
        verification_status=memorial.verification_state,
        completeness_percent=memorial.completeness_percent,
        updated_at=memorial.updated_at,
    )
