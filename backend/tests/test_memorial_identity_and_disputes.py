"""Tests for identity resolution, privacy-safe duplicate screening,
competing claims, concurrency, and memorial merge workflows.
"""

from __future__ import annotations

from app.core.enums import (
    UserRole,
)
from app.memorials.identity import (
    calculate_identity_similarity,
    normalize_name,
)


def test_name_normalization_strips_honorifics_and_sorts_tokens():
    """Verify honorific stripping and token order independence."""
    assert normalize_name("Dr. Arun Krishnan") == "arun krishnan"
    assert normalize_name("Krishnan, Arun (Dr.)") == "arun krishnan"
    assert normalize_name("Late Col. Hardeep Singh Gill") == "gill hardeep singh"
    assert normalize_name("Hardeep Singh Gill") == "gill hardeep singh"
    assert normalize_name("Smt. Kamala Devi") == "devi kamala"
    assert normalize_name("Pandit Ravi Shankar") == "ravi shankar"


def test_identity_similarity_distinguishes_same_person_from_different_generations():
    """Two people with the same name born in different centuries are distinct."""
    # Same person: identical name and dates
    high_match = calculate_identity_similarity(
        name_a="Dr. Arun Krishnan",
        birth_a="15 March 1948",
        death_a="14 February 2026",
        loc_a="Bengaluru",
        name_b="Arun Krishnan",
        birth_b="1948",
        death_b="2026",
        loc_b="Bangalore",
    )
    assert high_match.confidence_tier == "high_confidence"
    assert high_match.composite_score >= 0.80

    # Different person: same name, but decades apart (1910 vs 1995)
    diff_person = calculate_identity_similarity(
        name_a="Arun Krishnan",
        birth_a="1910",
        death_a="1975",
        loc_a="Chennai",
        name_b="Arun Krishnan",
        birth_b="1995",
        death_b="2024",
        loc_b="Bengaluru",
    )
    assert diff_person.confidence_tier == "likely_different"
    assert diff_person.composite_score < 0.50


def test_privacy_safe_duplicate_screening_redacts_private_memorial_metadata(
    client, make_user, auth, db_session
):
    """If User A has a private memorial, User B screening for the same person
    must NOT see User A's private slug, steward identity, or private content.
    """
    user_a = make_user(name="User A", email="usera@example.com")
    user_b = make_user(name="User B", email="userb@example.com")

    # User A creates a Private memorial
    res_a = client.post(
        "/api/v1/memorials",
        json={
            "fullName": "Ravi Kumar",
            "birthDate": "1950-01-01",
            "deathDate": "2024-05-15",
            "birthPlace": "Mysore",
            "privacy": "private",
        },
        headers=auth(user_a),
    )
    assert res_a.status_code == 201

    # User B checks for duplicate screening
    res_b = client.post(
        "/api/v1/memorials/screening/duplicate-check",
        json={
            "fullName": "Mr. Ravi Kumar",
            "birthDate": "1950",
            "deathDate": "2024",
            "birthPlace": "Mysore",
        },
        headers=auth(user_b),
    )
    assert res_b.status_code == 200
    data_b = res_b.json()

    assert data_b["hasPotentialCollision"] is True
    assert data_b["confidenceTier"] == "high_confidence"
    assert "Family Trust Desk" in data_b["privacySafeMessage"]

    # Verify that candidate details are REDACTED for User B
    candidate = data_b["candidateMatches"][0]
    assert candidate["id"] == "[PROTECTED_MEMORIAL]"
    assert candidate["fullName"] == "[Protected Record - Identity Held]"
    assert candidate["birthDate"] == "[Confidential]"
    assert "usera" not in str(data_b).lower()


def test_admin_duplicate_screening_reveals_unredacted_details(client, make_user, auth):
    """Admins need full visibility to arbitrate disputes."""
    admin = make_user(name="Pravin Admin", email="admin@pithros.org", role=UserRole.ADMIN.value)
    user_a = make_user(name="Family Member", email="family@example.com")

    client.post(
        "/api/v1/memorials",
        json={
            "fullName": "Suresh Raina Senior",
            "birthDate": "1940-02-10",
            "deathDate": "2020-03-12",
            "birthPlace": "Lucknow",
            "privacy": "private",
        },
        headers=auth(user_a),
    )

    res_admin = client.post(
        "/api/v1/memorials/screening/duplicate-check",
        json={
            "fullName": "Suresh Raina Senior",
            "birthDate": "1940",
            "deathDate": "2020",
            "birthPlace": "Lucknow",
        },
        headers=auth(admin),
    )
    assert res_admin.status_code == 200
    data = res_admin.json()
    assert data["hasPotentialCollision"] is True
    # Admin sees actual full name
    assert data["candidateMatches"][0]["fullName"] == "Suresh Raina Senior"


def test_concurrent_collision_holds_second_memorial_from_publication(
    client, make_user, auth, db_session
):
    """User A and User B create memorials for the same person.
    Both records are saved, but User B's memorial is marked duplicate_held
    and blocked from direct publication until Trust review.
    """
    user_a = make_user(name="Relative A", email="relativea@example.com")
    user_b = make_user(name="Relative B", email="relativeb@example.com")

    # User A creates memorial
    res_a = client.post(
        "/api/v1/memorials",
        json={
            "fullName": "Gopalakrishnan V",
            "birthDate": "1945-06-20",
            "deathDate": "2025-11-10",
            "birthPlace": "Palakkad",
            "privacy": "public",
        },
        headers=auth(user_a),
    )
    assert res_a.status_code == 201
    mem_a_id = res_a.json()["id"]

    # User B creates memorial for the same person
    res_b = client.post(
        "/api/v1/memorials",
        json={
            "fullName": "Gopalakrishnan V",
            "birthDate": "1945-06-20",
            "deathDate": "2025-11-10",
            "birthPlace": "Palakkad",
            "privacy": "public",
        },
        headers=auth(user_b),
    )
    assert res_b.status_code == 201
    mem_b_id = res_b.json()["id"]

    # Both IDs are distinct
    assert mem_a_id != mem_b_id

    # User B's memorial detail carries duplicate_held = True
    detail_b = client.get(f"/api/v1/memorials/{mem_b_id}", headers=auth(user_b)).json()
    assert detail_b["duplicateHeld"] is True

    # User B attempts to publish directly -> blocked with 409 Conflict
    pub_res = client.post(
        f"/api/v1/memorials/{mem_b_id}/publication",
        json={"publicationState": "published"},
        headers=auth(user_b),
    )
    assert pub_res.status_code == 409
    assert "Family Trust review" in pub_res.json()["error"]["message"]


def test_admin_merge_memorials_carries_timeline_and_co_stewardship(
    client, make_user, auth, db_session
):
    """Admin merges duplicate memorial B into canonical memorial A.
    Timeline events carry over, co-stewardship is granted, and duplicate is archived.
    """
    admin = make_user(name="Admin", role=UserRole.ADMIN.value)
    user_a = make_user(name="User A", email="a@example.com")
    user_b = make_user(name="User B", email="b@example.com")

    # Memorial A
    mem_a = client.post(
        "/api/v1/memorials",
        json={"fullName": "Prof. Narayana Murthy", "birthDate": "1940"},
        headers=auth(user_a),
    ).json()

    # Memorial B
    mem_b = client.post(
        "/api/v1/memorials",
        json={"fullName": "Narayana Murthy", "birthDate": "1940"},
        headers=auth(user_b),
    ).json()

    # Add milestone to Memorial B
    client.post(
        f"/api/v1/memorials/{mem_b['id']}/timeline",
        json={"year": "1968", "title": "Published First Math Paper"},
        headers=auth(user_b),
    )

    # Admin executes merge
    merge_res = client.post(
        "/api/v1/memorials/admin/merge",
        json={
            "canonicalMemorialId": mem_a["id"],
            "duplicateMemorialId": mem_b["id"],
            "reason": "Family consensus to maintain a unified digital heritage.",
            "carryOverTimeline": True,
            "carryOverMedia": True,
            "carryOverTributes": True,
            "coStewardship": True,
        },
        headers=auth(admin),
    )
    if merge_res.status_code != 200:
        print("MERGE ERROR:", merge_res.json())
    assert merge_res.status_code == 200

    # Verify timeline event moved to Memorial A
    mem_a_detail = client.get(f"/api/v1/memorials/{mem_a['id']}", headers=auth(user_a)).json()
    assert any(t["title"] == "Published First Math Paper" for t in mem_a_detail["timeline"])

    # Verify user_b is now a contributor on Memorial A
    assert any(c["email"] == "b@example.com" for c in mem_a_detail["family"])

    # Verify Memorial B is archived and marked merged
    mem_b_detail = client.get(f"/api/v1/memorials/{mem_b['id']}", headers=auth(user_b)).json()
    assert mem_b_detail["publicationState"] == "archived"
    assert mem_b_detail["disputeStatus"] == "MERGED"
    assert mem_b_detail["mergedIntoId"] == mem_a["id"]


def test_farewell_partner_tribute_submission_and_steward_deletion(
    client, make_user, auth, db_session
):
    """Verify Question 1:
    A bereavement partner (or public visitor) can submit a tribute,
    but it enters PENDING_MODERATION. The partner cannot approve it.
    The steward can permanently delete it via DELETE endpoint.
    """
    steward = make_user(name="Steward", email="steward@example.com")
    partner = make_user(name="Partner", email="partner@shanti.com", role=UserRole.PARTNER.value)

    # Steward creates public memorial and publishes it
    mem = client.post(
        "/api/v1/memorials",
        json={"fullName": "Bhaskar Rao", "privacy": "public"},
        headers=auth(steward),
    ).json()

    client.post(
        f"/api/v1/memorials/{mem['id']}/publication",
        json={"publicationState": "published"},
        headers=auth(steward),
    )

    # Partner submits a tribute
    sub_res = client.post(
        f"/api/v1/public/memorials/{mem['slug']}/tributes",
        json={
            "authorName": "Shanti Bereavement Services",
            "relationship": "Farewell Partner Coordinator",
            "message": "Honored to have assisted the family during transit. Resting in peace.",
        },
        headers=auth(partner),
    )
    assert sub_res.status_code == 201
    tribute_id = sub_res.json()["id"]

    # Public list does NOT show the tribute yet
    public_tributes = client.get(f"/api/v1/public/memorials/{mem['slug']}/tributes").json()
    assert len(public_tributes) == 0

    # Partner cannot approve their own tribute (403 Forbidden)
    patch_res = client.patch(
        f"/api/v1/memorials/{mem['id']}/tributes/{tribute_id}",
        json={"status": "approved"},
        headers=auth(partner),
    )
    assert patch_res.status_code == 403

    # Steward views tribute in moderation queue
    steward_queue = client.get(
        f"/api/v1/memorials/{mem['id']}/tributes", headers=auth(steward)
    ).json()
    assert len(steward_queue) == 1
    assert steward_queue[0]["id"] == tribute_id

    # Steward permanently deletes the tribute
    del_res = client.delete(
        f"/api/v1/memorials/{mem['id']}/tributes/{tribute_id}",
        headers=auth(steward),
    )
    assert del_res.status_code == 204

    # Queue is now empty
    steward_queue_after = client.get(
        f"/api/v1/memorials/{mem['id']}/tributes", headers=auth(steward)
    ).json()
    assert len(steward_queue_after) == 0


def test_public_memorial_qr_permanence_resolves_to_canonical(client, make_user, auth, db_session):
    """Residual Risk Part 6: A QR code physically printed for duplicate memorial B
    must not 404 after a merge; it must resolve transparently to canonical memorial A.
    """
    admin = make_user(name="Admin", role=UserRole.ADMIN.value)
    user_a = make_user(name="User A", email="ua@example.com")
    user_b = make_user(name="User B", email="ub@example.com")

    # Memorial A (Canonical)
    mem_a = client.post(
        "/api/v1/memorials",
        json={"fullName": "Dr. Subhash Chandra", "birthDate": "1935", "privacy": "public"},
        headers=auth(user_a),
    ).json()
    pub_res = client.post(
        f"/api/v1/memorials/{mem_a['id']}/publication",
        json={"publicationState": "published"},
        headers={**auth(user_a), "If-Match": f'"{mem_a["version"]}"'},
    )
    assert pub_res.status_code == 200

    # Memorial B (Duplicate with physical QR code distributed)
    mem_b = client.post(
        "/api/v1/memorials",
        json={"fullName": "Subhash Chandra", "birthDate": "1935"},
        headers=auth(user_b),
    ).json()

    # Admin executes merge
    client.post(
        "/api/v1/memorials/admin/merge",
        json={
            "canonicalMemorialId": mem_a["id"],
            "duplicateMemorialId": mem_b["id"],
            "reason": "Family unification.",
        },
        headers=auth(admin),
    )

    # QR scan on duplicate's slug resolves to canonical memorial!
    res = client.get(f"/api/v1/public/memorials/{mem_b['slug']}")
    assert res.status_code == 200
    assert res.json()["fullName"] == "Dr. Subhash Chandra"
    assert res.headers.get("X-Pithros-Merged-Canonical") == mem_a["slug"]


def test_stewardship_transfer_workflow_promotes_successor_and_retains_co_steward(
    client, make_user, auth, db_session
):
    """Residual Risk Part 2: Primary steward voluntarily hands over stewardship
    to a family successor while retaining co-stewardship rights.
    """
    primary = make_user(name="Elder Sibling", email="elder@example.com")
    make_user(name="Younger Sibling", email="younger@example.com")

    mem = client.post(
        "/api/v1/memorials",
        json={"fullName": "Beloved Patriarch", "birthDate": "1928"},
        headers=auth(primary),
    ).json()

    transfer_res = client.post(
        f"/api/v1/memorials/{mem['id']}/transfer-stewardship",
        json={
            "targetEmail": "younger@example.com",
            "reason": "Passing family remembrance responsibilities to next generation.",
            "retainAsCoSteward": True,
        },
        headers=auth(primary),
    )
    assert transfer_res.status_code == 200
    updated = transfer_res.json()

    # Successor is now steward
    assert updated["stewardName"] == "Younger Sibling"
    assert updated["stewardEmail"] == "younger@example.com"

    # Both siblings are in family list
    emails = {member["email"] for member in updated["family"]}
    assert "elder@example.com" in emails
    assert "younger@example.com" in emails


def test_admin_governance_access_on_unassigned_memorial(client, make_user, auth, db_session):
    """Residual Risk Part 1 & Part 12: Admin can access and govern an orphaned memorial."""
    steward = make_user(name="Departed Steward", email="departed@example.com")
    admin = make_user(name="Super Admin", role=UserRole.ADMIN.value)

    mem = client.post(
        "/api/v1/memorials",
        json={"fullName": "Orphaned Memorial", "birthDate": "1950"},
        headers=auth(steward),
    ).json()

    # Admin accesses the memorial directly
    admin_view = client.get(f"/api/v1/memorials/{mem['id']}", headers=auth(admin))
    assert admin_view.status_code == 200
    assert admin_view.json()["fullName"] == "Orphaned Memorial"
