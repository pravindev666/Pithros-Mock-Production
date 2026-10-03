"""Stage 3 gate — the Farewell Network as a real, propagating marketplace.

Three isolated browser contexts: a fixture-provisioned partner (a real Firebase
user with a partner role claim, who then signs in through the real UI), an admin,
and an anonymous visitor. Every mutation happens through the product's own UI;
the database is read only, purely to confirm the system state the UI reported.
"""

from __future__ import annotations

import re
import secrets
import uuid

import httpx
import pytest

from .support import database
from .support import firebase as firebase_tools
from .support.accounts import TestCredentials
from .test_verification_chain import _admin_landing, _login, _wait_for

ADMIN_EMAIL = "pithros.e2e.admin@gmail.com"
PARTNER_EMAIL = "pithros.e2e.partner@gmail.com"

pytestmark = pytest.mark.e2e
PROVIDER_NAME = "Mathew E2E Serene Transitions"
PROVIDER_CITY = "Bengaluru"
PROVIDER_CATEGORY = "Farewell Coordinators"
SERVICE_NAME = "Immediate Transit Coordination"
SERVICE_PRICE = "From ₹18,000"
FAMILY_NAME = "Anita Rao"
FAMILY_PHONE = "+91 98860 11111"


@pytest.fixture(scope="module")
def partner_credentials(firebase_app):
    """A fixture-owned synthetic partner: real Firebase user plus role claim.

    This is setup for a dedicated test persona — not a bypass inside a journey.
    The partner then signs in through the real UI, and the backend copies the
    role from the verified claims exactly as it does for every partner.
    """
    from firebase_admin import auth as fb_auth

    password = secrets.token_urlsafe(18)
    firebase_tools.delete_user_if_exists(PARTNER_EMAIL)
    created = firebase_tools.with_timeout(
        "create_partner_user",
        fb_auth.create_user,
        email=PARTNER_EMAIL,
        password=password,
        email_verified=True,
        display_name="Mathew E2E Partner",
    )
    firebase_tools.with_timeout(
        "set_partner_claims",
        fb_auth.set_custom_user_claims,
        created.uid,
        {"role": "partner"},
    )
    return TestCredentials(email=PARTNER_EMAIL, password=password)


def _partner_landing(url: str) -> bool:
    return "/partner" in url and "signin" not in url


@pytest.fixture(scope="module")
def admin_credentials(firebase_app):
    """The same fixture-owned synthetic admin the verification chain uses.

    Fixtures do not cross test modules, so this module declares its own.
    """
    from firebase_admin import auth as fb_auth

    password = secrets.token_urlsafe(18)
    try:
        existing = firebase_tools.with_timeout("get_user", fb_auth.get_user_by_email, ADMIN_EMAIL)
        firebase_tools.with_timeout("delete_user", fb_auth.delete_user, existing.uid)
    except fb_auth.UserNotFoundError:
        pass

    created = firebase_tools.with_timeout(
        "create_admin_user",
        fb_auth.create_user,
        email=ADMIN_EMAIL,
        password=password,
        email_verified=True,
        display_name="Pithros E2E Admin",
    )
    firebase_tools.with_timeout(
        "set_admin_claims",
        fb_auth.set_custom_user_claims,
        created.uid,
        {"role": "admin", "admin_subrole": "super_admin"},
    )
    return TestCredentials(email=ADMIN_EMAIL, password=password)


def _fill(page, label: str, value: str) -> None:
    page.locator(
        f'label:has-text("{label}") + input, label:has-text("{label}") + textarea'
    ).first.fill(value)


def _provider_row():
    return database.fetch_one(
        "SELECT id, status, verification_state, city, category, business_name "
        "FROM providers WHERE business_name = %s",
        (PROVIDER_NAME,),
    )


def test_farewell_network_marketplace(
    browser, e2e_stack, frontend_config, partner_credentials, admin_credentials, assets
):
    partner_context = browser.new_context()
    admin_context = browser.new_context()
    visitor_context = browser.new_context()
    try:
        partner_page = partner_context.new_page()
        admin_page = admin_context.new_page()
        visitor_page = visitor_context.new_page()

        # ── 1. The partner signs in and completes the directory profile ──────
        _login(partner_page, e2e_stack, partner_credentials, landing=_partner_landing)
        partner_page.goto(
            f"{e2e_stack.frontend_url}/partner/profile", wait_until="domcontentloaded"
        )
        partner_page.get_by_role("button", name="Save Profile").wait_for(timeout=30_000)

        _fill(partner_page, "Organization / Provider Brand", PROVIDER_NAME)
        _fill(partner_page, "Lead Funeral Director / Specialist", "Anita Rao")
        _fill(partner_page, "Service Category", PROVIDER_CATEGORY)
        _fill(partner_page, "Primary City", PROVIDER_CITY)
        _fill(partner_page, "Service Areas", "Bengaluru, Mysuru")
        _fill(partner_page, "Tagline", "Compassionate farewell coordination")
        _fill(partner_page, "Public Bereavement Statement", "Family-first coordination.")
        partner_page.get_by_role("button", name="Save Profile").click()
        partner_page.get_by_text("Profile saved.", exact=False).wait_for(timeout=20_000)

        row = _provider_row()
        assert row is not None, "the partner profile was never created"
        assert row[5] == PROVIDER_NAME
        assert row[3] == PROVIDER_CITY
        assert row[4] == PROVIDER_CATEGORY
        assert row[1] == "pending", "a new partner must not be public before review"

        # ── 2. Credentials: upload through the media pipeline, then submit ───
        partner_page.goto(
            f"{e2e_stack.frontend_url}/partner/verification", wait_until="domcontentloaded"
        )
        partner_page.locator('input[type="file"]').set_input_files(str(assets.certificate_match))
        partner_page.get_by_text("Document received", exact=False).wait_for(timeout=30_000)
        partner_page.get_by_role("button", name="Submit for review").click()
        partner_page.get_by_text("Under Trust Review", exact=False).wait_for(timeout=20_000)

        assert _provider_row()[2] == "submitted"

        # ── 3. An admin approves the credentials from the real queue ─────────
        _login(admin_page, e2e_stack, admin_credentials, landing=_admin_landing)
        admin_page.goto(f"{e2e_stack.frontend_url}/admin/providers", wait_until="domcontentloaded")

        queue_row = admin_page.locator("tr", has_text=PROVIDER_NAME)
        queue_row.wait_for(timeout=30_000)
        queue_row.get_by_role("button", name="Approve").click()
        admin_page.get_by_text("Approved Partner", exact=False).first.wait_for(timeout=20_000)

        approved = _provider_row()
        assert approved[1] == "approved"
        assert approved[2] == "approved"
        actions = [
            r[0]
            for r in database.fetch_all(
                "SELECT action FROM audit_logs WHERE entity = 'providers' "
                "OR entity = 'memorial_media'"
            )
        ]
        assert "PROVIDER_SUBMITTED" in actions
        assert "PROVIDER_APPROVED" in actions

        # ── 4. The visitor discovers the approved provider ───────────────────
        visitor_page.goto(f"{e2e_stack.frontend_url}/farewell", wait_until="domcontentloaded")
        visitor_page.get_by_text(PROVIDER_NAME, exact=False).first.wait_for(timeout=30_000)
        visitor_page.get_by_text(PROVIDER_NAME, exact=False).first.click()
        visitor_page.get_by_text(PROVIDER_CITY, exact=False).first.wait_for(timeout=20_000)

        # ── 5. A service added in the console propagates to the public page ──
        partner_page.goto(
            f"{e2e_stack.frontend_url}/partner/services", wait_until="domcontentloaded"
        )
        partner_page.get_by_role("button", name="Add New Service").click()
        _fill(partner_page, "Service Title", SERVICE_NAME)
        _fill(partner_page, "Price / Fee", SERVICE_PRICE)
        _fill(partner_page, "Turnaround", "4 hours")
        _fill(partner_page, "Description", "Temperature-controlled coordination.")
        partner_page.get_by_role("button", name="Publish Service").click()
        partner_page.get_by_text(SERVICE_NAME, exact=False).first.wait_for(timeout=20_000)

        service_row = database.fetch_one(
            "SELECT id, active FROM provider_services WHERE name = %s", (SERVICE_NAME,)
        )
        assert service_row is not None, "the service was never created"
        assert service_row[1] is True

        # The detail endpoint is read first, so a failure localises the layer.
        detail = httpx.get(
            f"{e2e_stack.backend_url}/api/v1/public/providers/mathew-e2e-serene-transitions",
            timeout=20,
        )
        assert detail.status_code == 200
        public_payload = detail.json()
        assert [s["name"] for s in public_payload["services"]] == [SERVICE_NAME], (
            f"public detail did not carry the service: {public_payload.get('services')!r}"
        )
        assert public_payload["services"][0]["startingPrice"] == SERVICE_PRICE

        # The visitor's own context may still be serving the previous payload from
        # the PWA service-worker cache, so the propagation check uses a fresh
        # browser context — which is also exactly how a new family arrives.
        profile_url = f"{e2e_stack.frontend_url}/farewell/providers/mathew-e2e-serene-transitions"
        fresh_context = browser.new_context()
        try:
            fresh_page = fresh_context.new_page()
            fresh_page.goto(profile_url, wait_until="domcontentloaded")
            _wait_for(
                lambda: (
                    fresh_page.get_by_text(SERVICE_NAME, exact=False).count() > 0
                    or fresh_page.get_by_text("Services (1)", exact=False).count() > 0
                ),
                timeout=30,
                message="the public profile page never rendered the new service",
            )
        finally:
            fresh_context.close()

        # Hiding it in the console removes it from the public page again.
        partner_page.get_by_role("button", name="Published").first.click()
        _wait_for(
            lambda: (
                database.fetch_one(
                    "SELECT active FROM provider_services WHERE name = %s", (SERVICE_NAME,)
                )[0]
                is False
            ),
            timeout=20,
            message="hiding the service was never persisted",
        )
        hidden_context = browser.new_context()
        try:
            hidden_page = hidden_context.new_page()
            hidden_page.goto(profile_url, wait_until="domcontentloaded")
            _wait_for(
                lambda: (
                    hidden_page.get_by_text(SERVICE_NAME, exact=False).count() == 0
                    and hidden_page.get_by_text("Services (1)", exact=False).count() == 0
                ),
                timeout=30,
                message="a hidden service was still visible on the public profile",
            )
        finally:
            hidden_context.close()
        hidden_detail = httpx.get(
            f"{e2e_stack.backend_url}/api/v1/public/providers/mathew-e2e-serene-transitions",
            timeout=20,
        )
        assert hidden_detail.json()["services"] == []

        # ── 6. An anonymous family enquiry reaches the partner ───────────────
        visitor_page.get_by_role("button", name=re.compile("Request", re.IGNORECASE)).first.click()
        visitor_page.get_by_placeholder("e.g. Aditi Sharma").fill(FAMILY_NAME)
        visitor_page.get_by_placeholder("+91 98450 00000").fill(FAMILY_PHONE)
        # The submit control is labelled through the locale catalogue, so address the
        # form's own submit button rather than its translated text.
        visitor_page.locator('form button[type="submit"]').last.click()
        visitor_page.get_by_text("has received your inquiry", exact=False).wait_for(timeout=20_000)

        lead_row = database.fetch_one(
            "SELECT id, status, provider_id, contact_name FROM farewell_leads "
            "WHERE contact_name = %s",
            (FAMILY_NAME,),
        )
        assert lead_row is not None, "the enquiry was never recorded"
        assert lead_row[1] == "submitted"
        assert str(lead_row[2]) == str(approved[0])

        # ── 7. The partner sees it and moves the status ──────────────────────
        partner_page.goto(f"{e2e_stack.frontend_url}/partner/leads", wait_until="domcontentloaded")
        partner_page.get_by_text(FAMILY_NAME, exact=False).first.wait_for(timeout=30_000)
        partner_page.get_by_text(FAMILY_NAME, exact=False).first.click()
        # `.last` because the status filter chips carry the same labels as the
        # modal's action buttons.
        partner_page.get_by_role("button", name="contacted").last.click()
        _wait_for(
            lambda: (
                database.fetch_one(
                    "SELECT status FROM farewell_leads WHERE contact_name = %s", (FAMILY_NAME,)
                )[0]
                == "contacted"
            ),
            timeout=20,
            message="the partner's status change was never persisted",
        )

        # ── 8. The admin desk reflects the same enquiry and status ───────────
        admin_page.goto(f"{e2e_stack.frontend_url}/admin/leads", wait_until="domcontentloaded")
        admin_page.get_by_text(FAMILY_NAME, exact=False).first.wait_for(timeout=30_000)
        admin_page.get_by_text("Provider Contacted", exact=False).first.wait_for(timeout=20_000)

        # ── 9. Suspension hides the provider again ───────────────────────────
        admin_page.goto(f"{e2e_stack.frontend_url}/admin/providers", wait_until="domcontentloaded")
        suspend_row = admin_page.locator("tr", has_text=PROVIDER_NAME)
        suspend_row.wait_for(timeout=30_000)
        suspend_row.get_by_role("button", name="Suspend").click()
        admin_page.get_by_text("Suspended", exact=False).first.wait_for(timeout=20_000)

        assert _provider_row()[1] == "suspended"

        visitor_page.goto(f"{e2e_stack.frontend_url}/farewell", wait_until="domcontentloaded")
        _wait_for(
            lambda: visitor_page.get_by_text(PROVIDER_NAME, exact=False).count() == 0,
            timeout=30,
            message="the suspended provider is still listed in the public directory",
        )

        suspended_audit = [
            r[0]
            for r in database.fetch_all("SELECT action FROM audit_logs WHERE entity = 'providers'")
        ]
        assert "PROVIDER_SUSPENDED" in suspended_audit
        lead_audit = [
            r[0]
            for r in database.fetch_all(
                "SELECT action FROM audit_logs WHERE entity = 'farewell_leads'"
            )
        ]
        assert "LEAD_SUBMITTED" in lead_audit
        assert "LEAD_STATUS_CHANGED" in lead_audit

        # Every provider media object belongs to this provider, not a memorial.
        media_owner = database.fetch_one(
            "SELECT count(*) FROM memorial_media WHERE provider_id = %s "
            "AND memorial_id IS NOT NULL",
            (str(approved[0]),),
        )
        assert media_owner[0] == 0, "a provider media row also claimed a memorial owner"
        assert uuid.UUID(str(approved[0]))  # sanity: the id is a real provider id
    finally:
        partner_context.close()
        admin_context.close()
        visitor_context.close()
