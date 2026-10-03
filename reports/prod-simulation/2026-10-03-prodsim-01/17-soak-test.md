# 17 — SOAK TEST · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Tested app SHA:** `c050b2f` · **Date:** 2026-10-03
**Generator:** this Windows host (off-box). **Workload:** 40 VUs constant, 30 min, mixed reads
(60 % public memorial, 30 % `/me`, 10 % media list), think time 0.5–1.5 s.
Raw: `soak-resource-samples.csv`, `soak-results.json`.

---

## 1. Headline (full 30 min, 50 299 requests)

| Metric | Value |
|---|---|
| Throughput | **27.3 req/s** |
| Median | 168 ms |
| p90 | 823 ms |
| p95 | 959 ms |
| p99 | 1 382 ms |
| Max | 60 s (isolated timeouts) |
| **Error rate** | **0.29 %** |

## 2. Start / Middle / End drift

| Segment | p50 | p95 | p99 | error |
|---|---|---|---|---|
| START | 209 ms | 983 ms | 1 260 ms | 0.16 % |
| MIDDLE | 147 ms | 926 ms | 1 281 ms | 0.21 % |
| END | 144 ms | 962 ms | **8 041 ms** | **0.50 %** |

| Resource (seg avg / max) | START | MIDDLE | END |
|---|---|---|---|
| load1 (2 vCPU) | 1.20 / 2.53 | 2.11 / 3.95 | 1.49 / 2.62 |
| RAM used max | 2.46 GB | 2.46 GB | 2.46 GB |
| swap | 0 | 0 | 0 |
| backend CPU avg | 40 % | 41 % | 37 % |
| backend RSS max | 422 MB | 428 MB | 428 MB |
| Redis used | ~1.9 MB | ~1.9 MB | ~1.9 MB |
| DB connections max | 28 | 28 | 28 |
| `/billing/plans` avg | 426 ms | 380 ms | **779 ms** |

## 3. Stability verdict

- **No memory leak** — RAM flat (2.46 GB), backend RSS 422→428 MB (≈1.4 %).
- **No swap pressure**, **no Redis growth**, **no DB-connection leak** (flat at 28).
- **CPU stable** (~40 %), load1 well within capacity at 40 VUs.
- **Mild END-of-run degradation:** p99 rose to ~8 s and remote-DB latency (`/billing/plans` 426→779 ms) roughly doubled. Error rate drifted 0.16 → 0.50 % (still well under 1 %).
- **Likely cause of the END drift:** remote Supabase latency variance (the app is latency-bound on remote DB round-trips, not CPU), not a local leak.

## 4. Verdict

**Stage 6B soak: PASS.** 40 VUs is **stable for 30 min** with no leaks; a mild late-stage p99/DB-latency rise is noted as a **capacity limitation to watch**, not a clean-production claim.
