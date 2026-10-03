# 27 — CAPACITY MODEL · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Tested app SHA:** `c050b2f` · **Date:** 2026-10-03
**Hardware:** 2 vCPU Intel i3-3240 @3.4 GHz · 7.8 GiB RAM · 4 GiB swap · 57 G **HDD** · Ubuntu 24.04 (KVM).
**Generator:** separate Windows host → VM figures are server-side only.

> Every number below is **conditional on the stated workload**. This is **not** a claim that Pithros
> "supports N users". Convert concurrency→users only with the assumptions in §1.

## 1. Workload assumption (measured)

Mixed read workload: **60 % anonymous public-memorial GET · 30 % authenticated `/me` · 10 % authenticated media list**;
per-iteration think time 0.5–1.5 s. Backend: FastAPI (uvicorn ×2) → **remote Supabase Postgres** + Redis + R2.

| Registered users | — | not modelled from load alone (registration is Firebase-side) |
|---|---|---|
| DAU | — | not measured (no session model) |
| **Concurrent active sessions** | peak 200 VUs | **10 → 200 measured** |

## 2. Observed results (mixed workload)

| Concurrency | Throughput | p50 | p95 | p99 | error | note |
|---|---|---|---|---|---|---|
| **40 VUs** (30 min) | 27.3 req/s | 168 ms | 959 ms | 1.4 s | **0.29 %** | **stable** |
| 100 VUs (90 s) | 31.1 req/s | 773 ms | 2.83 s | 10.0 s | **13.3 %** | degraded |
| 200 VUs (stepped/hold) | ~25–40 req/s | 0.6–2.3 s | 4.3–40 s | 43–50 s | **8–21 %** | saturated |

Resources at the 40-VU soak: load1 ~1.2–2.1 (2 vCPU), RAM 2.46 GB, swap 0, backend ~40 % CPU / 428 MB, Redis ~1.9 MB, DB connections 28 (flat).

## 3. Capacity statements (workload W above)

- **OBSERVED SAFE CAPACITY:** **~40 concurrent sessions** → ~27 req/s, p95 < 1 s, error < 0.5 %, for 30 min with no leaks.
- **OBSERVED DEGRADED CAPACITY:** **~100 concurrent** → error ~13 %, p95 ~2.8 s. Usable only if elevated latency/errors are acceptable.
- **OBSERVED SATURATION:** **~200 concurrent** → p95 32–40 s, p99 43–50 s, error 11–21 %.
- **PRIMARY BOTTLENECK:** **CPU (2 vCPU) *and* remote-DB latency** — `/billing/plans` rose 0.8 s → 3.1 s under the spike; the app is latency-bound on Supabase round-trips.
- **RECOVERY TIME:** automatic — after the 5× spike, p50 returned to 328 ms within the 60 s recovery window (no persistent degradation).
- **FAILURE POINT:** beyond ~200 concurrent the request timeout (60 s) becomes the dominant failure mode.

## 4. Per-workload coverage (honest)

| Workload | Measured? |
|---|---|
| MIXED | **Yes** (above) |
| PUBLIC-only | Partially — 60 % of the mix; **not isolated** |
| AUTHENTICATED-only | Partially — `/me` is the slow path; **not isolated** |
| MEDIA-HEAVY | **No** — upload path blocked by R2 CORS (browser); server media-list only |
| FAREWELL / ADMIN | **No** — not load-tested this pass |

## 5. NEXT SCALING ACTION (evidence-based, no speculative infra)

1. **More vCPU** (vertical) — CPU saturates first at 2 cores.
2. **Reduce per-request DB round-trips** — remote Supabase RTT is the latency floor; add caching/keep-alive/pooling tuning or move the app closer to the DB region.
3. **Horizontal app replicas** behind Caddy once CPU is addressed.
No Kubernetes/microservices are justified by this data.

**Explicitly NOT claimed:** a guaranteed user count. Public read caching and `/me` cost must be re-measured per real traffic mix.
