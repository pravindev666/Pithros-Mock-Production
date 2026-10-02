"""Signup-time identity collisions.

The bug these tests pin down: a new Firebase signup whose email already has a
Pithros row (from a previous account lifecycle) crashed with a database
UniqueViolation before the email was verified. It must instead refuse cleanly,
and it must never hand the existing account to an unverified identity.
"""

from __future__ import annotations

from app.auth.firebase import FirebaseIdentity


def _fresh_token(verifier, *, uid: str, email: str, verified: bool) -> dict[str, str]:
    verifier.tokens[f"token-{uid}"] = FirebaseIdentity(
        uid=uid,
        email=email,
        email_verified=verified,
        name="Fresh Signup",
        sign_in_provider="password",
    )
    return {"Authorization": f"Bearer token-{uid}"}


def test_unverified_collision_is_refused_cleanly_and_leaves_account_untouched(
    client, verifier, make_user, db_session
):
    existing = make_user(name="Existing Person", email="collision@example.com")
    original_uid = existing.firebase_uid

    headers = _fresh_token(
        verifier, uid="uid_new_collision", email="collision@example.com", verified=False
    )
    response = client.get("/api/v1/me", headers=headers)

    assert response.status_code == 403
    message = response.json()["error"]["message"]
    assert "already exists" in message

    db_session.refresh(existing)
    assert existing.firebase_uid == original_uid
    assert existing.deleted_at is None


def test_closed_account_collision_is_refused_cleanly(client, verifier, make_user, db_session):
    from datetime import UTC, datetime

    closed = make_user(name="Closed Person", email="closed-collision@example.com")
    closed.deleted_at = datetime.now(UTC)
    db_session.commit()

    headers = _fresh_token(
        verifier, uid="uid_new_closed", email="closed-collision@example.com", verified=False
    )
    response = client.get("/api/v1/me", headers=headers)

    assert response.status_code == 403
    assert "closed account" in response.json()["error"]["message"]


def test_verified_collision_adopts_the_existing_account(client, verifier, make_user, db_session):
    """After verification, the same person is linked to their existing row."""
    existing = make_user(name="Rejoining Person", email="rejoining@example.com")

    headers = _fresh_token(
        verifier, uid="uid_new_rejoining", email="rejoining@example.com", verified=True
    )
    response = client.get("/api/v1/me", headers=headers)

    assert response.status_code == 200
    assert response.json()["id"] == str(existing.id)

    db_session.refresh(existing)
    assert existing.firebase_uid == "uid_new_rejoining"
