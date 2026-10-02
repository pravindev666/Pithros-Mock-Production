"""Schemas for the account-deletion lifecycle."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class DeletionRequestCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    confirm_email: str = Field(alias="confirmEmail", min_length=3, max_length=320)
    reason: str | None = Field(default=None, max_length=2000)


class DeletionDispositionOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    memorial_id: str = Field(alias="memorialId")
    memorial_name: str = Field(alias="memorialName")
    memorial_slug: str = Field(alias="memorialSlug")
    disposition: str
    status: str
    successor_email: str | None = Field(default=None, alias="successorEmail")
    completed_at: datetime | None = Field(default=None, alias="completedAt")


class DeletionRequestOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    status: str
    reason: str | None = None
    requested_at: datetime = Field(alias="requestedAt")
    verified_at: datetime | None = Field(default=None, alias="verifiedAt")
    scheduled_for: datetime | None = Field(default=None, alias="scheduledFor")
    executed_at: datetime | None = Field(default=None, alias="executedAt")
    cancelled_at: datetime | None = Field(default=None, alias="cancelledAt")
    rejection_reason: str | None = Field(default=None, alias="rejectionReason")
    dispositions: list[DeletionDispositionOut] = []


class DispositionUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    memorial_id: uuid.UUID = Field(alias="memorialId")
    disposition: str = Field(description="transfer | delete | orphan")
    successor_email: EmailStr | None = Field(default=None, alias="successorEmail")


class AdminDeletionRow(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    user_id: str = Field(alias="userId")
    user_email: str = Field(alias="userEmail")
    status: str
    requested_at: datetime = Field(alias="requestedAt")
    scheduled_for: datetime | None = Field(default=None, alias="scheduledFor")
    executed_at: datetime | None = Field(default=None, alias="executedAt")
    disposition_count: int = Field(default=0, alias="dispositionCount")
