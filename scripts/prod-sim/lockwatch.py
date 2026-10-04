"""Sample Postgres for blocked sessions / users-row lock waits (runs in the backend image)."""

from __future__ import annotations

import time

import psycopg

from app.core.config import settings

DSN = settings.database_url.replace("postgresql+psycopg://", "postgresql://")
DEADLINE = time.time() + float(__import__("os").environ.get("LOCKWATCH_SECONDS", "180"))

worst_blocked = 0
worst_users_wait = 0
samples = 0

with psycopg.connect(DSN, autocommit=True, connect_timeout=15) as conn:
    while time.time() < DEADLINE:
        blocked = conn.execute(
            "SELECT count(*) FROM pg_stat_activity "
            "WHERE datname = current_database() AND cardinality(pg_blocking_pids(pid)) > 0"
        ).fetchone()[0]
        users_wait = conn.execute(
            "SELECT count(*) FROM pg_locks l JOIN pg_stat_activity a USING (pid) "
            "WHERE l.relation = 'users'::regclass AND NOT l.granted"
        ).fetchone()[0]
        worst_blocked = max(worst_blocked, blocked)
        worst_users_wait = max(worst_users_wait, users_wait)
        if blocked or users_wait:
            print(f"WAIT blocked={blocked} users_lock_waiting={users_wait}", flush=True)
        samples += 1
        time.sleep(0.5)

print(
    f"LOCKWATCH_DONE samples={samples} worst_blocked={worst_blocked} "
    f"worst_users_lock_waiting={worst_users_wait}",
    flush=True,
)
