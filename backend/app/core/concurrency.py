"""Optimistic concurrency helpers.

The real guard is `VersionMixin`'s `version_id_col`: SQLAlchemy appends
`AND version = <old>` to the UPDATE, so the check happens atomically inside the
database. What lives here is the HTTP surface — reading `If-Match` and translating
a lost race into a 409.

`If-Match` is optional. Sending it enables the check; omitting it keeps the old
last-write-wins behaviour. That is deliberate: the existing frontend and the demo
client do not send it, and making it mandatory would break them.
"""

from __future__ import annotations

import re

from starlette.requests import Request

from app.core.errors import ConflictError, ValidationError

_ETAG = re.compile(r'^"?(\d+)"?$')


def parse_if_match(request: Request) -> int | None:
    """Read the expected version from `If-Match`, or None when absent.

    Accepts a bare integer or the quoted ETag form we emit.
    """
    raw = request.headers.get("if-match")
    if raw is None or raw.strip() in {"", "*"}:
        return None

    match = _ETAG.match(raw.strip())
    if match is None:
        raise ValidationError("If-Match must be a version number.")

    return int(match.group(1))


def ensure_version(*, current: int, expected: int | None, what: str = "record") -> None:
    """Reject the write when the caller's copy is stale."""
    if expected is None:
        return
    if expected != current:
        raise ConflictError(
            f"This {what} was changed by someone else since you loaded it. "
            "Reload and reapply your changes.",
            details={"expectedVersion": expected, "currentVersion": current},
        )


def etag(version: int) -> str:
    return f'"{version}"'
