"""Scheduled lifecycle sweeps: billing expiry, media GC, and task registration.

These close the gap where a state transition only had a manual trigger. The
zero-deletion invariant is asserted directly: expiry changes billing access and
never removes the family's data.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.billing.models import Subscription
from app.billing.service import expire_due_subscriptions
from app.core.enums import SubscriptionStatus
from app.media.models import MediaItem
from app.media.service import purge_soft_deleted_media
from app.memorials.models import Memorial


def _active_subscription(db_session) -> Subscription:
    return db_session.scalars(select(Subscription)).one()


def test_a_lapsed_subscription_becomes_read_only_without_deleting_data(
    db_session, make_user, make_memorial
):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, premium=True)
    sub = _active_subscription(db_session)
    sub.current_period_end = datetime.now(UTC) - timedelta(days=30)
    db_session.flush()

    expired = expire_due_subscriptions(db_session, grace_days=7)

    assert expired == 1
    assert sub.status == SubscriptionStatus.EXPIRED_READ_ONLY.value
    # Zero-deletion invariant: billing lapsed, the memorial is untouched.
    refreshed = db_session.get(Memorial, memorial.id)
    assert refreshed is not None
    assert refreshed.deleted_at is None


def test_a_subscription_inside_the_grace_window_is_untouched(db_session, make_user, make_memorial):
    owner = make_user(name="Owner")
    make_memorial(steward=owner, premium=True)
    sub = _active_subscription(db_session)
    sub.current_period_end = datetime.now(UTC) - timedelta(days=1)
    db_session.flush()

    expired = expire_due_subscriptions(db_session, grace_days=7)

    assert expired == 0
    assert sub.status == SubscriptionStatus.ACTIVE.value


def test_purge_soft_deleted_media_reaps_only_rows_past_retention(
    db_session, make_user, make_memorial
):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, premium=False)
    now = datetime.now(UTC)

    old_key = f"test/{uuid.uuid4().hex}.jpg"
    recent_key = f"test/{uuid.uuid4().hex}.jpg"
    db_session.add_all(
        [
            MediaItem(
                memorial_id=memorial.id,
                kind="photo",
                status="ready",
                privacy="private",
                storage_tier="private",
                storage_bucket="pithros-private",
                storage_key=old_key,
                deleted_at=now - timedelta(days=90),
            ),
            MediaItem(
                memorial_id=memorial.id,
                kind="photo",
                status="ready",
                privacy="private",
                storage_tier="private",
                storage_bucket="pithros-private",
                storage_key=recent_key,
                deleted_at=now - timedelta(days=1),
            ),
        ]
    )
    db_session.flush()

    result = purge_soft_deleted_media(db_session, older_than_days=30)

    assert result["rows_purged"] == 1
    remaining = db_session.scalars(select(MediaItem).where(MediaItem.memorial_id == memorial.id))
    assert [m.storage_key for m in remaining.all()] == [recent_key]


def test_admin_user_list_is_bounded(client, make_user, auth):
    for i in range(3):
        make_user(name=f"User {i}")
    admin = make_user(name="Admin", role="admin")

    response = client.get("/api/v1/admin/users?limit=2", headers=auth(admin))

    assert response.status_code == 200, response.text
    assert len(response.json()) == 2


def test_admin_user_search_treats_wildcards_literally(client, make_user, auth):
    make_user(name="Ordinary Person")
    admin = make_user(name="Admin", role="admin")

    # A literal "%" must not behave as a SQL wildcard.
    response = client.get("/api/v1/admin/users?query=%25", headers=auth(admin))

    assert response.status_code == 200, response.text
    assert response.json() == []


def test_lifecycle_sweeps_are_scheduled():
    from app.workers.celery_app import celery_app

    schedule = celery_app.conf.beat_schedule
    assert "expire-due-subscriptions" in schedule
    assert "execute-due-account-deletions" in schedule
    assert "purge-soft-deleted-media" in schedule
