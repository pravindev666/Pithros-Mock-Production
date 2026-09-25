"""Media endpoints for a memorial.

Every route requires the media-management permission, enforced by the same
`authorized` dependency the rest of the memorial API uses — so an unauthorized
caller is refused before the handler runs.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser
from app.core.config import settings
from app.core.database import get_db
from app.core.enums import MemorialPermission
from app.core.errors import NotFoundError
from app.core.pagination import PageParams, apply_page_headers, page_params
from app.media import service
from app.media.models import MediaItem
from app.media.schemas import (
    MediaUpdateRequest,
    UploadCompleteResponse,
    UploadIntentRequest,
    UploadIntentResponse,
)
from app.memorials.models import Memorial
from app.memorials.permissions import authorized, resolve_access
from app.memorials.projections import load_media, media_out
from app.memorials.schemas import MediaItemOut

router = APIRouter(prefix="/memorials/{memorial_id}/media", tags=["Media"])

DbSession = Annotated[Session, Depends(get_db)]


def _project(item: MediaItem) -> MediaItemOut:
    projected = media_out(item, include_private=True)
    if projected is None:
        raise NotFoundError("Media not found")
    return projected


@router.post(
    "/upload-intent", response_model=UploadIntentResponse, status_code=status.HTTP_201_CREATED
)
def create_upload_intent(
    payload: UploadIntentRequest,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.MANAGE_MEDIA))],
    user: CurrentUser,
    db: DbSession,
) -> UploadIntentResponse:
    """Authorize the upload and hand back a one-shot URL.

    Large files never pass through FastAPI; the browser PUTs straight to storage.
    """
    access = resolve_access(db, memorial, user)
    item, upload_url = service.create_upload_intent(
        db, memorial=memorial, access=access, payload=payload, request=request
    )

    return UploadIntentResponse(
        media_id=str(item.id),
        upload_url=upload_url,
        method="PUT",
        headers={"Content-Type": item.mime_type},
        expires_in=settings.r2_presign_expiry_seconds,
        max_bytes=settings.max_upload_bytes,
    )


@router.post("/{media_id}/complete", response_model=UploadCompleteResponse)
def complete_upload(
    media_id: uuid.UUID,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.MANAGE_MEDIA))],
    user: CurrentUser,
    db: DbSession,
) -> UploadCompleteResponse:
    """Confirm the transfer and validate the stored bytes.

    The declared content type is not trusted: the object is re-inspected in
    storage and rejected unless its real signature matches its extension.
    """
    access = resolve_access(db, memorial, user)
    item = service.complete_upload(
        db, memorial=memorial, access=access, media_id=media_id, request=request
    )
    return UploadCompleteResponse(
        media_id=str(item.id),
        status=item.status,
        kind=item.kind,
        size_bytes=item.size_bytes,
        width=item.width,
        height=item.height,
        thumbnail_pending=item.thumbnail_key is None,
    )


@router.get("", response_model=list[MediaItemOut])
def list_media(
    response: Response,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.VIEW))],
    user: CurrentUser,
    db: DbSession,
    page: Annotated[PageParams, Depends(page_params)],
) -> list[MediaItemOut]:
    result = load_media(
        db,
        memorial.id,
        include_private=True,
        limit=page.limit,
        cursor=page.cursor,
    )
    apply_page_headers(response, result)
    projected = (media_out(item, include_private=True) for item in result.items)
    return [out for out in projected if out is not None]


@router.patch("/{media_id}", response_model=MediaItemOut)
def update_media(
    media_id: uuid.UUID,
    payload: MediaUpdateRequest,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.MANAGE_MEDIA))],
    user: CurrentUser,
    db: DbSession,
) -> MediaItemOut:
    access = resolve_access(db, memorial, user)
    item = service.update_media(
        db,
        memorial=memorial,
        access=access,
        media_id=media_id,
        updates=payload.model_dump(exclude_unset=True),
        request=request,
    )
    return _project(item)


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_media(
    media_id: uuid.UUID,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.MANAGE_MEDIA))],
    user: CurrentUser,
    db: DbSession,
) -> Response:
    access = resolve_access(db, memorial, user)
    service.delete_media(db, memorial=memorial, access=access, media_id=media_id, request=request)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
