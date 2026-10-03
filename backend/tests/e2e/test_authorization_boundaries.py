"""Anonymous access boundaries across the real stack (Stage 8 / Phase 6).

An unauthenticated caller must be refused by every private surface — the UI must
not render the dashboard, and the API must answer 401 (not 403 with data, not
200) for account, billing, notification, admin, export and deletion endpoints.

This is deliberately HTTP-first so the assertion is deterministic; one browser
check confirms the shell does not expose the dashboard without a session.
"""

from __future__ import annotations

import re

import httpx
import pytest

pytestmark = pytest.mark.e2e

# Every one of these must refuse an anonymous caller.
ANON_SENSITIVE = [
    "/api/v1/me",
    "/api/v1/billing/invoices",
    "/api/v1/billing/payments",
    "/api/v1/me/notifications",
    "/api/v1/me/deletion-request",
    "/api/v1/me/invitations",
    "/api/v1/admin/users",
    "/api/v1/admin/audit?limit=1",
    "/api/v1/billing/admin/refunds",
    "/api/v1/billing/admin/overview",
    "/api/v1/admin/deletion-requests",
    "/api/v1/admin/providers",
    "/api/v1/memorials/export/status/does-not-exist",
    "/api/v1/memorials/00000000-0000-0000-0000-000000000000/permissions",
]

PUBLIC_READABLE = [
    "/api/v1/health",
    "/api/v1/billing/plans",
    "/api/v1/public/providers",
]


def test_anonymous_api_requests_are_refused(e2e_stack):
    for path in ANON_SENSITIVE:
        response = httpx.get(f"{e2e_stack.backend_url}{path}", timeout=20)
        assert response.status_code == 401, (
            f"anonymous GET {path} returned {response.status_code} "
            f"(expected 401): {response.text[:200]}"
        )


def test_public_endpoints_stay_readable_while_anonymous(e2e_stack):
    for path in PUBLIC_READABLE:
        response = httpx.get(f"{e2e_stack.backend_url}{path}", timeout=20)
        assert response.status_code == 200, (
            f"public GET {path} returned {response.status_code}: {response.text[:200]}"
        )


def test_anonymous_browser_cannot_reach_the_dashboard(browser, e2e_stack):
    context = browser.new_context()
    try:
        page = context.new_page()
        page.goto(f"{e2e_stack.frontend_url}/dashboard", wait_until="domcontentloaded")
        # The shell must either redirect to sign-in or show a sign-in affordance —
        # never the steward dashboard.
        page.wait_for_timeout(3000)
        on_signin = "signin" in page.url or "signup" in page.url
        has_signin_cta = page.get_by_role("button", name=re.compile("sign", re.I)).count() > 0
        assert on_signin or has_signin_cta, (
            f"anonymous /dashboard did not require sign-in (url={page.url})"
        )
    finally:
        context.close()
