# 23 — DBMS / QUERY ANALYSIS · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Tested app SHA:** `c050b2f` · **Date:** 2026-10-03
**Database:** dedicated Supabase test/staging Postgres, **remote** (`ap-south-1`).

## Observations

| Metric | Value | Source |
|---|---|---|
| Idle DB connections | **24** (pool) | baseline sampler |
| Max DB connections under load | **28** (flat, no leak) | soak/spike sampler |
| Trivial query latency (`/billing/plans`) | 380–810 ms idle → **3 055 ms under 200-VU spike** | sampler |
| `SELECT 1` + pool check | ~1 s cold, then sub-second | sampler |

- **Connections are bounded** — pool size 10 + overflow; observed max 28, **no connection leak** across a 30-min soak.
- **Remote-DB latency is the dominant cost** — every request pays a network round-trip to Supabase; this scales poorly under load (0.8 s → 3.1 s at the spike). This is a **capacity/latency finding**, not a schema bug.
- No 5xx caused by SQL errors were observed in the load runs.

## Not done / deferred

- `EXPLAIN (ANALYZE)` on hot queries and index-usage (`pg_stat_statements`, seq-scan review) — **not run this pass** (requires a read-only admin connection to the test DB; the app token can query but the analysis was deprioritized given time).
- **No indexes added** — per instruction, do not add indexes speculatively.

## Verdict
**Stage 7B/DBMS: PARTIAL.** Connection bounding and latency behaviour characterized; deep query-plan/index analysis is **PENDING**. No code-controlled defect identified. Remote DB latency is recorded as a **primary bottleneck** in the capacity model.
