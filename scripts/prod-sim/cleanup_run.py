"""Scoped cleanup of synthetic simulation artifacts (dry-run by default).

Identifies the artifacts a run created, shows what it would remove, and requires an
explicit scope + `--apply`. It never touches non-matching data (production-safety),
and it only hard-deletes rows that are safe to remove: abandoned/incomplete uploads
(`memorial_media` rows that never reached `ready`). User/memorial rows are NOT
hard-deleted here because several FKs are `ON DELETE RESTRICT` (billing) — a hard
purge must go through the product's own account-deletion lifecycle instead.

Run inside the backend image with the deployed env file.
"""

from __future__ import annotations

import argparse
import json

import boto3
import psycopg

from app.core.config import settings


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--email-pattern", default="pithros.%@gmail.com")
    parser.add_argument("--memorial-prefix", default="VM ")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    dsn = settings.database_url.replace("postgresql+psycopg://", "postgresql://")
    report: dict = {"scope": {"email_pattern": args.email_pattern, "memorial_prefix": args.memorial_prefix}}

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute("SELECT id::text FROM users WHERE email LIKE %s", (args.email_pattern,))
        user_ids = [row[0] for row in cur.fetchall()]
        cur.execute(
            "SELECT id::text, full_name FROM memorials WHERE full_name LIKE %s "
            "OR id IN (SELECT memorial_id FROM memorial_stewards WHERE user_id = ANY(%s::uuid[]))",
            (f"{args.memorial_prefix}%", user_ids),
        )
        memorials = cur.fetchall()
        memorial_ids = [row[0] for row in memorials]

        cur.execute(
            "SELECT id::text, memorial_id::text, storage_bucket, storage_key, status "
            "FROM memorial_media WHERE memorial_id = ANY(%s::uuid[]) "
            "AND status <> 'ready' AND deleted_at IS NULL",
            (memorial_ids,),
        )
        abandoned = cur.fetchall()
        cur.execute(
            "SELECT count(*) FROM memorial_media WHERE memorial_id = ANY(%s::uuid[])",
            (memorial_ids,),
        )
        media_total = cur.fetchone()[0]

        report["synthetic_users"] = len(user_ids)
        report["synthetic_memorials"] = len(memorials)
        report["media_rows"] = media_total
        report["abandoned_media_rows"] = len(abandoned)
        report["abandoned_sample"] = [[r[3], r[4]] for r in abandoned[:10]]

        if args.apply and abandoned:
            cur.execute(
                "DELETE FROM memorial_media WHERE id = ANY(%s::uuid[])",
                ([r[0] for r in abandoned],),
            )
            conn.commit()
            report["deleted_abandoned_media_rows"] = len(abandoned)
        elif args.apply:
            report["deleted_abandoned_media_rows"] = 0

        # R2: report objects whose row is gone (expected for retained/deleted media).
        if memorial_ids and settings.r2_endpoint_url:
            s3 = boto3.client(
                "s3",
                endpoint_url=settings.r2_endpoint_url,
                aws_access_key_id=settings.r2_access_key_id,
                aws_secret_access_key=settings.r2_secret_access_key,
                region_name=settings.r2_region,
            )
            prefixes = tuple(f"memorials/{mid}/" for mid in memorial_ids)
            live = {
                (r[0], r[1])
                for r in cur.execute(
                    "SELECT storage_bucket, storage_key FROM memorial_media "
                    "WHERE memorial_id = ANY(%s::uuid[]) AND deleted_at IS NULL",
                    (memorial_ids,),
                ).fetchall()
            }
            orphans = []
            for bucket in (settings.r2_bucket_public, settings.r2_bucket_private, settings.r2_bucket_sensitive):
                try:
                    for page in s3.get_paginator("list_objects_v2").paginate(Bucket=bucket):
                        for obj in page.get("Contents", []):
                            if obj["Key"].startswith(prefixes) and (bucket, obj["Key"]) not in live:
                                orphans.append([bucket, obj["Key"]])
                except Exception as exc:  # noqa: BLE001
                    report.setdefault("list_errors", {})[bucket] = f"{type(exc).__name__}"
            report["r2_objects_for_deleted_media"] = len(orphans)

    print(json.dumps(report, indent=2, default=str))


if __name__ == "__main__":
    main()
