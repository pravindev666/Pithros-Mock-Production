"""Stage 8 / Phase 12-13 — a public memorial and an anonymous tribute.

The steward publishes the memorial from the real privacy screen. A signed-out
visitor then opens the public memorial, leaves a tribute through the real form,
and — because the server decides — it waits for moderation. The steward approves
it in their own console and it becomes visible to the public.
"""

from __future__ import annotations

import re

import httpx
import pytest

from .support import database
from .support import firebase as firebase_tools
from .support.accounts import TEST_STEWARD_EMAIL, TestCredentials
from .test_media_lifecycle import _create_memorial, _memorial_id
from .test_verification_chain import _login, _wait_for

pytestmark = pytest.mark.e2e

PUBLIC_NAME = "Mathew E2E Public Remembrance"
TRIBUTE_AUTHOR = "Meera E2E Visitor"
TRIBUTE_MESSAGE = (
    "Remembered with warmth by the whole neighbourhood; a quiet, generous life well lived."
)


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


def _memorial_row(name: str):
    return database.fetch_one(
        "SELECT id::text, slug, privacy, publication_state FROM memorials "
        "WHERE full_name = %s ORDER BY created_at DESC LIMIT 1",
        (name,),
    )


def _tribute_row(memorial_id: str):
    return database.fetch_one(
        "SELECT id::text, status, author_name, message FROM tributes "
        "WHERE memorial_id = %s::uuid ORDER BY created_at DESC LIMIT 1",
        (memorial_id,),
    )


def test_public_tribute_is_pending_then_approved(browser, e2e_stack, steward_credentials):
    a_context = browser.new_context()
    a_page = a_context.new_page()
    traffic: list[str] = []
    console: list[str] = []
    a_page.on(
        "response",
        lambda response: (
            traffic.append(f"{response.status} {response.request.method} {response.url}")
            if "/api/v1/" in response.url
            else None
        ),
    )
    a_page.on("console", lambda message: console.append(f"{message.type}: {message.text}"))
    a_page.on("pageerror", lambda error: console.append(f"pageerror: {error}"))
    try:
        # ── Steward creates and publishes the memorial ──────────────────────
        _login(a_page, e2e_stack, steward_credentials, landing=lambda url: "/dashboard" in url)
        _create_memorial(a_page, e2e_stack, name=PUBLIC_NAME)
        memorial_id = _memorial_id(PUBLIC_NAME)

        a_page.goto(f"{e2e_stack.frontend_url}/dashboard/privacy", wait_until="domcontentloaded")
        a_page.get_by_text("Public Sanctuary", exact=False).first.click()
        a_page.get_by_role("button", name="Save Privacy Settings").click()

        # The save persists both the visibility and the publication state; the
        # transient on-screen confirmation is lost when the dashboard refetches,
        # so the authoritative check is the database.
        try:
            published = _wait_for(
                lambda: (lambda r: r if r and r[2] == "public" and r[3] == "published" else None)(
                    _memorial_row(PUBLIC_NAME)
                ),
                timeout=20,
                message="the memorial was never published",
            )
        except Exception as exc:
            body = a_page.locator("body").inner_text()[:800]
            raise AssertionError(
                f"publish failed (url={a_page.url}).\nTRAFFIC={traffic[-12:]!r}\n"
                f"CONSOLE={console[-15:]!r}\nBODY={body!r}"
            ) from exc
        slug = published[1]

        # ── An anonymous visitor opens the public memorial ──────────────────
        v_context = browser.new_context()
        try:
            v_page = v_context.new_page()
            visitor_log: list[str] = []
            v_page.on(
                "console", lambda message: visitor_log.append(f"{message.type}: {message.text}")
            )
            v_page.on(
                "response",
                lambda response: (
                    visitor_log.append(
                        f"{response.status} {response.request.method} {response.url}"
                    )
                    if "/tributes" in response.url
                    else None
                ),
            )
            v_page.goto(f"{e2e_stack.frontend_url}/m/{slug}", wait_until="domcontentloaded")
            v_page.get_by_text(PUBLIC_NAME, exact=False).first.wait_for(timeout=20_000)

            v_page.get_by_role("button", name=re.compile(r"Remembrance \(\d+\)")).first.click()
            try:
                v_page.get_by_role("button", name=re.compile("Write a Tribute")).first.wait_for(
                    timeout=15_000
                )
            except Exception as exc:
                body = v_page.locator("body").inner_text()[:1500]
                raise AssertionError(
                    f"the tribute form button never appeared (url={v_page.url}).\nBODY={body!r}"
                ) from exc
            v_page.get_by_role("button", name=re.compile("Write a Tribute")).first.click()
            v_page.get_by_placeholder("e.g. Meera S.").fill(TRIBUTE_AUTHOR)
            v_page.get_by_placeholder("e.g. Colleague, Granddaughter, Lifelong Friend").fill(
                "Neighbour"
            )
            v_page.get_by_placeholder(
                "Write your reflection, an enduring story, or a tribute to their life..."
            ).fill(TRIBUTE_MESSAGE)
            v_page.get_by_role("button", name="Submit Tribute for Review").click()
            # The server decides the status; wait for the persisted row, because
            # the on-screen confirmation is cleared by the page's refetch.
            submitted = _wait_for(
                lambda: _tribute_row(memorial_id),
                timeout=30,
                message=f"the tribute was never recorded. LOG={visitor_log[-8:]!r}",
            )
            assert submitted[1] == "pending_moderation"
        finally:
            v_context.close()

        # ── The server parked it for moderation; the public cannot see it ───
        tribute = _tribute_row(memorial_id)
        tribute_id, status, author, message = tribute
        assert status == "pending_moderation"
        assert author == TRIBUTE_AUTHOR
        assert message == TRIBUTE_MESSAGE

        public_before = httpx.get(
            f"{e2e_stack.backend_url}/api/v1/public/memorials/{slug}/tributes", timeout=20
        )
        assert public_before.status_code == 200, public_before.text
        assert all(item["id"] != tribute_id for item in public_before.json())

        # ── The steward approves it in the real moderation console ──────────
        a_page.goto(f"{e2e_stack.frontend_url}/dashboard/tributes", wait_until="domcontentloaded")
        a_page.get_by_text(TRIBUTE_AUTHOR, exact=False).first.wait_for(timeout=20_000)
        approve_button = a_page.get_by_role("button", name="Approve", exact=True).first
        approve_button.wait_for(timeout=20_000)
        approve_button.click()
        a_page.wait_for_timeout(1000)

        try:
            approved = _wait_for(
                lambda: (lambda r: r if r and r[1] == "approved" else None)(
                    _tribute_row(memorial_id)
                ),
                timeout=20,
                message="the tribute was never approved",
            )
        except Exception as exc:
            body = a_page.locator("body").inner_text()[:1000]
            raise AssertionError(
                f"approve failed (url={a_page.url}).\nTRAFFIC={traffic[-12:]!r}\n"
                f"CONSOLE={console[-12:]!r}\nBODY={body!r}"
            ) from exc
        assert approved[1] == "approved"

        # ── Now it is public ─────────────────────────────────────────────────
        public_after = httpx.get(
            f"{e2e_stack.backend_url}/api/v1/public/memorials/{slug}/tributes", timeout=20
        )
        assert any(item["id"] == tribute_id for item in public_after.json())

        v2_context = browser.new_context()
        try:
            v2_page = v2_context.new_page()
            v2_page.goto(f"{e2e_stack.frontend_url}/m/{slug}", wait_until="domcontentloaded")
            v2_page.get_by_role("button", name=re.compile(r"Remembrance \(\d+\)")).first.click()
            v2_page.get_by_text(TRIBUTE_AUTHOR, exact=False).first.wait_for(timeout=20_000)
        finally:
            v2_context.close()
    finally:
        a_context.close()
