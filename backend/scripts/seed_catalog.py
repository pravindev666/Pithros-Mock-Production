"""Seed the authoritative pricing catalog.

Idempotent and safe to run on every deploy. A fresh production database has no
plan rows until this runs, which would make `/billing/plans` empty and order
creation fail. Run after `alembic upgrade head`:

    ./.venv/Scripts/python.exe scripts/seed_catalog.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.billing.catalog import seed_pricing_catalog
from app.core.database import SessionLocal


def run() -> None:
    with SessionLocal() as db:
        result = seed_pricing_catalog(db)
    print(f"Pricing catalog seeded: {result}")


if __name__ == "__main__":
    run()
