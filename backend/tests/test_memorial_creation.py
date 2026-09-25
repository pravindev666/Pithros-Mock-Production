"""Memorial creation and ownership.

These are regression tests for the prototype's hardcoded steward: every memorial
was stamped with `stewardId: 'usr_anita_krishnan'` regardless of who created it.
"""

from __future__ import annotations

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.enums import PrivacyLevel, UserRole
from app.memorials.models import MemorialSteward


def test_creator_becomes_the_primary_steward(client, make_user, auth, db_session):
    creator = make_user(name="Real Person", email="real.person@example.com")

    response = client.post(
        "/api/v1/memorials",
        json={"fullName": "Dr. Someone Real", "birthDate": "1954-04-12"},
        headers=auth(creator),
    )

    assert response.status_code == 201
    memorial_id = response.json()["id"]

    stewards = list(
        db_session.scalars(
            select(MemorialSteward).where(MemorialSteward.memorial_id == memorial_id)
        )
    )

    assert len(stewards) == 1
    assert stewards[0].user_id == creator.id
    assert stewards[0].is_primary is True


def test_no_hardcoded_steward_leaks_into_a_new_memorial(client, make_user, auth):
    creator = make_user(name="Someone Else")

    response = client.post(
        "/api/v1/memorials",
        json={"fullName": "Another Memorial"},
        headers=auth(creator),
    )

    body = response.json()
    assert body["stewardId"] == str(creator.id)
    assert body["stewardEmail"] == creator.email
    assert "anita" not in str(body).lower()


def test_client_cannot_nominate_a_steward(client, make_user, auth):
    """Ownership fields are rejected outright rather than silently ignored."""
    creator = make_user(name="Creator")
    victim = make_user(name="Someone Else")

    response = client.post(
        "/api/v1/memorials",
        json={
            "fullName": "Stolen Memorial",
            "stewardId": str(victim.id),
            "stewardName": victim.name,
            "stewardEmail": victim.email,
        },
        headers=auth(creator),
    )

    assert response.status_code == 422


def test_only_one_primary_steward_per_memorial(client, make_user, auth, db_session):
    """Enforced by a partial unique index, so application bugs cannot break it."""
    creator = make_user(name="Creator")
    other = make_user(name="Other")

    response = client.post(
        "/api/v1/memorials",
        json={"fullName": "Ownership Test"},
        headers=auth(creator),
    )
    memorial_id = response.json()["id"]

    db_session.add(MemorialSteward(memorial_id=memorial_id, user_id=other.id, is_primary=True))

    with pytest.raises(IntegrityError):
        db_session.flush()

    db_session.rollback()


def test_second_primary_steward_is_allowed_when_not_primary(client, make_user, auth, db_session):
    """The constraint is on *primary*, not on membership."""
    creator = make_user(name="Creator")
    co_steward = make_user(name="Co-steward")

    response = client.post(
        "/api/v1/memorials",
        json={"fullName": "Shared Stewardship"},
        headers=auth(creator),
    )
    memorial_id = response.json()["id"]

    db_session.add(
        MemorialSteward(memorial_id=memorial_id, user_id=co_steward.id, is_primary=False)
    )
    db_session.flush()

    stewards = list(
        db_session.scalars(
            select(MemorialSteward).where(MemorialSteward.memorial_id == memorial_id)
        )
    )
    assert len(stewards) == 2
    assert sum(1 for steward in stewards if steward.is_primary) == 1


def test_creating_a_memorial_promotes_a_visitor_to_family_steward(client, make_user, auth):
    creator = make_user(name="New Person")
    assert creator.role == UserRole.VISITOR.value

    client.post(
        "/api/v1/memorials",
        json={"fullName": "First Memorial"},
        headers=auth(creator),
    )

    profile = client.get("/api/v1/me", headers=auth(creator)).json()
    assert profile["role"] == UserRole.FAMILY_STEWARD.value


def test_slug_is_generated_and_made_unique(client, make_user, auth):
    creator = make_user(name="Creator")

    first = client.post(
        "/api/v1/memorials", json={"fullName": "John Mathew"}, headers=auth(creator)
    ).json()
    second = client.post(
        "/api/v1/memorials", json={"fullName": "John Mathew"}, headers=auth(creator)
    ).json()

    assert first["slug"] == "john-mathew"
    assert second["slug"] == "john-mathew-2"


def test_private_memorial_cannot_be_published(client, make_user, auth):
    """Publication and visibility are separate; publishing a private memorial would
    have no meaning and is refused with an explanation."""
    creator = make_user(name="Creator")

    memorial = client.post(
        "/api/v1/memorials",
        json={"fullName": "Still Private", "privacy": "private"},
        headers=auth(creator),
    ).json()

    response = client.post(
        f"/api/v1/memorials/{memorial['id']}/publication",
        json={"publicationState": "published"},
        headers=auth(creator),
    )

    assert response.status_code == 409


def test_publishing_a_public_memorial_makes_it_readable_anonymously(client, make_user, auth):
    creator = make_user(name="Creator")

    memorial = client.post(
        "/api/v1/memorials",
        json={"fullName": "Eventually Public", "privacy": "public"},
        headers=auth(creator),
    ).json()

    # Still a draft, so not yet reachable.
    assert client.get(f"/api/v1/public/memorials/{memorial['slug']}").status_code == 404

    published = client.post(
        f"/api/v1/memorials/{memorial['id']}/publication",
        json={"publicationState": "published"},
        headers=auth(creator),
    )
    assert published.status_code == 200

    assert client.get(f"/api/v1/public/memorials/{memorial['slug']}").status_code == 200


def test_deleting_a_memorial_soft_deletes_it(client, make_user, auth):
    creator = make_user(name="Creator")

    memorial = client.post(
        "/api/v1/memorials",
        json={"fullName": "To Be Removed"},
        headers=auth(creator),
    ).json()

    assert (
        client.delete(f"/api/v1/memorials/{memorial['id']}", headers=auth(creator)).status_code
        == 204
    )
    assert client.get("/api/v1/me/memorials", headers=auth(creator)).json() == []


def test_completeness_percent_reflects_the_content(client, make_user, auth):
    creator = make_user(name="Creator")

    memorial = client.post(
        "/api/v1/memorials",
        json={
            "fullName": "Fully Documented",
            "birthDate": "1950-01-01",
            "deathDate": "2024-01-01",
            "birthPlace": "Bengaluru",
            "restingPlace": "Hebbal",
            "shortEpitaph": "Remembered always.",
        },
        headers=auth(creator),
    ).json()

    assert 0 < memorial["completenessPercent"] <= 100

    sparse = client.post(
        "/api/v1/memorials", json={"fullName": "Sparse"}, headers=auth(creator)
    ).json()

    assert sparse["completenessPercent"] < memorial["completenessPercent"]


def test_unauthenticated_creation_is_refused(client):
    response = client.post("/api/v1/memorials", json={"fullName": "Anonymous Memorial"})
    assert response.status_code == 401


def test_privacy_defaults_to_private(client, make_user, auth):
    """A new memorial must not be world-readable by default."""
    creator = make_user(name="Creator")

    memorial = client.post(
        "/api/v1/memorials", json={"fullName": "Default Privacy"}, headers=auth(creator)
    ).json()

    assert memorial["privacy"] == PrivacyLevel.PRIVATE.value
    assert memorial["publicationState"] == "draft"
