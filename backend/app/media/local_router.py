"""Development-only endpoints that stand in for S3 presigned URLs.

Mounted only when STORAGE_BACKEND=local, which production configuration refuses.
The upload path is authenticated by the HMAC token in the URL, exactly as a
presigned S3 URL is — the browser still uploads directly, never through a
business endpoint.
"""

from __future__ import annotations

from fastapi import APIRouter, Request, Response
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.enums import StorageTier
from app.core.errors import ForbiddenError, NotFoundError, ValidationError
from app.media.local_storage import LocalFilesystemStorage, verify_token
from app.media.storage import get_storage

router = APIRouter(tags=["Storage (development)"])

_CHUNK = 64 * 1024


def _local_storage() -> LocalFilesystemStorage:
    storage = get_storage()
    if not isinstance(storage, LocalFilesystemStorage):
        raise NotFoundError("Not found")
    return storage


async def _read_capped(request: Request) -> bytes:
    """Read the body in chunks so an oversized upload cannot exhaust memory."""
    limit = settings.max_upload_bytes
    buffer = bytearray()
    async for chunk in request.stream():
        buffer.extend(chunk)
        if len(buffer) > limit:
            raise ValidationError(
                f"Files must be smaller than {limit // (1024 * 1024)} MB.",
            )
    if not buffer:
        raise ValidationError("The uploaded file is empty.")
    return bytes(buffer)


@router.put("/storage/local/upload", status_code=204)
async def local_upload(token: str, request: Request) -> Response:
    tier, key = verify_token(token, expected_op="put")
    storage = _local_storage()
    data = await _read_capped(request)
    storage.write_raw(tier, key, data)
    return Response(status_code=204)


@router.get("/storage/local/fetch")
def local_fetch(token: str) -> FileResponse:
    tier, key = verify_token(token, expected_op="get")
    storage = _local_storage()
    return FileResponse(storage.resolve_existing(tier, key))


@router.get("/storage/local/file")
def local_public_file(bucket: str, key: str) -> FileResponse:
    """Unsigned, but only ever for the public bucket — the CDN equivalent."""
    if bucket != settings.r2_bucket_public:
        raise ForbiddenError("Only public objects are served without a signed link.")

    return FileResponse(_local_storage().resolve_existing(StorageTier.PUBLIC, key))
