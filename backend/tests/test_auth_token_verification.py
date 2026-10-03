"""Firebase token verification: failure categories, fail-closed behaviour, bounded retry.

These exercise the real `FirebaseTokenVerifier` with the Admin SDK call replaced by
a test double, so they prove the mapping and resilience without Firebase or network.
No path here ever accepts a token it cannot verify.
"""

from __future__ import annotations

import pytest
from firebase_admin import auth as fb_auth

from app.auth import firebase as auth_firebase
from app.auth.firebase import (
    AuthFailureCategory,
    FirebaseTokenVerifier,
    _classify_failure,
)
from app.core.errors import UnauthorizedError


@pytest.fixture
def verifier(monkeypatch):
    instance = FirebaseTokenVerifier()
    # Bypass real Firebase init/prewarm; we are testing the verify() logic.
    monkeypatch.setattr(instance, "_ensure_app", lambda: None)
    monkeypatch.setattr(auth_firebase.time, "sleep", lambda *_: None)
    return instance


def _claims(uid: str = "uid-1", **extra):
    return {"uid": uid, "sub": uid, "email": "a@example.com", "email_verified": True, **extra}


def test_valid_token_returns_identity(verifier, monkeypatch):
    monkeypatch.setattr(fb_auth, "verify_id_token", lambda *a, **k: _claims())
    assert verifier.verify("token").uid == "uid-1"


def test_invalid_token_fails_closed(verifier, monkeypatch):
    def boom(*a, **k):
        raise fb_auth.InvalidIdTokenError("Token has wrong audience")

    monkeypatch.setattr(fb_auth, "verify_id_token", boom)
    with pytest.raises(UnauthorizedError, match=r"Invalid authentication token\."):
        verifier.verify("super-secret-token")


def test_expired_token_fails_closed(verifier, monkeypatch):
    def boom(*a, **k):
        raise fb_auth.ExpiredIdTokenError("Token expired", None)

    monkeypatch.setattr(fb_auth, "verify_id_token", boom)
    with pytest.raises(UnauthorizedError, match="expired"):
        verifier.verify("token")


def test_revoked_token_fails_closed(verifier, monkeypatch):
    def boom(*a, **k):
        raise fb_auth.RevokedIdTokenError("revoked")

    monkeypatch.setattr(fb_auth, "verify_id_token", boom)
    with pytest.raises(UnauthorizedError, match="revoked"):
        verifier.verify("token")


def test_missing_subject_fails_closed(verifier, monkeypatch):
    monkeypatch.setattr(fb_auth, "verify_id_token", lambda *a, **k: {"email": "x@y.z"})
    with pytest.raises(UnauthorizedError, match="missing a subject"):
        verifier.verify("token")


def test_transient_certificate_failure_is_retried_then_succeeds(verifier, monkeypatch):
    calls = {"n": 0}

    def flaky(*a, **k):
        calls["n"] += 1
        if calls["n"] < 3:
            raise fb_auth.CertificateFetchError("temporary", None)
        return _claims()

    monkeypatch.setattr(fb_auth, "verify_id_token", flaky)

    assert verifier.verify("token").uid == "uid-1"
    assert calls["n"] == 3


def test_persistent_certificate_failure_stays_closed(verifier, monkeypatch):
    calls = {"n": 0}

    def boom(*a, **k):
        calls["n"] += 1
        raise fb_auth.CertificateFetchError("temporary", None)

    monkeypatch.setattr(fb_auth, "verify_id_token", boom)

    with pytest.raises(UnauthorizedError, match="temporarily unavailable"):
        verifier.verify("token")
    assert calls["n"] == auth_firebase._MAX_VERIFY_ATTEMPTS


def test_a_non_retryable_failure_does_not_retry(verifier, monkeypatch):
    calls = {"n": 0}

    def boom(*a, **k):
        calls["n"] += 1
        raise fb_auth.InvalidIdTokenError("bad")

    monkeypatch.setattr(fb_auth, "verify_id_token", boom)

    with pytest.raises(UnauthorizedError):
        verifier.verify("token")
    assert calls["n"] == 1


def test_failure_is_logged_with_a_safe_category_and_no_token(verifier, monkeypatch, caplog):
    def boom(*a, **k):
        raise fb_auth.InvalidIdTokenError("bad")

    monkeypatch.setattr(fb_auth, "verify_id_token", boom)

    with caplog.at_level("WARNING"), pytest.raises(UnauthorizedError):
        verifier.verify("super-secret-token")

    entries = [r for r in caplog.records if r.message == "auth_verification_failed"]
    assert entries
    assert getattr(entries[0], "category", None) == AuthFailureCategory.INVALID_TOKEN.value
    assert "super-secret-token" not in caplog.text


def test_classify_maps_sdk_exceptions_to_categories():
    assert (
        _classify_failure(fb_auth.CertificateFetchError("x", None))
        is AuthFailureCategory.CERTIFICATE_FETCH_FAILURE
    )
    assert (
        _classify_failure(fb_auth.ExpiredIdTokenError("x", None))
        is AuthFailureCategory.EXPIRED_TOKEN
    )
    assert _classify_failure(fb_auth.RevokedIdTokenError("x")) is AuthFailureCategory.REVOKED_TOKEN
    assert (
        _classify_failure(fb_auth.InvalidIdTokenError("aud")) is AuthFailureCategory.INVALID_TOKEN
    )
    assert (
        _classify_failure(ValueError("no project id")) is AuthFailureCategory.CONFIGURATION_FAILURE
    )


def test_env_var_credentials_build_a_complete_service_account(monkeypatch):
    """Regression: the client-email/private-key path previously built an incomplete
    service-account dict and failed with 'missing fields token_uri'."""
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()

    monkeypatch.setattr(auth_firebase.settings, "firebase_service_account_file", "")
    monkeypatch.setattr(
        auth_firebase.settings, "firebase_client_email", "svc@pithros-dev.iam.gserviceaccount.com"
    )
    monkeypatch.setattr(auth_firebase.settings, "firebase_private_key", pem)

    credential = FirebaseTokenVerifier()._credential()
    assert credential is not None


def test_env_var_credentials_absent_yield_none(monkeypatch):
    monkeypatch.setattr(auth_firebase.settings, "firebase_service_account_file", "")
    monkeypatch.setattr(auth_firebase.settings, "firebase_client_email", "")
    monkeypatch.setattr(auth_firebase.settings, "firebase_private_key", "")
    assert FirebaseTokenVerifier()._credential() is None
