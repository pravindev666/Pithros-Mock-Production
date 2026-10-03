# 07 — INGRESS / NETWORK

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f`

Topology: `client → Caddy :80 → {/api,/health,/ready → FastAPI :8000 | everything else → SPA :80}`. Only Caddy publishes a host port for app traffic; FastAPI/Redis/Celery stay on the Docker network. Mailpit UI is published on `:8025` (LAN).

| Route | Result |
|---|---|
| `/` | 200 (SPA) |
| `/health` | 200 |
| `/ready` | 200 (`{database,redis,storage}` all true) |
| `/api/v1/health`, `/api/v1/ready` | 200 |
| `/api/v1/billing/plans` | 200 |
| unknown SPA route | 200 (client-side 404) |
| unknown API route | 404 |

- Security headers set by Caddy (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`); `-Server` stripped.
- Webhook/API path uses `flush_interval -1` (no buffering) for byte-exact webhook bodies.
- **No Cloudflare Tunnel** configured → the sim is reachable over the LAN at `http://10.153.175.57`; this is the root of the R2 CORS origin mismatch (see 06/9B).

**Verdict: PASS.** Single well-behaved ingress.
