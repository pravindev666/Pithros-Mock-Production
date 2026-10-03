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
import secrets
import time

import httpx
import pytest

from .support import database
from .support import firebase as firebase_tools
from .support.accounts import TEST_STEWARD_EMAIL, TestCredentials
from .test_verification_chain import _login, _wait_for

pytestmark = pytest.mark.e2e

MEMORIAL_NAME = "Mathew E2E Media Lifecycle"
VOICE_MEMORIAL_NAME = "Mathew E2E Voice Memorial"
THREE_PHOTOS_NAME = "Mathew E2E Photo Collection"
CROSS_USER_NAME = "Mathew E2E Private Album"
ADMIN_EMAIL = "pithros.e2e.admin@gmail.com"
INTRUDER_EMAIL = "pithros.e2e.intruder@gmail.com"
VOICE_TITLE = "A Spoken Memory"


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


@pytest.fixture(scope="module")
def admin_credentials(firebase_app):
    """The same fixture-owned synthetic admin the other E2E modules use.

    Fixtures do not cross test modules, so this module declares its own. The
    admin then authenticates for real; the backend copies the role from the
    verified claims exactly as it does for every administrator.
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


@pytest.fixture(scope="module")
def intruder_credentials(firebase_app):
    """A second, unrelated real user — a verified steward with no ties to A."""
    from firebase_admin import auth as fb_auth

    password = secrets.token_urlsafe(18)
    firebase_tools.delete_user_if_exists(INTRUDER_EMAIL)
    firebase_tools.with_timeout(
        "create_intruder_user",
        fb_auth.create_user,
        email=INTRUDER_EMAIL,
        password=password,
        email_verified=True,
        display_name="Mathew E2E Intruder",
    )
    return TestCredentials(email=INTRUDER_EMAIL, password=password)


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


def _voice_row(memorial_id: str):
    return database.fetch_one(
        "SELECT id::text, status, privacy, storage_tier, storage_bucket, storage_key, "
        "thumbnail_key, deleted_at, size_bytes FROM memorial_media "
        "WHERE memorial_id = %s::uuid AND kind = 'voice' "
        "ORDER BY created_at DESC LIMIT 1",
        (memorial_id,),
    )


def _ready_voice(memorial_id: str):
    row = _voice_row(memorial_id)
    return row if row and row[1] == "ready" else None


def _open_voice_form(page) -> None:
    page.get_by_role("button", name=re.compile("Voice Memories")).click()
    page.get_by_role("button", name="Add Voice Memory").click()
    page.get_by_placeholder("e.g. Explaining the Monsoon Winds (1998)").wait_for(timeout=20_000)


def _submit_voice(page, *, title: str, audio_path) -> None:
    page.get_by_placeholder("e.g. Explaining the Monsoon Winds (1998)").fill(title)
    page.locator('input[type="file"]').first.set_input_files(str(audio_path))
    page.get_by_role("button", name="Save Voice Memory").click()


def _grant_memorial_care(*, stack, frontend_config, admin_credentials, steward_email, memorial_id):
    """A real, audited admin grant (the endpoint's own contract).

    This is the supported complimentary-preservation path — it records an
    ``admin_grant`` subscription and a $0 invoice, never a fabricated payment.
    """
    admin_token = firebase_tools.sign_in_with_password(
        frontend_config["VITE_FIREBASE_API_KEY"],
        admin_credentials.email,
        admin_credentials.password,
    )
    response = httpx.post(
        f"{stack.backend_url}/api/v1/billing/admin/grant",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "targetUserEmail": steward_email.lower(),
            "planCode": "MEMORIAL_CARE",
            "durationMonths": 12,
            "reason": "E2E media verification: complimentary preservation grant",
            "memorialId": memorial_id,
        },
        timeout=30,
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_voice_memory_is_gated_then_uploads_on_a_grant(
    browser, e2e_stack, frontend_config, steward_credentials, admin_credentials, assets, r2_client
):
    context = browser.new_context()
    page = context.new_page()
    page_errors: list[str] = []
    try:
        _login(page, e2e_stack, steward_credentials, landing=lambda url: "/dashboard" in url)
        _create_memorial(page, e2e_stack, name=VOICE_MEMORIAL_NAME)
        memorial_id = _memorial_id(VOICE_MEMORIAL_NAME)

        # ── 1. A Free memorial refuses voice memory (the real gate) ─────────
        _open_media_view(page, e2e_stack)
        _open_voice_form(page)
        _submit_voice(page, title=VOICE_TITLE, audio_path=assets.voice)
        page.get_by_text(
            "Voice memories are preserved with PITHROS Memorial Care", exact=False
        ).first.wait_for(timeout=30_000)
        assert _voice_row(memorial_id) is None, "a gated upload still created a media row"

        # ── 2. A real admin grant makes this memorial premium ───────────────
        granted = _grant_memorial_care(
            stack=e2e_stack,
            frontend_config=frontend_config,
            admin_credentials=admin_credentials,
            steward_email=steward_credentials.email,
            memorial_id=memorial_id,
        )
        assert granted["planCode"] == "MEMORIAL_CARE"

        steward_token = firebase_tools.sign_in_with_password(
            frontend_config["VITE_FIREBASE_API_KEY"],
            steward_credentials.email,
            steward_credentials.password,
        )
        entitlements = httpx.get(
            f"{e2e_stack.backend_url}/api/v1/billing/memorials/{memorial_id}/entitlements",
            headers={"Authorization": f"Bearer {steward_token}"},
            timeout=20,
        )
        assert entitlements.status_code == 200, entitlements.text
        assert entitlements.json()["permissions"]["canUploadVoice"] is True

        # ── 3. The audio uploads through the real UI to R2 ──────────────────
        page.reload(wait_until="domcontentloaded")
        _open_media_view(page, e2e_stack)
        _open_voice_form(page)
        _submit_voice(page, title=VOICE_TITLE, audio_path=assets.voice)

        row = _wait_for(
            lambda: _ready_voice(memorial_id),
            timeout=60,
            message="the voice memory never reached the ready state",
        )
        _media_id, status, privacy, tier, bucket, key, _thumb, deleted_at, _size = row
        assert status == "ready"
        assert privacy == "private"
        assert tier == "private"
        assert bucket == r2_client.private_bucket
        assert key.startswith(f"memorials/{memorial_id}/voice/")
        assert deleted_at is None

        assert r2_client.exists(r2_client.private_bucket, key)
        raw = r2_client.get(r2_client.private_bucket, key)
        assert raw[:4] == b"RIFF" and raw[8:12] == b"WAVE", (
            "the stored object is not the uploaded WAV"
        )

        # ── 4. It is visible, and survives a refresh ────────────────────────
        # The memorials refetch after upload leaves the view on the Photos
        # sub-tab; the tab count proves the voice memory was recorded.
        page.get_by_text(re.compile(r"Voice Memories \(1\)")).first.wait_for(timeout=20_000)

        # A fresh load shows it in the voice list, and it survives the refresh.
        page.reload(wait_until="domcontentloaded")
        _open_media_view(page, e2e_stack)
        page.get_by_role("button", name=re.compile("Voice Memories")).click()
        page.get_by_role("button", name="Add Voice Memory").wait_for(timeout=20_000)
        try:
            page.get_by_text(VOICE_TITLE, exact=False).first.wait_for(timeout=20_000)
        except Exception as exc:
            body = page.locator("body").inner_text()[:1500]
            raise AssertionError(
                f"the voice memory is not visible in the UI (url={page.url}).\nBODY={body!r}"
            ) from exc

        assert not page_errors, f"uncaught page errors during the journey: {page_errors}"
    finally:
        context.close()


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


def _ready_photo_count(memorial_id: str) -> int:
    row = database.fetch_one(
        "SELECT count(*) FROM memorial_media "
        "WHERE memorial_id = %s::uuid AND kind = 'photo' "
        "AND status = 'ready' AND deleted_at IS NULL",
        (memorial_id,),
    )
    return int(row[0]) if row else 0


def test_three_photos_delete_one_keeps_the_others(
    browser, e2e_stack, steward_credentials, assets, r2_client
):
    """Uploading three photographs, deleting one, must not touch the other two."""
    context = browser.new_context()
    page = context.new_page()
    page_errors: list[str] = []
    console: list[str] = []
    media_traffic: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on("console", lambda message: console.append(f"{message.type}: {message.text}"))
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
        _create_memorial(page, e2e_stack, name=THREE_PHOTOS_NAME)
        memorial_id = _memorial_id(THREE_PHOTOS_NAME)

        for index, photo in enumerate(assets.photos, start=1):
            # A fresh view each time: the uploader swaps to a success panel and
            # hides its file input after a completed upload.
            _open_media_view(page, e2e_stack)
            page.locator('input[type="file"]').first.set_input_files(str(photo))
            try:
                _wait_for(
                    lambda idx=index: _ready_photo_count(memorial_id) == idx,
                    timeout=60,
                    message=f"photograph {index} never became ready",
                )
            except Exception as exc:
                body = page.locator("body").inner_text()[:1200]
                raise AssertionError(
                    f"photograph {index} upload failed (url={page.url}).\n"
                    f"BODY={body!r}\nCONSOLE={console[-15:]!r}\nTRAFFIC={media_traffic[-15:]!r}"
                ) from exc

        rows = database.fetch_all(
            "SELECT id::text, title, status, storage_bucket, storage_key FROM memorial_media "
            "WHERE memorial_id = %s::uuid AND kind = 'photo' ORDER BY created_at",
            (memorial_id,),
        )
        assert len(rows) == 3, f"expected 3 photographs, found {len(rows)}"
        assert all(row[2] == "ready" for row in rows)
        for _id, _title, _status, bucket, key in rows:
            assert bucket == r2_client.private_bucket
            assert r2_client.exists(r2_client.private_bucket, key)

        for title in ("photo_1", "photo_2", "photo_3"):
            page.get_by_text(title, exact=False).first.wait_for(timeout=20_000)

        # Delete the middle photograph, targeting its own card's delete button.
        card = page.locator("div.group").filter(has_text="photo_2").first
        card.locator('button[title="Delete photo"]').click()
        page.get_by_text("photo_2", exact=False).first.wait_for(state="detached", timeout=20_000)

        # The other two are untouched, in the UI and in the database.
        page.get_by_text("photo_1", exact=False).first.wait_for(timeout=20_000)
        page.get_by_text("photo_3", exact=False).first.wait_for(timeout=20_000)
        assert _ready_photo_count(memorial_id) == 2
        deleted = database.fetch_one(
            "SELECT count(*) FROM memorial_media WHERE memorial_id = %s::uuid "
            "AND kind = 'photo' AND deleted_at IS NOT NULL",
            (memorial_id,),
        )
        assert int(deleted[0]) == 1

        assert not page_errors, f"uncaught page errors during the journey: {page_errors}"
    finally:
        context.close()


def test_another_user_cannot_touch_a_stewards_media(
    browser,
    e2e_stack,
    frontend_config,
    steward_credentials,
    intruder_credentials,
    assets,
    r2_client,
):
    """A second real user must not be able to read, download, or delete A's media."""
    context = browser.new_context()
    page = context.new_page()
    try:
        # ── Steward A uploads one private photograph ────────────────────────
        _login(page, e2e_stack, steward_credentials, landing=lambda url: "/dashboard" in url)
        _create_memorial(page, e2e_stack, name=CROSS_USER_NAME)
        memorial_id = _memorial_id(CROSS_USER_NAME)
        _open_media_view(page, e2e_stack)
        page.locator('input[type="file"]').first.set_input_files(str(assets.photos[0]))
        row = _wait_for(
            lambda: _ready_photo(memorial_id),
            timeout=60,
            message="the photograph never became ready",
        )
        media_id, _status, _privacy, tier, bucket, key, _thumb, _deleted = row
        assert tier == "private" and bucket == r2_client.private_bucket

        token_a = firebase_tools.sign_in_with_password(
            frontend_config["VITE_FIREBASE_API_KEY"],
            steward_credentials.email,
            steward_credentials.password,
        )
        owns = httpx.get(
            f"{e2e_stack.backend_url}/api/v1/memorials/{memorial_id}/media",
            headers={"Authorization": f"Bearer {token_a}"},
            timeout=20,
        )
        assert owns.status_code == 200, owns.text
        assert any(item["id"] == media_id for item in owns.json())

        # ── User B (a different real user) is refused on every media route ──
        token_b = firebase_tools.sign_in_with_password(
            frontend_config["VITE_FIREBASE_API_KEY"],
            intruder_credentials.email,
            intruder_credentials.password,
        )
        headers_b = {"Authorization": f"Bearer {token_b}"}
        attempts = [
            ("GET", f"/api/v1/memorials/{memorial_id}/media", None),
            ("DELETE", f"/api/v1/memorials/{memorial_id}/media/{media_id}", None),
            ("PATCH", f"/api/v1/memorials/{memorial_id}/media/{media_id}", {"title": "hijacked"}),
            (
                "POST",
                f"/api/v1/memorials/{memorial_id}/media/upload-intent",
                {
                    "filename": "intruder.jpg",
                    "contentType": "image/jpeg",
                    "sizeBytes": 1024,
                    "kind": "photo",
                    "title": "intruder",
                },
            ),
        ]
        for method, path, body in attempts:
            response = httpx.request(
                method,
                f"{e2e_stack.backend_url}{path}",
                headers=headers_b,
                json=body,
                timeout=20,
            )
            assert response.status_code in (403, 404), (
                f"intruder {method} {path} returned {response.status_code}: {response.text[:200]}"
            )

        # ── A's media is wholly untouched ───────────────────────────────────
        after = _photo_row(memorial_id)
        assert after[1] == "ready" and after[7] is None
        assert after[5] == key
        assert r2_client.exists(r2_client.private_bucket, key)

        # ── And B's own dashboard never shows A's memorial ──────────────────
        b_context = browser.new_context()
        try:
            b_page = b_context.new_page()
            _sign_in_again(b_page, e2e_stack, intruder_credentials, console=[], failed=[])
            b_page.get_by_text("You have not created a memorial yet.", exact=False).wait_for(
                timeout=20_000
            )
        finally:
            b_context.close()
    finally:
        context.close()
