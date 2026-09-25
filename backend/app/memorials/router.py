"""Memorial endpoints.

Route bodies stay thin: they resolve dependencies, delegate to the service, and
project the result. Every mutating route names the permission it requires, and
the dependency refuses the request before the body runs.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, OptionalUser
from app.core.concurrency import ensure_version, etag, parse_if_match
from app.core.database import get_db
from app.core.enums import MemorialPermission, PrivacyLevel, PublicationState
from app.core.errors import NotFoundError
from app.core.pagination import PageParams, apply_page_headers, page_params
from app.core.rate_limit import rate_limit
from app.memorials import repository, service
from app.memorials.models import Memorial
from app.memorials.permissions import (
    ROLE_PERMISSIONS,
    authorized,
    can_view_memorial,
    resolve_access,
)
from app.memorials.projections import (
    memorial_detail_out,
    memorial_public_out,
    memorial_summary_out,
)
from app.memorials.schemas import (
    MemorialCreate,
    MemorialDetailOut,
    MemorialPublicOut,
    MemorialPublishRequest,
    MemorialSummaryOut,
    MemorialUpdate,
    PaginatedSearchOut,
    PermissionCatalogOut,
    SearchResultOut,
    TimelineEventIn,
    TimelineEventOut,
)

public_router = APIRouter(prefix="/public", tags=["Public memorials"])
me_router = APIRouter(prefix="/me", tags=["Memorials"])
router = APIRouter(prefix="/memorials", tags=["Memorials"])

DbSession = Annotated[Session, Depends(get_db)]


# ─── Authenticated: my memorials ────────────────────────────────────────────


@me_router.get("/memorials", response_model=list[MemorialSummaryOut])
def list_my_memorials(
    response: Response,
    user: CurrentUser,
    db: DbSession,
    page: Annotated[PageParams, Depends(page_params)],
) -> list[MemorialSummaryOut]:
    """Only memorials where the caller holds a real membership.

    The browser never receives the full memorial table. The body stays an array
    (the frontend contract) and paging metadata travels in headers.
    """
    result = repository.list_for_user(db, user.id, limit=page.limit, cursor=page.cursor)
    apply_page_headers(response, result)
    return [memorial_summary_out(memorial) for memorial in result.items]


# ─── Authenticated: memorial CRUD ───────────────────────────────────────────


@router.post("", response_model=MemorialDetailOut, status_code=status.HTTP_201_CREATED)
def create_memorial(
    payload: MemorialCreate,
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> MemorialDetailOut:
    """Create a memorial. The authenticated caller becomes its primary steward.

    Ownership is never taken from the request body — the schema forbids those
    fields outright, so a client cannot even attempt it.
    """
    memorial = service.create_memorial(db, actor=user, payload=payload, request=request)
    access = service.access_for(db, memorial, user)
    return memorial_detail_out(
        db,
        memorial,
        access,
        story=memorial.story,
        timeline=memorial.timeline_events,
        legacy_links=memorial.legacy_links,
    )


@router.get("/{memorial_id}", response_model=MemorialDetailOut)
def get_memorial(
    response: Response,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.VIEW))],
    user: CurrentUser,
    db: DbSession,
) -> MemorialDetailOut:
    access = resolve_access(db, memorial, user)
    detail = memorial_detail_out(
        db,
        memorial,
        access,
        story=memorial.story,
        timeline=memorial.timeline_events,
        legacy_links=memorial.legacy_links,
    )
    response.headers["ETag"] = etag(memorial.version)
    return detail


@router.patch("/{memorial_id}", response_model=MemorialDetailOut)
def update_memorial(
    payload: MemorialUpdate,
    request: Request,
    response: Response,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.VIEW))],
    user: CurrentUser,
    db: DbSession,
) -> MemorialDetailOut:
    """Partial update.

    The dependency proves membership and read access; `update_memorial` then
    checks each submitted field against the permission that field requires, so a
    biographer can edit the story without being able to rename the memorial.

    Send `If-Match: <version>` to make the write conditional. A stale version is a
    409 rather than a silent overwrite of someone else's edit.
    """
    ensure_version(
        current=memorial.version,
        expected=parse_if_match(request),
        what="memorial",
    )

    access = resolve_access(db, memorial, user)
    updated = service.update_memorial(
        db, memorial=memorial, access=access, payload=payload, request=request
    )
    detail = memorial_detail_out(
        db,
        updated,
        access,
        story=updated.story,
        timeline=updated.timeline_events,
        legacy_links=updated.legacy_links,
    )
    response.headers["ETag"] = etag(updated.version)
    return detail


@router.post("/{memorial_id}/publication", response_model=MemorialDetailOut)
def set_publication(
    payload: MemorialPublishRequest,
    request: Request,
    response: Response,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.PUBLISH))],
    user: CurrentUser,
    db: DbSession,
) -> MemorialDetailOut:
    ensure_version(
        current=memorial.version,
        expected=parse_if_match(request),
        what="memorial",
    )

    access = resolve_access(db, memorial, user)
    updated = service.set_publication_state(
        db,
        memorial=memorial,
        access=access,
        state=PublicationState(payload.publication_state),
        request=request,
    )
    return memorial_detail_out(
        db,
        updated,
        access,
        story=updated.story,
        timeline=updated.timeline_events,
        legacy_links=updated.legacy_links,
    )


@router.delete("/{memorial_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_memorial(
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.DELETE))],
    user: CurrentUser,
    db: DbSession,
) -> Response:
    access = resolve_access(db, memorial, user)
    service.delete_memorial(db, memorial=memorial, access=access, request=request)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{memorial_id}/permissions", response_model=PermissionCatalogOut)
def permission_catalog(
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.VIEW))],
    user: CurrentUser,
    db: DbSession,
) -> PermissionCatalogOut:
    """Lets the UI hide controls the server would refuse.

    A convenience for the interface, never a substitute for the checks above.
    """
    access = resolve_access(db, memorial, user)
    return PermissionCatalogOut(
        my_role=access.role,
        my_permissions=sorted(permission.value for permission in access.permissions),
        role_permissions={
            role: sorted(permission.value for permission in permissions)
            for role, permissions in ROLE_PERMISSIONS.items()
        },
        available_permissions=sorted(permission.value for permission in MemorialPermission),
    )


# ─── Timeline ───────────────────────────────────────────────────────────────


@router.post(
    "/{memorial_id}/timeline",
    response_model=TimelineEventOut,
    status_code=status.HTTP_201_CREATED,
)
def add_timeline_event(
    payload: TimelineEventIn,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.MANAGE_TIMELINE))],
    user: CurrentUser,
    db: DbSession,
) -> TimelineEventOut:
    access = resolve_access(db, memorial, user)
    event = service.add_timeline_event(
        db, memorial=memorial, access=access, payload=payload, request=request
    )
    return TimelineEventOut(
        id=str(event.id),
        year=event.year,
        date_str=event.date_str,
        title=event.title,
        description=event.description,
        location=event.location,
        media_url=event.media_url,
        category=event.category,
    )


@router.patch("/{memorial_id}/timeline/{event_id}", response_model=TimelineEventOut)
def update_timeline_event(
    event_id: uuid.UUID,
    payload: TimelineEventIn,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.MANAGE_TIMELINE))],
    user: CurrentUser,
    db: DbSession,
) -> TimelineEventOut:
    access = resolve_access(db, memorial, user)
    event = service.get_timeline_event(db, memorial_id=memorial.id, event_id=event_id)
    updated = service.update_timeline_event(
        db, memorial=memorial, access=access, event=event, payload=payload, request=request
    )
    return TimelineEventOut(
        id=str(updated.id),
        year=updated.year,
        date_str=updated.date_str,
        title=updated.title,
        description=updated.description,
        location=updated.location,
        media_url=updated.media_url,
        category=updated.category,
    )


@router.delete("/{memorial_id}/timeline/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_timeline_event(
    event_id: uuid.UUID,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.MANAGE_TIMELINE))],
    user: CurrentUser,
    db: DbSession,
) -> Response:
    access = resolve_access(db, memorial, user)
    event = service.get_timeline_event(db, memorial_id=memorial.id, event_id=event_id)
    service.delete_timeline_event(
        db, memorial=memorial, access=access, event=event, request=request
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ─── Public ─────────────────────────────────────────────────────────────────


@public_router.get("/memorials/{slug}", response_model=MemorialPublicOut)
def get_public_memorial(
    slug: str,
    response: Response,
    db: DbSession,
    user: OptionalUser,
) -> MemorialPublicOut:
    """Anonymous-safe projection.

    A private or family memorial returns 404 for anyone who is not a member, so
    the endpoint cannot be used to discover whether a memorial exists.
    """
    memorial = repository.get_by_slug(db, slug)
    if memorial is None:
        raise NotFoundError("Memorial not found")

    access = resolve_access(db, memorial, user)

    if not can_view_memorial(access):
        raise NotFoundError("Memorial not found")

    if memorial.privacy == PrivacyLevel.UNLISTED.value:
        # Reachable by exact URL, but must never be indexed.
        response.headers["X-Robots-Tag"] = "noindex, nofollow"

    return memorial_public_out(
        db,
        memorial,
        story=memorial.story,
        timeline=memorial.timeline_events,
        legacy_links=memorial.legacy_links,
    )


@public_router.get("/search", response_model=PaginatedSearchOut)
def search_public_memorials(
    db: DbSession,
    _: Annotated[None, Depends(rate_limit("public_search", limit=60, window_seconds=60))],
    q: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PaginatedSearchOut:
    """Search covers published, public, index-enabled memorials only.

    Family and unlisted memorials never appear in results — they are reachable
    solely by their exact URL.
    """
    memorials = repository.list_publicly_discoverable(db, query=q, limit=limit, offset=offset)
    results = [
        SearchResultOut(
            slug=memorial.slug,
            full_name=memorial.full_name,
            birth_date=memorial.birth_date or "",
            death_date=memorial.death_date or "",
            birth_place=memorial.birth_place or "",
            short_epitaph=memorial.short_epitaph or "",
            portrait_url=memorial.portrait_url,
            verification_status=memorial.verification_state,
        )
        for memorial in memorials
    ]
    return PaginatedSearchOut(
        results=results, total_returned=len(results), limit=limit, offset=offset
    )
