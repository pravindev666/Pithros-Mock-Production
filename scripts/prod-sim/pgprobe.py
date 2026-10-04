"""Read-only Postgres lock/activity probe (runs inside the backend image)."""

from __future__ import annotations

import psycopg

from app.core.config import settings

DSN = settings.database_url.replace("postgresql+psycopg://", "postgresql://")

with psycopg.connect(DSN, autocommit=True, connect_timeout=15) as conn:
    print("=== activity (non-idle) ===")
    rows = conn.execute(
        "SELECT pid, usename, state, wait_event_type, wait_event, "
        "to_char(now() - xact_start, 'HH24:MI:SS') AS xact_age, "
        "to_char(now() - query_start, 'HH24:MI:SS') AS query_age, left(query, 100) "
        "FROM pg_stat_activity "
        "WHERE datname = current_database() AND pid <> pg_backend_pid() "
        "ORDER BY xact_start NULLS LAST LIMIT 30"
    )
    for row in rows:
        print(row)

    print("=== blocked ===")
    rows = conn.execute(
        "SELECT pid, pg_blocking_pids(pid) AS blockers, state, left(query, 100) "
        "FROM pg_stat_activity WHERE cardinality(pg_blocking_pids(pid)) > 0"
    )
    for row in rows:
        print(row)

    print("=== users row 2,23 lock holders ===")
    rows = conn.execute(
        "SELECT pid, state, left(query, 100) FROM pg_locks l "
        "JOIN pg_stat_activity a USING (pid) WHERE l.relation = 'users'::regclass"
    )
    for row in rows:
        print(row)
