"""Optimistic concurrency.

Two people editing one memorial must not silently overwrite each other. The guard
is a `version` column: SQLAlchemy appends `AND version = <old>` to the UPDATE, so
the check happens inside the database rather than as a read-then-write race.
"""

from __future__ import annotations


def test_detail_response_carries_version_and_etag(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    headers = auth(owner)

    response = client.get(f"/api/v1/memorials/{memorial.id}", headers=headers)

    assert response.status_code == 200
    assert response.json()["version"] == 1
    assert response.headers["etag"] == '"1"'


def test_write_without_if_match_still_works(client, make_user, make_memorial, auth):
    """If-Match is optional: omitting it keeps the legacy behaviour, so the
    existing frontend and the demo client are unaffected."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)

    response = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"shortEpitaph": "No precondition sent."},
        headers=auth(owner),
    )

    assert response.status_code == 200


def test_write_with_current_version_succeeds_and_increments(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)

    response = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"shortEpitaph": "First edit."},
        headers={**auth(owner), "If-Match": '"1"'},
    )

    assert response.status_code == 200
    assert response.json()["version"] == 2
    assert response.headers["etag"] == '"2"'


def test_stale_if_match_is_rejected_with_409(client, make_user, make_memorial, auth):
    """The case §74 describes: tab A saved, tab B is working from the old copy."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    headers = auth(owner)

    first = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"shortEpitaph": "Tab A wins."},
        headers={**headers, "If-Match": '"1"'},
    )
    assert first.status_code == 200

    # Tab B still believes the memorial is at version 1.
    second = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"shortEpitaph": "Tab B would have clobbered it."},
        headers={**headers, "If-Match": '"1"'},
    )

    assert second.status_code == 409
    body = second.json()
    assert body["error"]["code"] == "conflict"
    assert body["error"]["details"]["currentVersion"] == 2


def test_rejected_write_does_not_change_the_record(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    headers = auth(owner)

    client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"shortEpitaph": "Original."},
        headers={**headers, "If-Match": '"1"'},
    )
    client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"shortEpitaph": "Should not land."},
        headers={**headers, "If-Match": '"1"'},
    )

    current = client.get(f"/api/v1/memorials/{memorial.id}", headers=headers).json()
    assert current["shortEpitaph"] == "Original."
    assert current["version"] == 2


def test_publication_change_honours_if_match(client, make_user, auth):
    creator = make_user(name="Creator")
    headers = auth(creator)

    memorial = client.post(
        "/api/v1/memorials",
        json={"fullName": "Concurrency On Publish", "privacy": "public"},
        headers=headers,
    ).json()

    stale = client.post(
        f"/api/v1/memorials/{memorial['id']}/publication",
        json={"publicationState": "published"},
        headers={**headers, "If-Match": '"999"'},
    )

    assert stale.status_code == 409


def test_malformed_if_match_is_a_validation_error(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)

    response = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"shortEpitaph": "Bad header."},
        headers={**auth(owner), "If-Match": "not-a-number"},
    )

    assert response.status_code == 422
