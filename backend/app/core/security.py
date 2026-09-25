"""Cryptographic helpers: token minting, hashing, and signature verification."""

from __future__ import annotations

import hashlib
import hmac
import secrets

TOKEN_BYTES = 32


def generate_token(nbytes: int = TOKEN_BYTES) -> str:
    """URL-safe, unguessable token for invitations and signed URLs."""
    return secrets.token_urlsafe(nbytes)


def hash_token(token: str) -> str:
    """Store only the hash of a bearer token, never the token itself."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def constant_time_equals(left: str, right: str) -> bool:
    return hmac.compare_digest(left.encode("utf-8"), right.encode("utf-8"))


def verify_hmac_sha256(*, payload: bytes, signature: str, secret: str) -> bool:
    """Verify an HMAC-SHA256 signature, e.g. a Razorpay or Cashfree webhook."""
    if not secret or not signature:
        return False
    expected = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return constant_time_equals(expected, signature.strip())


def mask_ip(ip: str) -> str:
    """Keep audit logs useful without storing a full address."""
    if not ip:
        return ""
    if ":" in ip:
        parts = ip.split(":")
        return ":".join(parts[:3]) + "::***"
    parts = ip.split(".")
    if len(parts) == 4:
        return ".".join(parts[:2]) + ".***.***"
    return "***"
