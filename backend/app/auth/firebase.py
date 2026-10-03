"""Firebase Admin initialisation and ID-token verification.

The verifier is deliberately behind a Protocol so the authorization test suite
can substitute fake claims and run without any Firebase credentials.
"""

from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass
from enum import StrEnum
from functools import lru_cache
from pathlib import Path
from typing import Any, Protocol

import firebase_admin
import google.oauth2.id_token
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from app.core.config import BACKEND_DIR, settings
from app.core.errors import UnauthorizedError

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class FirebaseIdentity:
    """The subset of verified token claims Pithros cares about."""

    uid: str
    email: str | None
    email_verified: bool
    name: str | None = None
    picture: str | None = None
    phone_number: str | None = None
    sign_in_provider: str | None = None
    role: str | None = None
    admin_subrole: str | None = None
    auth_time: int | None = None

    @property
    def normalized_email(self) -> str:
        return (self.email or "").strip().lower()

    @property
    def display_name(self) -> str:
        if self.name and self.name.strip():
            return self.name.strip()
        if self.email:
            return self.email.split("@")[0]
        return "Pithros Member"

    @classmethod
    def from_claims(cls, claims: dict[str, Any]) -> FirebaseIdentity:
        firebase_claim = claims.get("firebase") or {}
        return cls(
            uid=claims["uid"],
            email=claims.get("email"),
            email_verified=bool(claims.get("email_verified", False)),
            name=claims.get("name"),
            picture=claims.get("picture"),
            phone_number=claims.get("phone_number"),
            sign_in_provider=firebase_claim.get("sign_in_provider"),
            role=claims.get("role"),
            admin_subrole=claims.get("admin_subrole"),
            auth_time=claims.get("auth_time"),
        )


class TokenVerifier(Protocol):
    def verify(self, token: str) -> FirebaseIdentity: ...


class AuthFailureCategory(StrEnum):
    """Why token verification failed — logged, never returned to the client."""

    INVALID_TOKEN = "INVALID_TOKEN"  # noqa: S105
    EXPIRED_TOKEN = "EXPIRED_TOKEN"  # noqa: S105
    REVOKED_TOKEN = "REVOKED_TOKEN"  # noqa: S105
    CERTIFICATE_FETCH_FAILURE = "CERTIFICATE_FETCH_FAILURE"
    CONFIGURATION_FAILURE = "FIREBASE_CONFIGURATION_FAILURE"
    NETWORK_FAILURE = "NETWORK_FAILURE"


# Safe, non-sensitive client messages. Internal categories/exception details are
# logged instead of surfaced, so a caller cannot use error text as an oracle.
_CLIENT_MESSAGE: dict[AuthFailureCategory, str] = {
    AuthFailureCategory.EXPIRED_TOKEN: "Your session has expired. Please sign in again.",
    AuthFailureCategory.REVOKED_TOKEN: "This session was revoked. Please sign in again.",
    AuthFailureCategory.CERTIFICATE_FETCH_FAILURE: (
        "Authentication service is temporarily unavailable. Please try again."
    ),
    AuthFailureCategory.NETWORK_FAILURE: (
        "Authentication service is temporarily unavailable. Please try again."
    ),
    AuthFailureCategory.CONFIGURATION_FAILURE: "Invalid authentication token.",
    AuthFailureCategory.INVALID_TOKEN: "Invalid authentication token.",
}

# One initial attempt plus bounded retries for a *transient* certificate fetch.
_MAX_VERIFY_ATTEMPTS = 3
_CERT_FETCH_BACKOFF_SECONDS = 0.25


def _classify_failure(exc: BaseException) -> AuthFailureCategory:
    """Map an SDK exception onto an operator-visible category."""
    if isinstance(exc, firebase_auth.ExpiredIdTokenError):
        return AuthFailureCategory.EXPIRED_TOKEN
    if isinstance(exc, firebase_auth.RevokedIdTokenError):
        return AuthFailureCategory.REVOKED_TOKEN
    if isinstance(exc, firebase_auth.CertificateFetchError):
        return AuthFailureCategory.CERTIFICATE_FETCH_FAILURE
    if isinstance(exc, firebase_auth.InvalidIdTokenError):
        # A certificate fetch that returned an unusable body surfaces here too.
        text = str(exc).lower()
        if "certificate" in text or "could not fetch" in text or "token signature" in text:
            return AuthFailureCategory.CERTIFICATE_FETCH_FAILURE
        return AuthFailureCategory.INVALID_TOKEN
    if isinstance(exc, ValueError):
        return AuthFailureCategory.CONFIGURATION_FAILURE
    return AuthFailureCategory.NETWORK_FAILURE


class FirebaseTokenVerifier:
    """Verifies Firebase ID tokens using the Admin SDK."""

    def __init__(self) -> None:
        self._app: firebase_admin.App | None = None
        self._prewarmed = False

    def _service_account_path(self) -> Path | None:
        if not settings.firebase_service_account_file:
            return None
        candidate = Path(settings.firebase_service_account_file)
        if not candidate.is_absolute():
            candidate = BACKEND_DIR / candidate
        return candidate if candidate.exists() else None

    def _credential(self) -> credentials.Base | None:
        path = self._service_account_path()
        if path is not None:
            return credentials.Certificate(str(path))
        if settings.firebase_client_email and settings.firebase_private_key:
            return credentials.Certificate(
                {
                    "project_id": settings.firebase_project_id,
                    "client_email": settings.firebase_client_email,
                    "private_key": settings.firebase_private_key,
                    "type": "service_account",
                }
            )
        return None

    def _ensure_app(self) -> firebase_admin.App:
        if self._app is None:
            try:
                self._app = firebase_admin.get_app()
            except ValueError:
                credential = self._credential()
                if credential is None:
                    raise UnauthorizedError(
                        "Authentication is not configured on this server.",
                    ) from None

                options = (
                    {"projectId": settings.firebase_project_id}
                    if settings.firebase_project_id
                    else {}
                )
                self._app = firebase_admin.initialize_app(credential, options)
                logger.info(
                    "firebase_initialised",
                    extra={"project": settings.firebase_project_id, "pid": os.getpid()},
                )

        # Warm the SDK's per-app certificate cache exactly once, off the request
        # path. Failure is never fatal and never weakens verification.
        if not self._prewarmed:
            self._prewarm_certificates()
            self._prewarmed = True

        return self._app

    def _prewarm_certificates(self) -> None:
        """Best-effort fetch of Google's signing certificates at startup.

        The Admin SDK caches these per app (CacheControl), so repeated
        verification is a cache hit; but the *first* request otherwise pays the
        full TLS + certificate fetch, and any transient failure lands on a real
        sign-in. Prefetching once moves that cost off the request path.
        """
        try:
            client = firebase_auth._get_client(self._app)
            token_verifier = client._token_verifier
            request = token_verifier.request
            cert_url = token_verifier.id_token_verifier.cert_url
            google.oauth2.id_token._fetch_certs(request, cert_url)
            logger.info("firebase_certificates_prewarmed", extra={"pid": os.getpid()})
        except Exception as exc:
            logger.warning(
                "firebase_certificate_prewarm_failed",
                extra={"error_class": type(exc).__name__, "pid": os.getpid()},
            )

    def verify(self, token: str) -> FirebaseIdentity:
        """Verify an ID token, failing closed with an operator-visible category.

        A transient certificate-fetch failure is retried a bounded number of
        times; it never causes a token to be accepted. Every failure path logs
        safe metadata (category, exception class, latency) and never the token.
        """
        self._ensure_app()

        for attempt in range(1, _MAX_VERIFY_ATTEMPTS + 1):
            started = time.perf_counter()
            try:
                claims = firebase_auth.verify_id_token(token, check_revoked=False)
            except Exception as exc:
                category = _classify_failure(exc)
                logger.warning(
                    "auth_verification_failed",
                    extra={
                        "category": category.value,
                        "error_class": type(exc).__name__,
                        "error_message": str(exc)[:200],
                        "attempt": attempt,
                        "max_attempts": _MAX_VERIFY_ATTEMPTS,
                        "latency_ms": round((time.perf_counter() - started) * 1000, 1),
                        "pid": os.getpid(),
                    },
                )
                retryable = category is AuthFailureCategory.CERTIFICATE_FETCH_FAILURE
                if retryable and attempt < _MAX_VERIFY_ATTEMPTS:
                    time.sleep(_CERT_FETCH_BACKOFF_SECONDS * attempt)
                    continue
                raise UnauthorizedError(_CLIENT_MESSAGE[category]) from exc

            if not claims.get("uid"):
                raise UnauthorizedError("Authentication token is missing a subject.")

            return FirebaseIdentity.from_claims(claims)

        # Defensive: the loop always returns or raises.
        raise UnauthorizedError(_CLIENT_MESSAGE[AuthFailureCategory.CERTIFICATE_FETCH_FAILURE])


@lru_cache(maxsize=1)
def get_firebase_verifier() -> FirebaseTokenVerifier:
    return FirebaseTokenVerifier()


def disable_firebase_user(uid: str) -> None:
    """Disable sign-in for a Firebase user (used by account deletion).

    Raises `UnauthorizedError` when the Admin SDK is not configured, so callers
    can distinguish "provider unavailable" from a successful disable.
    """
    get_firebase_verifier()._ensure_app()
    firebase_auth.update_user(uid, disabled=True)


def revoke_firebase_tokens(uid: str) -> None:
    """Invalidate a Firebase user's refresh tokens, ending active sessions."""
    get_firebase_verifier()._ensure_app()
    firebase_auth.revoke_refresh_tokens(uid)
