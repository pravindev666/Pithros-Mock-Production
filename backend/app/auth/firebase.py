"""Firebase Admin initialisation and ID-token verification.

The verifier is deliberately behind a Protocol so the authorization test suite
can substitute fake claims and run without any Firebase credentials.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Protocol

import firebase_admin
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
        )


class TokenVerifier(Protocol):
    def verify(self, token: str) -> FirebaseIdentity: ...


class FirebaseTokenVerifier:
    """Verifies Firebase ID tokens using the Admin SDK."""

    def __init__(self) -> None:
        self._app: firebase_admin.App | None = None

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
        if self._app is not None:
            return self._app

        try:
            self._app = firebase_admin.get_app()
            return self._app
        except ValueError:
            pass

        credential = self._credential()
        if credential is None:
            raise UnauthorizedError(
                "Authentication is not configured on this server.",
            )

        options = (
            {"projectId": settings.firebase_project_id} if settings.firebase_project_id else {}
        )
        self._app = firebase_admin.initialize_app(credential, options)
        logger.info("firebase_initialised", extra={"project": settings.firebase_project_id})
        return self._app

    def verify(self, token: str) -> FirebaseIdentity:
        self._ensure_app()
        try:
            claims = firebase_auth.verify_id_token(token, check_revoked=False)
        except firebase_auth.ExpiredIdTokenError as exc:
            raise UnauthorizedError("Your session has expired. Please sign in again.") from exc
        except firebase_auth.RevokedIdTokenError as exc:
            raise UnauthorizedError("This session was revoked. Please sign in again.") from exc
        except firebase_auth.InvalidIdTokenError as exc:
            raise UnauthorizedError("Invalid authentication token.") from exc
        except firebase_auth.CertificateFetchError as exc:
            logger.warning("firebase_certificate_fetch_failed")
            raise UnauthorizedError("Authentication service temporarily unavailable.") from exc

        if not claims.get("uid"):
            raise UnauthorizedError("Authentication token is missing a subject.")

        return FirebaseIdentity.from_claims(claims)


@lru_cache(maxsize=1)
def get_firebase_verifier() -> FirebaseTokenVerifier:
    return FirebaseTokenVerifier()
