"""Notification wire schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field

from app.core.schemas import CamelModel


class NotificationOut(CamelModel):
    id: str
    type: str
    title: str
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    read_at: datetime | None = None
    created_at: datetime


class NotificationListOut(CamelModel):
    notifications: list[NotificationOut] = Field(default_factory=list)
    unread_count: int = 0


class NotificationMarkAllOut(CamelModel):
    updated: int = 0
