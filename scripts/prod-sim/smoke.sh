#!/usr/bin/env sh
# Quick post-deploy smoke, exercised through Caddy (the single LAN door).
#
#   PITHROS_BASE_URL=http://10.153.175.57 scripts/prod-sim/smoke.sh
set -eu

BASE="${PITHROS_BASE_URL:-http://localhost}"

probe() {
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "${BASE}$1" || echo "000")
  printf '%-28s -> %s\n' "$1" "$code"
}

echo "Smoke through ${BASE}"
probe /
probe /health
probe /ready
probe /api/v1/health
probe /api/v1/ready
probe /api/v1/billing/plans
probe /api/v1/this-route-does-not-exist
