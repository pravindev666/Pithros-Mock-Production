"""Read-only reconciliation + observability probe (runs inside the backend image).

Compares the DB media rows against the R2 buckets in both directions and reports
the dead-letter table (task_failures) and basic entity counts. Reads only; never
mutates business state. Prints counts, buckets and object keys only — no secrets.

Run inside the backend container with the deployed env file:

    docker run --rm --env-file runtime/app.env \
        -v /home/pravin/recon.py:/recon.py pithros-backend:sim python /recon.py
"""

from __future__ import annotations

import json

import boto3
import psycopg

from app.core.config import settings


def main() -> None:
    dsn = settings.database_url.replace("postgresql+psycopg://", "postgresql://")
    out: dict = {"list_errors": {}}

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM memorial_media")
        out["media_total"] = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM memorial_media WHERE deleted_at IS NOT NULL")
        out["media_soft_deleted"] = cur.fetchone()[0]
        cur.execute(
            "SELECT storage_bucket, count(*) FROM memorial_media "
            "WHERE deleted_at IS NULL GROUP BY 1 ORDER BY 1"
        )
        out["media_active_by_bucket"] = [list(r) for r in cur.fetchall()]
        cur.execute(
            "SELECT storage_bucket, storage_key, thumbnail_key FROM memorial_media "
            "WHERE deleted_at IS NULL"
        )
        rows = cur.fetchall()
        cur.execute("SELECT count(*) FROM users")
        out["users"] = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM memorials")
        out["memorials"] = cur.fetchone()[0]
        cur.execute(
            "SELECT task_name, count(*), max(created_at)::text FROM task_failures "
            "GROUP BY 1 ORDER BY 2 DESC LIMIT 20"
        )
        out["task_failures"] = [list(r) for r in cur.fetchall()]

    db_keys: set[tuple[str, str]] = set()
    for bucket, key, thumb in rows:
        if bucket and key:
            db_keys.add((bucket, key))
        if bucket and thumb:
            db_keys.add((bucket, thumb))
    out["db_objects"] = len(db_keys)

    s3 = boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name=settings.r2_region,
    )
    r2: dict[str, set[str] | None] = {}
    for name in (settings.r2_bucket_public, settings.r2_bucket_private, settings.r2_bucket_sensitive):
        try:
            keys: set[str] = set()
            for page in s3.get_paginator("list_objects_v2").paginate(Bucket=name):
                for obj in page.get("Contents", []):
                    keys.add(obj["Key"])
            r2[name] = keys
        except Exception as exc:  # noqa: BLE001
            r2[name] = None
            out["list_errors"][name] = f"{type(exc).__name__}: {str(exc)[:160]}"

    out["r2_object_counts"] = {b: (len(k) if k is not None else None) for b, k in r2.items()}

    missing = [(b, k) for (b, k) in db_keys if r2.get(b) is not None and k not in r2[b]]
    orphans = [
        (b, k)
        for b, keys in r2.items()
        if keys is not None
        for k in keys
        if (b, k) not in db_keys
    ]
    out["db_rows_without_object"] = len(missing)
    out["sample_missing"] = [list(x) for x in missing[:10]]
    out["r2_objects_without_row"] = len(orphans)
    out["sample_orphans"] = [list(x) for x in orphans[:10]]

    print(json.dumps(out, indent=2, default=str))


if __name__ == "__main__":
    main()
