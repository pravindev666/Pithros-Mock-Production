"""Smoke journey: a real person signs up and verifies email — twice in a row.

Everything happens through the real UI: the Firebase web SDK creates the
account, the harness opens the genuine Admin-SDK-generated verification link, and
the Pithros API provisions the user from the verified token. No database flag is
flipped anywhere inside the journey — this suite would rather fail than cheat.
"""

from __future__ import annotations

import time

import httpx
import pytest

from .support import firebase as firebase_tools
from .support.accounts import TEST_STEWARD_EMAIL

pytestmark = pytest.mark.e2e


def _poll(predicate, *, timeout: float, message: str):
    deadline = time.time() + timeout
    while time.time() < deadline:
        result = predicate()
        if result:
            return result
        time.sleep(0.5)
    raise AssertionError(message)


def test_health_readiness_and_storage_roundtrip(e2e_stack, r2_client):
    for path in ("/health", "/ready"):
        response = httpx.get(f"{e2e_stack.backend_url}{path}", timeout=10)
        assert response.status_code == 200, f"{path}: {response.text}"

    # The session fixture already performed a real PUT/GET/DELETE round-trip;
    # the key must be gone now.
    from .conftest import PROJECT_ROOT
    from .support import envfile

    env = envfile.backend_env(PROJECT_ROOT)
    # A second round-trip through the shared client, explicitly asserted.
    probe_key = f"e2e/healthcheck/assert-{time.time_ns()}.txt"
    r2_client.put(r2_client.private_bucket, probe_key, b"ok", "text/plain")
    assert r2_client.exists(r2_client.private_bucket, probe_key)
    assert r2_client.get(r2_client.private_bucket, probe_key) == b"ok"
    r2_client.delete(r2_client.private_bucket, probe_key)
    assert not r2_client.exists(r2_client.private_bucket, probe_key)
    assert env  # configuration was readable; preflight already proved credentials


@pytest.mark.parametrize("attempt", [1, 2], ids=["first-run", "repeat-run"])
def test_real_signup_verification_and_logout(
    attempt,
    browser,
    e2e_stack,
    frontend_config,
    firebase_app,
    steward_password,
):
    # The only Firebase account this suite ever removes: the dedicated test one.
    firebase_tools.delete_user_if_exists(TEST_STEWARD_EMAIL)

    context = browser.new_context()
    page = context.new_page()
    try:
        page.goto(f"{e2e_stack.frontend_url}/signup")
        page.fill("#fullName", "Mathew E2E Steward")
        page.fill("#signup-email", TEST_STEWARD_EMAIL)
        page.fill("#signup-phone", "+91 90000 00001")
        page.fill("#signup-password", steward_password.password)
        page.fill("#confirm-password", steward_password.password)
        page.check("#agreeTerms")
        page.get_by_role("button", name="Create Account").click()

        page.wait_for_url("**/verify-email", timeout=30_000)

        # Real Firebase created the account, and it is genuinely unverified.
        user = firebase_tools.get_user(TEST_STEWARD_EMAIL)
        assert user.email_verified is False

        # Verification interception: open the genuine link Firebase would email.
        link = firebase_tools.verification_link(TEST_STEWARD_EMAIL)
        verification_page = context.new_page()
        verification_page.goto(link, wait_until="domcontentloaded")
        _poll(
            lambda: firebase_tools.is_email_verified(TEST_STEWARD_EMAIL),
            timeout=30,
            message="Firebase never marked the address verified",
        )
        verification_page.close()

        # The app recognises verification through its own state check.
        page.bring_to_front()
        page.get_by_role("button", name="I've verified my email").click()
        page.get_by_role("button", name="Continue to Pithros").click()
        page.wait_for_url("**/dashboard", timeout=20_000)

        # Pithros provisioning is real: a token-authenticated /me resolves the user.
        api_key = frontend_config["VITE_FIREBASE_API_KEY"]
        token = firebase_tools.sign_in_with_password(
            api_key, TEST_STEWARD_EMAIL, steward_password.password
        )
        me = httpx.get(
            f"{e2e_stack.backend_url}/api/v1/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=20,
        )
        assert me.status_code == 200, me.text
        body = me.json()
        # /me is the one response model that stays snake_case (it mirrors the
        # frontend's existing PithrosUserRecord shape).
        assert body["email"] == TEST_STEWARD_EMAIL.lower()
        assert body["email_verified"] is True
        assert body["status"] == "active"

        # Logout through the real UI, then prove the session is genuinely gone.
        page.goto(f"{e2e_stack.frontend_url}/")
        page.locator("button:has-text('Mathew E2E Steward')").first.click()
        page.get_by_role("button", name="Sign Out").click()
        page.wait_for_url("**/signin", timeout=20_000)

        anonymous = httpx.get(f"{e2e_stack.backend_url}/api/v1/me", timeout=10)
        assert anonymous.status_code == 401
    finally:
        context.close()
