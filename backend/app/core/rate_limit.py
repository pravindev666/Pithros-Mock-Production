"""Redis-backed fixed-window rate limiting.

Deliberately small: INCR + EXPIRE is enough for the endpoints we protect, and a
dependency we control cannot break the app the way a third-party limiter can.

Two flavours:

* `rate_limit` keys on the client IP — for endpoints reachable without an account.
* `user_rate_limit` keys on the authenticated user and depends on
  `get_current_user`, so it is guaranteed to run *after* authentication. Keying on
  `request.state.user_id` instead would be order-dependent: if the limiter ran
  first it would find no user and silently apply nothing.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import cast

from fastapi import Depends, Request, Response
from redis.exceptions import RedisError

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.core.errors import RateLimitedError
from app.core.redis import get_redis
from app.users.models import User

logger = logging.getLogger(__name__)

KeyFn = Callable[[Request], str | None]


def client_ip(request: Request) -> str:
    """Resolve the caller IP, trusting only proxies we control.

    Cloudflare and Caddy both overwrite CF-Connecting-IP/X-Forwarded-For, so the
    left-most entry is the real client when deployed behind them.
    """
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _ip_key(request: Request) -> str | None:
    return f"ip:{client_ip(request)}"


def _enforce(
    *,
    name: str,
    subject: str,
    limit: int,
    window_seconds: int,
    response: Response,
) -> None:
    redis_key = f"pithros:ratelimit:{name}:{subject}"
    try:
        client = get_redis()
        # cast: redis-py's stubs cannot tell the sync client from the async one
        # at this call site, so the return type widens to `Awaitable | Any`.
        current = cast(int, client.incr(redis_key))
        if current == 1:
            client.expire(redis_key, window_seconds)
        ttl = cast(int, client.ttl(redis_key))
    except RedisError:
        # Fail open on availability grounds, but make the condition visible —
        # a silent limiter outage means the protection is not there.
        logger.warning("rate_limit_unavailable", extra={"limiter": name})
        return

    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Remaining"] = str(max(0, limit - current))

    if current > limit:
        raise RateLimitedError(
            "Too many requests. Please try again shortly.",
            details={"retry_after_seconds": max(ttl, 0)},
        )


def rate_limit(
    name: str,
    limit: int,
    window_seconds: int,
    *,
    by: KeyFn = _ip_key,
) -> Callable[[Request, Response], None]:
    """Limit by client IP. For endpoints reachable without an account."""

    def dependency(request: Request, response: Response) -> None:
        if not settings.rate_limit_enabled:
            return
        subject = by(request)
        if not subject:
            return
        _enforce(
            name=name,
            subject=subject,
            limit=limit,
            window_seconds=window_seconds,
            response=response,
        )

    return dependency


def user_rate_limit(
    name: str,
    limit: int,
    window_seconds: int,
) -> Callable[..., None]:
    """Limit by authenticated user.

    Declares `get_current_user` as a dependency rather than reading request state,
    so FastAPI resolves the caller first and the limit can never silently no-op.
    """

    def dependency(
        request: Request,
        response: Response,
        user: User = Depends(get_current_user),
    ) -> None:
        if not settings.rate_limit_enabled:
            return
        _enforce(
            name=name,
            subject=f"user:{user.id}",
            limit=limit,
            window_seconds=window_seconds,
            response=response,
        )

    return dependency
