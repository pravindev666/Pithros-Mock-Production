"""Data access for memorials. No business rules live here."""

from __future__ import annotations

import re
import uuid

from sqlalchemy import CompoundSelect, Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.enums import ContributorStatus, PrivacyLevel, PublicationState
from app.core.pagination import DEFAULT_LIMIT, Cursor, Page
from app.memorials.models import Memorial, MemorialContributor, MemorialSteward

_SLUG_STRIP = re.compile(r"[^a-z0-9]+")


def with_access_relations() -> tuple:
    """Eager-load everything `resolve_access` needs, to avoid N+1 queries."""
    return (
        selectinload(Memorial.stewards).selectinload(MemorialSteward.user),
        selectinload(Memorial.contributors).selectinload(MemorialContributor.user),
        selectinload(Memorial.permission_grants),
    )


def with_full_detail() -> tuple:
    return (
        *with_access_relations(),
        selectinload(Memorial.story),
        selectinload(Memorial.timeline_events),
        selectinload(Memorial.legacy_links),
    )


def _not_deleted(stmt: Select) -> Select:
    return stmt.where(Memorial.deleted_at.is_(None))


def get_by_id(db: Session, memorial_id: uuid.UUID) -> Memorial | None:
    stmt = _not_deleted(select(Memorial).where(Memorial.id == memorial_id))
    return db.scalar(stmt.options(*with_full_detail()))


def get_by_slug(db: Session, slug: str) -> Memorial | None:
    stmt = _not_deleted(select(Memorial).where(Memorial.slug == slug.lower()))
    return db.scalar(stmt.options(*with_full_detail()))


def _membership_subquery(user_id: uuid.UUID) -> CompoundSelect:
    steward_ids = select(MemorialSteward.memorial_id).where(MemorialSteward.user_id == user_id)
    contributor_ids = select(MemorialContributor.memorial_id).where(
        MemorialContributor.user_id == user_id,
        MemorialContributor.status == ContributorStatus.ACTIVE.value,
    )
    return steward_ids.union(contributor_ids)


def list_for_user(
    db: Session,
    user_id: uuid.UUID,
    *,
    limit: int | None = None,
    cursor: Cursor | None = None,
) -> Page:
    """Only memorials where the caller has a real membership. Never the whole table."""
    from app.core.pagination import PageParams, paginate

    stmt = _not_deleted(
        select(Memorial).where(Memorial.id.in_(_membership_subquery(user_id)))
    ).options(*with_full_detail())

    return paginate(
        db,
        stmt,
        model=Memorial,
        params=PageParams(limit=limit or DEFAULT_LIMIT, cursor=cursor),
        order_field="updated_at",
        descending=True,
    )


def list_publicly_discoverable(
    db: Session,
    *,
    query: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[Memorial]:
    """Search is limited to published, public, index-enabled memorials.

    `family` and `unlisted` memorials are reachable only by their exact URL and
    must never appear in results.
    """
    stmt = _not_deleted(
        select(Memorial).where(
            Memorial.publication_state == PublicationState.PUBLISHED.value,
            Memorial.privacy == PrivacyLevel.PUBLIC.value,
            Memorial.search_index_enabled.is_(True),
        )
    )

    if query:
        needle = f"%{query.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Memorial.full_name).like(needle),
                func.lower(Memorial.birth_place).like(needle),
                func.lower(Memorial.short_epitaph).like(needle),
            )
        )

    stmt = stmt.order_by(Memorial.published_at.desc().nullslast(), Memorial.created_at.desc())
    return list(db.scalars(stmt.limit(limit).offset(offset)).unique())


def build_slug(full_name: str) -> str:
    slug = _SLUG_STRIP.sub("-", full_name.strip().lower()).strip("-")
    return slug or "memorial"


def unique_slug(db: Session, full_name: str, *, exclude_id: uuid.UUID | None = None) -> str:
    base = build_slug(full_name)
    candidate = base
    suffix = 2
    while True:
        stmt = select(func.count()).select_from(Memorial).where(Memorial.slug == candidate)
        if exclude_id is not None:
            stmt = stmt.where(Memorial.id != exclude_id)
        if db.scalar(stmt) == 0:
            return candidate
        candidate = f"{base}-{suffix}"
        suffix += 1


def count_memorials(db: Session) -> int:
    return (
        db.scalar(select(func.count()).select_from(Memorial).where(Memorial.deleted_at.is_(None)))
        or 0
    )
