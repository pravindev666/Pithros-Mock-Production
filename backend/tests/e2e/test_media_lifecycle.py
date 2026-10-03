"""Stage 8 / Phase 6 — the full life of a photograph, through the real UI.

Journey: the steward signs in, creates a memorial, uploads a photograph with the
real uploader (the browser PUTs straight to Cloudflare R2), watches it survive a
refresh and a full logout/login, then deletes it and confirms it is gone from the
UI and the API.

PostgreSQL and R2 are read only here — used solely to confirm the state the UI
reported. The only database write is the harness's per-test truncation of the
synthetic E2E database; no journey ever writes business state directly.
"""

from __future__ import annotations

import re
import time

import httpx
import pytest

from .support import database
from .support import firebase as firebase_tools
from .support.accounts import TEST_STEWARD_EMAIL, TestCredentials
from .test_verification_chain import _login, _wait_for

pytestmark = pytest.mark.e2e

MEMORIAL_NAME = "Mathew E2E Media Lifecycle"


@pytest.fixture(scope="module")
def steward_credentials(firebase_app, steward_password):
    """A fixture-owned, genuinely verified steward persona.

    The real signup + email-verification journey is already proven end-to-end by
    ``test_smoke_signup``; this module needs a reliable steward to exercise the
    media lifecycle, so the persona is provisioned like the other E2E personas
    (admin/partner) and then signs in through the real UI. The media journey
    itself is untouched by this setup — no journey writes business state.
    """
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


def _create_memorial(page, stack, *, name: str) -> None:
    """Create a memorial through the wizard, honestly skipping the evidence step."""
    page.goto(f"{stack.frontend_url}/create-memorial", wait_until="domcontentloaded")
    page.get_by_placeholder("Enter their full name").fill(name)
    page.get_by_placeholder("e.g. 1954").fill("1951")
    page.get_by_placeholder("e.g. 2024").fill("2025")
    page.get_by_role("button", name="Continue", exact=True).click()
    page.get_by_placeholder("e.g. A life lived with gentle kindness and quiet grace.").wait_for()
    page.get_by_role("button", name="Continue", exact=True).click()
    page.get_by_placeholder("Full Name (e.g. Vikram)").wait_for()
    page.get_by_role("button", name="Continue", exact=True).click()
    page.get_by_role("button", name=re.compile("Visitor")).first.wait_for()
    page.get_by_role("button", name="Continue", exact=True).click()
    page.get_by_text("Evidence of passing").wait_for()
    page.get_by_role("button", name="Create Memorial", exact=True).last.click()
    page.wait_for_url("**/m/**", timeout=60_000)


def _open_media_view(page, stack) -> None:
    """Reach the media screen the way a steward does: dashboard → sidebar link."""
    page.goto(f"{stack.frontend_url}/dashboard", wait_until="domcontentloaded")
    page.get_by_role("button", name="Media & Voice").click()
    page.get_by_text("Media & Spoken Memories").wait_for(timeout=20_000)


def _logout(page, stack) -> None:
    page.goto(f"{stack.frontend_url}/", wait_until="domcontentloaded")
    page.locator("button:has-text('Mathew E2E Steward')").first.click()
    page.get_by_role("button", name="Sign Out").click()
    page.wait_for_url("**/signin", timeout=20_000)


def _sign_in_again(page, stack, credentials, *, console: list[str], failed: list[str]) -> None:
    """A returning steward signs in again through the real form.

    Retried a couple of times because Firebase's identity toolkit occasionally
    rate-limits a burst of sign-ins; the failure is surfaced with the visible
    error text rather than swallowed.
    """
    body = ""
    last_error: Exception | None = None
    for _attempt in range(1, 4):
        page.goto(f"{stack.frontend_url}/signin", wait_until="domcontentloaded")
        page.fill("#email", credentials.email)
        page.fill("#password", credentials.password)
        page.get_by_role("button", name="Sign In").click()
        try:
            page.wait_for_url(lambda url: "/dashboard" in url, timeout=20_000)
            return
        except Exception as exc:
            last_error = exc
            body = page.locator("body").inner_text()[:800]
            time.sleep(3)
    raise AssertionError(
        f"sign-in after logout never reached /dashboard (url={page.url}).\n"
        f"BODY={body!r}\nCONSOLE={console[-20:]!r}\nFAILED={failed!r}"
    ) from last_error


def _memorial_id(name: str) -> str:
    row = database.fetch_one(
        "SELECT id::text FROM memorials WHERE full_name = %s ORDER BY created_at DESC LIMIT 1",
        (name,),
    )
    assert row is not None, "the memorial was never created"
    return row[0]


def _photo_row(memorial_id: str):
    return database.fetch_one(
        "SELECT id::text, status, privacy, storage_tier, storage_bucket, storage_key, "
        "thumbnail_key, deleted_at FROM memorial_media "
        "WHERE memorial_id = %s::uuid AND kind = 'photo' "
        "ORDER BY created_at DESC LIMIT 1",
        (memorial_id,),
    )


def _ready_photo(memorial_id: str):
    row = _photo_row(memorial_id)
    return row if row and row[1] == "ready" else None


def _thumb_ready(memorial_id: str):
    row = _photo_row(memorial_id)
    return row if row and row[6] else None


def _deleted_photo(memorial_id: str):
    row = _photo_row(memorial_id)
    return row if row and row[7] is not None and row[1] == "rejected" else None


def test_photo_upload_persists_and_delete_removes_it(
    browser, e2e_stack, frontend_config, steward_credentials, assets, r2_client
):
    context = browser.new_context()
    page = context.new_page()
    page_errors: list[str] = []
    console: list[str] = []
    failed_requests: list[str] = []
    media_traffic: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on("console", lambda message: console.append(f"{message.type}: {message.text}"))
    page.on("requestfailed", lambda request: failed_requests.append(request.url))
    page.on(
        "response",
        lambda response: (
            media_traffic.append(f"{response.status} {response.request.method} {response.url}")
            if "/media/" in response.url or "cloudflarestorage" in response.url
            else None
        ),
    )
    try:
        _login(page, e2e_stack, steward_credentials, landing=lambda url: "/dashboard" in url)
        _create_memorial(page, e2e_stack, name=MEMORIAL_NAME)
        memorial_id = _memorial_id(MEMORIAL_NAME)

        _open_media_view(page, e2e_stack)
        assert _photo_row(memorial_id) is None, "a photograph existed before any upload"

        # ── Upload through the real uploader: the browser PUTs to R2 ────────
        page.locator('input[type="file"]').first.set_input_files(str(assets.photos[0]))
        try:
            # The upload is complete once the server has verified the stored
            # bytes (the row goes ready) and the grid re-renders with the photo.
            _wait_for(
                lambda: _ready_photo(memorial_id),
                timeout=60,
                message="the photograph never reached the ready state",
            )
            page.get_by_text("photo_1", exact=False).first.wait_for(timeout=30_000)
        except Exception as exc:
            body = page.locator("body").inner_text()[:1500]
            raise AssertionError(
                "the photograph upload did not complete.\n"
                f"URL={page.url}\n"
                f"BODY={body!r}\n"
                f"CONSOLE={console[-20:]!r}\n"
                f"FAILED={failed_requests!r}\n"
                f"MEDIA_TRAFFIC={media_traffic[-20:]!r}"
            ) from exc

        row = _ready_photo(memorial_id)
        media_id, status, privacy, tier, bucket, key, _thumb, deleted_at = row
        assert status == "ready"
        assert privacy == "private"
        assert tier == "private"
        assert bucket == r2_client.private_bucket, (
            "the photo was not stored in the private R2 bucket"
        )
        assert key.startswith(f"memorials/{memorial_id}/photo/")
        assert deleted_at is None

        # The bytes are genuinely in Cloudflare R2 and genuinely a JPEG.
        assert r2_client.exists(r2_client.private_bucket, key)
        raw = r2_client.get(r2_client.private_bucket, key)
        assert raw[:3] == b"\xff\xd8\xff", "the stored object is not the uploaded JPEG"

        # The Celery worker really processed it and wrote its thumbnail to R2.
        thumb_row = _wait_for(
            lambda: _thumb_ready(memorial_id),
            timeout=60,
            message="the worker never produced a thumbnail",
        )
        thumb_key = thumb_row[6]
        assert r2_client.exists(r2_client.private_bucket, thumb_key)

        # ── Refresh: still visible ──────────────────────────────────────────
        page.reload(wait_until="domcontentloaded")
        page.get_by_text("photo_1", exact=False).first.wait_for(timeout=20_000)

        # ── Logout / login: still visible ───────────────────────────────────
        _logout(page, e2e_stack)
        _sign_in_again(
            page, e2e_stack, steward_credentials, console=console, failed=failed_requests
        )
        _open_media_view(page, e2e_stack)
        page.get_by_text("photo_1", exact=False).first.wait_for(timeout=20_000)

        # ── Delete → refresh: gone from the UI ──────────────────────────────
        page.locator('button[title="Delete photo"]').first.click()
        page.get_by_text("No archival photographs preserved yet.").wait_for(timeout=20_000)
        page.reload(wait_until="domcontentloaded")
        page.get_by_text("No archival photographs preserved yet.").wait_for(timeout=20_000)

        # ...and it is soft-deleted in the database...
        deleted = _wait_for(
            lambda: _deleted_photo(memorial_id),
            timeout=20,
            message="the delete was never persisted",
        )
        assert deleted[7] is not None

        # ...and the API no longer serves it to its own steward.
        token = firebase_tools.sign_in_with_password(
            frontend_config["VITE_FIREBASE_API_KEY"],
            steward_credentials.email,
            steward_credentials.password,
        )
        listing = httpx.get(
            f"{e2e_stack.backend_url}/api/v1/memorials/{memorial_id}/media",
            headers={"Authorization": f"Bearer {token}"},
            timeout=20,
        )
        assert listing.status_code == 200, listing.text
        assert all(item["id"] != media_id for item in listing.json())

        # R2 lifecycle on delete: the row is soft-deleted, but the delete endpoint
        # does not purge the stored object (deliberate retention — see the media
        # service). Assert the real behaviour rather than an assumed one.
        assert r2_client.exists(r2_client.private_bucket, key), (
            "the R2 object was purged on delete; the retention behaviour changed"
        )

        assert not page_errors, f"uncaught page errors during the journey: {page_errors}"
    finally:
        context.close()
