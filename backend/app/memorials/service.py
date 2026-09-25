"""Memorial business logic. Owns transactions; routes stay thin."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.audit.service import record as audit_record
from app.core.database import transaction
from app.core.enums import (
    AuditAction,
    PrivacyLevel,
    PublicationState,
    UserRole,
    VerificationState,
)
from app.core.errors import ConflictError, NotFoundError
from app.memorials import repository
from app.memorials.models import (
    DigitalLegacyLink,
    Memorial,
    MemorialSteward,
    Story,
    TimelineEvent,
)
from app.memorials.permissions import (
    MemorialAccess,
    can_view_memorial,
    ensure_can_update,
    resolve_access,
)
from app.memorials.schemas import MemorialCreate, MemorialUpdate, StoryIn, TimelineEventIn
from app.users.models import User


def _apply_story(db: Session, memorial: Memorial, payload: StoryIn) -> Story:
    story = memorial.story
    if story is None:
        story = Story(memorial_id=memorial.id)
        db.add(story)
        memorial.story = story

    story.overview = payload.overview or ""
    story.early_life = payload.early_life
    story.passions_and_values = payload.passions_and_values
    story.enduring_legacy = payload.enduring_legacy
    story.favorite_quotes = list(payload.favorite_quotes or [])
    # No flush here: the caller flushes once, so a single logical edit produces a
    # single UPDATE and therefore a single version increment.
    return story


def compute_completeness(memorial: Memorial) -> int:
    """Drives the dashboard progress ring. Deterministic, so the UI never surprises."""
    score = 0

    if memorial.full_name:
        score += 10
    if memorial.birth_date:
        score += 5
    if memorial.death_date:
        score += 5
    if memorial.birth_place:
        score += 5
    if memorial.resting_place:
        score += 5
    if memorial.short_epitaph:
        score += 10
    if memorial.portrait_url:
        score += 8
    if memorial.cover_url:
        score += 7

    story = memorial.story
    if story is not None:
        if story.overview:
            score += 10
        if story.early_life:
            score += 5
        if story.passions_and_values:
            score += 5
        if story.enduring_legacy:
            score += 5
        if story.favorite_quotes:
            score += 3

    if memorial.timeline_events:
        score += 10
    if memorial.contributors:
        score += 4

    return min(score, 100)


def _refresh_completeness(memorial: Memorial) -> None:
    memorial.completeness_percent = compute_completeness(memorial)


def create_memorial(
    db: Session,
    *,
    actor: User,
    payload: MemorialCreate,
    request: Request | None = None,
) -> Memorial:
    """Create a memorial and its primary steward in one transaction.

    The steward is the authenticated actor. There is no code path by which a
    client can nominate someone else as owner, which is the bug this replaces.
    """
    with transaction(db):
        memorial = Memorial(
            slug=repository.unique_slug(db, payload.full_name),
            full_name=payload.full_name.strip(),
            preferred_name=payload.preferred_name,
            birth_date=payload.birth_date or "",
            death_date=payload.death_date or "",
            birth_place=payload.birth_place or "",
            resting_place=payload.resting_place,
            short_epitaph=payload.short_epitaph or "",
            portrait_url=payload.portrait_url,
            cover_url=payload.cover_url,
            privacy=payload.privacy.value,
            theme=payload.theme.value,
            publication_state=PublicationState.DRAFT.value,
            verification_state=VerificationState.DRAFT.value,
        )
        db.add(memorial)
        db.flush()

        # Appended through the relationship rather than `db.add(...)`: that keeps
        # `memorial.stewards` consistent in memory, so `primary_steward` reflects
        # the new row immediately instead of relying on a later lazy load.
        memorial.stewards.append(MemorialSteward(user_id=actor.id, is_primary=True))

        if payload.story is not None:
            _apply_story(db, memorial, payload.story)

        # Creating a memorial is what makes someone a family steward. This is an
        # explicit domain action, not a guess from their email address.
        if actor.role == UserRole.VISITOR.value:
            actor.role = UserRole.FAMILY_STEWARD.value

        db.flush()
        _refresh_completeness(memorial)

        audit_record(
            db,
            action=AuditAction.USER_CREATED_MEMORIAL,
            entity="memorial",
            entity_id=memorial.id,
            actor=actor,
            detail={"slug": memorial.slug},
            request=request,
        )

    db.refresh(memorial)
    return memorial


def update_memorial(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    payload: MemorialUpdate,
    request: Request | None = None,
) -> Memorial:
    """Apply an update.

    The route has already established that the caller is a member with read
    access; the per-field permissions are enforced here, because which permission
    is required depends on which fields the request actually touches.
    """
    changes = payload.model_dump(exclude_unset=True)
    ensure_can_update(access, set(changes))

    with transaction(db):
        privacy_changed = False
        for field, value in changes.items():
            if field == "story":
                continue
            if field == "privacy":
                privacy_changed = value.value != memorial.privacy
                memorial.privacy = value.value
                continue
            if field == "theme":
                memorial.theme = value.value
                continue
            if value is not None:
                setattr(memorial, field, value)

        if payload.story is not None:
            _apply_story(db, memorial, payload.story)

        # Recomputed before the single flush so one logical edit produces exactly
        # one UPDATE — and therefore exactly one version increment. Flushing twice
        # would advance `version` by two for a single user action, which makes the
        # concurrency token harder to reason about than it needs to be.
        _refresh_completeness(memorial)
        db.flush()

        audit_record(
            db,
            action=(
                AuditAction.MEMORIAL_PRIVACY_CHANGED
                if privacy_changed
                else AuditAction.MEMORIAL_UPDATED
            ),
            entity="memorial",
            entity_id=memorial.id,
            actor=access.user,
            detail={"fields": sorted(changes)},
            request=request,
        )

    db.refresh(memorial)
    return memorial


def set_publication_state(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    state: PublicationState,
    request: Request | None = None,
) -> Memorial:
    if state == PublicationState.PUBLISHED and memorial.privacy == PrivacyLevel.PRIVATE.value:
        raise ConflictError(
            "Choose a visibility setting before publishing. A private memorial cannot be published."
        )

    with transaction(db):
        memorial.publication_state = state.value
        if state == PublicationState.PUBLISHED and memorial.published_at is None:
            memorial.published_at = datetime.now(UTC)
        else:
            memorial.published_at = None

        audit_record(
            db,
            action=(
                AuditAction.MEMORIAL_PUBLISHED
                if state == PublicationState.PUBLISHED
                else AuditAction.MEMORIAL_ARCHIVED
            ),
            entity="memorial",
            entity_id=memorial.id,
            actor=access.user,
            detail={"publicationState": state.value, "privacy": memorial.privacy},
            request=request,
        )

    db.refresh(memorial)
    return memorial


def delete_memorial(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    request: Request | None = None,
) -> None:
    """Soft delete. Audit and legal history must survive."""
    with transaction(db):
        memorial.deleted_at = datetime.now(UTC)
        audit_record(
            db,
            action=AuditAction.MEMORIAL_DELETED,
            entity="memorial",
            entity_id=memorial.id,
            actor=access.user,
            detail={"slug": memorial.slug},
            request=request,
        )


def add_timeline_event(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    payload: TimelineEventIn,
    request: Request | None = None,
) -> TimelineEvent:
    with transaction(db):
        next_order = max((event.sort_order for event in memorial.timeline_events), default=0) + 1
        event = TimelineEvent(
            memorial_id=memorial.id,
            year=payload.year or "",
            date_str=payload.date_str,
            title=payload.title,
            description=payload.description or "",
            location=payload.location,
            media_url=payload.media_url,
            category=payload.category,
            sort_order=next_order,
        )
        db.add(event)
        db.flush()
        audit_record(
            db,
            action=AuditAction.MEMORIAL_UPDATED,
            entity="memorial",
            entity_id=memorial.id,
            actor=access.user,
            detail={"timelineEventAdded": str(event.id)},
            request=request,
        )
    db.refresh(event)
    return event


def get_timeline_event(
    db: Session, *, memorial_id: uuid.UUID, event_id: uuid.UUID
) -> TimelineEvent:
    event = db.scalar(
        select(TimelineEvent).where(
            TimelineEvent.id == event_id,
            TimelineEvent.memorial_id == memorial_id,
        )
    )
    if event is None:
        raise NotFoundError("Timeline event not found")
    return event


def update_timeline_event(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    event: TimelineEvent,
    payload: TimelineEventIn,
    request: Request | None = None,
) -> TimelineEvent:
    with transaction(db):
        event.year = payload.year or ""
        event.date_str = payload.date_str
        event.title = payload.title
        event.description = payload.description or ""
        event.location = payload.location
        event.media_url = payload.media_url
        event.category = payload.category
        audit_record(
            db,
            action=AuditAction.MEMORIAL_UPDATED,
            entity="memorial",
            entity_id=memorial.id,
            actor=access.user,
            detail={"timelineEventUpdated": str(event.id)},
            request=request,
        )
    db.refresh(event)
    return event


def delete_timeline_event(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    event: TimelineEvent,
    request: Request | None = None,
) -> None:
    with transaction(db):
        db.delete(event)
        audit_record(
            db,
            action=AuditAction.MEMORIAL_UPDATED,
            entity="memorial",
            entity_id=memorial.id,
            actor=access.user,
            detail={"timelineEventRemoved": str(event.id)},
            request=request,
        )


def replace_legacy_links(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    links: list[dict],
    request: Request | None = None,
) -> list[DigitalLegacyLink]:
    with transaction(db):
        for existing in list(memorial.legacy_links):
            db.delete(existing)
        db.flush()

        created: list[DigitalLegacyLink] = []
        for link in links:
            item = DigitalLegacyLink(
                memorial_id=memorial.id,
                platform=link["platform"],
                label=link["label"],
                url=link["url"],
                notes=link.get("notes"),
            )
            db.add(item)
            created.append(item)

        db.flush()
        audit_record(
            db,
            action=AuditAction.MEMORIAL_UPDATED,
            entity="memorial",
            entity_id=memorial.id,
            actor=access.user,
            detail={"legacyLinks": len(created)},
            request=request,
        )
    return created


def access_for(db: Session, memorial: Memorial, user: User | None) -> MemorialAccess:
    return resolve_access(db, memorial, user)


def resolve_public_access(
    db: Session, slug: str, user: User | None
) -> tuple[Memorial, MemorialAccess]:
    """Resolve a memorial reached by its public URL.

    Returns 404 rather than 403 for anything the caller may not see, so the
    endpoint cannot be used to probe whether a private memorial exists.
    """
    memorial = repository.get_by_slug(db, slug)
    if memorial is None:
        raise NotFoundError("Memorial not found")

    access = resolve_access(db, memorial, user)
    if not can_view_memorial(access):
        raise NotFoundError("Memorial not found")

    return memorial, access
