"""Public tribute and offering submission.

Both are anonymous-capable, so both are rate limited by client IP — the abuse
surface here is the open internet rather than an authenticated user.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, OptionalUser
from app.core.database import get_db
from app.core.enums import MemorialPermission, TributeStatus
from app.core.idempotency import record, reserve, subject_for
from app.core.pagination import PageParams, apply_page_headers, page_params
from app.core.rate_limit import rate_limit
from app.memorials import service as memorial_service
from app.memorials.models import Memorial
from app.memorials.permissions import authorized, resolve_access
from app.memorials.projections import load_offerings, load_tributes, offering_out, tribute_out
from app.memorials.schemas import OfferingOut, TributeOut
from app.offerings import service as offering_service
from app.offerings.schemas import OfferingSubmissionRequest
from app.tributes import service as tribute_service
from app.tributes.schemas import TributeModerationRequest, TributeSubmissionRequest

router = APIRouter(prefix="/public/memorials/{slug}", tags=["Tributes"])
moderation_router = APIRouter(prefix="/memorials/{memorial_id}/tributes", tags=["Tributes"])

DbSession = Annotated[Session, Depends(get_db)]
SubmitLimit = Annotated[None, Depends(rate_limit("public_submission", limit=10, window_seconds=60))]


@moderation_router.get("", response_model=list[TributeOut])
def list_tributes_for_moderation(
    response: Response,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.MANAGE_TRIBUTES))],
    db: DbSession,
    page: Annotated[PageParams, Depends(page_params)],
    status_filter: Annotated[TributeStatus | None, Query(alias="status")] = None,
) -> list[TributeOut]:
    """Moderation queue.

    Unlike the public list, this returns every status — it is the only way a
    steward sees a pending submission.
    """
    result = tribute_service.list_for_moderation(
        db,
        memorial_id=memorial.id,
        status=status_filter,
        limit=page.limit,
        cursor=page.cursor,
    )
    apply_page_headers(response, result)
    return [tribute_out(tribute) for tribute in result.items]


@moderation_router.patch("/{tribute_id}", response_model=TributeOut)
def moderate_tribute(
    tribute_id: uuid.UUID,
    payload: TributeModerationRequest,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.MANAGE_TRIBUTES))],
    user: CurrentUser,
    db: DbSession,
) -> TributeOut:
    """Approve, reject, hide or pin a tribute.

    Anonymous submissions arrive in PENDING_MODERATION and stay invisible to the
    public until someone with MANAGE_TRIBUTES decides otherwise.
    """
    access = resolve_access(db, memorial, user)
    tribute = tribute_service.moderate_tribute(
        db,
        memorial=memorial,
        access=access,
        tribute_id=tribute_id,
        payload=payload,
        request=request,
    )
    return tribute_out(tribute)


@moderation_router.delete("/{tribute_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tribute(
    tribute_id: uuid.UUID,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.MANAGE_TRIBUTES))],
    user: CurrentUser,
    db: DbSession,
) -> Response:
    access = resolve_access(db, memorial, user)
    tribute_service.delete_tribute(
        db, memorial=memorial, access=access, tribute_id=tribute_id, request=request
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/tributes", response_model=TributeOut, status_code=status.HTTP_201_CREATED)
def submit_tribute(
    slug: str,
    payload: TributeSubmissionRequest,
    request: Request,
    db: DbSession,
    user: OptionalUser,
    _: SubmitLimit,
) -> TributeOut | JSONResponse:
    """Submit a tribute.

    Persisted as PENDING_MODERATION unless the author is a member of the
    memorial. The old client-side `isApproved: true` is gone — the server decides.

    Repeating the request with the same `Idempotency-Key` returns the original
    response instead of creating a second tribute.
    """
    subject = subject_for(request, user)
    replay = reserve(
        request,
        endpoint="tributes.submit",
        body=payload.model_dump(mode="json"),
        subject=subject,
    )
    if replay is not None:
        return JSONResponse(status_code=replay.status_code, content=replay.body)

    memorial, access = memorial_service.resolve_public_access(db, slug, user)
    tribute = tribute_service.submit_tribute(
        db, memorial=memorial, access=access, payload=payload, request=request
    )
    out = tribute_out(tribute)
    record(request, subject=subject, status_code=201, body=out)
    return out


@router.post("/offerings", response_model=OfferingOut, status_code=status.HTTP_201_CREATED)
def submit_offering(
    slug: str,
    payload: OfferingSubmissionRequest,
    request: Request,
    db: DbSession,
    user: OptionalUser,
    _: SubmitLimit,
) -> OfferingOut | JSONResponse:
    subject = subject_for(request, user)
    replay = reserve(
        request,
        endpoint="offerings.submit",
        body=payload.model_dump(mode="json"),
        subject=subject,
    )
    if replay is not None:
        return JSONResponse(status_code=replay.status_code, content=replay.body)

    memorial, access = memorial_service.resolve_public_access(db, slug, user)
    offering = offering_service.submit_offering(
        db, memorial=memorial, access=access, payload=payload, request=request
    )
    out = offering_out(offering)
    record(request, subject=subject, status_code=201, body=out)
    return out


@router.get("/tributes", response_model=list[TributeOut])
def list_tributes(
    slug: str,
    response: Response,
    db: DbSession,
    user: OptionalUser,
    page: Annotated[PageParams, Depends(page_params)],
) -> list[TributeOut]:
    """Approved tributes only, unless the caller is a member of the memorial."""
    memorial, access = memorial_service.resolve_public_access(db, slug, user)
    result = load_tributes(
        db,
        memorial.id,
        include_unapproved=access.is_member,
        limit=page.limit,
        cursor=page.cursor,
    )
    apply_page_headers(response, result)
    return [tribute_out(tribute) for tribute in result.items]


@router.get("/offerings", response_model=list[OfferingOut])
def list_offerings(
    slug: str,
    response: Response,
    db: DbSession,
    user: OptionalUser,
    page: Annotated[PageParams, Depends(page_params)],
) -> list[OfferingOut]:
    memorial, _ = memorial_service.resolve_public_access(db, slug, user)
    result = load_offerings(db, memorial.id, limit=page.limit, cursor=page.cursor)
    apply_page_headers(response, result)
    return [offering_out(offering) for offering in result.items]
