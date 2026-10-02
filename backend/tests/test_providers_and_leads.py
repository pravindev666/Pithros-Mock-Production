"""Farewell Network: partner onboarding, credential review, discovery, and leads.

These tests drive the real HTTP surface with the real services: profile
provisioning, document upload through the media pipeline, admin review, public
visibility, and enquiry propagation. Ownership isolation is checked explicitly,
because a partner console that leaks another partner's leads would be worse than
having none at all.
"""

from __future__ import annotations

import base64
import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.audit.models import AuditLog
from app.core.enums import StorageTier
from app.media.models import MediaItem
from app.media.storage import get_storage
from app.notifications.models import Notification
from app.providers.models import FarewellLead, Provider

# A real 1x1 PNG: passes the content sniffing stage honestly.
TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg=="
)


def _make_manager(db_session, make_user):
    manager = make_user(name="Priya Provider Manager", role="admin")
    manager.admin_subrole = "provider_manager"
    db_session.flush()
    return manager


def _notifications(db_session, user_id) -> list[Notification]:
    return list(
        db_session.scalars(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at)
        )
    )


def _audit_actions(db_session) -> list[str]:
    return list(db_session.scalars(select(AuditLog.action).order_by(AuditLog.created_at)))


def _upload(
    client,
    db_session,
    headers: dict[str, str],
    *,
    filename: str,
    kind: str,
    content_type: str,
    title: str = "",
) -> uuid.UUID:
    """Real intent → bytes → complete, through the provider media endpoints."""
    intent = client.post(
        "/api/v1/partner/media/intent",
        json={
            "filename": filename,
            "contentType": content_type,
            "sizeBytes": len(TINY_PNG),
            "kind": kind,
            "title": title,
        },
        headers=headers,
    )
    assert intent.status_code == 200, intent.text
    media_id = uuid.UUID(intent.json()["mediaId"])

    item = db_session.get(MediaItem, media_id)
    assert item is not None
    storage = get_storage()
    storage.put_bytes(
        tier=StorageTier(item.storage_tier),
        key=item.storage_key,
        data=TINY_PNG,
        content_type=content_type,
    )

    done = client.post(f"/api/v1/partner/media/{media_id}/complete", headers=headers)
    assert done.status_code == 200, done.text
    assert done.json()["status"] == "ready"
    return media_id


def _ready_provider(client, db_session, make_user, auth, *, name: str = "Serene Transitions"):
    """Partner with a completed credential review, approved by an admin."""
    partner = make_user(name=name, role="partner")
    headers = auth(partner)
    profile = client.get("/api/v1/partner/profile", headers=headers)
    assert profile.status_code == 200, profile.text
    provider_id = uuid.UUID(profile.json()["id"])

    client.patch(
        "/api/v1/partner/profile",
        json={
            "businessName": name,
            "tagline": "Compassionate farewell coordination",
            "category": "Farewell Coordination",
            "city": "Bengaluru",
            "serviceAreas": ["Bengaluru", "Mysuru"],
            "phone": "+91 98450 00000",
            "whatsapp": "+91 98450 00000",
            "email": "care@example.com",
            "description": "Family-first coordination across Karnataka.",
            "operatingHours": "24 hours",
            "address": "12 Cubbon Road, Bengaluru",
        },
        headers=headers,
    )

    _upload(
        client,
        db_session,
        headers,
        filename="trade-licence.png",
        kind="document",
        content_type="image/png",
        title="Trade licence",
    )
    submitted = client.post("/api/v1/partner/verification/submit", headers=headers)
    assert submitted.status_code == 200, submitted.text

    manager = _make_manager(db_session, make_user)
    approved = client.post(
        f"/api/v1/admin/providers/{provider_id}/approve",
        json={"reason": "Credentials verified."},
        headers=auth(manager),
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "approved"
    return partner, provider_id, headers


# ─── Onboarding ─────────────────────────────────────────────────────────────


def test_partner_profile_is_provisioned_pending_and_invisible(client, make_user, auth):
    partner = make_user(name="Serene Transitions", role="partner")
    headers = auth(partner)

    profile = client.get("/api/v1/partner/profile", headers=headers)
    assert profile.status_code == 200
    body = profile.json()
    assert body["slug"] == "serene-transitions"
    assert body["status"] == "pending"
    assert body["verificationState"] == "draft"

    updated = client.patch(
        "/api/v1/partner/profile",
        json={"city": "Bengaluru", "serviceAreas": ["Bengaluru", "Mysuru"]},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["city"] == "Bengaluru"
    assert updated.json()["serviceAreas"] == ["Bengaluru", "Mysuru"]

    # Nothing here is public until an admin approves it.
    assert client.get("/api/v1/public/providers/serene-transitions").status_code == 404
    listing = client.get("/api/v1/public/providers")
    assert listing.status_code == 200
    assert listing.json()["total"] == 0


def test_non_partner_cannot_reach_the_partner_console(client, make_user, auth):
    visitor = make_user(name="Curious Visitor", role="visitor")
    response = client.get("/api/v1/partner/profile", headers=auth(visitor))
    assert response.status_code == 403


def test_verification_requires_at_least_one_document(client, make_user, auth):
    partner = make_user(name="Docless Partner", role="partner")
    headers = auth(partner)
    client.get("/api/v1/partner/profile", headers=headers)

    response = client.post("/api/v1/partner/verification/submit", headers=headers)
    assert response.status_code == 422
    assert "document" in response.json()["error"]["message"].lower()


# ─── Review and publication ──────────────────────────────────────────────────


def test_admin_approval_publishes_the_provider_and_notifies_the_owner(
    client, db_session, make_user, auth
):
    partner, _provider_id, _ = _ready_provider(client, db_session, make_user, auth)

    listed = client.get("/api/v1/public/providers")
    assert listed.json()["total"] == 1
    card = listed.json()["providers"][0]
    assert card["slug"] == "serene-transitions"
    assert card["city"] == "Bengaluru"

    detail = client.get("/api/v1/public/providers/serene-transitions")
    assert detail.status_code == 200
    body = detail.json()
    assert body["businessName"] == "Serene Transitions"
    assert body["verifiedBadges"] == ["Documents Reviewed"]
    # No reviews exist yet, and none are invented.
    assert body["rating"] == 0
    assert body["reviewCount"] == 0
    assert body["reviews"] == []
    assert body["serviceAreas"] == ["Bengaluru", "Mysuru"]

    notes = _notifications(db_session, partner.id)
    assert "provider_approved" in [note.type for note in notes]

    actions = _audit_actions(db_session)
    assert "PROVIDER_SUBMITTED" in actions
    assert "PROVIDER_APPROVED" in actions
    assert "PROVIDER_MEDIA_CHANGED" in actions


def test_services_propagate_to_the_public_profile(client, db_session, make_user, auth):
    _, _provider_id, headers = _ready_provider(client, db_session, make_user, auth)

    created = client.post(
        "/api/v1/partner/services",
        json={
            "name": "Immediate Transit Coordination",
            "description": "Temperature-controlled transport within 4 hours.",
            "priceNote": "From ₹18,000",
            "estimatedTime": "4 hours",
            "includes": ["Documentation support", "Coordination with crematorium"],
            "sort": 1,
        },
        headers=headers,
    )
    assert created.status_code == 201, created.text
    service_id = created.json()["id"]
    assert created.json()["includes"] == [
        "Documentation support",
        "Coordination with crematorium",
    ]

    public = client.get("/api/v1/public/providers/serene-transitions").json()
    assert [s["name"] for s in public["services"]] == ["Immediate Transit Coordination"]
    assert public["startingPrice"] == "From ₹18,000"

    # Deactivating a service removes it from the public profile.
    patched = client.patch(
        f"/api/v1/partner/services/{service_id}", json={"active": False}, headers=headers
    )
    assert patched.status_code == 200
    assert client.get("/api/v1/public/providers/serene-transitions").json()["services"] == []


def test_gallery_photo_upload_publishes_with_the_provider(client, db_session, make_user, auth):
    _, _provider_id, headers = _ready_provider(client, db_session, make_user, auth)

    _upload(
        client,
        db_session,
        headers,
        filename="chapel.png",
        kind="photo",
        content_type="image/png",
        title="Our chapel",
    )

    public = client.get("/api/v1/public/providers/serene-transitions").json()
    assert len(public["photos"]) == 1
    assert public["photos"][0].startswith("http")
    assert public["photoUrl"].startswith("http")


def test_suspension_hides_the_provider_again(client, db_session, make_user, auth):
    _, provider_id, _ = _ready_provider(client, db_session, make_user, auth)
    manager = _make_manager(db_session, make_user)

    suspended = client.post(
        f"/api/v1/admin/providers/{provider_id}/suspend",
        json={"reason": "Repeated complaints from families."},
        headers=auth(manager),
    )
    assert suspended.status_code == 200
    assert suspended.json()["status"] == "suspended"

    assert client.get("/api/v1/public/providers").json()["total"] == 0
    assert client.get("/api/v1/public/providers/serene-transitions").status_code == 404


# ─── Leads ──────────────────────────────────────────────────────────────────


def test_public_lead_reaches_the_partner_and_the_admin(client, db_session, make_user, auth):
    partner, _provider_id, headers = _ready_provider(client, db_session, make_user, auth)

    created = client.post(
        "/api/v1/public/providers/serene-transitions/leads",
        json={
            "contactName": "Anita Rao",
            "contactPhone": "+91 98860 11111",
            "contactEmail": "anita@example.com",
            "city": "Bengaluru",
            "serviceNeeded": "Immediate Transit & Ceremonial Coordination",
            "message": "We need support for 40 attendees this evening.",
            "urgency": "Immediate (Today/Tomorrow)",
        },
    )
    assert created.status_code == 201, created.text
    assert created.json()["status"] == "new"
    lead_id = created.json()["id"]

    # The partner is told, and sees the enquiry in its console.
    assert "provider_lead_received" in [n.type for n in _notifications(db_session, partner.id)]
    console = client.get("/api/v1/partner/leads", headers=headers)
    assert console.status_code == 200
    assert console.json()["total"] == 1
    lead = console.json()["leads"][0]
    assert lead["requesterName"] == "Anita Rao"
    assert lead["status"] == "Submitted"

    # So does the admin desk.
    manager = _make_manager(db_session, make_user)
    admin_leads = client.get("/api/v1/admin/leads", headers=auth(manager))
    assert admin_leads.status_code == 200
    assert admin_leads.json()["total"] == 1

    # Status moves through the real state machine and persists.
    moved = client.patch(
        f"/api/v1/partner/leads/{lead_id}",
        json={"status": "Provider Contacted"},
        headers=headers,
    )
    assert moved.status_code == 200, moved.text
    assert moved.json()["status"] == "Provider Contacted"
    assert db_session.get(FarewellLead, uuid.UUID(lead_id)).status == "contacted"

    # An illegal jump is refused, not silently written: a contacted enquiry
    # cannot slide backwards into "In Discussion" without a quote.
    illegal = client.patch(
        f"/api/v1/partner/leads/{lead_id}",
        json={"status": "In Discussion"},
        headers=headers,
    )
    assert illegal.status_code == 409, illegal.text

    assert "LEAD_SUBMITTED" in _audit_actions(db_session)
    assert "LEAD_STATUS_CHANGED" in _audit_actions(db_session)


def test_lead_status_update_notifies_a_signed_in_family_member(client, db_session, make_user, auth):
    _, _provider_id, partner_headers = _ready_provider(client, db_session, make_user, auth)

    family = make_user(name="Anita Rao", role="visitor")
    created = client.post(
        "/api/v1/public/providers/serene-transitions/leads",
        json={
            "contactName": "Anita Rao",
            "contactPhone": "+91 98860 11111",
            "city": "Bengaluru",
            "serviceNeeded": "Farewell Coordination",
        },
        headers=auth(family),
    )
    assert created.status_code == 201
    lead_id = created.json()["id"]

    contacted = client.patch(
        f"/api/v1/partner/leads/{lead_id}",
        json={"status": "Provider Contacted"},
        headers=partner_headers,
    )
    assert contacted.status_code == 200, contacted.text

    moved = client.patch(
        f"/api/v1/partner/leads/{lead_id}",
        json={"status": "Quote Received", "quotedAmount": "₹22,000"},
        headers=partner_headers,
    )
    assert moved.status_code == 200, moved.text
    assert moved.json()["quotedAmount"] == "₹22,000"

    notes = [n.type for n in _notifications(db_session, family.id)]
    assert "lead_status_updated" in notes

    family_view = client.get("/api/v1/partner/leads", headers=auth(family))
    assert family_view.status_code == 403  # the family is not a partner


def test_a_partner_cannot_touch_another_partners_records(client, db_session, make_user, auth):
    _, _provider_id, owner_headers = _ready_provider(client, db_session, make_user, auth)
    service = client.post(
        "/api/v1/partner/services",
        json={"name": "Private Service", "priceNote": "From ₹1"},
        headers=owner_headers,
    ).json()

    created_lead = client.post(
        "/api/v1/public/providers/serene-transitions/leads",
        json={
            "contactName": "Anita Rao",
            "contactPhone": "+91 98860 11111",
            "serviceNeeded": "Farewell Coordination",
        },
    )
    lead_id = created_lead.json()["id"]

    rival = make_user(name="Rival Funerals", role="partner")
    rival_headers = auth(rival)
    client.get("/api/v1/partner/profile", headers=rival_headers)

    assert (
        client.patch(
            f"/api/v1/partner/services/{service['id']}",
            json={"name": "Hijacked"},
            headers=rival_headers,
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/api/v1/partner/services/{service['id']}", headers=rival_headers
        ).status_code
        == 404
    )
    assert (
        client.patch(
            f"/api/v1/partner/leads/{lead_id}",
            json={"status": "Provider Contacted"},
            headers=rival_headers,
        ).status_code
        == 404
    )
    assert client.get("/api/v1/partner/leads", headers=rival_headers).json()["total"] == 0


def test_media_row_cannot_belong_to_both_a_memorial_and_a_provider(
    db_session, make_user, make_memorial
):
    """The one-owner rule is enforced by the database, not just by our code."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    partner = make_user(name="Partner", role="partner")

    provider = Provider(
        owner_user_id=partner.id,
        slug=f"provider-{uuid.uuid4().hex[:8]}",
        business_name="Partner Co",
    )
    db_session.add(provider)
    db_session.flush()

    db_session.add(
        MediaItem(
            memorial_id=memorial.id,
            provider_id=provider.id,
            kind="photo",
            status="ready",
            privacy="public",
            storage_tier=StorageTier.PUBLIC.value,
            storage_bucket="pithros-public",
            storage_key=f"both/{uuid.uuid4().hex}.png",
            original_filename="both.png",
            mime_type="image/png",
            size_bytes=10,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()
