"""User schemas.

`UserOut` deliberately keeps snake_case field names: it must match the frontend's
existing `PithrosUserRecord` shape, which is the one response model that does not
use the camelCase alias generator.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.schemas import StrictModel


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    firebase_uid: str
    name: str
    email: str
    role: str
    admin_subrole: str | None = None
    avatar: str | None = None
    phone: str | None = None
    status: str
    email_verified: bool
    phone_verified: bool
    mfa_enabled: bool
    created_at: datetime
    updated_at: datetime


class UserUpdate(StrictModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    phone: str | None = Field(default=None, max_length=32)
    avatar: str | None = None

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str | None) -> str | None:
        return value.strip() if value else value
