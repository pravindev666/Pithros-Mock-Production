# 15 — ROLLBACK (DRILL) · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f` · **Date:** 2026-10-03

## Drill executed — **PASS**

| Step | Result |
|---|---|
| 1. Known-good state | `/health` 200, `/ready` 200 |
| 2. Controlled bad config applied (`CORS_ORIGINS=*`, violates production boot guard) | applied |
| 3. **Detected** | `/health` → **502**; backend health `starting` (guard refuses boot) |
| 4. Rollback (restore `app.env` + recreate) | — |
| 5. **Recovered** | `/health` 200, `/ready` 200; backend/beat/redis/worker/caddy/frontend/mailpit all up |

- No destructive database migration was used; the schema was untouched.
- The mechanism (exact-SHA git bundle + `deploy.sh` + smoke) is the same one used for the forward deploys this session.

## Verdict
**Stage 8 rollback: PASS.** Detection and recovery verified end-to-end with a non-destructive bad config.
