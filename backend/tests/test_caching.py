"""Test Redis caching and invalidation for public memorial reads (B7).

Ensures:
1. Public read returns X-Cache: MISS on first access and X-Cache: HIT subsequently.
2. Any mutation (details, privacy, timeline, legacy, tributes, offerings) invalidates cache.
3. Fail-open resilience: Redis connectivity issues degrade gracefully to database reads.
4. Privacy boundaries: authenticated stewards bypass anonymous cache, private/draft memorials
   are never cached.
"""

from __future__ import annotations

from unittest.mock import patch

import redis

from app.core.enums import OfferingType, PrivacyLevel, PublicationState, TributeStatus
from app.memorials.cache import (
    get_cached_public_memorial,
    invalidate_public_memorial_cache,
)


def test_public_memorial_cache_miss_then_hit(client, make_user, make_memorial):
    owner = make_user(name="Owner")
    memorial = make_memorial(
        steward=owner,
        privacy=PrivacyLevel.PUBLIC.value,
        publication_state=PublicationState.PUBLISHED.value,
    )
    invalidate_public_memorial_cache(memorial.slug)

    # First request: cache MISS
    r1 = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r1.status_code == 200
    assert r1.headers.get("X-Cache") == "MISS"
    data1 = r1.json()
    assert data1["slug"] == memorial.slug

    # Second request: cache HIT
    r2 = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r2.status_code == 200
    assert r2.headers.get("X-Cache") == "HIT"
    assert r2.json() == data1


def test_cache_invalidation_on_memorial_update(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(
        steward=owner,
        privacy=PrivacyLevel.PUBLIC.value,
        publication_state=PublicationState.PUBLISHED.value,
    )
    headers = auth(owner)
    invalidate_public_memorial_cache(memorial.slug)

    # Populate cache
    r1 = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r1.headers.get("X-Cache") == "MISS"
    r2 = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r2.headers.get("X-Cache") == "HIT"

    # Update memorial details
    up = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"shortEpitaph": "An updated epitaph for remembrance."},
        headers=headers,
    )
    assert up.status_code == 200

    # Next request must be a MISS and reflect the updated epitaph
    r3 = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r3.status_code == 200
    assert r3.headers.get("X-Cache") == "MISS"
    assert r3.json()["shortEpitaph"] == "An updated epitaph for remembrance."

    # Next request is HIT again
    r4 = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r4.headers.get("X-Cache") == "HIT"


def test_cache_invalidation_on_privacy_change(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(
        steward=owner,
        privacy=PrivacyLevel.PUBLIC.value,
        publication_state=PublicationState.PUBLISHED.value,
    )
    headers = auth(owner)
    invalidate_public_memorial_cache(memorial.slug)

    # Populate cache
    r1 = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r1.status_code == 200
    r2 = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r2.headers.get("X-Cache") == "HIT"

    # Steward changes privacy to private
    up = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"privacy": PrivacyLevel.PRIVATE.value},
        headers=headers,
    )
    assert up.status_code == 200

    # Cached representation was evicted; anonymous request gets 404
    r_after = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r_after.status_code == 404
    assert get_cached_public_memorial(memorial.slug) is None


def test_cache_invalidation_on_timeline_event(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(
        steward=owner,
        privacy=PrivacyLevel.PUBLIC.value,
        publication_state=PublicationState.PUBLISHED.value,
    )
    headers = auth(owner)
    invalidate_public_memorial_cache(memorial.slug)

    # Populate cache
    client.get(f"/api/v1/public/memorials/{memorial.slug}")
    r_hit = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r_hit.headers.get("X-Cache") == "HIT"
    assert len(r_hit.json()["timeline"]) == 0

    # Add timeline event
    tl = client.post(
        f"/api/v1/memorials/{memorial.id}/timeline",
        json={"year": "1985", "title": "Milestone Achievement", "description": "Founded charity."},
        headers=headers,
    )
    assert tl.status_code == 201

    # Cache invalidated
    r_after = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r_after.status_code == 200
    assert r_after.headers.get("X-Cache") == "MISS"
    assert len(r_after.json()["timeline"]) == 1
    assert r_after.json()["timeline"][0]["title"] == "Milestone Achievement"


def test_cache_invalidation_on_legacy_link(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(
        steward=owner,
        privacy=PrivacyLevel.PUBLIC.value,
        publication_state=PublicationState.PUBLISHED.value,
    )
    headers = auth(owner)
    invalidate_public_memorial_cache(memorial.slug)

    # Populate cache
    client.get(f"/api/v1/public/memorials/{memorial.slug}")
    r_hit = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r_hit.headers.get("X-Cache") == "HIT"
    assert len(r_hit.json()["legacyLinks"]) == 0

    # Add legacy link
    link = client.post(
        f"/api/v1/memorials/{memorial.id}/legacy-links",
        json={
            "platform": "website",
            "label": "Open Source Contributions",
            "url": "https://github.com/remembered-dev",
        },
        headers=headers,
    )
    assert link.status_code == 201

    # Cache invalidated
    r_after = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r_after.status_code == 200
    assert r_after.headers.get("X-Cache") == "MISS"
    assert len(r_after.json()["legacyLinks"]) == 1
    assert r_after.json()["legacyLinks"][0]["platform"] == "website"


def test_cache_invalidation_on_tribute_moderation(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(
        steward=owner,
        privacy=PrivacyLevel.PUBLIC.value,
        publication_state=PublicationState.PUBLISHED.value,
    )
    headers = auth(owner)
    invalidate_public_memorial_cache(memorial.slug)

    # Anonymous user submits tribute (pending moderation)
    sub = client.post(
        f"/api/v1/public/memorials/{memorial.slug}/tributes",
        json={"authorName": "Alice", "message": "In loving memory."},
    )
    assert sub.status_code == 201
    tribute_id = sub.json()["id"]

    # Populate cache - pending tribute is not visible publicly
    r1 = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r1.status_code == 200
    assert len(r1.json()["tributes"]) == 0
    r_hit = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r_hit.headers.get("X-Cache") == "HIT"

    # Steward approves tribute
    mod = client.patch(
        f"/api/v1/memorials/{memorial.id}/tributes/{tribute_id}",
        json={"status": TributeStatus.APPROVED.value},
        headers=headers,
    )
    assert mod.status_code == 200

    # Cache invalidated, approved tribute is now visible
    r_after = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r_after.status_code == 200
    assert r_after.headers.get("X-Cache") == "MISS"
    assert len(r_after.json()["tributes"]) == 1
    assert r_after.json()["tributes"][0]["authorName"] == "Alice"


def test_cache_invalidation_on_offering(client, make_user, make_memorial):
    owner = make_user(name="Owner")
    memorial = make_memorial(
        steward=owner,
        privacy=PrivacyLevel.PUBLIC.value,
        publication_state=PublicationState.PUBLISHED.value,
    )
    invalidate_public_memorial_cache(memorial.slug)

    # Populate cache
    client.get(f"/api/v1/public/memorials/{memorial.slug}")
    r_hit = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r_hit.headers.get("X-Cache") == "HIT"
    assert len(r_hit.json()["offerings"]) == 0

    # Submit offering
    off = client.post(
        f"/api/v1/public/memorials/{memorial.slug}/offerings",
        json={
            "type": OfferingType.LIGHT.value,
            "senderName": "Grace",
            "message": "Lighting a candle.",
        },
    )
    assert off.status_code == 201

    # Cache invalidated, offering is present
    r_after = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r_after.status_code == 200
    assert r_after.headers.get("X-Cache") == "MISS"
    assert len(r_after.json()["offerings"]) == 1
    assert r_after.json()["offerings"][0]["type"] == OfferingType.LIGHT.value


def test_cache_fail_open_on_redis_error(client, make_user, make_memorial):
    owner = make_user(name="Owner")
    memorial = make_memorial(
        steward=owner,
        privacy=PrivacyLevel.PUBLIC.value,
        publication_state=PublicationState.PUBLISHED.value,
    )
    invalidate_public_memorial_cache(memorial.slug)

    # Simulate Redis connection failure
    with patch("app.memorials.cache.get_redis") as mock_redis:
        mock_client = mock_redis.return_value
        mock_client.get.side_effect = redis.ConnectionError("Redis connection refused")
        mock_client.setex.side_effect = redis.ConnectionError("Redis connection refused")

        # Request succeeds despite Redis outage, falling back to db
        res = client.get(f"/api/v1/public/memorials/{memorial.slug}")
        assert res.status_code == 200
        assert res.headers.get("X-Cache") == "MISS"
        assert res.json()["slug"] == memorial.slug


def test_authenticated_steward_bypasses_cache(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(
        steward=owner,
        privacy=PrivacyLevel.PUBLIC.value,
        publication_state=PublicationState.PUBLISHED.value,
    )
    headers = auth(owner)
    invalidate_public_memorial_cache(memorial.slug)

    # Anonymous populates cache
    client.get(f"/api/v1/public/memorials/{memorial.slug}")
    r_anon = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert r_anon.headers.get("X-Cache") == "HIT"

    # Authenticated steward request bypasses cache
    r_steward = client.get(f"/api/v1/public/memorials/{memorial.slug}", headers=headers)
    assert r_steward.status_code == 200
    assert r_steward.headers.get("X-Cache") == "MISS"


def test_private_and_draft_memorials_never_cached(client, make_user, make_memorial):
    owner = make_user(name="Owner")
    private_mem = make_memorial(
        steward=owner,
        privacy=PrivacyLevel.PRIVATE.value,
        publication_state=PublicationState.PUBLISHED.value,
    )
    draft_mem = make_memorial(
        steward=owner,
        privacy=PrivacyLevel.PUBLIC.value,
        publication_state=PublicationState.DRAFT.value,
    )

    # Anonymous gets 404
    r1 = client.get(f"/api/v1/public/memorials/{private_mem.slug}")
    assert r1.status_code == 404
    assert get_cached_public_memorial(private_mem.slug) is None

    r2 = client.get(f"/api/v1/public/memorials/{draft_mem.slug}")
    assert r2.status_code == 404
    assert get_cached_public_memorial(draft_mem.slug) is None


def test_cache_invalidation_on_slug_change(client, make_user, make_memorial, auth, db_session):
    """A rename must never leave a stale page behind — at either address.

    Public slugs are permanent links, and the write API refuses to change one
    (asserted below). The service keeps a rename branch for administrative moves
    regardless: when a slug does change, both the old and the new cache keys must
    be evicted so neither address can serve a stale representation.
    """
    from unittest.mock import MagicMock

    from app.memorials import service as memorial_service
    from app.memorials.permissions import resolve_access

    owner = make_user(name="Owner")
    memorial = make_memorial(
        steward=owner,
        privacy=PrivacyLevel.PUBLIC.value,
        publication_state=PublicationState.PUBLISHED.value,
    )
    headers = auth(owner)
    old_slug = memorial.slug
    new_slug = f"{old_slug}-moved"
    invalidate_public_memorial_cache(old_slug)

    # Populate the cache at the old address.
    assert client.get(f"/api/v1/public/memorials/{old_slug}").headers.get("X-Cache") == "MISS"
    assert client.get(f"/api/v1/public/memorials/{old_slug}").headers.get("X-Cache") == "HIT"

    # The public write API refuses to rename: permanence is enforced by the schema.
    refusal = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"slug": new_slug},
        headers=headers,
    )
    assert refusal.status_code == 422

    # Simulate the administrative rename branch. Only a service-side move can
    # change a slug; when it happens, both addresses must be evicted.
    payload = MagicMock()
    payload.model_dump.return_value = {"slug": new_slug}
    payload.story = None

    access = resolve_access(db_session, memorial, owner)
    memorial_service.update_memorial(db_session, memorial=memorial, access=access, payload=payload)

    assert get_cached_public_memorial(old_slug) is None
    assert get_cached_public_memorial(new_slug) is None

    # The old address is gone; the new address serves fresh content from the database.
    assert client.get(f"/api/v1/public/memorials/{old_slug}").status_code == 404
    fresh = client.get(f"/api/v1/public/memorials/{new_slug}")
    assert fresh.status_code == 200
    assert fresh.headers.get("X-Cache") == "MISS"
