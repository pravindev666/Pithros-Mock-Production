"""Memorial endpoints.

Route bodies stay thin: they resolve dependencies, delegate to the service, and
project the result. Every mutating route names the permission it requires, and
the dependency refuses the request before the body runs.
"""

from __future__ import annotations

import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, OptionalUser
from app.core.concurrency import ensure_version, etag, parse_if_match
from app.core.database import get_db
from app.core.enums import MemorialPermission, PrivacyLevel, PublicationState, UserRole
from app.core.errors import ForbiddenError, NotFoundError
from app.core.idempotency import record, reserve, subject_for
from app.core.pagination import PageParams, apply_page_headers, page_params
from app.core.rate_limit import rate_limit, user_rate_limit
from app.memorials import cache, repository, service
from app.memorials.models import DigitalLegacyLink, Memorial
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
    ArchiveExportOut,
    ArchiveExportStatusOut,
    DigitalLegacyLinkIn,
    DigitalLegacyLinkOut,
    DigitalLegacyLinksReplace,
    DigitalLegacyLinkUpdate,
    DuplicateScreeningOut,
    DuplicateScreeningRequest,
    MemorialCreate,
    MemorialDetailOut,
    MemorialMergeRequest,
    MemorialPublicOut,
    MemorialPublishRequest,
    MemorialSummaryOut,
    MemorialUpdate,
    PaginatedSearchOut,
    PermissionCatalogOut,
    SearchResultOut,
    StewardTransferRequest,
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
    return [memorial_summary_out(memorial, db) for memorial in result.items]


# ─── Authenticated: memorial CRUD ───────────────────────────────────────────


@router.post("", response_model=MemorialDetailOut, status_code=status.HTTP_201_CREATED)
def create_memorial(
    payload: MemorialCreate,
    request: Request,
    user: CurrentUser,
    db: DbSession,
    _: Annotated[None, Depends(user_rate_limit("memorial_create", limit=10, window_seconds=3600))],
) -> MemorialDetailOut | JSONResponse:
    """Create a memorial. The authenticated caller becomes its primary steward.

    Ownership is never taken from the request body — the schema forbids those
    fields outright, so a client cannot even attempt it.

    Repeating the request with the same `Idempotency-Key` returns the original
    memorial instead of creating a duplicate.
    """
    subject = subject_for(request, user)
    replay = reserve(
        request,
        endpoint="memorials.create",
        body=payload.model_dump(mode="json"),
        subject=subject,
    )
    if replay is not None:
        return JSONResponse(status_code=replay.status_code, content=replay.body)

    memorial = service.create_memorial(db, actor=user, payload=payload, request=request)
    access = service.access_for(db, memorial, user)
    detail = memorial_detail_out(
        db,
        memorial,
        access,
        story=memorial.story,
        timeline=memorial.timeline_events,
        legacy_links=memorial.legacy_links,
    )
    record(request, subject=subject, status_code=201, body=detail)
    return detail


@router.post("/screening/duplicate-check", response_model=DuplicateScreeningOut)
def check_duplicate_memorial(
    payload: DuplicateScreeningRequest,
    user: CurrentUser,
    db: DbSession,
) -> DuplicateScreeningOut:
    """Privacy-safe duplicate screening check during creation or publication."""
    from app.memorials import identity

    return identity.screen_for_duplicates(db, actor=user, payload=payload)


@router.post("/admin/merge", response_model=MemorialDetailOut)
def merge_memorials_admin(
    payload: MemorialMergeRequest,
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> MemorialDetailOut:
    """Super Admin merges a duplicate memorial into a canonical memorial."""
    if user.role != UserRole.ADMIN.value:
        raise ForbiddenError("Administrative privileges required to merge memorials.")
    from app.memorials import identity

    canonical = identity.merge_memorials(
        db,
        canonical_id=payload.canonical_memorial_id,
        duplicate_id=payload.duplicate_memorial_id,
        actor=user,
        request=request,
        carry_over_tributes=payload.carry_over_tributes,
        carry_over_media=payload.carry_over_media,
        carry_over_timeline=payload.carry_over_timeline,
        co_stewardship=payload.co_stewardship,
    )
    access = service.access_for(db, canonical, user)
    return memorial_detail_out(
        db,
        canonical,
        access,
        story=canonical.story,
        timeline=canonical.timeline_events,
        legacy_links=canonical.legacy_links,
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


@router.post("/{memorial_id}/transfer-stewardship", response_model=MemorialDetailOut)
def transfer_stewardship(
    payload: StewardTransferRequest,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.TRANSFER_STEWARDSHIP))],
    user: CurrentUser,
    db: DbSession,
) -> MemorialDetailOut:
    """Transfer primary stewardship of the memorial to a family successor or co-steward."""
    updated = service.transfer_stewardship(
        db,
        memorial=memorial,
        actor=user,
        payload=payload,
        request=request,
    )
    access = resolve_access(db, updated, user)
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


# ─── Digital Legacy Links ───────────────────────────────────────────────────


def _legacy_link_out(link: DigitalLegacyLink) -> DigitalLegacyLinkOut:
    return DigitalLegacyLinkOut(
        id=str(link.id),
        platform=link.platform,
        label=link.label,
        url=link.url,
        notes=link.notes,
    )


@router.get("/{memorial_id}/legacy-links", response_model=list[DigitalLegacyLinkOut])
def list_legacy_links(
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.VIEW))],
) -> list[DigitalLegacyLinkOut]:
    return [_legacy_link_out(link) for link in memorial.legacy_links]


@router.post(
    "/{memorial_id}/legacy-links",
    response_model=DigitalLegacyLinkOut,
    status_code=status.HTTP_201_CREATED,
)
def add_legacy_link(
    payload: DigitalLegacyLinkIn,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.EDIT_DETAILS))],
    user: CurrentUser,
    db: DbSession,
) -> DigitalLegacyLinkOut:
    access = resolve_access(db, memorial, user)
    link = service.add_legacy_link(
        db, memorial=memorial, access=access, payload=payload, request=request
    )
    return _legacy_link_out(link)


@router.put("/{memorial_id}/legacy-links", response_model=list[DigitalLegacyLinkOut])
def replace_legacy_links(
    payload: DigitalLegacyLinksReplace,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.EDIT_DETAILS))],
    user: CurrentUser,
    db: DbSession,
) -> list[DigitalLegacyLinkOut]:
    access = resolve_access(db, memorial, user)
    created = service.replace_legacy_links(
        db, memorial=memorial, access=access, links=payload.links, request=request
    )
    return [_legacy_link_out(link) for link in created]


@router.get("/{memorial_id}/legacy-links/{link_id}", response_model=DigitalLegacyLinkOut)
def get_legacy_link(
    link_id: uuid.UUID,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.VIEW))],
    db: DbSession,
) -> DigitalLegacyLinkOut:
    link = service.get_legacy_link(db, memorial_id=memorial.id, link_id=link_id)
    return _legacy_link_out(link)


@router.patch("/{memorial_id}/legacy-links/{link_id}", response_model=DigitalLegacyLinkOut)
def update_legacy_link(
    link_id: uuid.UUID,
    payload: DigitalLegacyLinkUpdate,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.EDIT_DETAILS))],
    user: CurrentUser,
    db: DbSession,
) -> DigitalLegacyLinkOut:
    access = resolve_access(db, memorial, user)
    link = service.get_legacy_link(db, memorial_id=memorial.id, link_id=link_id)
    updated = service.update_legacy_link(
        db, memorial=memorial, access=access, link=link, payload=payload, request=request
    )
    return _legacy_link_out(updated)


@router.delete("/{memorial_id}/legacy-links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_legacy_link(
    link_id: uuid.UUID,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.EDIT_DETAILS))],
    user: CurrentUser,
    db: DbSession,
) -> Response:
    access = resolve_access(db, memorial, user)
    link = service.get_legacy_link(db, memorial_id=memorial.id, link_id=link_id)
    service.delete_legacy_link(db, memorial=memorial, access=access, link=link, request=request)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ─── Public ─────────────────────────────────────────────────────────────────


@public_router.get("/memorials/{slug}", response_model=MemorialPublicOut)
def get_public_memorial(
    slug: str,
    response: Response,
    db: DbSession,
    user: OptionalUser,
) -> MemorialPublicOut | JSONResponse:
    """Anonymous-safe projection with Redis read caching.

    A private or family memorial returns 404 for anyone who is not a member, so
    the endpoint cannot be used to discover whether a memorial exists.
    """
    if user is None:
        cached = cache.get_cached_public_memorial(slug)
        if cached is not None:
            return JSONResponse(content=cached, headers={"X-Cache": "HIT"})

    memorial = repository.get_by_slug(db, slug)
    if memorial is None:
        raise NotFoundError("Memorial not found")

    # QR & Link Permanence: If this memorial was merged into another,
    # follow the pointer to canonical.
    if memorial.merged_into_id is not None:
        canonical = repository.get_by_id(db, memorial.merged_into_id)
        if canonical is not None:
            memorial = canonical
            slug = canonical.slug
            response.headers["X-Pithros-Merged-Canonical"] = canonical.slug

    access = resolve_access(db, memorial, user)

    if not can_view_memorial(access):
        raise NotFoundError("Memorial not found")

    if memorial.privacy == PrivacyLevel.UNLISTED.value:
        # Reachable by exact URL, but must never be indexed.
        response.headers["X-Robots-Tag"] = "noindex, nofollow"

    result = memorial_public_out(
        db,
        memorial,
        story=memorial.story,
        timeline=memorial.timeline_events,
        legacy_links=memorial.legacy_links,
    )

    if user is None and memorial.publication_state == PublicationState.PUBLISHED.value:
        cache.set_cached_public_memorial(slug, result.model_dump(mode="json", by_alias=True))

    response.headers["X-Cache"] = "MISS"
    return result


@public_router.get("/search", response_model=PaginatedSearchOut)
def search_public_memorials(
    db: DbSession,
    _: Annotated[None, Depends(rate_limit("public_search", limit=60, window_seconds=60))],
    q: Annotated[str | None, Query(max_length=120)] = None,
    city: Annotated[str | None, Query(max_length=120)] = None,
    year_from: Annotated[int | None, Query(ge=1000, le=2200)] = None,
    year_to: Annotated[int | None, Query(ge=1000, le=2200)] = None,
    birth_year_from: Annotated[int | None, Query(ge=1000, le=2200)] = None,
    birth_year_to: Annotated[int | None, Query(ge=1000, le=2200)] = None,
    death_year_from: Annotated[int | None, Query(ge=1000, le=2200)] = None,
    death_year_to: Annotated[int | None, Query(ge=1000, le=2200)] = None,
    verification_status: Annotated[str | None, Query(max_length=64)] = None,
    sort_by: Annotated[
        Literal[
            "recent",
            "name_asc",
            "name_desc",
            "birth_date_asc",
            "birth_date_desc",
            "death_date_asc",
            "death_date_desc",
        ],
        Query(),
    ] = "recent",
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PaginatedSearchOut:
    """Search covers published, public, index-enabled memorials only.

    Family and unlisted memorials never appear in results — they are reachable
    solely by their exact URL.
    """
    memorials = repository.list_publicly_discoverable(
        db,
        query=q,
        city=city,
        year_from=year_from,
        year_to=year_to,
        birth_year_from=birth_year_from,
        birth_year_to=birth_year_to,
        death_year_from=death_year_from,
        death_year_to=death_year_to,
        verification_status=verification_status,
        sort_by=sort_by,
        limit=limit,
        offset=offset,
    )
    total_count = repository.count_publicly_discoverable(
        db,
        query=q,
        city=city,
        year_from=year_from,
        year_to=year_to,
        birth_year_from=birth_year_from,
        birth_year_to=birth_year_to,
        death_year_from=death_year_from,
        death_year_to=death_year_to,
        verification_status=verification_status,
    )
    results = [
        SearchResultOut(
            slug=memorial.slug,
            full_name=memorial.full_name,
            birth_date=memorial.birth_date or "",
            death_date=memorial.death_date or "",
            birth_place=memorial.birth_place or "",
            resting_place=memorial.resting_place,
            short_epitaph=memorial.short_epitaph or "",
            portrait_url=memorial.portrait_url,
            verification_status=memorial.verification_state,
            verification_badge_type=memorial.verification_badge_type,
        )
        for memorial in memorials
    ]
    return PaginatedSearchOut(
        results=results,
        total_returned=len(results),
        total_count=total_count,
        limit=limit,
        offset=offset,
    )


@public_router.get(
    "/memorials/{slug}/qr",
    summary="Download or stream QR code for a public memorial",
    response_description="QR code image in PNG or SVG format",
)
def get_public_memorial_qr(
    slug: str,
    db: DbSession,
    _: Annotated[None, Depends(rate_limit("public_qr", limit=60, window_seconds=60))],
    format: Literal["png", "svg"] = Query("png", description="Image format (png or svg)"),
    download: bool = Query(False, description="Whether to trigger file download attachment"),
) -> Response:
    qr_bytes, memorial_slug = service.get_public_memorial_qr_bytes(db, slug=slug, format=format)
    media_type = "image/svg+xml" if format == "svg" else "image/png"
    headers: dict[str, str] = {}
    if download:
        ext = "svg" if format == "svg" else "png"
        headers["Content-Disposition"] = f'attachment; filename="{memorial_slug}-qr.{ext}"'
    return Response(content=qr_bytes, media_type=media_type, headers=headers)


# ─── Authenticated: QR & Archive Exports ───────────────────────────────────


@router.get(
    "/export/status/{task_id}",
    response_model=ArchiveExportStatusOut,
    summary="Check status of background archive export",
)
def get_export_status(
    task_id: str,
    user: CurrentUser,
) -> ArchiveExportStatusOut:
    return service.get_export_status(task_id, actor=user)


@router.get(
    "/{memorial_id}/qr",
    summary="Get memorial QR code for member/steward",
    response_description="QR code image in PNG or SVG format",
)
def get_memorial_qr(
    memorial_id: uuid.UUID,
    db: DbSession,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.VIEW))],
    user: CurrentUser,
    format: Literal["png", "svg"] = Query("png", description="Image format (png or svg)"),
    download: bool = Query(False, description="Whether to trigger file download attachment"),
) -> Response:
    access = resolve_access(db, memorial, user)
    qr_bytes = service.get_memorial_qr_bytes(db, memorial=memorial, access=access, format=format)
    media_type = "image/svg+xml" if format == "svg" else "image/png"
    headers: dict[str, str] = {}
    if download:
        ext = "svg" if format == "svg" else "png"
        headers["Content-Disposition"] = f'attachment; filename="{memorial.slug}-qr.{ext}"'
    return Response(content=qr_bytes, media_type=media_type, headers=headers)


@router.post(
    "/{memorial_id}/export/pdf",
    response_model=ArchiveExportOut,
    summary="Trigger asynchronous archival memorial book PDF export via Celery",
)
def export_memorial_pdf(
    memorial_id: uuid.UUID,
    db: DbSession,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.EXPORT_ARCHIVE))],
    user: CurrentUser,
) -> ArchiveExportOut:
    access = resolve_access(db, memorial, user)
    return service.trigger_pdf_export(db, memorial=memorial, access=access, request=request)


@router.get(
    "/{memorial_id}/export/status/{task_id}",
    response_model=ArchiveExportStatusOut,
    summary="Check status of background archive export for a memorial",
)
def get_memorial_export_status(
    memorial_id: uuid.UUID,
    task_id: str,
    db: DbSession,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.VIEW))],
    user: CurrentUser,
) -> ArchiveExportStatusOut:
    return service.get_export_status(task_id, actor=user, expected_memorial_id=memorial.id)


@router.get(
    "/{memorial_id}/export/pdf/download",
    summary="Directly generate and download archival memorial book PDF",
    response_description="Binary PDF stream",
)
def download_memorial_pdf(
    memorial_id: uuid.UUID,
    db: DbSession,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.EXPORT_ARCHIVE))],
    user: CurrentUser,
) -> Response:
    access = resolve_access(db, memorial, user)
    pdf_bytes = service.generate_direct_pdf_export(
        db, memorial=memorial, access=access, request=request
    )
    filename = f"{memorial.slug}-memorial-book.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
