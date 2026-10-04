"""Force the burst actors' last_seen stale so the next request updates the row (runs in backend image)."""

from __future__ import annotations

import psycopg

from app.core.config import settings

DSN = settings.database_url.replace("postgresql+psycopg://", "postgresql://")
with psycopg.connect(DSN, autocommit=True, connect_timeout=15) as conn:
    count = conn.execute(
        "UPDATE users SET last_seen_at = now() - interval '2 hours' "
        "WHERE email LIKE 'pithros.%burst%'"
    ).rowcount
    print(f"stale_set={count}")
