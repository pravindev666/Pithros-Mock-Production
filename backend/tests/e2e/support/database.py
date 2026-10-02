"""PostgreSQL helpers for the E2E database.

Setup and read-only inspection live here. Journeys never write business state
through this module: the only mutation is the truncation performed between tests
so every journey starts from a clean, clearly-synthetic database.
"""

from __future__ import annotations

import os
import subprocess
from pathlib import Path

import psycopg

E2E_DB_NAME = "pithros_e2e"
E2E_DATABASE_URL = f"postgresql+psycopg://pithros:pithros@localhost:5432/{E2E_DB_NAME}"
E2E_DSN = f"postgresql://pithros:pithros@localhost:5432/{E2E_DB_NAME}"
ADMIN_DSN = "postgresql://pithros:pithros@localhost:5432/postgres"


def ensure_database() -> None:
    with psycopg.connect(ADMIN_DSN, autocommit=True) as conn:
        exists = conn.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s", (E2E_DB_NAME,)
        ).fetchone()
        if not exists:
            conn.execute(f'CREATE DATABASE "{E2E_DB_NAME}"')


def run_alembic(project_root: Path) -> None:
    """Migrate the E2E database with the project's real migration chain."""
    backend_dir = project_root / "backend"
    alembic = backend_dir / ".venv" / "Scripts" / "alembic.exe"
    completed = subprocess.run(
        [str(alembic), "upgrade", "head"],
        cwd=str(backend_dir),
        env={**os.environ.copy(), "DATABASE_URL": E2E_DATABASE_URL},
        capture_output=True,
        text=True,
        timeout=180,
    )
    if completed.returncode != 0:
        raise RuntimeError(f"alembic upgrade head failed:\n{completed.stdout}\n{completed.stderr}")


def truncate_all() -> None:
    with psycopg.connect(E2E_DSN, autocommit=True) as conn:
        rows = conn.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' "
            "AND tablename <> 'alembic_version'"
        ).fetchall()
        if not rows:
            return
        tables = ", ".join(f'"{row[0]}"' for row in rows)
        conn.execute(f"TRUNCATE {tables} RESTART IDENTITY CASCADE")


def fetch_all(sql: str, params: tuple = ()) -> list[tuple]:
    with psycopg.connect(E2E_DSN) as conn:
        return conn.execute(sql, params).fetchall()


def fetch_one(sql: str, params: tuple = ()):
    rows = fetch_all(sql, params)
    return rows[0] if rows else None


def media_objects() -> list[tuple[str, str]]:
    """(bucket, key) pairs recorded in the E2E database, for storage cleanup."""
    objects: list[tuple[str, str]] = []
    rows = fetch_all(
        "SELECT storage_bucket, storage_key FROM memorial_media WHERE storage_key IS NOT NULL"
    )
    objects.extend((row[0], row[1]) for row in rows if row[0] and row[1])
    rows = fetch_all(
        "SELECT storage_bucket, thumbnail_key FROM memorial_media WHERE thumbnail_key IS NOT NULL"
    )
    objects.extend((row[0], row[1]) for row in rows if row[0] and row[1])
    return objects
