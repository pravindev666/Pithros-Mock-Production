"""Shared Redis connection pool."""

from __future__ import annotations

from functools import lru_cache

import redis

from app.core.config import settings


@lru_cache(maxsize=1)
def get_redis() -> redis.Redis:
    """Shared Redis client.

    Timeouts matter more than they look: this client backs rate limiting, which
    runs on the request path. Without a socket timeout a hung Redis would hold
    requests open indefinitely rather than failing fast and failing open.
    """
    return redis.Redis.from_url(
        settings.redis_url,
        decode_responses=True,
        socket_timeout=5,
        socket_connect_timeout=5,
        retry_on_timeout=True,
        health_check_interval=30,
    )


def redis_healthy() -> bool:
    try:
        return bool(get_redis().ping())
    except Exception:
        return False
