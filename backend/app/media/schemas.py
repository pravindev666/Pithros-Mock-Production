"""Media request/response schemas."""

from __future__ import annotations

from pydantic import Field

from app.core.enums import MediaKind, PrivacyLevel
from app.core.schemas import CamelModel, StrictModel


class UploadIntentRequest(StrictModel):
    filename: str = Field(min_length=1, max_length=255)
    content_type: str | None = Field(default=None, max_length=128)
    size_bytes: int | None = Field(default=None, ge=0)
    kind: MediaKind
    title: str = Field(default="", max_length=200)
    caption: str | None = None
    year: str | None = Field(default=None, max_length=16)
    privacy: PrivacyLevel = PrivacyLevel.PRIVATE


class UploadIntentResponse(CamelModel):
    """Note the absence of the storage bucket and object key.

    The client gets a one-shot upload URL and an opaque media id; nothing that
    would let it address storage directly or derive a permanent URL.
    """

    media_id: str
    upload_url: str
    method: str = "PUT"
    headers: dict[str, str] = Field(default_factory=dict)
    expires_in: int
    max_bytes: int


class UploadCompleteResponse(CamelModel):
    media_id: str
    status: str
    kind: str
    size_bytes: int
    width: int | None = None
    height: int | None = None
    thumbnail_pending: bool = True


class MediaUpdateRequest(StrictModel):
    title: str | None = Field(default=None, max_length=200)
    caption: str | None = None
    year: str | None = Field(default=None, max_length=16)
    privacy: PrivacyLevel | None = None
