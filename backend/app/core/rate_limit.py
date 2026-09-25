"""Redis-backed fixed-window rate limiting.

Deliberately small: INCR + EXPIRE is enough for the public write endpoints, and a
dependency we control cannot break the app the way a third-party limiter can.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import cast

from fastapi import Request, Response
from redis.exceptions import RedisError

from app.core.config import settings
from app.core.errors import RateLimitedError
from app.core.redis import get_redis

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


def _authenticated_key(request: Request) -> str | None:
    user_id = getattr(request.state, "user_id", None)
    return f"user:{user_id}" if user_id else None


def _ip_key(request: Request) -> str | None:
    return f"ip:{client_ip(request)}"


def rate_limit(
    name: str,
    limit: int,
    window_seconds: int,
    *,
    by: KeyFn = _ip_key,
) -> Callable[[Request, Response], None]:
    def dependency(request: Request, response: Response) -> None:
        if not settings.rate_limit_enabled:
            return

        subject = by(request)
        if not subject:
            return

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
            logger.warning("rate_limit_unavailable", extra={"limiter": name})
            return

        remaining = max(0, limit - current)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)

        if current > limit:
            raise RateLimitedError(
                "Too many requests. Please try again shortly.",
                details={"retry_after_seconds": max(ttl, 0)},
            )

    return dependency


rate_limit_by_user = rate_limit
