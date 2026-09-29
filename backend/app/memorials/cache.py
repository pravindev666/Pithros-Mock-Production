"""Redis caching for public memorial reads and proactive invalidation (B7).

Public memorial views are heavily read-biased. Caching the serialized public
projection in Redis avoids expensive multi-table joins (story, timeline, media,
offerings, legacy links) on every hit, while ensuring zero stale data through
immediate invalidation upon any mutating operation.

Fails open: Redis downtime or connectivity timeouts log an alert and fall back to
PostgreSQL rather than dropping user traffic.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from app.core.redis import get_redis

logger = logging.getLogger(__name__)

CACHE_PREFIX = "pithros:memorial:public:"
DEFAULT_CACHE_TTL_SECONDS = 3600  # 1 hour


def _make_key(slug: str) -> str:
    return f"{CACHE_PREFIX}{slug.strip().lower()}"


def get_cached_public_memorial(slug: str) -> dict[str, Any] | None:
    """Retrieve the cached public memorial representation, if present."""
    key = _make_key(slug)
    try:
        raw = get_redis().get(key)
        if raw is None:
            return None
        text = raw.decode("utf-8") if isinstance(raw, bytes) else str(raw)
        result = json.loads(text)
        if isinstance(result, dict):
            return result
        return None
    except Exception as exc:
        logger.warning(
            "public_memorial_cache_get_failed",
            extra={"slug": slug, "error": str(exc)},
        )
        return None


def set_cached_public_memorial(
    slug: str,
    data: dict[str, Any],
    ttl_seconds: int = DEFAULT_CACHE_TTL_SECONDS,
) -> None:
    """Store the public memorial representation in Redis with TTL."""
    key = _make_key(slug)
    try:
        serialized = json.dumps(data)
        get_redis().setex(key, ttl_seconds, serialized)
    except Exception as exc:
        logger.warning(
            "public_memorial_cache_set_failed",
            extra={"slug": slug, "error": str(exc)},
        )


def invalidate_public_memorial_cache(slug: str | None) -> None:
    """Evict a memorial from the public read cache."""
    if not slug:
        return
    key = _make_key(slug)
    try:
        get_redis().delete(key)
    except Exception as exc:
        logger.warning(
            "public_memorial_cache_invalidation_failed",
            extra={"slug": slug, "error": str(exc)},
        )
