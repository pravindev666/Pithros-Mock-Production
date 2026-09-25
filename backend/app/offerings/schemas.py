"""Remembrance offering schemas."""

from __future__ import annotations

from pydantic import Field

from app.core.enums import OfferingType
from app.core.schemas import StrictModel


class OfferingSubmissionRequest(StrictModel):
    """Anonymous visitors may place permitted offerings, so no account is required."""

    type: OfferingType
    sender_name: str = Field(default="Anonymous", max_length=200)
    message: str | None = Field(default=None, max_length=1000)
