"""Account deletion lifecycle (PRD sections 18-24).

These prove the parts a modal-and-dismiss cannot fake: re-authentication, recurring
billing cancellation, shared memorials surviving, sole-steward disposition, real
erasure with Firebase disabled, and admin visibility.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from sqlalchemy import select

from app.audit.models import AuditLog
from app.billing.models import Subscription
from app.core.enums import AuditAction, DeletionStatus, PublicationState
from app.memorials.models import MemorialSteward
from app.notifications.models import Notification
from app.privacy import service


def _request(client, auth, user, **overrides):
    payload = {"confirmEmail": user.email, "reason": "Moving on"}
    payload.update(overrides)
    return client.post("/api/v1/me/deletion-request", json=payload, headers=auth(user))


def _add_co_steward(db_session, memorial, co_steward):
    db_session.add(
        MemorialSteward(memorial_id=memorial.id, user_id=co_steward.id, is_primary=False)
    )
    db_session.commit()


@pytest.fixture
def grace_zero():
    from app.core.config import settings

    original = settings.account_deletion_grace_days

    def _assign(value):
        try:
            settings.account_deletion_grace_days = value
        except Exception:  # frozen model
            object.__setattr__(settings, "account_deletion_grace_days", value)

    _assign(0)
    yield
    _assign(original)


def test_deletion_requires_recent_reauth(client, db_session, make_user, verifier):
    user = make_user()
    stale = int(datetime.now(UTC).timestamp()) - 3600
    headers = {"Authorization": f"Bearer {verifier.issue(user, auth_time=stale)}"}

    response = client.post(
        "/api/v1/me/deletion-request",
        json={"confirmEmail": user.email},
        headers=headers,
    )

    assert response.status_code == 422, response.text
    assert response.json()["error"]["details"]["reauthRequired"] is True
    # No deletion was started. (Audit also carries denied-access rows written
    # independently of the rolled-back test transaction, so assert on the action.)
    deletion_rows = db_session.scalars(
        select(AuditLog).where(AuditLog.action == AuditAction.USER_DELETION_REQUESTED.value)
    ).all()
    assert deletion_rows == []


def test_deletion_requires_email_confirmation(client, make_user, auth):
    user = make_user()
    response = _request(client, auth, user, confirmEmail="someone-else@example.com")
    assert response.status_code == 422, response.text
    assert response.json()["error"]["details"]["field"] == "confirmEmail"


def test_request_schedules_and_cancels_recurring_billing(
    client, db_session, make_user, make_memorial, auth
):
    user = make_user()
    co_steward = make_user(name="Co-steward")
    memorial = make_memorial(steward=user, premium=True)
    db_session.add(
        MemorialSteward(memorial_id=memorial.id, user_id=co_steward.id, is_primary=False)
    )
    db_session.commit()
    subscription = db_session.scalars(select(Subscription)).one()
    assert subscription.auto_renew is True

    response = _request(client, auth, user)
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["status"] == DeletionStatus.SCHEDULED.value
    assert body["scheduledFor"] is not None

    db_session.refresh(subscription)
    assert subscription.auto_renew is False
    assert subscription.cancel_at_period_end is True

    notification = db_session.scalars(
        select(Notification).where(Notification.user_id == user.id)
    ).one()
    assert notification.type == "account_deletion_requested"

    actions = {row.action for row in db_session.scalars(select(AuditLog)).all()}
    assert AuditAction.USER_DELETION_REQUESTED.value in actions
    assert AuditAction.USER_DELETION_VERIFIED.value in actions


def test_deletion_can_be_cancelled(client, db_session, make_user, auth):
    user = make_user()
    created = _request(client, auth, user).json()

    response = client.post("/api/v1/me/deletion-request/cancel", headers=auth(user))
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["id"] == created["id"]
    assert body["status"] == DeletionStatus.CANCELLED.value
    assert body["cancelledAt"] is not None


def test_sole_steward_blocks_until_disposition(client, db_session, make_user, make_memorial, auth):
    user = make_user()
    memorial = make_memorial(steward=user, premium=True)

    created = _request(client, auth, user).json()
    assert created["status"] == DeletionStatus.BLOCKED_BY_DISPOSITION.value
    assert len(created["dispositions"]) == 1

    response = client.post(
        f"/api/v1/me/deletion-request/{created['id']}/disposition",
        json={"memorialId": str(memorial.id), "disposition": "orphan"},
        headers=auth(user),
    )
    assert response.status_code == 200, response.text
    assert response.json()["status"] == DeletionStatus.SCHEDULED.value

    db_session.refresh(memorial)
    assert memorial.publication_state == PublicationState.ARCHIVED.value
    assert memorial.privacy == "private"
    assert memorial.search_index_enabled is False
    assert memorial.deleted_at is None
    stewards = db_session.scalars(
        select(MemorialSteward).where(MemorialSteward.memorial_id == memorial.id)
    ).all()
    assert stewards == []


def test_transfer_needs_a_real_successor_then_completes(
    client, db_session, make_user, make_memorial, auth
):
    user = make_user()
    successor = make_user(name="Sibling")
    memorial = make_memorial(steward=user, premium=True)

    created = _request(client, auth, user).json()

    pending = client.post(
        f"/api/v1/me/deletion-request/{created['id']}/disposition",
        json={
            "memorialId": str(memorial.id),
            "disposition": "transfer",
            "successorEmail": "nobody@example.com",
        },
        headers=auth(user),
    ).json()
    assert pending["status"] == DeletionStatus.BLOCKED_BY_DISPOSITION.value

    completed = client.post(
        f"/api/v1/me/deletion-request/{created['id']}/disposition",
        json={
            "memorialId": str(memorial.id),
            "disposition": "transfer",
            "successorEmail": successor.email,
        },
        headers=auth(user),
    ).json()
    assert completed["status"] == DeletionStatus.SCHEDULED.value

    db_session.refresh(memorial)
    steward_ids = {s.user_id for s in memorial.stewards}
    assert successor.id in steward_ids
    assert user.id not in steward_ids
    assert any(s.is_primary for s in memorial.stewards)


def test_execution_anonymizes_and_disables_firebase(
    client, db_session, make_user, make_memorial, auth, grace_zero, monkeypatch
):
    calls: list[tuple[str, str]] = []
    monkeypatch.setattr(
        "app.auth.firebase.disable_firebase_user",
        lambda uid: calls.append(("disable", uid)),
    )
    monkeypatch.setattr(
        "app.auth.firebase.revoke_firebase_tokens",
        lambda uid: calls.append(("revoke", uid)),
    )

    user = make_user()
    original_uid = user.firebase_uid
    memorial = make_memorial(steward=user, premium=True)
    _add_co_steward(db_session, memorial, make_user(name="Co-steward"))
    _request(client, auth, user)

    executed = service.execute_due(db_session)
    assert len(executed) == 1
    assert executed[0].status == DeletionStatus.COMPLETED.value

    db_session.refresh(user)
    assert user.deleted_at is not None
    assert user.name == "Deleted Account"
    assert user.email.startswith("deleted+")
    assert user.phone is None
    assert user.firebase_uid != original_uid
    assert ("disable", original_uid) in calls
    assert ("revoke", original_uid) in calls

    actions = {row.action for row in db_session.scalars(select(AuditLog)).all()}
    assert AuditAction.USER_DELETION_EXECUTED.value in actions


def test_shared_memorial_survives_and_promotes_co_steward(
    client, db_session, make_user, make_memorial, auth, grace_zero
):
    owner = make_user(name="Owner")
    co_steward = make_user(name="Co-steward")
    memorial = make_memorial(steward=owner, premium=True)
    db_session.add(
        MemorialSteward(memorial_id=memorial.id, user_id=co_steward.id, is_primary=False)
    )
    db_session.commit()

    created = _request(client, auth, owner).json()
    assert created["status"] == DeletionStatus.SCHEDULED.value  # not a sole steward

    service.execute_due(db_session)

    db_session.refresh(memorial)
    assert memorial.deleted_at is None
    steward_ids = {s.user_id for s in memorial.stewards}
    assert co_steward.id in steward_ids
    assert owner.id not in steward_ids
    assert any(s.is_primary for s in memorial.stewards)


def test_execution_is_idempotent(db_session, make_user, make_memorial, client, auth, grace_zero):
    user = make_user()
    memorial = make_memorial(steward=user, premium=True)
    _add_co_steward(db_session, memorial, make_user(name="Co-steward"))
    _request(client, auth, user)

    first = service.execute_due(db_session)
    second = service.execute_due(db_session)

    assert len(first) == 1
    assert second == []


def test_sole_steward_is_not_executed_while_blocked(
    client, db_session, make_user, make_memorial, auth, grace_zero
):
    user = make_user()
    make_memorial(steward=user, premium=True)
    _request(client, auth, user)

    executed = service.execute_due(db_session)
    assert executed == []
    db_session.refresh(user)
    assert user.deleted_at is None


def test_admin_can_list_deletion_requests(client, db_session, make_user, auth):
    admin = make_user(name="Support", role="admin")
    admin.admin_subrole = "support_agent"
    db_session.flush()
    user = make_user()
    _request(client, auth, user)

    response = client.get("/api/v1/admin/deletion-requests", headers=auth(admin))
    assert response.status_code == 200, response.text
    rows = response.json()
    assert any(row["userId"] == str(user.id) for row in rows)


def test_non_admin_cannot_list_deletion_requests(client, make_user, auth):
    user = make_user()
    response = client.get("/api/v1/admin/deletion-requests", headers=auth(user))
    assert response.status_code == 403
