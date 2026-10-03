#!/usr/bin/env sh
# Restore a Pithros custom-format pg_dump into $DATABASE_URL.
#
#   DATABASE_URL=postgresql+psycopg://... scripts/restore.sh /path/to/pithros-<stamp>.dump
#
# DESTRUCTIVE: --clean drops and recreates objects in the target database.
# NEVER point this at production Supabase. Use a disposable database only
# (see docker-compose.sim.yml `pg-drill` profile or a dedicated test DB).
set -eu

DUMP="${1:?usage: restore.sh <backup.dump>}"
: "${DATABASE_URL:?DATABASE_URL is required}"

# pg_restore does not understand the SQLAlchemy driver suffix.
PGURL=$(printf '%s' "$DATABASE_URL" | sed 's|+psycopg||')

echo "==> Restoring ${DUMP}"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$PGURL" "$DUMP"
echo "==> Restore complete"
