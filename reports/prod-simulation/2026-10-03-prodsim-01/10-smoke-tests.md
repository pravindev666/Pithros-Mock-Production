# 10 — SMOKE TESTS

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f`

Post-deploy smoke through Caddy (`scripts/prod-sim/smoke.sh`):

| Check | Result |
|---|---|
| `/`, `/health`, `/ready`, `/api/v1/health`, `/api/v1/ready`, `/api/v1/billing/plans` | **200** |
| `/ready` body | `{database:true, redis:true, storage:true}` |
| unknown API route | 404 |
| containers | all up/healthy (backend, worker, beat, redis, frontend, caddy, mailpit) |

A full browser walk (signup → verify → login → create → media → tribute → logout) was **not** driven through the UI this pass; the equivalent flows were exercised at the API layer through Caddy (see 12) with real Firebase tokens. **UI-level smoke: PARTIALLY VERIFIED.**

**Verdict: PASS (server smoke).**
