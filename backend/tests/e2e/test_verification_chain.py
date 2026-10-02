"""Evidence-of-passing chain, end to end, through the real UI.

Journey: the steward creates a memorial in the wizard and attaches evidence of
passing → the file is uploaded into the sensitive tier → the Celery worker runs
real OCR → the reviewer sees the submission in the real admin queue, opens the
actual document, and decides → the decision lands on the memorial and in the
steward's in-app notifications.

Every state change happens through the UI or the API. Database access here is
read-only (plus the harness's per-test truncation), and Firebase accounts are
fixture-managed synthetic personas.
"""

from __future__ import annotations

import contextlib
import re
import secrets
import time

import httpx
import pytest

from .support import database
from .support import firebase as firebase_tools
from .support.accounts import TEST_STEWARD_EMAIL, TestCredentials

pytestmark = pytest.mark.e2e

ADMIN_EMAIL = "pithros.e2e.admin@gmail.com"

MEMORIAL_APPROVE = "Mathew E2E Heritage Memorial"
MEMORIAL_MISMATCH = "Mathew E2E Mismatch Case"
MEMORIAL_WRONG_DOC = "Mathew E2E Wrong Document Case"


def _wait_for(predicate, *, timeout: float, message: str):
    deadline = time.time() + timeout
    while time.time() < deadline:
        result = predicate()
        if result:
            return result
        time.sleep(1)
    raise AssertionError(message)


def _memorial_row(name: str):
    return database.fetch_one(
        "SELECT id::text, slug, privacy, publication_state, verification_state, "
        "verification_badge_type FROM memorials WHERE full_name = %s "
        "ORDER BY created_at DESC LIMIT 1",
        (name,),
    )


def _latest_submission(memorial_id: str):
    return database.fetch_one(
        "SELECT id::text, state, automated_result, risk_signals, decision_reason "
        "FROM verification_submissions WHERE memorial_id = %s::uuid "
        "ORDER BY created_at DESC LIMIT 1",
        (memorial_id,),
    )


def _submission_state(memorial_id: str) -> str | None:
    row = _latest_submission(memorial_id)
    return row[1] if row else None


def _submission_under_review(memorial_id: str):
    row = _latest_submission(memorial_id)
    if row and row[1] == "verification_review":
        return row
    return None


def _signup_through_ui(page, stack, email: str, password: str) -> None:
    console: list[str] = []
    page.on("console", lambda message: console.append(message.text))
    page.goto(f"{stack.frontend_url}/signup")
    page.fill("#fullName", "Mathew E2E Steward")
    page.fill("#signup-email", email)
    page.fill("#signup-password", password)
    page.fill("#confirm-password", password)
    page.check("#agreeTerms")
    page.get_by_role("button", name="Create Account").click()
    try:
        page.wait_for_url("**/verify-email", timeout=30_000)
    except Exception as exc:
        alert = ""
        try:
            alert = page.locator('[role="alert"]').first.inner_text(timeout=3_000)
        except Exception:
            alert = "(no alert rendered)"
        raise AssertionError(
            f"signup did not reach /verify-email (url={page.url}). "
            f"Visible error: {alert!r}. Console tail: {console[-12:]!r}"
        ) from exc


def _login(page, stack, credentials, *, landing) -> None:
    page.goto(f"{stack.frontend_url}/signin")
    page.fill("#email", credentials.email)
    page.fill("#password", credentials.password)
    page.get_by_role("button", name="Sign In").click()
    page.wait_for_url(landing, timeout=30_000)


def _create_memorial_with_evidence(
    page,
    stack,
    assets,
    *,
    name: str,
    birth: str,
    death: str,
    evidence_path,
    doc_type: str,
) -> None:
    page.goto(f"{stack.frontend_url}/create-memorial")
    page.get_by_placeholder("Enter their full name").fill(name)
    page.get_by_placeholder("e.g. 1954").fill(birth)
    page.get_by_placeholder("e.g. 2024").fill(death)

    # Step 1: portrait (simulated preview in the wizard; uploaded after creation).
    # The uploader completes asynchronously — wait for its success state so the
    # file is actually attached before we navigate away.
    page.locator("input[type=file]").set_input_files(str(assets.portrait))
    page.get_by_text("Uploaded successfully").wait_for(timeout=15_000)

    page.get_by_role("button", name="Continue", exact=True).click()
    page.get_by_placeholder("e.g. A life lived with gentle kindness and quiet grace.").wait_for()
    page.get_by_role("button", name="Continue", exact=True).click()
    page.get_by_placeholder("Full Name (e.g. Vikram)").wait_for()
    page.get_by_role("button", name="Continue", exact=True).click()
    page.get_by_role("button", name=re.compile("Visitor")).first.wait_for()
    page.get_by_role("button", name="Continue", exact=True).click()

    # Step 5: evidence of passing.
    page.get_by_text("Evidence of passing").wait_for()
    page.locator("input[type=file]").set_input_files(str(evidence_path))
    page.get_by_text("Uploaded successfully").wait_for(timeout=15_000)
    page.select_option("#evidence-doc-type", doc_type)
    page.get_by_role("button", name="Create Memorial", exact=True).last.click()

    # The app opens the new memorial page for its steward.
    page.wait_for_url("**/m/**", timeout=60_000)


@pytest.fixture(scope="module")
def steward_credentials(e2e_stack, browser, steward_password, firebase_app, r2_client):
    """One real signup+verification for the module; later tests log in afresh.

    The smoke suite already proves signup; here the fixture exists so the
    verification-chain tests do not pay the email-quota cost per test. Module
    setup runs before the per-test isolation, so the previous session's rows and
    storage objects are cleaned here too — synthetic fixture data only.
    """
    from .support import storage

    storage.cleanup_objects(r2_client)
    database.truncate_all()

    firebase_tools.delete_user_if_exists(TEST_STEWARD_EMAIL)

    context = browser.new_context()
    page = context.new_page()
    console: list[str] = []
    page.on("console", lambda message: console.append(message.text))
    page.on("pageerror", lambda error: console.append(f"pageerror: {error}"))
    try:
        _signup_through_ui(page, e2e_stack, TEST_STEWARD_EMAIL, steward_password.password)
        link = firebase_tools.verification_link(TEST_STEWARD_EMAIL)
        verification_page = context.new_page()
        verification_page.goto(link, wait_until="domcontentloaded")
        _wait_for(
            lambda: firebase_tools.is_email_verified(TEST_STEWARD_EMAIL),
            timeout=30,
            message="Firebase never marked the address verified",
        )
        verification_page.close()

        page.bring_to_front()
        # Firebase's verification state can take a beat to propagate to the
        # client's token refresh; retry the app's own check a few times.
        last_error: Exception | None = None
        for _attempt in range(1, 4):
            page.get_by_role("button", name="I've verified my email").click()
            try:
                page.get_by_role("button", name="Continue to Pithros").click(timeout=15_000)
                last_error = None
                break
            except Exception as exc:
                last_error = exc
                time.sleep(3)
        if last_error is not None:
            body = ""
            try:
                body = page.locator("body").inner_text()[:600]
            except Exception:
                body = "(body unreadable)"
            raise AssertionError(
                f"verification check did not succeed (url={page.url}). "
                f"Visible text: {body!r}. Console tail: {console[-15:]!r}"
            ) from last_error
        page.wait_for_url("**/dashboard", timeout=20_000)
    finally:
        context.close()

    return TestCredentials(email=TEST_STEWARD_EMAIL, password=steward_password.password)


@pytest.fixture(scope="module")
def admin_credentials(firebase_app):
    """A fixture-owned synthetic admin: reset each run for deterministic login.

    This is setup for a dedicated test persona — not a bypass inside any
    journey. The admin then signs in through the real UI, and the backend copies
    the role from the verified claims exactly as it does for every admin.
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


def _admin_landing(url: str) -> bool:
    return "/admin" in url and "signin" not in url


def test_full_evidence_chain_through_approval(
    browser, e2e_stack, frontend_config, steward_credentials, admin_credentials, assets
):
    steward_context = browser.new_context()
    admin_context = browser.new_context()
    steward_page = steward_context.new_page()
    admin_page = admin_context.new_page()
    try:
        _login(
            steward_page,
            e2e_stack,
            steward_credentials,
            landing=lambda url: "/dashboard" in url,
        )
        _create_memorial_with_evidence(
            steward_page,
            e2e_stack,
            assets,
            name=MEMORIAL_APPROVE,
            birth="1950",
            death="2025",
            evidence_path=assets.certificate_match,
            doc_type="death_certificate",
        )

        row = _memorial_row(MEMORIAL_APPROVE)
        assert row is not None, "the memorial was not created"
        memorial_id = row[0]

        submission = _wait_for(
            lambda: _submission_under_review(memorial_id),
            timeout=120,
            message="the worker never advanced the submission to review",
        )
        automated = submission[2] or {}
        assert automated.get("text_extracted") is True
        assert automated.get("text_length", 0) > 50
        assert automated.get("ocr_engine", "").startswith("pypdf")

        # Admin signs in through the real UI and works the real queue.
        _login(admin_page, e2e_stack, admin_credentials, landing=_admin_landing)
        admin_page.goto(f"{e2e_stack.frontend_url}/admin/verification")
        queue_item = admin_page.locator("button", has_text=MEMORIAL_APPROVE).first
        queue_item.wait_for(timeout=20_000)
        queue_item.click()

        open_button = admin_page.get_by_role("button", name="Open document").first
        open_button.wait_for(timeout=20_000)
        with admin_context.expect_page() as popup_info:
            open_button.click()
        popup = popup_info.value
        with contextlib.suppress(Exception):
            # The in-browser viewer can stay blank; the checks below are authoritative.
            popup.wait_for_url(re.compile(r"^https?://"), timeout=5_000)
        popup.close()

        # The click calls the audited evidence endpoint — prove the real effect.
        _wait_for(
            lambda: database.fetch_one(
                "SELECT id FROM audit_logs WHERE action = 'SENSITIVE_DOCUMENT_ACCESSED' "
                "ORDER BY created_at DESC LIMIT 1"
            ),
            timeout=20,
            message="the evidence-open action was never audited",
        )
        admin_token = firebase_tools.sign_in_with_password(
            frontend_config["VITE_FIREBASE_API_KEY"],
            admin_credentials.email,
            admin_credentials.password,
        )
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        submitted_detail = httpx.get(
            f"{e2e_stack.backend_url}/api/v1/admin/verification/{submission[0]}",
            headers=admin_headers,
            timeout=20,
        )
        assert submitted_detail.status_code == 200
        access = httpx.get(
            f"{e2e_stack.backend_url}/api/v1/verification/evidence/"
            f"{submitted_detail.json()['evidence'][0]['id']}",
            headers=admin_headers,
            timeout=20,
        )
        assert access.status_code == 200
        served = httpx.get(access.json()["url"], timeout=20)
        assert served.status_code == 200
        assert len(served.content) > 100

        admin_page.get_by_role("button", name="Approve & Grant Badge").click()
        admin_page.get_by_text("Approved. The memorial", exact=False).wait_for(timeout=20_000)

        _wait_for(
            lambda: _submission_state(memorial_id) == "approved",
            timeout=30,
            message="the submission never reached approved",
        )
        refreshed = _memorial_row(MEMORIAL_APPROVE)
        assert refreshed[5] == "Document Reviewed"

        notification = database.fetch_one(
            "SELECT n.id::text FROM notifications n JOIN users u ON u.id = n.user_id "
            "WHERE u.email = %s AND n.type = 'verification_approved' "
            "ORDER BY n.created_at DESC LIMIT 1",
            (TEST_STEWARD_EMAIL.lower(),),
        )
        assert notification is not None, "the steward was not notified of the decision"

        # The steward sees the decision and the notification in the real UI.
        steward_page.goto(f"{e2e_stack.frontend_url}/dashboard/verification")
        steward_page.get_by_text("Verified by the Pithros Trust team", exact=False).wait_for(
            timeout=20_000
        )

        steward_page.goto(f"{e2e_stack.frontend_url}/dashboard/notifications")
        steward_page.get_by_text("Verification approved", exact=False).first.wait_for(
            timeout=20_000
        )
        steward_page.get_by_role("button", name="Mark read").first.click()
        _wait_for(
            lambda: (
                database.fetch_one(
                    "SELECT read_at FROM notifications WHERE id = %s::uuid", (notification[0],)
                )[0]
                is not None
            ),
            timeout=20,
            message="the notification was never marked read",
        )
    finally:
        steward_context.close()
        admin_context.close()


def test_mismatched_evidence_flags_risk_then_request_info(
    browser, e2e_stack, steward_credentials, admin_credentials, assets
):
    steward_context = browser.new_context()
    admin_context = browser.new_context()
    steward_page = steward_context.new_page()
    admin_page = admin_context.new_page()
    try:
        _login(
            steward_page,
            e2e_stack,
            steward_credentials,
            landing=lambda url: "/dashboard" in url,
        )
        _create_memorial_with_evidence(
            steward_page,
            e2e_stack,
            assets,
            name=MEMORIAL_MISMATCH,
            birth="1950",
            death="2025",
            evidence_path=assets.certificate_mismatch,
            doc_type="death_certificate",
        )

        memorial_id = _memorial_row(MEMORIAL_MISMATCH)[0]
        submission = _wait_for(
            lambda: _submission_under_review(memorial_id),
            timeout=120,
            message="the worker never advanced the mismatched submission to review",
        )

        # The inconsistency is surfaced as a signal — never an automatic rejection.
        risks = submission[3] or {}
        name_match = risks.get("name_match") or {}
        flags = risks.get("flags") or []
        assert name_match.get("verdict") == "mismatch" or "name_mismatch" in flags
        assert risks.get("overall_risk") in ("medium", "high")
        assert _submission_state(memorial_id) == "verification_review"

        _login(admin_page, e2e_stack, admin_credentials, landing=_admin_landing)
        admin_page.goto(f"{e2e_stack.frontend_url}/admin/verification")
        queue_item = admin_page.locator("button", has_text=MEMORIAL_MISMATCH).first
        queue_item.wait_for(timeout=20_000)
        queue_item.click()

        admin_page.get_by_role("button", name="Request More Info").first.click()
        admin_page.fill(
            "#decision-reason",
            "Please upload a clearer certificate that shows the registrar seal.",
        )
        admin_page.get_by_role("button", name="Request More Info").click()
        admin_page.get_by_text("Information requested.", exact=False).wait_for(timeout=20_000)

        _wait_for(
            lambda: _submission_state(memorial_id) == "needs_more_information",
            timeout=30,
            message="the submission never moved to needs_more_information",
        )
        notification = database.fetch_one(
            "SELECT n.id::text FROM notifications n JOIN users u ON u.id = n.user_id "
            "WHERE u.email = %s AND n.type = 'verification_needs_info' "
            "ORDER BY n.created_at DESC LIMIT 1",
            (TEST_STEWARD_EMAIL.lower(),),
        )
        assert notification is not None

        # The steward is told what to do next, with the reviewer's note.
        steward_page.goto(f"{e2e_stack.frontend_url}/dashboard/verification")
        steward_page.get_by_text("More information requested", exact=False).wait_for(timeout=20_000)
        steward_page.get_by_text("registrar seal", exact=False).wait_for(timeout=20_000)
        steward_page.get_by_text("Upload the additional document", exact=False).wait_for(
            timeout=20_000
        )
    finally:
        steward_context.close()
        admin_context.close()


def test_wrong_document_is_not_accepted_as_certificate(
    browser, e2e_stack, steward_credentials, admin_credentials, assets
):
    steward_context = browser.new_context()
    admin_context = browser.new_context()
    steward_page = steward_context.new_page()
    admin_page = admin_context.new_page()
    try:
        _login(
            steward_page,
            e2e_stack,
            steward_credentials,
            landing=lambda url: "/dashboard" in url,
        )
        _create_memorial_with_evidence(
            steward_page,
            e2e_stack,
            assets,
            name=MEMORIAL_WRONG_DOC,
            birth="1966",
            death="2024",
            evidence_path=assets.blank_image,
            doc_type="other",
        )

        memorial_id = _memorial_row(MEMORIAL_WRONG_DOC)[0]
        submission = _wait_for(
            lambda: _submission_under_review(memorial_id),
            timeout=120,
            message="the worker never advanced the wrong-document submission to review",
        )
        automated = submission[2] or {}
        # A blank page yields no usable text; the system records that honestly.
        assert not automated.get("text_extracted", False)
        assert _submission_state(memorial_id) == "verification_review"

        # The admin queue shows the submission with only real analysis state.
        _login(admin_page, e2e_stack, admin_credentials, landing=_admin_landing)
        admin_page.goto(f"{e2e_stack.frontend_url}/admin/verification")
        queue_item = admin_page.locator("button", has_text=MEMORIAL_WRONG_DOC).first
        queue_item.wait_for(timeout=20_000)
        queue_item.click()
        admin_page.get_by_role("button", name="Approve & Grant Badge").wait_for(timeout=20_000)
        admin_page.get_by_role("button", name="Open document").first.wait_for(timeout=20_000)
    finally:
        steward_context.close()
        admin_context.close()
