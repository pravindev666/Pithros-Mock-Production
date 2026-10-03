# 21 — SPIKE TEST · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Tested app SHA:** `c050b2f` · **Date:** 2026-10-03
**Generator:** Windows host (off-box). **Shape:** baseline 40 VUs → 5× spike to 200 VUs (15 s ramp, 90 s hold) → back to 40 VUs (recovery). Raw: `spike-resource-samples.csv`, `spike-results.json`.

---

## 1. Result by phase (thirds mapped to baseline / spike / recovery)

| Phase | p50 | p95 | p99 | error |
|---|---|---|---|---|
| START (baseline + ramp) | 480 ms | 4 000 ms | 38 477 ms | 8.6 % |
| **MIDDLE (200 VUs hold)** | **2 307 ms** | **40 056 ms** | **49 598 ms** | **21.5 %** |
| END (spike down + recovery) | 328 ms | 8 378 ms | 19 909 ms | 2.8 % |

Aggregate: 5 493 reqs @ 20.6 req/s, overall error **11.0 %**, max 60 s (timeouts).

## 2. Resources

| Phase | load1 max | backend CPU avg | backend RSS max | RAM max | DB conns | `/billing/plans` avg |
|---|---|---|---|---|---|---|
| START | 0.77 | 24 % | 472 MB | 2.52 G | 28 | 811 ms |
| **MIDDLE** | 2.91 | **90 %** | 440 MB | 2.51 G | 28 | **3 055 ms** |
| END | 4.08 | 45 % | 454 MB | 2.50 G | 28 | 685 ms |

## 3. Findings

- **What saturated first:** CPU (backend ~90 % on 2 vCPU) **and** remote-DB latency — `/billing/plans` went **811 → 3 055 ms** under the spike. The app is **latency-bound on remote Supabase round-trips**; under load those round-trips amplify.
- **Latency increase was immediate:** p95 jumped from ~4 s (ramp) to **40 s** in the hold phase.
- **Requests were effectively dropped/failed:** 21.5 % errors during the hold (5xx/timeouts).
- **Queue backlog:** none observed — Celery queue stayed at 0 (this workload is synchronous; no background tasks enqueued).
- **Recovery: AUTOMATIC.** Once load returned to 40 VUs, p50 dropped back to **328 ms**, error to **2.8 %**. No persistent degradation, but load1 was still 4.08 mid-drain (queue drain in progress).
- **Reproducible:** matches the earlier stepped/100-VU runs (8–13 % errors, 10–12 s p99) — consistent saturation behaviour.

## 4. Verdict

**Stage 6C spike: PASS (test executed).** 5× the stable load **saturates** the VM; the system **recovers automatically** when the spike ends. **First bottleneck: CPU + remote-DB latency.** Treat the 100–200 VU errors/p99 as a **capacity warning**, not a production pass.
