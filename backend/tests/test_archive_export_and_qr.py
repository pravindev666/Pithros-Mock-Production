"""Tests for Archive Export (PDF via Celery) and QR code generation (B6).

Covers:
- Public QR code generation in PNG and SVG formats.
- Privacy boundary enforcement: private/family memorials return 404 on public QR.
- Authenticated member/steward QR code access.
- Celery task execution, polling status, and audit log persistence.
- Direct PDF stream download with full typeset story, milestones, and tributes.
- Role-based authorization for archive export (Steward and Archivist vs Viewer).
- Cross-memorial authorization isolation.
"""

from __future__ import annotations

from sqlalchemy import select

from app.audit.models import AuditLog
from app.core.enums import ContributorRole, TributeStatus
from app.memorials.models import Story, TimelineEvent
from app.tributes.models import Tribute


def test_public_can_fetch_qr_for_discoverable_memorial(
    client, make_user, make_memorial, db_session
):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")
    memorial.publication_state = "published"
    memorial.search_index_enabled = True
    db_session.commit()

    # PNG format
    res_png = client.get(f"/api/v1/public/memorials/{memorial.slug}/qr?format=png")
    assert res_png.status_code == 200
    assert res_png.headers["content-type"] == "image/png"
    assert res_png.content.startswith(b"\x89PNG\r\n\x1a\n")

    # SVG format with download header
    res_svg = client.get(f"/api/v1/public/memorials/{memorial.slug}/qr?format=svg&download=true")
    assert res_svg.status_code == 200
    assert "image/svg+xml" in res_svg.headers["content-type"]
    assert "attachment" in res_svg.headers.get("content-disposition", "")
    assert b"<svg" in res_svg.content


def test_public_cannot_fetch_qr_for_private_or_family_memorial(
    client, make_user, make_memorial, db_session
):
    owner = make_user(name="Owner")
    m_priv = make_memorial(steward=owner, privacy="private")
    m_priv.publication_state = "published"
    m_fam = make_memorial(steward=owner, privacy="family")
    m_fam.publication_state = "published"
    db_session.commit()

    res_priv = client.get(f"/api/v1/public/memorials/{m_priv.slug}/qr")
    assert res_priv.status_code == 404

    res_fam = client.get(f"/api/v1/public/memorials/{m_fam.slug}/qr")
    assert res_fam.status_code == 404


def test_authenticated_steward_can_get_qr_for_private_memorial(
    client, make_user, make_memorial, auth
):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="private")
    headers = auth(owner)

    res = client.get(f"/api/v1/memorials/{memorial.id}/qr?format=png", headers=headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/png"
    assert res.content.startswith(b"\x89PNG\r\n\x1a\n")


def test_steward_can_trigger_celery_pdf_export_and_poll_status(
    client, make_user, make_memorial, auth, monkeypatch, db_session
):
    from app.workers.celery_app import celery_app

    monkeypatch.setattr(celery_app.conf, "task_always_eager", True)
    monkeypatch.setattr(celery_app.conf, "task_eager_propagates", True)
    monkeypatch.setattr(celery_app.conf, "task_store_eager_result", True)
    monkeypatch.setattr("app.workers.tasks.archive_tasks.SessionLocal", lambda: db_session)
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")
    headers = auth(owner)

    # 1. Trigger export
    res = client.post(f"/api/v1/memorials/{memorial.id}/export/pdf", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "taskId" in data
    assert data["memorialId"] == str(memorial.id)
    assert data["status"] == "ready"
    assert "downloadUrl" in data

    task_id = data["taskId"]

    # 2. Poll status endpoint
    res_status = client.get(
        f"/api/v1/memorials/{memorial.id}/export/status/{task_id}",
        headers=headers,
    )
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["status"] == "ready"
    assert status_data["downloadUrl"] is not None
    assert status_data["fileSize"] > 0

    # 3. Check audit log
    audit_entry = db_session.scalar(
        select(AuditLog).where(
            AuditLog.entity == "memorial_archive_export",
            AuditLog.entity_id == str(memorial.id),
        )
    )
    assert audit_entry is not None
    assert audit_entry.action == "MEMORIAL_EXPORTED"


def test_steward_can_directly_download_pdf_book(client, make_user, make_memorial, auth, db_session):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, full_name="Mahatma Gandhi")
    memorial.short_epitaph = "My life is my message."
    memorial.birth_place = "Porbandar"
    memorial.resting_place = "Rajghat, New Delhi"
    db_session.commit()
    headers = auth(owner)

    # Attach Story
    story = Story(
        memorial_id=memorial.id,
        overview="Leader of the Indian independence movement through nonviolent resistance.",
        early_life="Studied law at University College London.",
        passions_and_values="Satyagraha, Ahimsa, and Truth.",
        enduring_legacy="Inspired movements for civil rights and freedom across the globe.",
        favorite_quotes=["In a gentle way, you can shake the world."],
    )
    db_session.add(story)

    # Attach TimelineEvent
    event = TimelineEvent(
        memorial_id=memorial.id,
        year="1930",
        date_str="12 March 1930",
        title="Salt March",
        description="Nonviolent protest march against the British salt monopoly in colonial India.",
    )
    db_session.add(event)

    # Attach approved Tribute
    tribute = Tribute(
        memorial_id=memorial.id,
        author_name="Albert Einstein",
        relationship="Admirer & Physicist",
        message=(
            "Generations to come will scarce believe that such a one as this "
            "ever walked upon this earth."
        ),
        status=TributeStatus.APPROVED.value,
    )
    db_session.add(tribute)
    db_session.commit()

    res = client.get(f"/api/v1/memorials/{memorial.id}/export/pdf/download", headers=headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF-")
    assert f"{memorial.slug}-memorial-book.pdf" in res.headers["content-disposition"]


def test_contributor_roles_permissions_for_pdf_export(
    client, make_user, make_memorial, add_contributor, auth
):
    owner = make_user(name="Owner")
    archivist = make_user(name="Archivist")
    viewer = make_user(name="Viewer")
    memorial = make_memorial(steward=owner, privacy="public")

    add_contributor(memorial=memorial, user=archivist, role=ContributorRole.PHOTO_ARCHIVIST.value)
    add_contributor(memorial=memorial, user=viewer, role=ContributorRole.VIEWER.value)

    # Archivist can export
    res_arch = client.get(
        f"/api/v1/memorials/{memorial.id}/export/pdf/download",
        headers=auth(archivist),
    )
    assert res_arch.status_code == 200
    assert res_arch.content.startswith(b"%PDF-")

    # Viewer is forbidden
    res_view = client.get(
        f"/api/v1/memorials/{memorial.id}/export/pdf/download",
        headers=auth(viewer),
    )
    assert res_view.status_code == 403

    # Unauthenticated is 401
    res_anon = client.get(f"/api/v1/memorials/{memorial.id}/export/pdf/download")
    assert res_anon.status_code == 401


def test_cross_memorial_isolation_for_export_and_qr(client, make_user, make_memorial, auth):
    owner_a = make_user(name="Owner A")
    owner_b = make_user(name="Owner B")
    memorial_a = make_memorial(steward=owner_a, privacy="private")
    headers_b = auth(owner_b)

    # Owner B cannot access private QR of memorial A (returns 404 to prevent leaking existence)
    res_qr = client.get(f"/api/v1/memorials/{memorial_a.id}/qr", headers=headers_b)
    assert res_qr.status_code in (403, 404)

    # Owner B cannot export memorial A
    res_export = client.post(
        f"/api/v1/memorials/{memorial_a.id}/export/pdf",
        headers=headers_b,
    )
    assert res_export.status_code in (403, 404)
