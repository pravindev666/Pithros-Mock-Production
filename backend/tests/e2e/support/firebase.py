"""Firebase Admin helpers for the E2E harness.

Verification interception: the harness generates the *real* verification link
through the Admin SDK and opens it in the browser, so Firebase's own state
machine performs the verification — no database flag is ever flipped. The only
account ever touched is the dedicated test address, and only to guarantee a
clean signup (by deleting a leftover account from a previous run).
"""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout
from pathlib import Path
from typing import Any

import httpx

_app: Any = None

FIREBASE_CALL_TIMEOUT = 45.0


def with_timeout(label: str, fn, *args, **kwargs):
    """Run a Firebase Admin call with a hard deadline.

    The Admin SDK's HTTP client has no default timeout; without this, a stalled
    connection can hang the whole suite. 45 seconds is generous for an auth
    lookup and short enough to fail loudly instead of silently.
    """
    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(fn, *args, **kwargs)
        try:
            return future.result(timeout=FIREBASE_CALL_TIMEOUT)
        except FutureTimeout as exc:
            raise RuntimeError(f"Firebase call '{label}' timed out") from exc


def init(env: dict[str, str]) -> Any:
    global _app
    if _app is not None:
        return _app

    import firebase_admin
    from firebase_admin import credentials

    cred_path = env.get("FIREBASE_SERVICE_ACCOUNT_FILE", "")
    if not cred_path or not Path(cred_path).exists():
        raise RuntimeError(
            f"Firebase service account file not found: {cred_path!r}. "
            "The E2E suite requires real Firebase credentials."
        )

    certificate = credentials.Certificate(cred_path)
    try:
        _app = firebase_admin.initialize_app(certificate)
    except ValueError:
        _app = firebase_admin.get_app()
    return _app


def get_user(email: str):
    from firebase_admin import auth as fb_auth

    return with_timeout("get_user", fb_auth.get_user_by_email, email)


def delete_user_if_exists(email: str) -> bool:
    """Remove a leftover E2E account so signup runs against a clean project.

    This is quarantine for the dedicated test address only — never any other
    user — and it is logged so the deletion is visible in the run output.
    """
    from firebase_admin import auth as fb_auth

    try:
        user = with_timeout("get_user", fb_auth.get_user_by_email, email)
    except fb_auth.UserNotFoundError:
        return False
    with_timeout("delete_user", fb_auth.delete_user, user.uid)
    print(f"[e2e] removed leftover test account {email} (uid {user.uid})")
    return True


def verification_link(email: str, *, timeout: float = 180.0) -> str:
    """The genuine link Firebase would email, generated without sending it.

    Firebase rate-limits verification codes per address, and the app's own
    signup already consumed one — so generation retries with a patient backoff
    instead of trying to cheat past the provider's limit.
    """
    from firebase_admin import auth as fb_auth

    deadline = time.time() + timeout
    delay = 20.0
    while True:
        try:
            return with_timeout(
                "generate_verification_link", fb_auth.generate_email_verification_link, email
            )
        except Exception as exc:
            if "TOO_MANY_ATTEMPTS_TRY_LATER" not in str(exc) or time.time() >= deadline:
                raise
            print(
                f"[e2e] verification code rate-limited; retrying in {int(delay)}s",
                flush=True,
            )
            time.sleep(delay)
            delay = min(delay * 1.5, 45.0)


def is_email_verified(email: str) -> bool:
    return bool(get_user(email).email_verified)


def sign_in_with_password(api_key: str, email: str, password: str) -> str:
    """ID token via the Identity Toolkit REST API, for read-only API asserts."""
    response = httpx.post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
        json={"email": email, "password": password, "returnSecureToken": True},
        timeout=20,
    )
    if response.status_code != 200:
        raise RuntimeError(
            f"Firebase REST sign-in failed ({response.status_code}): {response.text[:300]}"
        )
    return response.json()["idToken"]
