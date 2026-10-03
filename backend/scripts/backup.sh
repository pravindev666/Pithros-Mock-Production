#!/bin/sh
# Nightly PostgreSQL backup.
#
# Dumps the database in compressed custom format and, when R2 credentials are
# present, ships the file to object storage outside the primary host. The image
# installs postgresql-client so pg_dump is available.
#
# Usage (prod compose): docker compose -f docker-compose.prod.yml --profile backup up
# Manual:               ./scripts/backup.sh
#
# NOTE: the dump is not encrypted here. If your threat model requires encryption
# at rest, pipe it through `age`/`gpg` before upload, or enable bucket-level
# encryption on the backup destination.
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"

# SQLAlchemy URLs carry a driver suffix (postgresql+psycopg://) that pg_dump
# does not understand; strip it.
PG_URL="$(printf '%s' "${DATABASE_URL}" | sed -E 's#^postgresql\+[a-z0-9_]+://#postgresql://#')"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="/tmp/pithros-${STAMP}.dump"

echo "[backup] dumping database to ${OUT}"
pg_dump --format=custom --no-owner --no-privileges --file="${OUT}" "${PG_URL}"

if [ -n "${R2_ACCESS_KEY_ID:-}" ] && [ -n "${R2_SECRET_ACCESS_KEY:-}" ] && [ -n "${R2_ENDPOINT_URL:-}" ]; then
  echo "[backup] uploading to object storage"
  python - "${OUT}" "${STAMP}" <<'PY'
import os
import sys

import boto3

path, stamp = sys.argv[1], sys.argv[2]
bucket = os.environ.get("R2_BACKUP_BUCKET") or os.environ["R2_BUCKET_PRIVATE"]
client = boto3.client(
    "s3",
    endpoint_url=os.environ["R2_ENDPOINT_URL"],
    aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
    region_name=os.environ.get("R2_REGION", "auto"),
)
key = f"backups/postgres/pithros-{stamp}.dump"
client.upload_file(path, bucket, key)
print(f"[backup] uploaded s3://{bucket}/{key}")
PY
else
  echo "[backup] R2 credentials not set — dump left at ${OUT}; copy it off-host"
fi

echo "[backup] done"
