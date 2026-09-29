"""Tests for digital legacy links CRUD (B4).

Covers creation, reading, updating, deleting, bulk replacement,
authorization boundaries, input validation, and audit recording.
"""

from __future__ import annotations

from sqlalchemy import select

from app.audit.models import AuditLog
from app.core.enums import ContributorRole, LegacyPlatform


def test_steward_can_crud_legacy_links(client, make_user, make_memorial, auth, db_session):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")
    headers = auth(owner)

    # 1. Create
    create_payload = {
        "platform": LegacyPlatform.YOUTUBE.value,
        "label": "Memorial Concert 2024",
        "url": "https://youtube.com/watch?v=12345",
        "notes": "Live recording of the tribute concert",
    }
    create_res = client.post(
        f"/api/v1/memorials/{memorial.id}/legacy-links",
        json=create_payload,
        headers=headers,
    )
    assert create_res.status_code == 201
    created = create_res.json()
    link_id = created["id"]
    assert created["platform"] == LegacyPlatform.YOUTUBE.value
    assert created["label"] == "Memorial Concert 2024"
    assert created["url"] == "https://youtube.com/watch?v=12345"
    assert created["notes"] == "Live recording of the tribute concert"

    # 2. List
    list_res = client.get(
        f"/api/v1/memorials/{memorial.id}/legacy-links",
        headers=headers,
    )
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 1
    assert items[0]["id"] == link_id

    # 3. Get single
    get_res = client.get(
        f"/api/v1/memorials/{memorial.id}/legacy-links/{link_id}",
        headers=headers,
    )
    assert get_res.status_code == 200
    assert get_res.json()["id"] == link_id

    # 4. Patch
    patch_res = client.patch(
        f"/api/v1/memorials/{memorial.id}/legacy-links/{link_id}",
        json={"label": "Memorial Concert 2024 (HD Remaster)", "platform": "website"},
        headers=headers,
    )
    assert patch_res.status_code == 200
    patched = patch_res.json()
    assert patched["label"] == "Memorial Concert 2024 (HD Remaster)"
    assert patched["platform"] == "website"
    assert patched["url"] == "https://youtube.com/watch?v=12345"

    # 5. Delete
    delete_res = client.delete(
        f"/api/v1/memorials/{memorial.id}/legacy-links/{link_id}",
        headers=headers,
    )
    assert delete_res.status_code == 204

    # Verify deleted
    get_after_delete = client.get(
        f"/api/v1/memorials/{memorial.id}/legacy-links/{link_id}",
        headers=headers,
    )
    assert get_after_delete.status_code == 404


def test_replace_legacy_links(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")
    headers = auth(owner)

    # Initial add
    client.post(
        f"/api/v1/memorials/{memorial.id}/legacy-links",
        json={"platform": "website", "label": "Initial", "url": "https://example.com/1"},
        headers=headers,
    )

    # Bulk replace with two new links
    replace_payload = {
        "links": [
            {"platform": "facebook", "label": "FB Memorial", "url": "https://facebook.com/page"},
            {"platform": "linkedin", "label": "Career Legacy", "url": "https://linkedin.com/in/person"},
        ]
    }
    res = client.put(
        f"/api/v1/memorials/{memorial.id}/legacy-links",
        json=replace_payload,
        headers=headers,
    )
    assert res.status_code == 200
    links = res.json()
    assert len(links) == 2
    assert {link_item["platform"] for link_item in links} == {"facebook", "linkedin"}


def test_viewer_contributor_cannot_modify_legacy_links(
    client, make_user, make_memorial, add_contributor, auth
):
    owner = make_user(name="Owner")
    viewer = make_user(name="Viewer")
    memorial = make_memorial(steward=owner, privacy="public")
    add_contributor(memorial=memorial, user=viewer, role=ContributorRole.VIEWER.value)

    # Create link as owner
    created = client.post(
        f"/api/v1/memorials/{memorial.id}/legacy-links",
        json={"platform": "website", "label": "Official Archive", "url": "https://example.com"},
        headers=auth(owner),
    ).json()

    # Viewer can read
    read_res = client.get(
        f"/api/v1/memorials/{memorial.id}/legacy-links",
        headers=auth(viewer),
    )
    assert read_res.status_code == 200

    # Viewer cannot create (403)
    create_res = client.post(
        f"/api/v1/memorials/{memorial.id}/legacy-links",
        json={"platform": "other", "label": "Blog", "url": "https://blog.com"},
        headers=auth(viewer),
    )
    assert create_res.status_code == 403

    # Viewer cannot patch (403)
    patch_res = client.patch(
        f"/api/v1/memorials/{memorial.id}/legacy-links/{created['id']}",
        json={"label": "Hacked"},
        headers=auth(viewer),
    )
    assert patch_res.status_code == 403

    # Viewer cannot delete (403)
    delete_res = client.delete(
        f"/api/v1/memorials/{memorial.id}/legacy-links/{created['id']}",
        headers=auth(viewer),
    )
    assert delete_res.status_code == 403


def test_non_member_cannot_see_private_memorial_legacy_links(
    client, make_user, make_memorial, auth
):
    owner = make_user(name="Owner")
    stranger = make_user(name="Stranger")
    memorial = make_memorial(steward=owner, privacy="private")

    # Creating link as owner
    client.post(
        f"/api/v1/memorials/{memorial.id}/legacy-links",
        json={"platform": "website", "label": "Private Link", "url": "https://example.com"},
        headers=auth(owner),
    )

    # Stranger gets 404 so existence is hidden
    res = client.get(
        f"/api/v1/memorials/{memorial.id}/legacy-links",
        headers=auth(stranger),
    )
    assert res.status_code == 404


def test_cross_memorial_legacy_link_access_refused(client, make_user, make_memorial, auth):
    owner1 = make_user(name="Owner 1")
    owner2 = make_user(name="Owner 2")
    mem1 = make_memorial(steward=owner1, privacy="public")
    mem2 = make_memorial(steward=owner2, privacy="public")

    # Create link on mem1
    link1 = client.post(
        f"/api/v1/memorials/{mem1.id}/legacy-links",
        json={"platform": "website", "label": "Mem1 Site", "url": "https://mem1.com"},
        headers=auth(owner1),
    ).json()

    # Owner 2 tries to patch mem1's link through mem2 route
    res = client.patch(
        f"/api/v1/memorials/{mem2.id}/legacy-links/{link1['id']}",
        json={"label": "Hijacked"},
        headers=auth(owner2),
    )
    assert res.status_code == 404

    # Owner 2 tries to delete mem1's link through mem2 route
    del_res = client.delete(
        f"/api/v1/memorials/{mem2.id}/legacy-links/{link1['id']}",
        headers=auth(owner2),
    )
    assert del_res.status_code == 404


def test_legacy_link_validation(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")
    headers = auth(owner)

    # Invalid platform
    res = client.post(
        f"/api/v1/memorials/{memorial.id}/legacy-links",
        json={"platform": "tiktok_unsupported", "label": "TikTok", "url": "https://tiktok.com"},
        headers=headers,
    )
    assert res.status_code == 422

    # Missing label
    res_empty_label = client.post(
        f"/api/v1/memorials/{memorial.id}/legacy-links",
        json={"platform": "website", "label": "", "url": "https://example.com"},
        headers=headers,
    )
    assert res_empty_label.status_code == 422


def test_legacy_link_mutations_are_audited(client, make_user, make_memorial, auth, db_session):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")
    headers = auth(owner)

    client.post(
        f"/api/v1/memorials/{memorial.id}/legacy-links",
        json={"platform": "website", "label": "Audit Test", "url": "https://test.com"},
        headers=headers,
    )

    audit_entry = db_session.scalar(
        select(AuditLog)
        .where(
            AuditLog.entity_id == str(memorial.id),
            AuditLog.action == "MEMORIAL_UPDATED",
        )
        .order_by(AuditLog.created_at.desc())
    )
    assert audit_entry is not None
    assert "legacyLinkAdded" in audit_entry.detail
