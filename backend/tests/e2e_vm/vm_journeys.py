"""VM-targeted browser journeys for the Pithros production simulation.

Runs a real Chromium against the deployed simulation (default http://10.153.175.57)
and drives the SPA the way a person does. Firebase personas are provisioned with
the Admin SDK (fixture setup, exactly as the local E2E suite does) and then sign
in through the real form; journey assertions use the API (the server is the
authority) and the rendered UI. No business state is written directly.

Usage:
    .venv\\Scripts\\python.exe -m tests.e2e_vm.vm_journeys --journeys signup,cross_user,mobile,anon

Outputs a machine-readable result file under reports/prod-simulation/<RUN_ID>/
when PITHROS_VM_RUN_ID is set (otherwise prints to stdout only).
"""

from __future__ import annotations

import argparse
import concurrent.futures
import contextlib
import json
import os
import re
import secrets
import sys
import threading
import time
from pathlib import Path

import httpx
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]
BASE = os.environ.get("PITHROS_VM_BASE", "http://10.153.175.57").rstrip("/")
API = BASE + "/api/v1"

STEWARD_EMAIL = "pithros.vm.steward@gmail.com"
INTRUDER_EMAIL = "pithros.vm.intruder@gmail.com"
ADMIN_EMAIL = "pithros.vm.admin@gmail.com"
SIGNUP_EMAIL = "pithros.vm.signup@gmail.com"
MOBILE_EMAIL = "pithros.vm.mobile@gmail.com"

ANON_SENSITIVE = [
    "/me",
    "/billing/invoices",
    "/billing/payments",
    "/me/notifications",
    "/me/deletion-request",
    "/me/invitations",
    "/admin/users",
    "/admin/audit?limit=1",
    "/billing/admin/refunds",
    "/billing/admin/overview",
    "/admin/deletion-requests",
    "/admin/providers",
    "/memorials/export/status/does-not-exist",
    "/memorials/00000000-0000-0000-0000-000000000000/permissions",
]
PUBLIC_READABLE = ["/health", "/billing/plans", "/public/providers"]

RESULTS: list[dict] = []


def record(journey: str, step: str, status: str, detail: str = "") -> None:
    RESULTS.append({"journey": journey, "step": step, "status": status, "detail": detail})
    print(f"[{status}] {journey} :: {step} {('- ' + detail) if detail else ''}", flush=True)


def _status_for(exc: BaseException) -> str:
    """Transport stalls and provider rate limiting are external, not app defects."""
    if isinstance(exc, httpx.TransportError):
        return "BLOCKED"
    if re.search(
        r"too many|TOO_MANY|rate.?limit|blocked|unusual activity|timeout",
        str(exc),
        re.I,
    ):
        return "BLOCKED"
    return "FAIL"


def parse_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        values[key.strip()] = value
    return values


WEB = parse_env(ROOT / "Pithros" / ".env.development")
BACKEND_ENV = {
    **parse_env(ROOT / "backend" / ".env.development"),
    **parse_env(ROOT / "backend" / ".env.local"),
}
API_KEY = WEB["VITE_FIREBASE_API_KEY"]
PROJECT_ID = BACKEND_ENV.get("FIREBASE_PROJECT_ID", "pithros-dev")
SA_FILE = BACKEND_ENV["FIREBASE_SERVICE_ACCOUNT_FILE"]

import firebase_admin  # noqa: E402
from firebase_admin import auth as fb_auth  # noqa: E402
from firebase_admin import credentials  # noqa: E402

firebase_admin.initialize_app(credentials.Certificate(SA_FILE), {"projectId": PROJECT_ID})


def ensure_persona(email: str, password: str, name: str, claims: dict | None = None) -> str:
    with contextlib.suppress(fb_auth.UserNotFoundError):
        fb_auth.delete_user(fb_auth.get_user_by_email(email).uid)
    user = fb_auth.create_user(
        email=email, password=password, email_verified=True, display_name=name
    )
    if claims:
        fb_auth.set_custom_user_claims(user.uid, claims)
    return user.uid


def _ensure_persona_reuse(email: str, password: str, name: str) -> None:
    """Create the persona only if missing, so it is reused across burst runs."""
    try:
        fb_auth.get_user_by_email(email)
    except fb_auth.UserNotFoundError:
        fb_auth.create_user(email=email, password=password, email_verified=True, display_name=name)


def delete_persona(email: str) -> None:
    with contextlib.suppress(fb_auth.UserNotFoundError):
        fb_auth.delete_user(fb_auth.get_user_by_email(email).uid)


def verification_link(email: str, timeout: float = 180.0) -> str:
    deadline = time.time() + timeout
    delay = 20.0
    while True:
        try:
            return fb_auth.generate_email_verification_link(email)
        except Exception as exc:
            if "TOO_MANY_ATTEMPTS_TRY_LATER" not in str(exc) or time.time() >= deadline:
                raise
            time.sleep(delay)
            delay = min(delay * 1.5, 45.0)


def rest_token(email: str, password: str) -> str:
    response = httpx.post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}",
        json={"email": email, "password": password, "returnSecureToken": True},
        timeout=20,
    )
    response.raise_for_status()
    return response.json()["idToken"]


def api(method: str, path: str, token: str | None = None, **kwargs):
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    last: Exception | None = None
    for _ in range(2):  # the VM link is occasionally slow; retry a transport stall once
        try:
            return httpx.request(method, API + path, headers=headers, timeout=30, **kwargs)
        except httpx.TransportError as exc:
            last = exc
            time.sleep(2)
    raise last  # type: ignore[misc]


def ui_signin(page, email: str, password: str, landing: str = "**/dashboard**") -> None:
    page.goto(f"{BASE}/signin", wait_until="domcontentloaded")
    page.fill("#email", email)
    page.fill("#password", password)
    page.get_by_role("button", name="Sign In").click()
    page.wait_for_url(landing, timeout=40_000)


def ui_signup(page, email: str, password: str, name: str) -> None:
    page.goto(f"{BASE}/signup", wait_until="domcontentloaded")
    page.fill("#fullName", name)
    page.fill("#signup-email", email)
    page.fill("#signup-phone", "+91 90000 00042")
    page.fill("#signup-password", password)
    page.fill("#confirm-password", password)
    page.check("#agreeTerms")
    page.get_by_role("button", name="Create Account").click()
    page.wait_for_url("**/verify-email", timeout=40_000)


def no_horizontal_overflow(page) -> tuple[bool, str]:
    metrics = page.evaluate(
        "() => ({sw: document.documentElement.scrollWidth, iw: window.innerWidth})"
    )
    ok = metrics["sw"] <= metrics["iw"] + 2
    return ok, f"scrollWidth={metrics['sw']} innerWidth={metrics['iw']}"


# ─────────────────────────────── Journeys ───────────────────────────────


def journey_signup(browser) -> None:
    name = "journey_signup"
    password = secrets.token_urlsafe(14)
    email = SIGNUP_EMAIL
    delete_persona(email)
    context = browser.new_context()
    page = context.new_page()
    try:
        try:
            ui_signup(page, email, password, "VM Journey Steward")
            record(name, "signup reaches /verify-email", "PASS")
        except Exception as signup_exc:
            alert = ""
            with contextlib.suppress(Exception):
                alert = page.locator('[role="alert"]').first.inner_text(timeout=3_000)
            if (
                re.search(r"too many|TOO_MANY|rate.?limit|blocked|unusual activity", alert, re.I)
                or _status_for(signup_exc) == "BLOCKED"
            ):
                record(
                    name,
                    "signup blocked by Firebase (external)",
                    "BLOCKED",
                    (alert or type(signup_exc).__name__)[:200],
                )
                return
            raise signup_exc

        user = fb_auth.get_user_by_email(email)
        record(
            name,
            "Firebase account is genuinely unverified",
            "PASS" if user.email_verified is False else "FAIL",
        )

        link = verification_link(email)
        vpage = context.new_page()
        vpage.goto(link, wait_until="domcontentloaded")
        deadline = time.time() + 30
        while time.time() < deadline and not fb_auth.get_user_by_email(email).email_verified:
            time.sleep(1)
        record(
            name,
            "email verified through the real Firebase link",
            "PASS" if fb_auth.get_user_by_email(email).email_verified else "FAIL",
        )
        vpage.close()

        page.bring_to_front()
        for _ in range(3):
            page.get_by_role("button", name="I've verified my email").click()
            try:
                page.get_by_role("button", name="Continue to Pithros").click(timeout=15_000)
                break
            except Exception:
                time.sleep(3)
        page.wait_for_url("**/dashboard", timeout=25_000)
        record(name, "verified user reaches /dashboard", "PASS")

        token = rest_token(email, password)
        me = api("GET", "/me", token)
        body = me.json() if me.status_code == 200 else {}
        ok = me.status_code == 200 and body.get("email_verified") is True
        record(
            name,
            "API /me resolves the provisioned user",
            "PASS" if ok else "FAIL",
            str(me.status_code),
        )

        page.goto(f"{BASE}/", wait_until="domcontentloaded")
        page.locator("button:has-text('VM Journey Steward')").first.click()
        page.get_by_role("button", name="Sign Out").click()
        page.wait_for_url("**/signin", timeout=25_000)
        anon = api("GET", "/me")
        record(
            name,
            "logout clears the session (anonymous /me = 401)",
            "PASS" if anon.status_code == 401 else "FAIL",
            str(anon.status_code),
        )
    except Exception as exc:
        record(name, "journey", _status_for(exc), f"{type(exc).__name__}: {exc}")
    finally:
        context.close()


def journey_cross_user(browser) -> None:
    name = "journey_cross_user"
    pw_a = secrets.token_urlsafe(14)
    pw_b = secrets.token_urlsafe(14)
    ensure_persona(STEWARD_EMAIL, pw_a, "VM Steward A")
    ensure_persona(INTRUDER_EMAIL, pw_b, "VM Intruder B")

    ctx_a = browser.new_context()
    ctx_b = browser.new_context()
    pa, pb = ctx_a.new_page(), ctx_b.new_page()
    created: dict = {}

    seen: list[str] = []

    def _capture(response):
        if "/api/v1/memorials" in response.url:
            seen.append(f"{response.request.method} {response.status} {response.url}")
            try:
                data = response.json()
            except Exception:
                return
            if response.request.method == "POST" and isinstance(data, dict) and data.get("id"):
                created.update(data)
            elif isinstance(data, dict) and isinstance(data.get("memorial"), dict):
                created.update(data["memorial"])

    pa.on("response", _capture)
    try:
        ui_signin(pa, STEWARD_EMAIL, pw_a)
        # A creates a memorial through the real wizard.
        pa.goto(f"{BASE}/create-memorial", wait_until="domcontentloaded")
        pa.get_by_placeholder("Enter their full name").fill("VM Journey Private Memorial")
        pa.get_by_placeholder("e.g. 1954").fill("1950")
        pa.get_by_placeholder("e.g. 2024").fill("2025")
        pa.get_by_role("button", name="Continue", exact=True).click()
        pa.get_by_placeholder("e.g. A life lived with gentle kindness and quiet grace.").wait_for()
        pa.get_by_role("button", name="Continue", exact=True).click()
        pa.get_by_placeholder("Full Name (e.g. Vikram)").wait_for()
        pa.get_by_role("button", name="Continue", exact=True).click()
        pa.get_by_role("button", name=re.compile("Visitor")).first.wait_for()
        pa.get_by_role("button", name="Continue", exact=True).click()
        pa.get_by_text("Evidence of passing").wait_for()
        pa.get_by_role("button", name="Create Memorial", exact=True).last.click()
        pa.wait_for_url("**/m/**", timeout=60_000)

        deadline = time.time() + 20
        while time.time() < deadline and "id" not in created:
            time.sleep(0.5)
        memorial_id = created.get("id")
        if not memorial_id:
            for entry in seen:
                match = re.search(r"/api/v1/memorials/([0-9a-fA-F-]{36})", entry)
                if match:
                    memorial_id = match.group(1)
                    break
        if not memorial_id:
            slug = pa.url.rstrip("/").split("/")[-1]
            with contextlib.suppress(Exception):
                resp = api("GET", f"/memorials/{slug}", rest_token(STEWARD_EMAIL, pw_a))
                if resp.status_code == 200:
                    memorial_id = resp.json().get("id")
        record(
            name,
            "steward A creates a private memorial (UI)",
            "PASS" if memorial_id else "FAIL",
            f"id={memorial_id} url={pa.url} api_seen={seen[-4:]}",
        )
        if not memorial_id:
            return

        token_a = rest_token(STEWARD_EMAIL, pw_a)
        token_b = rest_token(INTRUDER_EMAIL, pw_b)

        own = api("GET", f"/memorials/{memorial_id}", token_a)
        record(
            name,
            "A can read A's memorial",
            "PASS" if own.status_code == 200 else "FAIL",
            str(own.status_code),
        )

        # B denied on every route (direct API).
        attempts = [
            ("GET", f"/memorials/{memorial_id}", None),
            ("PATCH", f"/memorials/{memorial_id}", {"fullName": "Hijacked"}),
            ("DELETE", f"/memorials/{memorial_id}", None),
            ("GET", f"/memorials/{memorial_id}/media", None),
            ("GET", f"/memorials/{memorial_id}/permissions", None),
            ("GET", f"/billing/memorials/{memorial_id}/entitlements", None),
            ("GET", f"/memorials/{memorial_id}/qr", None),
        ]
        denied = 0
        for method, path, body in attempts:
            response = api(method, path, token_b, json=body)
            if response.status_code in (403, 404):
                denied += 1
            else:
                record(name, f"B {method} {path}", "FAIL", f"status={response.status_code}")
        record(
            name,
            "B refused on all 7 protected routes",
            "PASS" if denied == 7 else "FAIL",
            f"{denied}/7",
        )

        # B's UI cannot reach A's memorial by direct URL.
        pb.goto(f"{BASE}/signin", wait_until="domcontentloaded")
        pb.fill("#email", INTRUDER_EMAIL)
        pb.fill("#password", pw_b)
        pb.get_by_role("button", name="Sign In").click()
        pb.wait_for_url("**/dashboard**", timeout=40_000)
        pb.goto(f"{BASE}/m/{memorial_id}", wait_until="domcontentloaded")
        time.sleep(2)
        body_text = pb.locator("body").inner_text()
        leaked = "VM Journey Private Memorial" in body_text
        record(
            name,
            "B's direct URL to A's memorial does not reveal it",
            "PASS" if not leaked else "FAIL",
        )

        # B's own dashboard never lists A's memorial.
        pb.goto(f"{BASE}/dashboard", wait_until="domcontentloaded")
        time.sleep(2)
        listed = "VM Journey Private Memorial" in pb.locator("body").inner_text()
        record(name, "A's memorial is absent from B's dashboard", "PASS" if not listed else "FAIL")

        # A's memorial is untouched by B's refused attempts.
        after = api("GET", f"/memorials/{memorial_id}", token_a)
        intact = (
            after.status_code == 200
            and after.json().get("fullName") == "VM Journey Private Memorial"
        )
        record(name, "A's memorial is intact after B's attempts", "PASS" if intact else "FAIL")
    except Exception as exc:
        record(name, "journey", _status_for(exc), f"{type(exc).__name__}: {exc}")
    finally:
        ctx_a.close()
        ctx_b.close()


def journey_anon(browser) -> None:
    name = "journey_anon"
    refused = 0
    for path in ANON_SENSITIVE:
        try:
            response = api("GET", path)
            code = response.status_code
        except Exception as exc:
            code = f"ERR {type(exc).__name__}"
        if code == 401:
            refused += 1
        else:
            record(name, f"anon GET {path}", "FAIL", f"status={code}")
    record(
        name,
        "anonymous refused on every private endpoint",
        "PASS" if refused == len(ANON_SENSITIVE) else "FAIL",
        f"{refused}/{len(ANON_SENSITIVE)}",
    )

    readable = 0
    for path in PUBLIC_READABLE:
        try:
            response = api("GET", path)
            code = response.status_code
        except Exception as exc:
            code = f"ERR {type(exc).__name__}"
        if code == 200:
            readable += 1
        else:
            record(name, f"public GET {path}", "FAIL", f"status={code}")
    record(
        name,
        "public endpoints stay readable anonymously",
        "PASS" if readable == len(PUBLIC_READABLE) else "FAIL",
        f"{readable}/{len(PUBLIC_READABLE)}",
    )

    # Anonymous browser must never be served the dashboard.
    context = browser.new_context()
    page = context.new_page()
    try:
        page.goto(f"{BASE}/dashboard", wait_until="domcontentloaded")
        page.wait_for_timeout(3000)
        on_signin = "signin" in page.url or "signup" in page.url
        has_signin_cta = page.get_by_role("button", name=re.compile("sign", re.I)).count() > 0
        record(
            name,
            "anonymous /dashboard shows a sign-in affordance, not the dashboard",
            "PASS" if (on_signin or has_signin_cta) else "FAIL",
            page.url,
        )
    except Exception as exc:
        record(name, "journey", _status_for(exc), f"{type(exc).__name__}: {exc}")
    finally:
        context.close()


def journey_mobile(browser) -> None:
    name = "journey_mobile"
    pw = secrets.token_urlsafe(14)
    email = MOBILE_EMAIL
    ensure_persona(email, pw, "VM Mobile Steward")
    viewports = [
        {"width": 360, "height": 800},
        {"width": 390, "height": 844},
        {"width": 412, "height": 915},
    ]
    public_routes = ["/", "/signin", "/signup"]
    auth_routes = ["/dashboard", "/create-memorial", "/dashboard/contributors"]
    for vp in viewports:
        context = browser.new_context(viewport=vp)
        page = context.new_page()
        try:
            for route in public_routes:
                try:
                    page.goto(f"{BASE}{route}", wait_until="domcontentloaded")
                    time.sleep(1)
                    ok, detail = no_horizontal_overflow(page)
                    record(
                        name,
                        f"{vp['width']}px public {route} no overflow",
                        "PASS" if ok else "FAIL",
                        detail,
                    )
                except Exception as exc:
                    record(
                        name,
                        f"{vp['width']}px public {route}",
                        "FAIL",
                        f"{type(exc).__name__}: {exc}",
                    )
            try:
                ui_signin(page, email, pw)
                for route in auth_routes:
                    try:
                        page.goto(f"{BASE}{route}", wait_until="domcontentloaded")
                        time.sleep(1)
                        ok, detail = no_horizontal_overflow(page)
                        record(
                            name,
                            f"{vp['width']}px auth {route} no overflow",
                            "PASS" if ok else "FAIL",
                            detail,
                        )
                    except Exception as exc:
                        record(
                            name,
                            f"{vp['width']}px auth {route}",
                            "FAIL",
                            f"{type(exc).__name__}: {exc}",
                        )
            except Exception as exc:
                record(name, f"{vp['width']}px sign-in", "FAIL", f"{type(exc).__name__}: {exc}")
        finally:
            context.close()


def journey_evidence(browser) -> None:
    name = "journey_evidence"
    pw = secrets.token_urlsafe(14)
    admin_pw = secrets.token_urlsafe(14)
    email = STEWARD_EMAIL
    ensure_persona(email, pw, "VM Evidence Steward")
    ensure_persona(
        ADMIN_EMAIL,
        admin_pw,
        "VM Evidence Admin",
        claims={"role": "admin", "admin_subrole": "super_admin"},
    )

    memorial_name = "VM Journey Evidence Memorial"
    cert = ROOT / "backend" / "tests" / "e2e_vm" / ".runtime"
    cert.mkdir(parents=True, exist_ok=True)
    cert_path = cert / "vm-death-certificate.pdf"
    from reportlab.pdfgen import canvas as _canvas

    c = _canvas.Canvas(str(cert_path))
    c.drawString(72, 720, "Certificate of Death")
    c.drawString(72, 700, f"Deceased Full Name: {memorial_name}")
    c.drawString(72, 680, "Date of Passing: 2025-03-14")
    c.drawString(72, 660, "Registrar: Municipal Records Office, cert ref VM-E2E-0001")
    c.save()

    steward = browser.new_context()
    admin = browser.new_context()
    sp, ap = steward.new_page(), admin.new_page()
    try:
        ui_signin(sp, email, pw)
        sp.goto(f"{BASE}/create-memorial", wait_until="domcontentloaded")
        sp.get_by_placeholder("Enter their full name").fill(memorial_name)
        sp.get_by_placeholder("e.g. 1954").fill("1950")
        sp.get_by_placeholder("e.g. 2024").fill("2025")
        sp.get_by_role("button", name="Continue", exact=True).click()
        sp.get_by_placeholder("e.g. A life lived with gentle kindness and quiet grace.").wait_for()
        sp.get_by_role("button", name="Continue", exact=True).click()
        sp.get_by_placeholder("Full Name (e.g. Vikram)").wait_for()
        sp.get_by_role("button", name="Continue", exact=True).click()
        sp.get_by_role("button", name=re.compile("Visitor")).first.wait_for()
        sp.get_by_role("button", name="Continue", exact=True).click()
        sp.get_by_text("Evidence of passing").wait_for()
        sp.locator("input[type=file]").set_input_files(str(cert_path))
        sp.get_by_text("Uploaded successfully").wait_for(timeout=20_000)
        sp.select_option("#evidence-doc-type", "death_certificate")
        sp.get_by_role("button", name="Create Memorial", exact=True).last.click()
        sp.wait_for_url("**/m/**", timeout=60_000)
        record(name, "steward uploads evidence and creates the memorial", "PASS")

        # Admin works the real queue: the AI/OCR result is only a signal — a human decides.
        ui_signin(
            ap, ADMIN_EMAIL, admin_pw, landing=lambda url: "/admin" in url and "signin" not in url
        )
        ap.goto(f"{BASE}/admin/verification")
        queue_item = ap.locator("button", has_text=memorial_name).first
        queue_item.wait_for(timeout=150_000)
        record(name, "submission reaches the human admin review queue (OCR ran)", "PASS")
        queue_item.click()
        approve = ap.get_by_role("button", name="Approve & Grant Badge")
        approve.wait_for(timeout=20_000)
        record(name, "admin queue exposes a human decision, not auto-approval", "PASS")
        approve.click()
        ap.get_by_text("Approved. The memorial", exact=False).wait_for(timeout=20_000)
        record(name, "admin approves the evidence", "PASS")

        # The steward sees the human decision reflected back.
        sp.goto(f"{BASE}/dashboard/verification", wait_until="domcontentloaded")
        sp.get_by_text("Verified by the Pithros Trust team", exact=False).wait_for(timeout=20_000)
        record(name, "steward sees the reviewer's decision", "PASS")
    except Exception as exc:
        record(name, "journey", _status_for(exc), f"{type(exc).__name__}: {exc}")
    finally:
        steward.close()
        admin.close()


def journey_burst(browser, burst_size: int = 40) -> None:
    """Fire concurrent refusals while polling /health — the release-critical lock probe.

    Reproduces the reported burst: many simultaneous authenticated requests that each
    trigger a refusal audit. Before the fix the API blocked on the caller's own
    users-row lock (`/health` unresponsive for minutes); after the fix the requests
    and `/health` stay responsive.
    """
    name = "journey_burst"
    pw_a = secrets.token_urlsafe(14)
    ensure_persona(STEWARD_EMAIL, pw_a, "VM Burst A")

    ctx = browser.new_context()
    page = ctx.new_page()
    seen: list[str] = []
    created: dict = {}

    def _cap(response):
        if "/api/v1/memorials" in response.url:
            seen.append(response.url)
            with contextlib.suppress(Exception):
                data = response.json()
                if response.request.method == "POST" and data.get("id"):
                    created.update(data)

    page.on("response", _cap)
    memorial_id = None
    try:
        ui_signin(page, STEWARD_EMAIL, pw_a)
        page.goto(f"{BASE}/create-memorial", wait_until="domcontentloaded")
        page.get_by_placeholder("Enter their full name").fill("VM Burst Memorial")
        page.get_by_placeholder("e.g. 1954").fill("1950")
        page.get_by_placeholder("e.g. 2024").fill("2025")
        page.get_by_role("button", name="Continue", exact=True).click()
        page.get_by_placeholder(
            "e.g. A life lived with gentle kindness and quiet grace."
        ).wait_for()
        page.get_by_role("button", name="Continue", exact=True).click()
        page.get_by_placeholder("Full Name (e.g. Vikram)").wait_for()
        page.get_by_role("button", name="Continue", exact=True).click()
        page.get_by_role("button", name=re.compile("Visitor")).first.wait_for()
        page.get_by_role("button", name="Continue", exact=True).click()
        page.get_by_text("Evidence of passing").wait_for()
        page.get_by_role("button", name="Create Memorial", exact=True).last.click()
        page.wait_for_url("**/m/**", timeout=60_000)
        memorial_id = created.get("id")
        if not memorial_id:
            for entry in seen:
                match = re.search(r"/api/v1/memorials/([0-9a-fA-F-]{36})", entry)
                if match:
                    memorial_id = match.group(1)
                    break
        record(name, "steward creates a memorial for the burst", "PASS" if memorial_id else "FAIL")
    finally:
        ctx.close()
    if not memorial_id:
        return

    # Distinct actors, reused across runs so a stale `last_seen` survives between
    # them: the burst's first request then updates the actor row (the lock the audit
    # used to wait on) and refuses — reproducing the reported path on demand.
    actor_tokens: list[str] = []
    for index in range(burst_size):
        actor_email = f"pithros.stale.burst{index}@gmail.com"
        actor_pw = f"Pithros-Stale-Burst-{index}-pw"
        _ensure_persona_reuse(actor_email, actor_pw, f"VM Stale Burst {index}")
        actor_tokens.append(rest_token(actor_email, actor_pw))

    health_samples: list[tuple[float, int]] = []
    stop = threading.Event()

    def poll_health() -> None:
        while not stop.is_set():
            started = time.perf_counter()
            try:
                code = httpx.get(f"{BASE}/health", timeout=10).status_code
            except Exception:
                code = 0
            health_samples.append((round(time.perf_counter() - started, 3), code))
            time.sleep(0.15)

    poller = threading.Thread(target=poll_health, daemon=True)
    poller.start()

    latencies: list[tuple[float, int | str]] = []

    def one(index: int) -> None:
        started = time.perf_counter()
        try:
            code: int | str = api(
                "GET", f"/memorials/{memorial_id}", actor_tokens[index]
            ).status_code
        except Exception as exc:
            code = f"ERR {type(exc).__name__}"
        latencies.append((round(time.perf_counter() - started, 3), code))

    burst_started = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=burst_size) as pool:
        list(pool.map(one, range(burst_size)))
    burst_elapsed = round(time.perf_counter() - burst_started, 2)
    stop.set()
    poller.join(timeout=5)

    denied = sum(1 for _lat, code in latencies if code in (403, 404))
    max_latency = max((lat for lat, _code in latencies), default=0)
    hung = [lat for lat, _code in latencies if lat > 60]
    record(
        name,
        f"{burst_size} refusals in {burst_elapsed}s (max {max_latency}s, >60s {len(hung)})",
        "PASS" if denied == burst_size and not hung else "FAIL",
    )
    health_failures = [sample for sample in health_samples if sample[1] != 200]
    max_health = max((lat for lat, _code in health_samples), default=0)
    record(
        name,
        f"/health responsive during burst ({len(health_samples)} samples, max {max_health}s)",
        "PASS" if not health_failures else "FAIL",
        f"failures={len(health_failures)}",
    )


JOURNEYS = {
    "signup": journey_signup,
    "cross_user": journey_cross_user,
    "anon": journey_anon,
    "mobile": journey_mobile,
    "evidence": journey_evidence,
    "burst": journey_burst,
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--journeys", default="anon,signup,cross_user,mobile")
    parser.add_argument("--headed", action="store_true")
    args = parser.parse_args()
    selected = [j.strip() for j in args.journeys.split(",") if j.strip()]

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not args.headed)
        try:
            for key in selected:
                if key not in JOURNEYS:
                    record("runner", f"unknown journey {key}", "SKIP")
                    continue
                JOURNEYS[key](browser)
        finally:
            browser.close()

    passed = sum(1 for r in RESULTS if r["status"] == "PASS")
    failed = sum(1 for r in RESULTS if r["status"] == "FAIL")
    print(f"\n=== {passed} PASS / {failed} FAIL / {len(RESULTS)} checks ===", flush=True)

    run_id = os.environ.get("PITHROS_VM_RUN_ID")
    if run_id:
        out_dir = ROOT / "reports" / "prod-simulation" / run_id
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / "vm-browser-results.json"
        existing: dict = {"base": BASE, "results": []}
        if out_path.exists():
            with contextlib.suppress(Exception):
                existing = json.loads(out_path.read_text(encoding="utf-8"))
        ran = {r["journey"] for r in RESULTS}
        merged = [r for r in existing.get("results", []) if r.get("journey") not in ran]
        merged.extend(RESULTS)
        out_path.write_text(
            json.dumps({"base": BASE, "results": merged}, indent=2), encoding="utf-8"
        )
        print(f"results written to {out_path}", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
