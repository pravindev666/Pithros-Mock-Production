"""Idempotency keys, rate limiting, and audit trails for refusals.

These three share a theme: they are the behaviours that only show up under
retries, abuse, or probing — the cases a happy-path test never reaches.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select

from app.audit.models import AuditLog
from app.core.enums import AuditResult
from app.tributes.models import Tribute


def _submit(client, slug, message, key=None):
    headers = {"Idempotency-Key": key} if key else {}
    return client.post(
        f"/api/v1/public/memorials/{slug}/tributes",
        json={"authorName": "Well-wisher", "message": message},
        headers=headers,
    )


def test_repeating_a_request_with_the_same_key_returns_the_same_response(
    client, make_user, make_memorial, db_session
):
    """The retry case: a flaky network must not create a second tribute."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")
    key = f"key-{uuid.uuid4()}"

    first = _submit(client, memorial.slug, "With deepest sympathy.", key=key)
    second = _submit(client, memorial.slug, "With deepest sympathy.", key=key)

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]

    count = db_session.scalar(
        select(func.count()).select_from(Tribute).where(Tribute.memorial_id == memorial.id)
    )
    assert count == 1, "the retry created a second tribute"


def test_without_a_key_repeated_requests_create_separate_records(
    client, make_user, make_memorial, db_session
):
    """Baseline: idempotency is opt-in, so existing callers are unaffected."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")

    _submit(client, memorial.slug, "Same message.")
    _submit(client, memorial.slug, "Same message.")

    count = db_session.scalar(
        select(func.count()).select_from(Tribute).where(Tribute.memorial_id == memorial.id)
    )
    assert count == 2


def test_same_key_with_a_different_body_is_rejected(client, make_user, make_memorial):
    """Silently replaying the first response would hide the client's mistake."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")
    key = f"key-{uuid.uuid4()}"

    _submit(client, memorial.slug, "First message.", key=key)
    conflicting = _submit(client, memorial.slug, "Completely different.", key=key)

    assert conflicting.status_code == 409
    assert conflicting.json()["error"]["code"] == "conflict"


def test_a_reserved_but_unfinished_key_is_refused_rather_than_rerun(
    client, make_user, make_memorial
):
    """The crash window: a key claimed but the work never completed.

    Re-running the handler would duplicate the side effect, so the second caller
    is told to try again instead.
    """
    from starlette.requests import Request

    from app.core.idempotency import reserve, subject_for
    from app.tributes.schemas import TributeSubmissionRequest

    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")
    key = f"key-{uuid.uuid4()}"

    # Build a request that looks exactly like the one TestClient will send, so the
    # subject and body hash match and we exercise the in-progress branch rather
    # than the different-body branch.
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/",
        "headers": [(b"idempotency-key", key.encode())],
        "client": ("testclient", 50000),
        "query_string": b"",
    }
    fake = Request(scope)

    payload = TributeSubmissionRequest(author_name="Well-wisher", message="Still being processed.")
    claimed = reserve(
        fake,
        endpoint="tributes.submit",
        body=payload.model_dump(mode="json"),
        subject=subject_for(fake, None),
    )
    assert claimed is None, "the key should have been newly claimed"

    response = _submit(client, memorial.slug, "Still being processed.", key=key)

    assert response.status_code == 409
    assert "in progress" in response.json()["error"]["message"].lower()


def test_authorization_denials_are_audited(client, make_user, make_memorial, auth, db_session):
    """A refused write is the signal worth keeping: it is how probing for other
    people's memorials becomes visible. The row must survive the request's rollback."""
    owner = make_user(name="Owner")
    intruder = make_user(name="Intruder")
    memorial = make_memorial(steward=owner, privacy="public")

    response = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"shortEpitaph": "Should not land."},
        headers=auth(intruder),
    )
    assert response.status_code == 403

    entry = db_session.scalar(
        select(AuditLog)
        .where(AuditLog.action == "AUTHORIZATION_DENIED")
        .order_by(AuditLog.created_at.desc())
    )

    assert entry is not None, "the denial was not recorded"
    assert entry.result == AuditResult.DENIED.value
    assert entry.entity == "memorial"
    assert entry.entity_id == str(memorial.id)
    # The route guards VIEW, so that is the gate the intruder hit first.
    assert entry.detail.get("permission") == "view"
    assert entry.detail.get("revealedExistence") is True


def test_a_member_reaching_beyond_their_role_is_audited(
    client, make_user, make_memorial, add_contributor, auth, db_session
):
    """A biographer editing the story is fine; renaming the memorial is not.

    This denial happens below the route dependency — it depends on which fields the
    body contains — so it needs its own audit call.
    """
    from app.core.enums import ContributorRole

    owner = make_user(name="Owner")
    biographer = make_user(name="Biographer")
    memorial = make_memorial(steward=owner)
    add_contributor(memorial=memorial, user=biographer, role=ContributorRole.BIOGRAPHER.value)

    response = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"fullName": "Renamed Without Permission"},
        headers=auth(biographer),
    )
    assert response.status_code == 403

    entry = db_session.scalar(
        select(AuditLog)
        .where(AuditLog.action == "AUTHORIZATION_DENIED")
        .order_by(AuditLog.created_at.desc())
    )
    assert entry is not None
    assert "full_name" in (entry.detail.get("deniedFields") or [])
    assert entry.detail.get("role") == ContributorRole.BIOGRAPHER.value


def test_denial_of_a_private_memorial_records_that_existence_was_concealed(
    client, make_user, make_memorial, auth, db_session
):
    owner = make_user(name="Owner")
    intruder = make_user(name="Intruder")
    memorial = make_memorial(steward=owner, privacy="private")

    response = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"shortEpitaph": "Nope."},
        headers=auth(intruder),
    )
    assert response.status_code == 404

    entry = db_session.scalar(
        select(AuditLog)
        .where(AuditLog.action == "AUTHORIZATION_DENIED")
        .order_by(AuditLog.created_at.desc())
    )
    assert entry is not None
    assert entry.detail.get("revealedExistence") is False


def test_per_user_rate_limit_eventually_refuses(client, make_user, auth, monkeypatch):
    """The limiter must actually engage for an authenticated caller.

    It keys on the user and depends on `get_current_user`, so it cannot silently
    no-op through dependency ordering.
    """
    from app.core.config import settings

    monkeypatch.setattr(settings, "rate_limit_enabled", True)

    user = make_user(name="Persistent")
    headers = auth(user)

    statuses = [
        client.patch("/api/v1/me", json={"name": f"Name {index}"}, headers=headers).status_code
        for index in range(35)
    ]

    assert 429 in statuses, f"never rate limited: {set(statuses)}"
