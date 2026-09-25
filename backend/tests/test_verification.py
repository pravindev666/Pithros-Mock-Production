"""Verification lifecycle.

The state machine is the thing worth testing: a submission must not be able to
reach APPROVED without passing through review, and evidence must be reachable only
by the people entitled to see it.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.audit.models import AuditLog
from app.core.enums import AdminSubRole, ContributorRole, MediaStatus, StorageTier
from app.media.models import MediaItem
from app.memorials.models import Memorial
from app.verification import service as verification_service


def _document(db_session, memorial, owner, *, tier=StorageTier.SENSITIVE.value):
    item = MediaItem(
        memorial_id=memorial.id,
        kind="document",
        status=MediaStatus.READY.value,
        privacy="private",
        storage_tier=tier,
        storage_bucket=f"pithros-{tier}",
        storage_key=f"memorials/{memorial.id}/document/{uuid.uuid4().hex}.pdf",
        original_filename="certificate.pdf",
        mime_type="application/pdf",
        size_bytes=2048,
        uploaded_by_id=owner.id,
    )
    db_session.add(item)
    db_session.commit()
    return item


def _submit(client, headers, memorial_id, media_id, document_type="death_certificate"):
    return client.post(
        f"/api/v1/memorials/{memorial_id}/verification",
        json={
            "evidence": [{"mediaId": str(media_id), "documentType": document_type}],
            "note": "Please review.",
        },
        headers=headers,
    )


def _reviews(db_session, submission_id):
    """Advance through the queued states, as the worker would."""
    verification_service.mark_processing(db_session, submission_id)
    verification_service.mark_ready_for_review(db_session, submission_id)


def _reviewer(make_user):
    reviewer = make_user(name="Sarah Chen", role="admin")
    reviewer.admin_subrole = AdminSubRole.VERIFICATION_REVIEWER.value
    return reviewer


def test_a_submission_reaches_review_then_approval_and_syncs_the_memorial(
    client, make_user, make_memorial, auth, db_session
):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    document = _document(db_session, memorial, owner)
    headers = auth(owner)

    submitted = _submit(client, headers, memorial.id, document.id)
    assert submitted.status_code == 201
    body = submitted.json()
    assert body["state"] == "submitted"
    assert len(body["evidence"]) == 1
    assert body["allowedNextStates"] == ["verification_pending"]

    submission_id = uuid.UUID(body["id"])
    _reviews(db_session, submission_id)

    reviewer = _reviewer(make_user)
    reviewed = db_session.get(Memorial, memorial.id)
    db_session.refresh(reviewed)
    assert reviewed.verification_state == "verification_review"

    approved = client.post(
        f"/api/v1/admin/verification/{submission_id}/approve",
        json={"reason": "Certificate matches the recorded dates."},
        headers=auth(reviewer),
    )
    assert approved.status_code == 200
    assert approved.json()["state"] == "approved"
    assert approved.json()["allowedNextStates"] == []

    db_session.expire_all()
    refreshed = db_session.get(Memorial, memorial.id)
    assert refreshed.verification_state == "approved"
    assert refreshed.verification_badge_type == "Document Reviewed"


def test_an_illegal_transition_is_refused(client, make_user, make_memorial, auth, db_session):
    """APPROVED is terminal — nothing may follow it."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    document = _document(db_session, memorial, owner)
    headers = auth(owner)

    submission_id = uuid.UUID(_submit(client, headers, memorial.id, document.id).json()["id"])
    _reviews(db_session, submission_id)

    reviewer = _reviewer(make_user)
    client.post(
        f"/api/v1/admin/verification/{submission_id}/approve",
        json={},
        headers=auth(reviewer),
    )

    # Approving twice is a second APPROVED transition from a terminal state.
    again = client.post(
        f"/api/v1/admin/verification/{submission_id}/approve",
        json={},
        headers=auth(reviewer),
    )

    assert again.status_code == 409
    assert again.json()["error"]["details"]["allowedNextStates"] == []


def test_a_submission_cannot_be_approved_before_review(
    client, make_user, make_memorial, auth, db_session
):
    """The core guarantee: no shortcut from submitted to approved."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    document = _document(db_session, memorial, owner)

    submission_id = uuid.UUID(_submit(client, auth(owner), memorial.id, document.id).json()["id"])

    reviewer = _reviewer(make_user)
    early = client.post(
        f"/api/v1/admin/verification/{submission_id}/approve",
        json={},
        headers=auth(reviewer),
    )

    assert early.status_code == 409
    assert "'submitted'" in early.json()["error"]["message"]
    assert "'approved'" in early.json()["error"]["message"]


def test_rejection_can_be_appealed(client, make_user, make_memorial, auth, db_session):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    document = _document(db_session, memorial, owner)
    headers = auth(owner)

    submission_id = uuid.UUID(_submit(client, headers, memorial.id, document.id).json()["id"])
    _reviews(db_session, submission_id)

    reviewer = _reviewer(make_user)
    rejected = client.post(
        f"/api/v1/admin/verification/{submission_id}/reject",
        json={"reason": "The scan is unreadable."},
        headers=auth(reviewer),
    )
    assert rejected.status_code == 200
    assert rejected.json()["state"] == "rejected"
    assert "appeal" in rejected.json()["allowedNextStates"]

    appeal = client.post(
        f"/api/v1/verification/{submission_id}/appeal",
        json={"reason": "I have uploaded a clearer scan."},
        headers=headers,
    )
    assert appeal.status_code == 200
    assert appeal.json()["state"] == "appeal"


def test_evidence_must_be_a_sensitive_tier_document(
    client, make_user, make_memorial, auth, db_session
):
    """A certificate must never be attachable from a publicly servable bucket."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    photo = _document(db_session, memorial, owner, tier=StorageTier.PRIVATE.value)

    response = _submit(client, auth(owner), memorial.id, photo.id)

    assert response.status_code == 422
    assert "verification evidence" in response.json()["error"]["message"].lower()


def test_a_document_from_another_memorial_cannot_be_attached(
    client, make_user, make_memorial, auth, db_session
):
    owner = make_user(name="Owner")
    mine = make_memorial(steward=owner)
    theirs = make_memorial(steward=owner, full_name="Someone Else")

    foreign_document = _document(db_session, theirs, owner)

    response = _submit(client, auth(owner), mine.id, foreign_document.id)

    assert response.status_code == 404


def test_a_contributor_without_the_permission_cannot_submit(
    client, make_user, make_memorial, add_contributor, auth, db_session
):
    owner = make_user(name="Owner")
    archivist = make_user(name="Archivist")
    memorial = make_memorial(steward=owner)
    add_contributor(memorial=memorial, user=archivist, role=ContributorRole.PHOTO_ARCHIVIST.value)

    document = _document(db_session, memorial, owner)

    response = _submit(client, auth(archivist), memorial.id, document.id)

    assert response.status_code == 403


def test_a_memorial_steward_cannot_reach_the_reviewer_queue(client, make_user, make_memorial, auth):
    """Verification is an administrative act, not something a member can perform."""
    owner = make_user(name="Owner")
    make_memorial(steward=owner)

    response = client.get("/api/v1/admin/verification", headers=auth(owner))

    assert response.status_code == 403


def test_a_moderator_cannot_review_verification(client, make_user, make_memorial, auth):
    """Subroles are enforced server-side, not by hiding a menu item."""
    moderator = make_user(name="Moderator", role="admin")
    moderator.admin_subrole = AdminSubRole.MODERATOR.value

    response = client.get("/api/v1/admin/verification", headers=auth(moderator))

    assert response.status_code == 403


def test_evidence_access_is_authorized_and_audited(
    client, make_user, make_memorial, auth, db_session
):
    """Reading a death certificate must be answerable for."""
    owner = make_user(name="Owner")
    intruder = make_user(name="Intruder")
    memorial = make_memorial(steward=owner)
    document = _document(db_session, memorial, owner)

    submission = _submit(client, auth(owner), memorial.id, document.id).json()
    evidence_id = submission["evidence"][0]["id"]

    # A non-member cannot read it.
    blocked = client.get(f"/api/v1/verification/evidence/{evidence_id}", headers=auth(intruder))
    assert blocked.status_code == 403

    # The steward can, and the read is recorded.
    allowed = client.get(f"/api/v1/verification/evidence/{evidence_id}", headers=auth(owner))
    assert allowed.status_code == 200
    assert allowed.json()["url"]
    assert "storageKey" not in allowed.json()

    entry = db_session.scalar(
        select(AuditLog)
        .where(AuditLog.action == "SENSITIVE_DOCUMENT_ACCESSED")
        .order_by(AuditLog.created_at.desc())
    )
    assert entry is not None
    assert entry.actor_id == owner.id


def test_the_queue_lists_submissions_awaiting_review(
    client, make_user, make_memorial, auth, db_session
):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    document = _document(db_session, memorial, owner)

    submission_id = uuid.UUID(_submit(client, auth(owner), memorial.id, document.id).json()["id"])
    reviewer = _reviewer(make_user)

    # Still `submitted`, so not yet queued for a human.
    assert client.get("/api/v1/admin/verification", headers=auth(reviewer)).json() == []

    _reviews(db_session, submission_id)

    queue = client.get("/api/v1/admin/verification", headers=auth(reviewer)).json()
    assert len(queue) == 1
    assert queue[0]["memorialName"] == memorial.full_name
    assert queue[0]["evidenceCount"] == 1


def test_submitting_without_evidence_is_refused(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)

    response = client.post(
        f"/api/v1/memorials/{memorial.id}/verification",
        json={"evidence": [], "note": "No documents."},
        headers=auth(owner),
    )

    assert response.status_code == 422


def test_get_verification_returns_null_before_anything_is_submitted(
    client, make_user, make_memorial, auth
):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)

    response = client.get(f"/api/v1/memorials/{memorial.id}/verification", headers=auth(owner))

    assert response.status_code == 200
    assert response.json() is None
