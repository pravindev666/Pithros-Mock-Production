"""Object storage behind a small port.

R2 and MinIO both speak S3, so a single boto3-backed adapter serves local
development and production. Swapping one for the other is an env-var change.

Three logical tiers map to three buckets. Private and sensitive objects are only
ever reachable through short-lived signed URLs; sensitive ones additionally get an
audit record on every access.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Protocol

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings
from app.core.enums import StorageTier
from app.core.errors import StorageError


@dataclass(frozen=True)
class StoredObject:
    key: str
    size: int
    content_type: str | None
    etag: str | None


class ObjectStorage(Protocol):
    def bucket_for(self, tier: StorageTier) -> str: ...

    def presigned_put_url(
        self, *, tier: StorageTier, key: str, content_type: str, expires_in: int | None = None
    ) -> str: ...

    def presigned_get_url(
        self, *, tier: StorageTier, key: str, expires_in: int | None = None
    ) -> str: ...

    def public_url(self, *, key: str) -> str | None: ...

    def head(self, *, tier: StorageTier, key: str) -> StoredObject: ...

    def get_bytes(self, *, tier: StorageTier, key: str, max_bytes: int = 1024 * 1024) -> bytes: ...

    def put_bytes(self, *, tier: StorageTier, key: str, data: bytes, content_type: str) -> None: ...

    def delete(self, *, tier: StorageTier, key: str) -> None: ...


def _build_s3_client() -> Any:
    """One client configuration, used by both the adapter and the readiness probe.

    `storage_is_reachable` previously built its own client with no Config at all,
    so the retry and timeout settings applied everywhere except the check whose
    job is to notice when storage is unhealthy.
    """
    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name=settings.r2_region,
        config=BotoConfig(
            signature_version="s3v4",
            # Bound both phases: a connect that never completes and a read that
            # stalls are different failures and both need a ceiling.
            connect_timeout=5,
            read_timeout=30,
            retries={"max_attempts": 3, "mode": "standard"},
            s3={"addressing_style": "path" if "localhost" in settings.r2_endpoint_url else "auto"},
        ),
    )


class S3ObjectStorage:
    def __init__(self) -> None:
        self._client = _build_s3_client()

    def bucket_for(self, tier: StorageTier) -> str:
        return {
            StorageTier.PUBLIC: settings.r2_bucket_public,
            StorageTier.PRIVATE: settings.r2_bucket_private,
            StorageTier.SENSITIVE: settings.r2_bucket_sensitive,
        }[tier]

    def _expiry(self, expires_in: int | None) -> int:
        return expires_in or settings.r2_presign_expiry_seconds

    def presigned_put_url(
        self, *, tier: StorageTier, key: str, content_type: str, expires_in: int | None = None
    ) -> str:
        try:
            return self._client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.bucket_for(tier),
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=self._expiry(expires_in),
            )
        except (BotoCoreError, ClientError) as exc:
            raise StorageError("Could not prepare an upload URL.") from exc

    def presigned_get_url(
        self, *, tier: StorageTier, key: str, expires_in: int | None = None
    ) -> str:
        try:
            return self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_for(tier), "Key": key},
                ExpiresIn=self._expiry(expires_in),
            )
        except (BotoCoreError, ClientError) as exc:
            raise StorageError("Could not prepare a download URL.") from exc

    def public_url(self, *, key: str) -> str | None:
        base = settings.r2_public_base_url.rstrip("/")
        if not base:
            return None
        return f"{base}/{settings.r2_bucket_public}/{key.lstrip('/')}"

    def head(self, *, tier: StorageTier, key: str) -> StoredObject:
        try:
            response = self._client.head_object(Bucket=self.bucket_for(tier), Key=key)
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code in {"404", "NoSuchKey", "NotFound"}:
                raise StorageError("The upload could not be found in storage.") from exc
            raise StorageError("Storage is unavailable.") from exc
        except BotoCoreError as exc:
            raise StorageError("Storage is unavailable.") from exc

        return StoredObject(
            key=key,
            size=int(response.get("ContentLength", 0)),
            content_type=response.get("ContentType"),
            etag=str(response.get("ETag", "")).strip('"') or None,
        )

    def get_bytes(self, *, tier: StorageTier, key: str, max_bytes: int = 1024 * 1024) -> bytes:
        try:
            response = self._client.get_object(
                Bucket=self.bucket_for(tier),
                Key=key,
                Range=f"bytes=0-{max_bytes - 1}",
            )
            return response["Body"].read(max_bytes)
        except (BotoCoreError, ClientError) as exc:
            raise StorageError("Could not read the uploaded file.") from exc

    def put_bytes(self, *, tier: StorageTier, key: str, data: bytes, content_type: str) -> None:
        try:
            self._client.put_object(
                Bucket=self.bucket_for(tier),
                Key=key,
                Body=data,
                ContentType=content_type,
            )
        except (BotoCoreError, ClientError) as exc:
            raise StorageError("Could not write to storage.") from exc

    def delete(self, *, tier: StorageTier, key: str) -> None:
        try:
            self._client.delete_object(Bucket=self.bucket_for(tier), Key=key)
        except (BotoCoreError, ClientError) as exc:
            raise StorageError("Could not remove the file from storage.") from exc


def build_media_key(*, memorial_id: uuid.UUID, kind: str, extension: str) -> str:
    """Keys are generated, never taken from the client filename.

    A client-supplied name could contain traversal sequences or collide with an
    existing object; a random key sidesteps both.
    """
    suffix = extension.lower().lstrip(".")
    return f"memorials/{memorial_id}/{kind}/{uuid.uuid4().hex}.{suffix}"


def build_provider_media_key(*, provider_id: uuid.UUID, kind: str, extension: str) -> str:
    """Provider gallery objects live under their own prefix, same random-key rule."""
    suffix = extension.lower().lstrip(".")
    return f"providers/{provider_id}/{kind}/{uuid.uuid4().hex}.{suffix}"


def extension_of(filename: str) -> str:
    return Path(filename).suffix.lower().lstrip(".")


@lru_cache(maxsize=1)
def get_storage() -> ObjectStorage:
    if settings.storage_backend == "local":
        # Deferred import: local_storage depends on this module for StoredObject.
        from app.media.local_storage import LocalFilesystemStorage

        return LocalFilesystemStorage()
    return S3ObjectStorage()


def storage_is_reachable() -> bool:
    if not settings.has_storage_credentials:
        return False
    if settings.storage_backend == "local":
        return True
    try:
        _build_s3_client().head_bucket(Bucket=settings.r2_bucket_private)
        return True
    except Exception:
        return False
