"""Idempotency keys for retryable writes.

A network retry must not create a second tribute, offering, memorial or upload
intent. The client sends `Idempotency-Key: <opaque>`; the server reserves the key
before doing the work and stores the response afterwards. A replay of the same key
with the same body returns the stored response instead of repeating the side
effect.

Implemented as two explicit calls inside each route rather than framework magic —
it is a few more lines, but the control flow is visible where it matters.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Index,
    Integer,
    String,
    UniqueConstraint,
    select,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column
from starlette.requests import Request

from app.core.config import settings
from app.core.database import Base, SessionLocal
from app.core.errors import ConflictError
from app.core.models import UUIDPrimaryKeyMixin, allowed_values
from app.users.models import User

_allowed = allowed_values

TTL = timedelta(hours=24)


class IdempotencyStatus(StrEnum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class IdempotencyKey(UUIDPrimaryKeyMixin, Base):
    """One row per (key, caller).

    `subject` rather than `user_id`: anonymous tribute and offering submissions
    are idempotent too, and a nullable FK in a unique constraint would let
    duplicates through, since Postgres treats NULLs as distinct.
    """

    __tablename__ = "idempotency_keys"
    __table_args__ = (
        UniqueConstraint("key", "subject", name="key_subject"),
        CheckConstraint(f"status IN ({_allowed(IdempotencyStatus)})", name="status_valid"),
        Index("ix_idempotency_keys_expires_at", "expires_at"),
    )

    key: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(128), nullable=False)
    endpoint: Mapped[str] = mapped_column(String(128), nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)

    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=IdempotencyStatus.IN_PROGRESS.value
    )
    response_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    response_body: Mapped[Any | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


@dataclass(frozen=True)
class Replay:
    """A stored response to return instead of running the handler again."""

    status_code: int
    body: Any


def subject_for(request: Request, user: User | None) -> str:
    """Identify the caller for idempotency purposes.

    Prefers the authenticated user; falls back to the client IP for anonymous
    submissions. We hash the bearer token rather than decoding it, because at this
    point the token has not been verified.
    """
    if user is not None:
        return f"user:{user.id}"

    authorization = request.headers.get("authorization")
    if authorization:
        digest = hashlib.sha256(authorization.encode("utf-8")).hexdigest()[:32]
        return f"token:{digest}"

    from app.core.rate_limit import client_ip

    digest = hashlib.sha256(client_ip(request).encode("utf-8")).hexdigest()[:32]
    return f"ip:{digest}"


def _hash_body(body: Any) -> str:
    canonical = json.dumps(body, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _header_key(request: Request) -> str | None:
    if not settings.idempotency_enabled:
        return None
    raw = request.headers.get("idempotency-key")
    return raw.strip()[:255] if raw and raw.strip() else None


def reserve(
    request: Request,
    *,
    endpoint: str,
    body: Any,
    subject: str,
) -> Replay | None:
    """Claim the key, or return the response a previous attempt already produced.

    Opens its own short session so the reservation is committed independently of
    whatever transaction the handler later uses.
    """
    key = _header_key(request)
    if key is None:
        return None

    digest = _hash_body(body)

    with SessionLocal() as db:
        existing = db.scalar(
            select(IdempotencyKey).where(
                IdempotencyKey.key == key,
                IdempotencyKey.subject == subject,
            )
        )

        if existing is not None:
            if existing.request_hash != digest:
                raise ConflictError(
                    "This Idempotency-Key was already used for a different request.",
                )
            if existing.status == IdempotencyStatus.COMPLETED.value:
                return Replay(
                    status_code=existing.response_status or 200,
                    body=existing.response_body,
                )
            raise ConflictError(
                "A request with this Idempotency-Key is already in progress. Try again shortly.",
            )

        db.add(
            IdempotencyKey(
                key=key,
                subject=subject,
                endpoint=endpoint,
                request_hash=digest,
                status=IdempotencyStatus.IN_PROGRESS.value,
                expires_at=datetime.now(UTC) + TTL,
            )
        )
        try:
            db.commit()
        except IntegrityError as exc:
            # Another request claimed the same key between our SELECT and INSERT.
            db.rollback()
            raise ConflictError(
                "A request with this Idempotency-Key is already in progress. Try again shortly.",
            ) from exc

    return None


def record(
    request: Request,
    *,
    subject: str,
    status_code: int,
    body: Any,
) -> None:
    """Attach the produced response to the reserved key.

    Called on the success path only. If the handler raises, the reservation is
    left IN_PROGRESS and expires, so a genuine failure can still be retried.
    """
    key = _header_key(request)
    if key is None:
        return

    payload = body.model_dump(mode="json", by_alias=True) if hasattr(body, "model_dump") else body

    with SessionLocal() as db:
        existing = db.scalar(
            select(IdempotencyKey).where(
                IdempotencyKey.key == key,
                IdempotencyKey.subject == subject,
            )
        )
        if existing is None:
            return
        existing.status = IdempotencyStatus.COMPLETED.value
        existing.response_status = status_code
        existing.response_body = payload
        db.commit()


def purge_expired(batch: int = 1000) -> int:
    """Sweep expired keys. Run from Celery beat."""
    with SessionLocal() as db:
        stale = list(
            db.scalars(
                select(IdempotencyKey)
                .where(IdempotencyKey.expires_at < datetime.now(UTC))
                .limit(batch)
            )
        )
        for row in stale:
            db.delete(row)
        db.commit()
        return len(stale)
