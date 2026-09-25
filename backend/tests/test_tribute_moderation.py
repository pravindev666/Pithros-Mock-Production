"""Tribute moderation.

Anonymous submissions land in PENDING_MODERATION and stay invisible until someone
with MANAGE_TRIBUTES decides. The service function for this existed but had no
route, so none of it was reachable.
"""

from __future__ import annotations

from sqlalchemy import select

from app.audit.models import AuditLog
from app.core.enums import ContributorRole
from app.tributes.models import Tribute


def _submit(client, slug, message="With deepest sympathy."):
    return client.post(
        f"/api/v1/public/memorials/{slug}/tributes",
        json={"authorName": "Well-wisher", "message": message},
    )


def test_pending_tributes_are_invisible_publicly_but_visible_in_the_queue(
    client, make_user, make_memorial, auth
):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")
    headers = auth(owner)

    _submit(client, memorial.slug)

    assert client.get(f"/api/v1/public/memorials/{memorial.slug}/tributes").json() == []

    queue = client.get(f"/api/v1/memorials/{memorial.id}/tributes", headers=headers)
    assert queue.status_code == 200
    assert len(queue.json()) == 1
    assert queue.json()[0]["isApproved"] is False


def test_the_queue_can_be_filtered_by_status(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")
    headers = auth(owner)

    _submit(client, memorial.slug, "First")
    _submit(client, memorial.slug, "Second")

    pending = client.get(
        f"/api/v1/memorials/{memorial.id}/tributes",
        params={"status": "pending_moderation"},
        headers=headers,
    ).json()
    approved = client.get(
        f"/api/v1/memorials/{memorial.id}/tributes",
        params={"status": "approved"},
        headers=headers,
    ).json()

    assert len(pending) == 2
    assert approved == []


def test_approving_makes_a_tribute_publicly_visible(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")
    headers = auth(owner)

    _submit(client, memorial.slug, "Please remember him kindly.")

    tribute_id = client.get(f"/api/v1/memorials/{memorial.id}/tributes", headers=headers).json()[0][
        "id"
    ]

    approved = client.patch(
        f"/api/v1/memorials/{memorial.id}/tributes/{tribute_id}",
        json={"status": "approved"},
        headers=headers,
    )
    assert approved.status_code == 200
    assert approved.json()["isApproved"] is True

    public = client.get(f"/api/v1/public/memorials/{memorial.slug}/tributes").json()
    assert len(public) == 1
    assert public[0]["id"] == tribute_id


def test_rejecting_keeps_a_tribute_hidden(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")
    headers = auth(owner)

    _submit(client, memorial.slug, "Something unkind.")

    tribute_id = client.get(f"/api/v1/memorials/{memorial.id}/tributes", headers=headers).json()[0][
        "id"
    ]

    rejected = client.patch(
        f"/api/v1/memorials/{memorial.id}/tributes/{tribute_id}",
        json={"status": "rejected", "reason": "Not appropriate."},
        headers=headers,
    )
    assert rejected.status_code == 200
    assert rejected.json()["isApproved"] is False

    assert client.get(f"/api/v1/public/memorials/{memorial.slug}/tributes").json() == []


def test_moderation_is_audited(client, make_user, make_memorial, auth, db_session):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")
    headers = auth(owner)

    _submit(client, memorial.slug)
    tribute_id = client.get(f"/api/v1/memorials/{memorial.id}/tributes", headers=headers).json()[0][
        "id"
    ]

    client.patch(
        f"/api/v1/memorials/{memorial.id}/tributes/{tribute_id}",
        json={"status": "approved"},
        headers=headers,
    )

    entry = db_session.scalar(
        select(AuditLog)
        .where(AuditLog.action == "TRIBUTE_MODERATED")
        .order_by(AuditLog.created_at.desc())
    )
    assert entry is not None
    assert entry.detail.get("status") == "approved"
    assert entry.actor_id == owner.id


def test_a_contributor_without_the_permission_cannot_moderate(
    client, make_user, make_memorial, add_contributor, auth
):
    """A photo archivist administers media, not tributes."""
    owner = make_user(name="Owner")
    archivist = make_user(name="Archivist")
    memorial = make_memorial(steward=owner, privacy="public")
    add_contributor(memorial=memorial, user=archivist, role=ContributorRole.PHOTO_ARCHIVIST.value)

    _submit(client, memorial.slug)

    response = client.get(f"/api/v1/memorials/{memorial.id}/tributes", headers=auth(archivist))

    assert response.status_code == 403


def test_the_moderation_queue_accepts_an_anonymous_tribute(
    client, make_user, make_memorial, auth, db_session
):
    """The whole point: someone with no account can leave a tribute, and it waits."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")

    _submit(client, memorial.slug, "From a stranger.")

    row = db_session.scalar(select(Tribute).where(Tribute.memorial_id == memorial.id))
    assert row is not None
    assert row.status == "pending_moderation"
    assert row.submitted_by_id is None

    queue = client.get(f"/api/v1/memorials/{memorial.id}/tributes", headers=auth(owner)).json()
    assert len(queue) == 1


def test_deleting_a_tribute_removes_it_from_the_queue_and_the_public_page(
    client, make_user, make_memorial, auth
):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")
    headers = auth(owner)

    _submit(client, memorial.slug)

    tribute_id = client.get(f"/api/v1/memorials/{memorial.id}/tributes", headers=headers).json()[0][
        "id"
    ]

    client.patch(
        f"/api/v1/memorials/{memorial.id}/tributes/{tribute_id}",
        json={"status": "approved"},
        headers=headers,
    )
    assert len(client.get(f"/api/v1/public/memorials/{memorial.slug}/tributes").json()) == 1

    removed = client.delete(
        f"/api/v1/memorials/{memorial.id}/tributes/{tribute_id}", headers=headers
    )
    assert removed.status_code == 204

    assert client.get(f"/api/v1/memorials/{memorial.id}/tributes", headers=headers).json() == []
    assert client.get(f"/api/v1/public/memorials/{memorial.slug}/tributes").json() == []
