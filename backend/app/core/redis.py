"""Shared Redis connection pool."""

from __future__ import annotations

from functools import lru_cache

import redis

from app.core.config import settings


@lru_cache(maxsize=1)
def get_redis() -> redis.Redis:
    return redis.Redis.from_url(settings.redis_url, decode_responses=True)


def redis_healthy() -> bool:
    try:
        return bool(get_redis().ping())
    except Exception:
        return False
