"""Public tribute and offering submission.

Both are anonymous-capable, so both are rate limited by client IP — the abuse
surface here is the open internet rather than an authenticated user.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.auth.dependencies import OptionalUser
from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.memorials import service as memorial_service
from app.memorials.projections import load_offerings, load_tributes, offering_out, tribute_out
from app.memorials.schemas import OfferingOut, TributeOut
from app.offerings import service as offering_service
from app.offerings.schemas import OfferingSubmissionRequest
from app.tributes import service as tribute_service
from app.tributes.schemas import TributeSubmissionRequest

router = APIRouter(prefix="/public/memorials/{slug}", tags=["Tributes"])

DbSession = Annotated[Session, Depends(get_db)]
SubmitLimit = Annotated[None, Depends(rate_limit("public_submission", limit=10, window_seconds=60))]


@router.post("/tributes", response_model=TributeOut, status_code=status.HTTP_201_CREATED)
def submit_tribute(
    slug: str,
    payload: TributeSubmissionRequest,
    request: Request,
    db: DbSession,
    user: OptionalUser,
    _: SubmitLimit,
) -> TributeOut:
    """Submit a tribute.

    Persisted as PENDING_MODERATION unless the author is a member of the
    memorial. The old client-side `isApproved: true` is gone — the server decides.
    """
    memorial, access = memorial_service.resolve_public_access(db, slug, user)
    tribute = tribute_service.submit_tribute(
        db, memorial=memorial, access=access, payload=payload, request=request
    )
    return tribute_out(tribute)


@router.post("/offerings", response_model=OfferingOut, status_code=status.HTTP_201_CREATED)
def submit_offering(
    slug: str,
    payload: OfferingSubmissionRequest,
    request: Request,
    db: DbSession,
    user: OptionalUser,
    _: SubmitLimit,
) -> OfferingOut:
    memorial, access = memorial_service.resolve_public_access(db, slug, user)
    offering = offering_service.submit_offering(
        db, memorial=memorial, access=access, payload=payload, request=request
    )
    return offering_out(offering)


@router.get("/tributes", response_model=list[TributeOut])
def list_tributes(slug: str, db: DbSession, user: OptionalUser) -> list[TributeOut]:
    """Approved tributes only, unless the caller is a member of the memorial."""
    memorial, access = memorial_service.resolve_public_access(db, slug, user)
    tributes = load_tributes(db, memorial.id, include_unapproved=access.is_member)
    return [tribute_out(tribute) for tribute in tributes]


@router.get("/offerings", response_model=list[OfferingOut])
def list_offerings(slug: str, db: DbSession, user: OptionalUser) -> list[OfferingOut]:
    memorial, _ = memorial_service.resolve_public_access(db, slug, user)
    return [offering_out(offering) for offering in load_offerings(db, memorial.id)]
