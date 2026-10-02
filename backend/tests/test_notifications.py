"""In-app notifications: created with the events that matter, scoped to owners.

Email delivery does not exist yet, so these rows are the notification system.
The tests cover creation on the four emitted events, ownership isolation, and
read-state transitions.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.auth.firebase import FirebaseIdentity
from app.core.enums import AdminSubRole, MediaStatus, StorageTier
from app.media.models import MediaItem
from app.notifications.models import Notification
from app.verification import service as verification_service


def _notifications(db_session, user_id):
    return list(
        db_session.scalars(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at)
        )
    )


def _document(db_session, memorial, owner):
    item = MediaItem(
        memorial_id=memorial.id,
        kind="document",
        status=MediaStatus.READY.value,
        privacy="private",
        storage_tier=StorageTier.SENSITIVE.value,
        storage_bucket="pithros-sensitive",
        storage_key=f"memorials/{memorial.id}/document/{uuid.uuid4().hex}.pdf",
        original_filename="certificate.pdf",
        mime_type="application/pdf",
        size_bytes=2048,
        uploaded_by_id=owner.id,
    )
    db_session.add(item)
    db_session.commit()
    return item


def test_welcome_notification_is_created_on_first_login(client, verifier, db_session):
    """The notification is written by real provisioning, not by a fixture."""
    verifier.tokens["fresh-token"] = FirebaseIdentity(
        uid="uid_fresh_first_login",
        email="fresh.first.login@example.com",
        email_verified=True,
        name="Fresh Person",
        sign_in_provider="password",
    )
    headers = {"Authorization": "Bearer fresh-token"}

    me = client.get("/api/v1/me", headers=headers)
    assert me.status_code == 200
    user_id = uuid.UUID(me.json()["id"])

    notes = _notifications(db_session, user_id)
    assert [note.type for note in notes] == ["welcome"]

    listing = client.get("/api/v1/me/notifications", headers=headers)
    assert listing.status_code == 200
    body = listing.json()
    assert body["unreadCount"] == 1

    notification_id = body["notifications"][0]["id"]
    marked = client.post(f"/api/v1/me/notifications/{notification_id}/read", headers=headers)
    assert marked.status_code == 200
    assert marked.json()["readAt"] is not None

    assert client.get("/api/v1/me/notifications", headers=headers).json()["unreadCount"] == 0

    # Mark-all is idempotent and reports zero once everything is read.
    all_read = client.post("/api/v1/me/notifications/read-all", headers=headers)
    assert all_read.status_code == 200
    assert all_read.json()["updated"] == 0


def test_notifications_are_scoped_to_their_owner(client, verifier, db_session, make_user, auth):
    verifier.tokens["alice-token"] = FirebaseIdentity(
        uid="uid_alice_scope",
        email="alice.scope@example.com",
        email_verified=True,
        name="Alice Scope",
        sign_in_provider="password",
    )
    alice_headers = {"Authorization": "Bearer alice-token"}
    client.get("/api/v1/me", headers=alice_headers)

    bob = make_user(name="Bob")

    alice_user_id = uuid.UUID(client.get("/api/v1/me", headers=alice_headers).json()["id"])
    alice_note = _notifications(db_session, alice_user_id)[0]

    bob_listing = client.get("/api/v1/me/notifications", headers=auth(bob))
    assert bob_listing.status_code == 200
    assert all(n["id"] != str(alice_note.id) for n in bob_listing.json()["notifications"])

    # Reading someone else's notification is a 404, not a leak.
    intruder = client.post(f"/api/v1/me/notifications/{alice_note.id}/read", headers=auth(bob))
    assert intruder.status_code == 404

    assert client.get("/api/v1/me/notifications").status_code == 401


def test_verification_events_notify_reviewers_then_the_submitter(
    client, make_user, make_memorial, auth, db_session
):
    # The reviewer must exist before submission — recipients are resolved live.
    reviewer = make_user(name="Sarah Chen", role="admin")
    reviewer.admin_subrole = AdminSubRole.VERIFICATION_REVIEWER.value
    db_session.flush()

    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    document = _document(db_session, memorial, owner)
    headers = auth(owner)

    submitted = client.post(
        f"/api/v1/memorials/{memorial.id}/verification",
        json={"evidence": [{"mediaId": str(document.id), "documentType": "death_certificate"}]},
        headers=headers,
    )
    assert submitted.status_code == 201
    submission_id = uuid.UUID(submitted.json()["id"])

    reviewer_notes = _notifications(db_session, reviewer.id)
    assert any(note.type == "verification_submitted" for note in reviewer_notes)

    verification_service.mark_processing(db_session, submission_id)
    verification_service.mark_ready_for_review(db_session, submission_id)

    approved = client.post(
        f"/api/v1/admin/verification/{submission_id}/approve",
        json={"reason": "Certificate matches the recorded dates."},
        headers=auth(reviewer),
    )
    assert approved.status_code == 200
    assert approved.json()["state"] == "approved"

    owner_listing = client.get("/api/v1/me/notifications", headers=headers).json()
    decided = [n for n in owner_listing["notifications"] if n["type"] == "verification_approved"]
    assert len(decided) == 1
    assert "approved" in decided[0]["body"].lower()


def test_tribute_submission_notifies_the_steward(client, make_user, make_memorial, db_session):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public", publication_state="published")

    tribute = client.post(
        f"/api/v1/public/memorials/{memorial.slug}/tributes",
        json={"authorName": "Alice", "message": "In loving memory."},
    )
    assert tribute.status_code == 201

    notes = _notifications(db_session, owner.id)
    pending = [note for note in notes if note.type == "tribute_pending"]
    assert len(pending) == 1
    assert pending[0].payload.get("tributeId") == tribute.json()["id"]
