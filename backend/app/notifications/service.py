"""Notification creation and retrieval.

Creation shares the caller's transaction on purpose: a decision and the
notification about it must land together, or neither should.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import cast

from sqlalchemy import CursorResult, func, select, update
from sqlalchemy.orm import Session

from app.core.enums import AdminSubRole, NotificationType, UserRole
from app.memorials.models import Memorial
from app.notifications.models import Notification
from app.notifications.schemas import NotificationOut
from app.users.models import User


def notify(
    db: Session,
    *,
    user_id: uuid.UUID,
    notification_type: NotificationType,
    title: str,
    body: str,
    payload: dict | None = None,
) -> Notification:
    record = Notification(
        user_id=user_id,
        type=notification_type.value,
        title=title[:200],
        body=body,
        payload=payload or {},
    )
    db.add(record)
    db.flush()
    return record


def notify_reviewers(
    db: Session,
    *,
    notification_type: NotificationType = NotificationType.VERIFICATION_SUBMITTED,
    title: str,
    body: str,
    payload: dict | None = None,
) -> list[Notification]:
    """Tell every user who can act on the verification queue.

    Recipients are resolved from the database, so a reviewable item never
    silently lands nowhere — if no reviewer exists, nothing is created.
    """
    reviewer_ids = db.scalars(
        select(User.id).where(
            User.role == UserRole.ADMIN.value,
            User.admin_subrole.in_(
                [
                    AdminSubRole.VERIFICATION_REVIEWER.value,
                    AdminSubRole.SUPER_ADMIN.value,
                ]
            ),
            User.deleted_at.is_(None),
        )
    ).all()
    return [
        notify(
            db,
            user_id=reviewer_id,
            notification_type=notification_type,
            title=title,
            body=body,
            payload=payload,
        )
        for reviewer_id in reviewer_ids
    ]


def notify_provider_managers(
    db: Session,
    *,
    notification_type: NotificationType = NotificationType.VERIFICATION_SUBMITTED,
    title: str,
    body: str,
    payload: dict | None = None,
) -> list[Notification]:
    """Tell every admin who can act on the partner queue.

    Same principle as the verification queue: recipients come from the database,
    so a submitted application never silently lands nowhere.
    """
    manager_ids = db.scalars(
        select(User.id).where(
            User.role == UserRole.ADMIN.value,
            User.admin_subrole.in_(
                [
                    AdminSubRole.PROVIDER_MANAGER.value,
                    AdminSubRole.SUPER_ADMIN.value,
                ]
            ),
            User.deleted_at.is_(None),
        )
    ).all()
    return [
        notify(
            db,
            user_id=manager_id,
            notification_type=notification_type,
            title=title,
            body=body,
            payload=payload,
        )
        for manager_id in manager_ids
    ]


def notify_memorial_stewards(
    db: Session,
    *,
    memorial: Memorial,
    notification_type: NotificationType = NotificationType.TRIBUTE_PENDING,
    title: str,
    body: str,
    payload: dict | None = None,
) -> list[Notification]:
    """Tell the memorial's stewards; each steward is notified once."""
    seen: set[uuid.UUID] = set()
    created: list[Notification] = []
    for steward in memorial.stewards:
        if steward.user_id in seen:
            continue
        seen.add(steward.user_id)
        created.append(
            notify(
                db,
                user_id=steward.user_id,
                notification_type=notification_type,
                title=title,
                body=body,
                payload=payload,
            )
        )
    return created


def list_for_user(
    db: Session, user_id: uuid.UUID, *, limit: int = 50, offset: int = 0
) -> tuple[list[Notification], int]:
    items = db.scalars(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc(), Notification.id)
        .limit(limit)
        .offset(offset)
    ).all()
    unread = db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == user_id, Notification.read_at.is_(None))
    )
    return list(items), int(unread or 0)


def mark_read(
    db: Session, *, user_id: uuid.UUID, notification_id: uuid.UUID
) -> Notification | None:
    """Mark one notification read. Someone else's id resolves to None (404)."""
    record = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )
    if record is None:
        return None
    if record.read_at is None:
        record.read_at = datetime.now(UTC)
        db.flush()
    return record


def mark_all_read(db: Session, user_id: uuid.UUID) -> int:
    result = cast(
        CursorResult,
        db.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
            .values(read_at=datetime.now(UTC))
        ),
    )
    db.flush()
    return int(result.rowcount or 0)


def to_out(record: Notification) -> NotificationOut:
    return NotificationOut(
        id=str(record.id),
        type=record.type,
        title=record.title,
        body=record.body,
        payload=record.payload or {},
        read_at=record.read_at,
        created_at=record.created_at,
    )
