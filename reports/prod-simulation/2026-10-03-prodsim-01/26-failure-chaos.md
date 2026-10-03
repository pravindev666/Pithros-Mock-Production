# 26 — FAILURE / CHAOS · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Tested app SHA:** `c050b2f` · **Date:** 2026-10-03
Method: one container restarted at a time; `/health` and `/ready` probed through Caddy before/during/after.

| Failure | Detection | Impact | Recovery |
|---|---|---|---|
| **backend** restart | `/health`,`/ready` → **502** | short outage | **10 s** to 200 |
| **redis** restart | `/ready` stayed **200** | none observed (backend tolerates brief Redis loss — rate-limit/cache fail-open) | **1 s** |
| **worker** restart | `/ready` stayed 200 | none (no background jobs in flight) | **1 s** |
| **caddy** restart | connection refused (**000**) | ingress outage | **2 s** to 200 |

- **Data integrity:** no corruption observed; the app reconnected to Supabase automatically after each restart.
- **Redis `noeviction` + appendonly** means a restart preserves data; backend designed to fail-open on cache/rate-limit.
- **Mailpit:** not taken down as a separate fault this pass (receipt flow is Cashfree-gated → BLOCKED).
- **R2 interruption:** not induced (would require network manipulation; browser path already BLOCKED on CORS).

## Not executed (honest)
- **VM reboot** — requires `sudo reboot`; sudo is not available non-interactively → **BLOCKED** (see 16).
- R2/Mailpit dependency-outage injection — **PENDING**.

## Verdict
**Stage 8 chaos: PARTIAL PASS.** Container-level failures are detected and recover automatically in seconds. Reboot + dependency-outage injection deferred/blocked.
