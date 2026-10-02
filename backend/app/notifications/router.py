"""In-app notification endpoints. A user only ever sees their own notifications."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser
from app.core.database import get_db
from app.core.errors import NotFoundError
from app.notifications import service
from app.notifications.schemas import (
    NotificationListOut,
    NotificationMarkAllOut,
    NotificationOut,
)

router = APIRouter(prefix="/me/notifications", tags=["Notifications"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=NotificationListOut)
def list_notifications(
    user: CurrentUser,
    db: DbSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> NotificationListOut:
    items, unread = service.list_for_user(db, user.id, limit=limit, offset=offset)
    return NotificationListOut(
        notifications=[service.to_out(item) for item in items],
        unread_count=unread,
    )


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: uuid.UUID, user: CurrentUser, db: DbSession) -> NotificationOut:
    record = service.mark_read(db, user_id=user.id, notification_id=notification_id)
    if record is None:
        raise NotFoundError("Notification not found")
    db.commit()
    return service.to_out(record)


@router.post("/read-all", response_model=NotificationMarkAllOut)
def mark_all_read(user: CurrentUser, db: DbSession) -> NotificationMarkAllOut:
    updated = service.mark_all_read(db, user.id)
    db.commit()
    return NotificationMarkAllOut(updated=updated)
