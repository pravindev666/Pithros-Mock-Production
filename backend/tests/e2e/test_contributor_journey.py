"""Stage 8 / Phase 9-10 — the family contributor journey through the real UI.

A steward invites a relative from the contributors screen; the relative opens the
real invitation link, signs in, and accepts. The relationship is persisted by the
server, the contributor can then see the memorial, and every steward-only action
is refused for them — proven at the API, not by hiding a button.
"""

from __future__ import annotations

import contextlib
import secrets

import httpx
import pytest

from .support import database
from .support import firebase as firebase_tools
from .support.accounts import TEST_STEWARD_EMAIL, TestCredentials
from .test_media_lifecycle import _create_memorial, _memorial_id, _sign_in_again
from .test_verification_chain import _login, _wait_for

pytestmark = pytest.mark.e2e

CONTRIBUTOR_EMAIL = "pithros.e2e.kinsman@gmail.com"
CIRCLE_NAME = "Mathew E2E Contributor Circle"


@pytest.fixture(scope="module")
def steward_credentials(firebase_app, steward_password):
    """The verified steward persona (provisioned like the other E2E personas)."""
    from firebase_admin import auth as fb_auth

    firebase_tools.delete_user_if_exists(TEST_STEWARD_EMAIL)
    firebase_tools.with_timeout(
        "create_steward_user",
        fb_auth.create_user,
        email=TEST_STEWARD_EMAIL,
        password=steward_password.password,
        email_verified=True,
        display_name="Mathew E2E Steward",
    )
    return TestCredentials(email=TEST_STEWARD_EMAIL, password=steward_password.password)


@pytest.fixture(scope="module")
def contributor_credentials(firebase_app):
    """A second real user who will be invited and then accept."""
    from firebase_admin import auth as fb_auth

    password = secrets.token_urlsafe(18)
    firebase_tools.delete_user_if_exists(CONTRIBUTOR_EMAIL)
    firebase_tools.with_timeout(
        "create_contributor_user",
        fb_auth.create_user,
        email=CONTRIBUTOR_EMAIL,
        password=password,
        email_verified=True,
        display_name="Mathew E2E Kin",
    )
    return TestCredentials(email=CONTRIBUTOR_EMAIL, password=password)


def _contributor_row(memorial_id: str):
    return database.fetch_one(
        "SELECT id::text, status, role, user_id::text, invited_email "
        "FROM memorial_contributors WHERE memorial_id = %s::uuid "
        "ORDER BY created_at DESC LIMIT 1",
        (memorial_id,),
    )


def _accepted_contributor(memorial_id: str):
    row = _contributor_row(memorial_id)
    return row if row and row[1] == "active" and row[3] is not None else None


def test_contributor_invite_accept_and_steward_boundaries(
    browser, e2e_stack, frontend_config, steward_credentials, contributor_credentials
):
    a_context = browser.new_context()
    a_page = a_context.new_page()
    captured: dict = {}

    def _capture(response):
        if response.request.method == "POST" and response.url.endswith("/contributors"):
            with contextlib.suppress(Exception):
                captured.update(response.json())

    a_page.on("response", _capture)
    try:
        # ── Steward invites a relative from the real contributors screen ────
        _login(a_page, e2e_stack, steward_credentials, landing=lambda url: "/dashboard" in url)
        _create_memorial(a_page, e2e_stack, name=CIRCLE_NAME)
        memorial_id = _memorial_id(CIRCLE_NAME)

        a_page.goto(
            f"{e2e_stack.frontend_url}/dashboard/contributors", wait_until="domcontentloaded"
        )
        a_page.get_by_role("button", name="Invite Family Member").click()
        a_page.get_by_placeholder("e.g. Vikram Krishnan").fill("Vikram E2E Kin")
        a_page.get_by_placeholder("e.g. Son, Sister, Grandchild, Niece").fill("Brother")
        a_page.get_by_placeholder("relative@example.com").fill(contributor_credentials.email)
        a_page.locator("select").last.select_option("contributor")
        a_page.get_by_role("button", name="Send Invitation").click()
        a_page.get_by_text("Invitation Dispatched", exact=False).wait_for(timeout=20_000)

        row = _wait_for(
            lambda: _contributor_row(memorial_id),
            timeout=20,
            message="the invitation was never recorded",
        )
        contributor_id, status, role, user_id, invited_email = row
        assert status == "invited"
        assert role == "memory_contributor"
        assert user_id is None
        assert invited_email.lower() == contributor_credentials.email.lower()

        token = _wait_for(
            lambda: captured.get("invitationToken"),
            timeout=20,
            message="the invitation token was never issued",
        )
        invitation_url = (
            f"{e2e_stack.frontend_url}/invite/{memorial_id}"
            f"?role=memory_contributor&memberId={contributor_id}&token={token}"
        )

        # ── The invited relative signs in and accepts the real link ─────────
        b_context = browser.new_context()
        try:
            b_page = b_context.new_page()
            _sign_in_again(b_page, e2e_stack, contributor_credentials, console=[], failed=[])
            b_page.goto(invitation_url, wait_until="domcontentloaded")
            b_page.get_by_role("button", name="Accept Invitation & Enter Sanctuary").click()
            b_page.get_by_text("Welcome to the family circle", exact=False).wait_for(timeout=20_000)

            accepted = _wait_for(
                lambda: _accepted_contributor(memorial_id),
                timeout=30,
                message="the invitation was never accepted",
            )
            assert accepted[3] is not None, "the contributor was not bound to a user"

            # The contributor now sees the memorial in their own console.
            b_page.wait_for_url(lambda url: "/dashboard" in url, timeout=20_000)
            b_page.get_by_text(CIRCLE_NAME, exact=False).first.wait_for(timeout=20_000)
        finally:
            b_context.close()

        # ── Viewing is allowed; steward-only actions are refused ────────────
        b_token = firebase_tools.sign_in_with_password(
            frontend_config["VITE_FIREBASE_API_KEY"],
            contributor_credentials.email,
            contributor_credentials.password,
        )
        b_headers = {"Authorization": f"Bearer {b_token}"}

        view = httpx.get(
            f"{e2e_stack.backend_url}/api/v1/memorials/{memorial_id}",
            headers=b_headers,
            timeout=20,
        )
        assert view.status_code == 200, view.text

        rename = httpx.patch(
            f"{e2e_stack.backend_url}/api/v1/memorials/{memorial_id}",
            headers=b_headers,
            json={"fullName": "Hijacked By Contributor"},
            timeout=20,
        )
        assert rename.status_code == 403, rename.text

        delete = httpx.delete(
            f"{e2e_stack.backend_url}/api/v1/memorials/{memorial_id}",
            headers=b_headers,
            timeout=20,
        )
        assert delete.status_code == 403, delete.text

        # The memorial is untouched by the refused attempts.
        after = database.fetch_one(
            "SELECT full_name FROM memorials WHERE id = %s::uuid", (memorial_id,)
        )
        assert after[0] == CIRCLE_NAME
    finally:
        a_context.close()
