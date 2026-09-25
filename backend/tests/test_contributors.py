"""Family contributors: invitation, membership, permissions, revocation.

The authorization read-side was written and tested before any invite existed — a
contributor's role determines what they can do, and a non-ACTIVE contributor has
no access at all. These tests cover the write side that has to keep those
invariants true.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.core.enums import ContributorRole, ContributorStatus
from app.memorials.models import MemorialContributor


def _invite(client, headers, memorial_id, email, role="viewer"):
    return client.post(
        f"/api/v1/memorials/{memorial_id}/contributors",
        json={"email": email, "role": role},
        headers=headers,
    )


def test_full_invite_accept_permit_forbid_revoke_cycle(client, make_user, make_memorial, auth):
    """The journey §62 describes, end to end."""
    owner = make_user(name="Owner")
    member = make_user(name="Vikram", email="vikram@example.com")
    memorial = make_memorial(steward=owner, privacy="public")
    owner_headers = auth(owner)
    member_headers = auth(member)

    # Invite
    invited = _invite(client, owner_headers, memorial.id, "vikram@example.com", "biographer")
    assert invited.status_code == 201
    token = invited.json()["invitationToken"]
    assert token

    # Nothing is granted before acceptance: an invited-but-unaccepted contributor
    # has no membership, so editing is refused.
    assert (
        client.patch(
            f"/api/v1/memorials/{memorial.id}",
            json={"story": {"overview": "Too early."}},
            headers=member_headers,
        ).status_code
        == 403
    )

    # Accept
    accepted = client.post(
        "/api/v1/contributors/accept", json={"token": token}, headers=member_headers
    )
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "active"
    assert accepted.json()["role"] == "biographer"

    # Permitted action for a biographer.
    story = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"story": {"overview": "A life well lived."}},
        headers=member_headers,
    )
    assert story.status_code == 200

    # Forbidden action for a biographer.
    renamed = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"fullName": "Renamed By A Biographer"},
        headers=member_headers,
    )
    assert renamed.status_code == 403

    # Revoke
    contributors = client.get(
        f"/api/v1/memorials/{memorial.id}/contributors", headers=owner_headers
    ).json()
    contributor_id = next(c["id"] for c in contributors if c["role"] == "biographer")

    assert (
        client.delete(
            f"/api/v1/memorials/{memorial.id}/contributors/{contributor_id}",
            headers=owner_headers,
        ).status_code
        == 204
    )

    # Access is gone immediately.
    after = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"story": {"overview": "Should not land."}},
        headers=member_headers,
    )
    assert after.status_code == 403


def test_an_invitation_token_is_single_use(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    member = make_user(name="Member", email="once@example.com")
    memorial = make_memorial(steward=owner)

    token = _invite(client, auth(owner), memorial.id, "once@example.com").json()["invitationToken"]

    first = client.post("/api/v1/contributors/accept", json={"token": token}, headers=auth(member))
    assert first.status_code == 200

    replay = client.post("/api/v1/contributors/accept", json={"token": token}, headers=auth(member))
    assert replay.status_code == 404, "the token was still usable after acceptance"


def test_a_forwarded_token_cannot_be_used_by_a_different_account(
    client, make_user, make_memorial, auth, db_session
):
    """The token proves control of the invited address, not merely possession."""
    owner = make_user(name="Owner")
    intended = make_user(name="Intended", email="intended@example.com")
    interloper = make_user(name="Interloper", email="interloper@example.com")
    memorial = make_memorial(steward=owner)

    token = _invite(client, auth(owner), memorial.id, "intended@example.com").json()[
        "invitationToken"
    ]

    response = client.post(
        "/api/v1/contributors/accept", json={"token": token}, headers=auth(interloper)
    )

    assert response.status_code == 403

    row = db_session.query(MemorialContributor).filter_by(memorial_id=memorial.id).one()
    assert row.status == ContributorStatus.INVITED.value
    assert row.user_id is None, "a forwarded token created a membership"

    # The intended recipient can still use it.
    ok = client.post("/api/v1/contributors/accept", json={"token": token}, headers=auth(intended))
    assert ok.status_code == 200


def test_an_expired_invitation_is_refused(client, make_user, make_memorial, auth, db_session):
    owner = make_user(name="Owner")
    member = make_user(name="Late", email="late@example.com")
    memorial = make_memorial(steward=owner)

    token = _invite(client, auth(owner), memorial.id, "late@example.com").json()["invitationToken"]

    row = db_session.query(MemorialContributor).filter_by(memorial_id=memorial.id).one()
    row.invitation_expires_at = datetime.now(UTC) - timedelta(minutes=1)
    db_session.commit()

    response = client.post(
        "/api/v1/contributors/accept", json={"token": token}, headers=auth(member)
    )

    assert response.status_code == 409
    assert "expired" in response.json()["error"]["message"].lower()


def test_an_unknown_token_is_not_found(client, make_user, auth):
    member = make_user(name="Nobody")

    response = client.post(
        "/api/v1/contributors/accept",
        json={"token": "this-token-was-never-issued"},
        headers=auth(member),
    )

    assert response.status_code == 404


def test_a_non_member_cannot_invite(client, make_user, make_memorial, auth, add_contributor):
    """Inviting is a management action, not something any member can do."""
    owner = make_user(name="Owner")
    viewer = make_user(name="Viewer")
    memorial = make_memorial(steward=owner)
    add_contributor(memorial=memorial, user=viewer, role=ContributorRole.VIEWER.value)

    response = _invite(client, auth(viewer), memorial.id, "anyone@example.com")

    assert response.status_code == 403


def test_an_anonymous_caller_cannot_invite(client, make_user, make_memorial):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)

    response = client.post(
        f"/api/v1/memorials/{memorial.id}/contributors",
        json={"email": "anyone@example.com"},
    )

    assert response.status_code == 401


def test_re_inviting_rotates_the_token_and_does_not_duplicate(
    client, make_user, make_memorial, auth, db_session
):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    headers = auth(owner)

    first = _invite(client, headers, memorial.id, "again@example.com").json()
    second = _invite(client, headers, memorial.id, "again@example.com").json()

    assert first["invitationToken"] != second["invitationToken"]
    assert first["contributor"]["id"] == second["contributor"]["id"]

    count = db_session.query(MemorialContributor).filter_by(memorial_id=memorial.id).count()
    assert count == 1, "re-inviting created a second row"


def test_explicit_permissions_extend_a_role_and_are_removed_with_it(
    client, make_user, make_memorial, auth, add_contributor
):
    """A viewer granted MANAGE_MEDIA can upload; revoking removes the extra grant."""
    owner = make_user(name="Owner")
    member = make_user(name="Archivist", email="archivist@example.com")
    memorial = make_memorial(steward=owner)
    add_contributor(memorial=memorial, user=member, role=ContributorRole.VIEWER.value)
    owner_headers = auth(owner)
    member_headers = auth(member)

    contributor_id = client.get(
        f"/api/v1/memorials/{memorial.id}/contributors", headers=owner_headers
    ).json()[0]["id"]

    # A viewer cannot upload.
    intent = {"filename": "photo.jpg", "contentType": "image/jpeg", "kind": "photo"}
    assert (
        client.post(
            f"/api/v1/memorials/{memorial.id}/media/upload-intent",
            json=intent,
            headers=member_headers,
        ).status_code
        == 403
    )

    # Grant it explicitly.
    granted = client.patch(
        f"/api/v1/memorials/{memorial.id}/contributors/{contributor_id}",
        json={"permissions": ["view", "manage_media"]},
        headers=owner_headers,
    )
    assert granted.status_code == 200
    assert "manage_media" in granted.json()["permissions"]

    assert (
        client.post(
            f"/api/v1/memorials/{memorial.id}/media/upload-intent",
            json=intent,
            headers=member_headers,
        ).status_code
        == 201
    )

    # Revoking drops the explicit grants with the membership.
    client.delete(
        f"/api/v1/memorials/{memorial.id}/contributors/{contributor_id}", headers=owner_headers
    )

    # 404 rather than 403: this memorial is private, so once membership is gone the
    # caller is not even told it exists. Revocation revokes the extra grant too —
    # a stale permission row must not outlive the membership it hung off.
    after = client.post(
        f"/api/v1/memorials/{memorial.id}/media/upload-intent",
        json=intent,
        headers=member_headers,
    )
    assert after.status_code == 404


def test_the_steward_cannot_be_invited_as_a_contributor(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner", email="owner@example.com")
    memorial = make_memorial(steward=owner)

    response = _invite(client, auth(owner), memorial.id, "owner@example.com")

    assert response.status_code == 409


def test_the_invitation_token_is_hidden_when_exposure_is_disabled(
    client, make_user, make_memorial, auth, monkeypatch
):
    """Production refuses to start with tokens exposed; this proves the switch works."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "expose_invitation_tokens", False)

    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)

    body = _invite(client, auth(owner), memorial.id, "hidden@example.com").json()

    assert body["invitationToken"] is None
    assert body["invitationUrl"].startswith("http")


def test_the_recipient_can_see_and_decline_an_invitation(
    client, make_user, make_memorial, auth, db_session
):
    owner = make_user(name="Owner")
    member = make_user(name="Decliner", email="decliner@example.com")
    memorial = make_memorial(steward=owner)
    member_headers = auth(member)

    token = _invite(client, auth(owner), memorial.id, "decliner@example.com").json()[
        "invitationToken"
    ]

    pending = client.get("/api/v1/me/invitations", headers=member_headers).json()
    assert len(pending) == 1
    assert pending[0]["memorialSlug"] == memorial.slug

    declined = client.post(
        "/api/v1/contributors/reject", json={"token": token}, headers=member_headers
    )
    assert declined.status_code == 204

    assert client.get("/api/v1/me/invitations", headers=member_headers).json() == []

    row = db_session.query(MemorialContributor).filter_by(memorial_id=memorial.id).one()
    assert row.status == ContributorStatus.REVOKED.value
    assert row.invitation_token_hash is None
