#!/usr/bin/env sh
# Deploy the exact Pithros revision onto the simulation VM.
#
#   /opt/pithros/app/scripts/prod-sim/deploy.sh
#
# Preconditions:
#   - /opt/pithros/env/app.env exists, mode 600 (see scripts/prod-sim/env.template)
#   - <repo>/backend/secrets/firebase-service-account.json exists, mode 600
#   - the repo is checked out at the intended revision (deploy ref)
#
# Migrations are applied explicitly (the image does not run them at boot) against
# the external Supabase test/staging database. The pricing catalog seed is idempotent.
set -eu

APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${PITHROS_ENV_FILE:-$APP_DIR/runtime/app.env}"
COMPOSE="docker compose --env-file ${ENV_FILE} -f ${APP_DIR}/docker-compose.sim.yml"

echo "==> Deploying revision: $(git -C "${APP_DIR}" rev-parse HEAD 2>/dev/null || echo unknown)"

[ -f "${ENV_FILE}" ] || { echo "FATAL: missing ${ENV_FILE} (see scripts/prod-sim/env.template)"; exit 1; }
[ -f "${APP_DIR}/runtime/secrets/firebase-service-account.json" ] || { echo "FATAL: missing runtime/secrets/firebase-service-account.json"; exit 1; }

echo "==> Building images"
${COMPOSE} build

echo "==> Applying database migrations"
${COMPOSE} run --rm backend alembic upgrade head

echo "==> Seeding pricing catalog (idempotent)"
${COMPOSE} run --rm backend python scripts/seed_catalog.py

echo "==> Starting stack"
${COMPOSE} up -d

echo "==> Waiting for readiness"
i=1
while [ "$i" -le 30 ]; do
  if curl -fsS http://localhost/ready >/dev/null 2>&1; then echo "ready after ${i} checks"; break; fi
  i=$((i + 1))
  sleep 2
done

echo "==> Container status"
${COMPOSE} ps
