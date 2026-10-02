"""Memorial business logic. Owns transactions; routes stay thin."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Any, Literal

from celery.result import AsyncResult
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.audit.service import record as audit_record
from app.core.database import transaction
from app.core.enums import (
    AuditAction,
    MediaKind,
    MediaStatus,
    MemorialPermission,
    PrivacyLevel,
    PublicationState,
    TributeStatus,
    UserRole,
    VerificationState,
)
from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.media.models import MediaItem
from app.memorials import repository
from app.memorials.cache import invalidate_public_memorial_cache
from app.memorials.models import (
    DigitalLegacyLink,
    Memorial,
    MemorialSteward,
    Story,
    TimelineEvent,
)
from app.memorials.pdf_export import generate_memorial_pdf
from app.memorials.permissions import (
    MemorialAccess,
    can_view_memorial,
    ensure_can_update,
    resolve_access,
)
from app.memorials.qr import build_memorial_url, generate_qr_code
from app.memorials.schemas import (
    ArchiveExportOut,
    ArchiveExportStatusOut,
    DigitalLegacyLinkIn,
    DigitalLegacyLinkUpdate,
    MemorialCreate,
    MemorialUpdate,
    StewardTransferRequest,
    StoryIn,
    TimelineEventIn,
)
from app.tributes.models import Tribute
from app.users.models import User
from app.workers.celery_app import celery_app
from app.workers.tasks.archive_tasks import generate_memorial_pdf_export

logger = logging.getLogger(__name__)

# How long an export task's owner/memorial mapping is remembered, so the status
# endpoint can authorise a poll without a database round-trip. Comfortably longer
# than any export takes.
_EXPORT_SCOPE_TTL_SECONDS = 24 * 60 * 60


def _remember_export_scope(
    *, task_id: str, memorial_id: uuid.UUID, user_id: uuid.UUID | None
) -> None:
    """Record which memorial (and requester) a background export belongs to."""
    try:
        from app.core.redis import get_redis

        get_redis().set(
            f"memorial_export:{task_id}",
            json.dumps(
                {
                    "memorialId": str(memorial_id),
                    "userId": str(user_id) if user_id else None,
                }
            ),
            ex=_EXPORT_SCOPE_TTL_SECONDS,
        )
    except Exception:
        logger.warning("export_scope_remember_failed", extra={"task_id": task_id})


def _load_export_scope(task_id: str) -> dict | None:
    try:
        from app.core.redis import get_redis

        raw: Any = get_redis().get(f"memorial_export:{task_id}")
    except Exception:
        logger.warning("export_scope_read_failed", extra={"task_id": task_id})
        return None
    if not raw:
        return None
    try:
        return json.loads(raw)
    except ValueError:
        return None


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
        from app.memorials.identity import calculate_identity_similarity

        duplicate_held = False
        candidates = list(
            db.scalars(
                select(Memorial).where(
                    Memorial.deleted_at.is_(None),
                )
            )
        )
        for cand in candidates:
            # Skip if caller is already steward
            if any(s.user_id == actor.id for s in cand.stewards):
                continue
            match = calculate_identity_similarity(
                payload.full_name,
                payload.birth_date,
                payload.death_date,
                payload.birth_place or payload.resting_place,
                cand.full_name,
                cand.birth_date,
                cand.death_date,
                cand.birth_place or cand.resting_place,
            )
            if match.confidence_tier == "high_confidence":
                duplicate_held = True
                break

        from app.billing.entitlements import assert_steward_can_use_premium_theme
        from app.core.errors import ValidationError

        theme_allowed, theme_reason = assert_steward_can_use_premium_theme(
            actor.id, payload.theme.value, db
        )
        if not theme_allowed:
            raise ValidationError(
                theme_reason or "That theme is part of a paid plan.",
                details={"entitlementGated": True},
            )

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
            duplicate_held=duplicate_held,
        )
        db.add(memorial)
        db.flush()

        if duplicate_held:
            audit_record(
                db,
                action=AuditAction.MEMORIAL_COLLISION_DETECTED,
                entity="memorial",
                entity_id=memorial.id,
                actor=actor,
                detail={"slug": memorial.slug, "heldForReview": True},
                request=request,
            )

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


def _apply_media_reference(
    db: Session, memorial: Memorial, field: str, value: uuid.UUID | None
) -> None:
    """Bind (or clear) a portrait/cover reference to one of this memorial's photos.

    Validated rather than trusted: the media must belong to this memorial, have
    finished uploading, and be a photograph — a stray id can never point one
    memorial at another family's file.
    """
    if value is None:
        setattr(memorial, field, None)
        return

    media = db.scalar(
        select(MediaItem).where(
            MediaItem.id == value,
            MediaItem.memorial_id == memorial.id,
            MediaItem.deleted_at.is_(None),
        )
    )
    if media is None:
        raise NotFoundError("Photo not found")
    if media.kind != MediaKind.PHOTO.value:
        raise ValidationError("Only photographs can be used as a portrait or cover.")
    if media.status != MediaStatus.READY.value:
        raise ConflictError("That photo has not finished uploading yet.")
    setattr(memorial, field, media.id)


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
    old_slug = memorial.slug
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
                from app.billing.entitlements import assert_can_use_premium_theme

                theme_allowed, theme_reason = assert_can_use_premium_theme(
                    memorial.id, value.value, db
                )
                if not theme_allowed:
                    raise ValidationError(
                        theme_reason or "That theme is part of a paid plan.",
                        details={"entitlementGated": True},
                    )
                memorial.theme = value.value
                continue
            if field in ("portrait_media_id", "cover_media_id"):
                _apply_media_reference(db, memorial, field, value)
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
    invalidate_public_memorial_cache(memorial.slug)
    if memorial.slug != old_slug:
        invalidate_public_memorial_cache(old_slug)
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

    if state == PublicationState.PUBLISHED and getattr(memorial, "duplicate_held", False):
        raise ConflictError(
            "This memorial is held under Family Trust review due to an identity collision "
            "with an existing record. Please provide supporting relationship evidence to the "
            "Trust Desk to resolve."
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
    invalidate_public_memorial_cache(memorial.slug)
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
    invalidate_public_memorial_cache(memorial.slug)


def add_timeline_event(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    payload: TimelineEventIn,
    request: Request | None = None,
) -> TimelineEvent:
    from app.billing.entitlements import assert_can_add_timeline_event
    from app.core.errors import ValidationError

    allowed, reason = assert_can_add_timeline_event(memorial.id, db)
    if not allowed:
        raise ValidationError(
            reason or "This plan's timeline limit has been reached.",
            details={"entitlementGated": True},
        )

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
    invalidate_public_memorial_cache(memorial.slug)
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
    invalidate_public_memorial_cache(memorial.slug)
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
    invalidate_public_memorial_cache(memorial.slug)


def get_legacy_link(
    db: Session, *, memorial_id: uuid.UUID, link_id: uuid.UUID
) -> DigitalLegacyLink:
    link = db.scalar(
        select(DigitalLegacyLink).where(
            DigitalLegacyLink.id == link_id,
            DigitalLegacyLink.memorial_id == memorial_id,
        )
    )
    if link is None:
        raise NotFoundError("Legacy link not found")
    return link


def add_legacy_link(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    payload: DigitalLegacyLinkIn,
    request: Request | None = None,
) -> DigitalLegacyLink:
    from app.billing.entitlements import assert_can_manage_legacy_links
    from app.core.errors import ValidationError

    allowed, reason = assert_can_manage_legacy_links(memorial.id, db)
    if not allowed:
        raise ValidationError(
            reason or "Digital legacy links are part of a paid plan.",
            details={"entitlementGated": True},
        )

    platform_val = (
        payload.platform.value if hasattr(payload.platform, "value") else str(payload.platform)
    )
    with transaction(db):
        link = DigitalLegacyLink(
            memorial_id=memorial.id,
            platform=platform_val,
            label=payload.label,
            url=payload.url,
            notes=payload.notes,
        )
        db.add(link)
        db.flush()
        audit_record(
            db,
            action=AuditAction.MEMORIAL_UPDATED,
            entity="memorial",
            entity_id=memorial.id,
            actor=access.user,
            detail={"legacyLinkAdded": str(link.id)},
            request=request,
        )
    db.refresh(link)
    invalidate_public_memorial_cache(memorial.slug)
    return link


def update_legacy_link(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    link: DigitalLegacyLink,
    payload: DigitalLegacyLinkUpdate,
    request: Request | None = None,
) -> DigitalLegacyLink:
    with transaction(db):
        if payload.platform is not None:
            link.platform = (
                payload.platform.value
                if hasattr(payload.platform, "value")
                else str(payload.platform)
            )
        if payload.label is not None:
            link.label = payload.label
        if payload.url is not None:
            link.url = payload.url
        if payload.notes is not None:
            link.notes = payload.notes
        db.flush()
        audit_record(
            db,
            action=AuditAction.MEMORIAL_UPDATED,
            entity="memorial",
            entity_id=memorial.id,
            actor=access.user,
            detail={"legacyLinkUpdated": str(link.id)},
            request=request,
        )
    db.refresh(link)
    invalidate_public_memorial_cache(memorial.slug)
    return link


def delete_legacy_link(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    link: DigitalLegacyLink,
    request: Request | None = None,
) -> None:
    with transaction(db):
        db.delete(link)
        audit_record(
            db,
            action=AuditAction.MEMORIAL_UPDATED,
            entity="memorial",
            entity_id=memorial.id,
            actor=access.user,
            detail={"legacyLinkRemoved": str(link.id)},
            request=request,
        )
    invalidate_public_memorial_cache(memorial.slug)


def replace_legacy_links(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    links: list[dict] | list[DigitalLegacyLinkIn],
    request: Request | None = None,
) -> list[DigitalLegacyLink]:
    with transaction(db):
        for existing in list(memorial.legacy_links):
            db.delete(existing)
        db.flush()

        created: list[DigitalLegacyLink] = []
        for raw in links:
            link_data = raw if isinstance(raw, dict) else raw.model_dump()
            platform_val = link_data["platform"]
            if hasattr(platform_val, "value"):
                platform_val = platform_val.value
            item = DigitalLegacyLink(
                memorial_id=memorial.id,
                platform=str(platform_val),
                label=link_data["label"],
                url=link_data["url"],
                notes=link_data.get("notes"),
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
    invalidate_public_memorial_cache(memorial.slug)
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


def trigger_pdf_export(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    request: Request | None = None,
) -> ArchiveExportOut:
    access.require_permission(MemorialPermission.EXPORT_ARCHIVE)

    from app.billing.entitlements import assert_can_export_archive
    from app.core.errors import ValidationError

    allowed, reason = assert_can_export_archive(memorial.id, db)
    if not allowed:
        raise ValidationError(
            reason or "Archive export is part of a paid plan.",
            details={"entitlementGated": True},
        )

    # Read identity before dispatching: in eager/background execution the task
    # may expire the session, and re-reading an expired attribute would detach.
    memorial_id = memorial.id
    requester_id = access.user.id if access.user else None

    task = generate_memorial_pdf_export.delay(
        memorial_id=str(memorial_id),
        requested_by_user_id=str(requester_id) if requester_id else None,
    )
    task_id = str(task.id)
    _remember_export_scope(
        task_id=task_id,
        memorial_id=memorial_id,
        user_id=requester_id,
    )

    if task.ready():
        res = task.result or {}
        return ArchiveExportOut(
            task_id=task_id,
            status=res.get("status", "ready"),
            memorial_id=str(memorial_id),
            download_url=res.get("download_url"),
            file_size=res.get("file_size"),
        )

    return ArchiveExportOut(
        task_id=task_id,
        status="queued",
        memorial_id=str(memorial_id),
    )


def get_export_status(
    task_id: str,
    *,
    actor: User,
    expected_memorial_id: uuid.UUID | None = None,
) -> ArchiveExportStatusOut:
    """Status of a background export, readable only by its requester or an admin.

    A task id is a bearer-ish capability: without this check, any authenticated
    user who saw or guessed one could read another family's export status (and its
    download URL). The scope record written at enqueue time is the authority.
    """
    scope = _load_export_scope(task_id)
    if scope is None:
        raise NotFoundError("Export task not found.")
    is_admin = actor.role == UserRole.ADMIN.value
    if not is_admin and scope.get("userId") != str(actor.id):
        raise NotFoundError("Export task not found.")
    if expected_memorial_id is not None and scope.get("memorialId") != str(expected_memorial_id):
        raise NotFoundError("Export task not found.")

    async_res = AsyncResult(task_id, app=celery_app)
    state = async_res.state
    if state == "SUCCESS":
        res = async_res.result or {}
        return ArchiveExportStatusOut(
            task_id=task_id,
            status="ready",
            download_url=res.get("download_url"),
            file_size=res.get("file_size"),
        )
    if state == "FAILURE":
        return ArchiveExportStatusOut(
            task_id=task_id,
            status="failed",
            error=str(async_res.result),
        )
    return ArchiveExportStatusOut(
        task_id=task_id,
        status="processing",
    )


def generate_direct_pdf_export(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    request: Request | None = None,
) -> bytes:
    access.require_permission(MemorialPermission.EXPORT_ARCHIVE)

    tributes = list(
        db.scalars(
            select(Tribute)
            .where(
                Tribute.memorial_id == memorial.id,
                Tribute.status == TributeStatus.APPROVED.value,
                Tribute.deleted_at.is_(None),
            )
            .order_by(Tribute.created_at.asc())
        )
    )

    memorial_url = build_memorial_url(memorial.slug)
    qr_bytes = generate_qr_code(memorial_url, format="png", box_size=6, border=2)

    pdf_bytes = generate_memorial_pdf(
        memorial=memorial,
        story=memorial.story,
        timeline_events=memorial.timeline_events,
        contributors=memorial.contributors,
        tributes=tributes,
        qr_png_bytes=qr_bytes,
    )

    audit_record(
        db,
        action=AuditAction.MEMORIAL_EXPORTED,
        entity="memorial_archive_export",
        entity_id=str(memorial.id),
        actor=access.user,
        detail={"memorialId": str(memorial.id), "bytes": len(pdf_bytes), "format": "pdf"},
        request=request,
    )
    return pdf_bytes


def get_memorial_qr_bytes(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    format: Literal["png", "svg"] = "png",
) -> bytes:
    access.require_permission(MemorialPermission.VIEW)
    memorial_url = build_memorial_url(memorial.slug)
    return generate_qr_code(memorial_url, format=format)


def get_public_memorial_qr_bytes(
    db: Session,
    *,
    slug: str,
    format: Literal["png", "svg"] = "png",
) -> tuple[bytes, str]:
    memorial, _ = resolve_public_access(db, slug, None)
    memorial_url = build_memorial_url(memorial.slug)
    qr_bytes = generate_qr_code(memorial_url, format=format)
    return qr_bytes, memorial.slug


def transfer_stewardship(
    db: Session,
    *,
    memorial: Memorial,
    actor: User,
    payload: StewardTransferRequest,
    request: Request | None = None,
) -> Memorial:
    """Transfer primary stewardship of a memorial to another user.

    Gated by `MemorialPermission.TRANSFER_STEWARDSHIP`.
    Supports voluntary family handoff, succession planning, and admin rescue of orphaned memorials.
    """
    target_user: User | None = None
    if payload.target_user_id:
        target_user = db.get(User, payload.target_user_id)
    elif payload.target_email:
        target_user = db.scalar(
            select(User).where(User.email == payload.target_email.strip().lower())
        )

    if target_user is None:
        raise NotFoundError("Successor user account not found.")

    primary = memorial.primary_steward
    if primary and primary.user_id == target_user.id:
        raise ConflictError("User is already the primary steward of this memorial.")

    with transaction(db):
        # 1. Update current primary steward
        if primary:
            if payload.retain_as_co_steward:
                primary.is_primary = False
            else:
                memorial.stewards.remove(primary)

        # 2. Assign target user as primary steward
        existing_steward = next((s for s in memorial.stewards if s.user_id == target_user.id), None)
        if existing_steward:
            existing_steward.is_primary = True
        else:
            # If target user was a contributor, remove to avoid duplicate membership record
            contributor = next(
                (c for c in memorial.contributors if c.user_id == target_user.id), None
            )
            if contributor:
                memorial.contributors.remove(contributor)

            memorial.stewards.append(MemorialSteward(user_id=target_user.id, is_primary=True))

        if target_user.role == UserRole.VISITOR.value:
            target_user.role = UserRole.FAMILY_STEWARD.value

        db.flush()

        audit_record(
            db,
            action=AuditAction.STEWARD_TRANSFERRED,
            entity="memorial",
            entity_id=memorial.id,
            actor=actor,
            detail={
                "previous_steward_id": str(actor.id),
                "new_steward_id": str(target_user.id),
                "new_steward_email": target_user.email,
                "reason": payload.reason,
                "retained_as_co_steward": payload.retain_as_co_steward,
            },
            request=request,
        )

        invalidate_public_memorial_cache(memorial.slug)

    return memorial
