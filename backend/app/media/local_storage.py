"""Local-filesystem storage adapter.

A development stand-in for S3 that requires no extra service. URLs are
HMAC-signed with an expiry, so the *security property* exercised locally matches
presigned S3 URLs: short-lived and unforgeable.

Refused in production by both `get_storage` and the production config guard.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import time
from pathlib import Path
from urllib.parse import quote

from app.core.config import BACKEND_DIR, settings
from app.core.enums import StorageTier
from app.core.errors import NotFoundError, StorageError, UnauthorizedError
from app.media.storage import StoredObject

BUCKETS: dict[StorageTier, str] = {
    StorageTier.PUBLIC: "pithros-public",
    StorageTier.PRIVATE: "pithros-private",
    StorageTier.SENSITIVE: "pithros-sensitive",
}


def _digest(payload: str) -> str:
    return hmac.new(
        settings.local_storage_secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def sign_token(op: str, tier: str, key: str, expires_at: int) -> str:
    payload = f"{op}:{tier}:{key}:{expires_at}"
    raw = f"{payload}:{_digest(payload)}"
    return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("ascii").rstrip("=")


def verify_token(token: str, *, expected_op: str) -> tuple[StorageTier, str]:
    """Decode and authenticate a local storage token."""
    try:
        padded = token + "=" * (-len(token) % 4)
        decoded = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
        op, tier, key, expires_at, signature = decoded.rsplit(":", 4)
    except (ValueError, UnicodeDecodeError) as exc:
        raise UnauthorizedError("This storage link is not valid.") from exc

    if op != expected_op:
        raise UnauthorizedError("This storage link is not valid for that operation.")

    payload = f"{op}:{tier}:{key}:{expires_at}"
    if not hmac.compare_digest(_digest(payload), signature):
        raise UnauthorizedError("This storage link is not valid.")

    if int(expires_at) < int(time.time()):
        raise UnauthorizedError("This storage link has expired.")

    try:
        return StorageTier(tier), key
    except ValueError as exc:
        raise UnauthorizedError("This storage link is not valid.") from exc


class LocalFilesystemStorage:
    def __init__(self) -> None:
        if settings.is_production:
            raise StorageError("Local storage is not available in production.")
        self._root = (BACKEND_DIR / settings.local_storage_path).resolve()

    def bucket_for(self, tier: StorageTier) -> str:
        return BUCKETS[tier]

    def _path_for(self, tier: StorageTier, key: str) -> Path:
        if ".." in key or key.startswith(("/", "\\")):
            raise StorageError("Invalid storage key.")
        candidate = (self._root / self.bucket_for(tier) / key).resolve()
        if not str(candidate).startswith(str(self._root)):
            raise StorageError("Invalid storage key.")
        return candidate

    def _expiry(self, expires_in: int | None) -> int:
        return int(time.time()) + (expires_in or settings.r2_presign_expiry_seconds)

    def _url(self, *, path: str, token: str) -> str:
        base = settings.app_base_url.rstrip("/")
        return f"{base}/api/v1/storage/local/{path}?token={quote(token)}"

    def presigned_put_url(
        self, *, tier: StorageTier, key: str, content_type: str, expires_in: int | None = None
    ) -> str:
        return self._url(
            path="upload",
            token=sign_token("put", tier.value, key, self._expiry(expires_in)),
        )

    def presigned_get_url(
        self, *, tier: StorageTier, key: str, expires_in: int | None = None
    ) -> str:
        # Public objects are served directly, mirroring a CDN sitting in front of R2.
        if tier == StorageTier.PUBLIC:
            return self.public_url(key=key) or ""
        return self._url(
            path="fetch",
            token=sign_token("get", tier.value, key, self._expiry(expires_in)),
        )

    def public_url(self, *, key: str) -> str | None:
        base = settings.app_base_url.rstrip("/")
        bucket = BUCKETS[StorageTier.PUBLIC]
        return f"{base}/api/v1/storage/local/file?bucket={bucket}&key={quote(key)}"

    def head(self, *, tier: StorageTier, key: str) -> StoredObject:
        path = self._path_for(tier, key)
        if not path.is_file():
            raise StorageError("The upload could not be found in storage.")
        return StoredObject(key=key, size=path.stat().st_size, content_type=None, etag=None)

    def get_bytes(self, *, tier: StorageTier, key: str, max_bytes: int = 1024 * 1024) -> bytes:
        path = self._path_for(tier, key)
        if not path.is_file():
            raise StorageError("The uploaded file could not be read.")
        with path.open("rb") as handle:
            return handle.read(max_bytes)

    def put_bytes(self, *, tier: StorageTier, key: str, data: bytes, content_type: str) -> None:
        path = self._path_for(tier, key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def delete(self, *, tier: StorageTier, key: str) -> None:
        path = self._path_for(tier, key)
        if path.is_file():
            path.unlink()

    def resolve_existing(self, tier: StorageTier, key: str) -> Path:
        path = self._path_for(tier, key)
        if not path.is_file():
            raise NotFoundError("File not found")
        return path

    def write_raw(self, tier: StorageTier, key: str, data: bytes) -> None:
        path = self._path_for(tier, key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
