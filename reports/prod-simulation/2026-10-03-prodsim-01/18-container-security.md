# 18 — CONTAINER SECURITY

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f`

## Static review (verified)

| Image | Base | User | Healthcheck | Ports | Notes |
|---|---|---|---|---|---|
| `pithros-backend:sim` | `python:3.14-slim` (multi-stage) | **non-root `pithros` uid 1001** | compose healthcheck on `/health` | 8000 (internal) | `pg_dump` + `tesseract-ocr` installed; **no secrets baked**; `/app` chowned to `pithros` |
| `pithros-frontend:sim` | `node:22-alpine` build → `caddy:2-alpine` | caddy (non-root) | image HEALTHCHECK | 80 (internal) | only build args (public VITE_*); `.dockerignore` present |
| `redis` | `redis:7-alpine` | redis | `redis-cli ping` | internal | `noeviction`, appendonly |
| `caddy` | `caddy:2-alpine` | caddy | — | **:80 published** | single door |
| `mailpit` | `axllent/mailpit:latest` | non-root | — | :8025 published | sim-only |

- **No container runs as root.**
- **No container publishes a database/redis/broker port.**
- Secrets live in `runtime/` (mode 600) and are injected as env — never in the image (verified: `/app` contains no `.env`).

## Not run
- **Trivy / CVE image + dependency scan — PENDING** (not executed this pass). Recommend `aquasec/trivy image pithros-backend:sim` on the VM.
- Base-image pinning beyond tags (digest pinning) — not applied.

**Verdict: PARTIAL.** Structural hardening verified; vulnerability scanning **PENDING**.
