"""Tribute schemas. Field names match the frontend's existing `Tribute` shape."""

from __future__ import annotations

from pydantic import Field

from app.core.enums import TributeStatus
from app.core.schemas import StrictModel


class TributeSubmissionRequest(StrictModel):
    """Note the absence of `isApproved`.

    The frontend type omits it too, and the server decides the status — a client
    marking its own tribute approved is exactly what this replaces.
    """

    author_name: str = Field(min_length=1, max_length=200)
    author_email: str | None = Field(default=None, max_length=320)
    relationship: str | None = Field(default=None, max_length=120)
    message: str = Field(min_length=1, max_length=4000)
    avatar_url: str | None = None
    photo_url: str | None = None


class TributeModerationRequest(StrictModel):
    status: TributeStatus
    is_pinned: bool | None = None
    reason: str | None = Field(default=None, max_length=500)
