# 20 — LOAD / CAPACITY · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f` · **Date:** 2026-10-03
**Generator host:** this Windows machine (separate from the VM) → VM metrics reflect **server load only**.
**Target:** `http://10.153.175.57` through Caddy. k6 v2.3.0 (scoop). Raw: `load-results.json`, `capacity-results.json`, `resource-samples.csv`.

**Workload assumption (must be quoted with every number):**
Mixed — 60 % anonymous public-memorial GET, 30 % authenticated `/me`, 10 % authenticated media list;
per-iteration think time 0.5–2.0 s. A separate profile also included 20 % public search (rate-limited).

---

## 1. Results

| Run | VUs | req/s | median | p90 | p95 | p99 | max | error rate |
|---|---|---|---|---|---|---|---|---|
| Stepped 10→25→50→100→200 | 200 max | **24.9** | 497 ms | 2 620 ms | **4 271 ms** | 11 763 ms | 60 s | **8.0 %** |
| Constant | 100 | **31.1** | 773 ms | 2 139 ms | **2 826 ms** | 10 013 ms | 60 s | **13.3 %** |

- Stepped run: 8 115 requests, 8 109 iterations. `http_req_failed` 8.0 % (threshold 5 % breached → k6 exit 99).
- Constant-100: 4 086 requests. `http_req_failed` 13.3 %.
- The stepped run also carried 20 % public-search traffic; the per-IP limiter (60/min) returned **429** on most of those — tagged expected, so the 8 % is **genuine** 5xx/timeout failures, not rate-limiting.
- `max 60 s` = k6 request timeout under saturation (requests queued past timeout).

## 2. VM resources during load (`resource-samples.csv`)

| Metric | Idle | During load |
|---|---|---|
| load1 (2 vCPU) | ~0.3 | **max 5.16** (≈2.6 × oversubscribed) |
| RAM used | ~1.3 GB | **max 2.58 GB** of 7.75 GB |
| swap used | 0 | **0** |
| backend CPU | idle | **peak 176 %** (≈1.76 cores) |
| backend RSS | — | ~423 MB |
| worker RSS | — | ~393 MB |
| redis / caddy RSS | — | ~4 MB / ~29 MB |

## 3. Capacity model (observed, NOT guaranteed)

> Under workload **W** above, on a **2 vCPU Intel i3-3240 / 7.8 GiB / HDD** VM, the stack sustained
> **~25–31 req/s** with **p95 2.8–4.3 s**, and the error rate rose to **8–13 % at 100–200 concurrent VUs**.

- **First bottleneck:** **CPU** (2 vCPU; load1 ~5; backend 1.8 cores). RAM, swap and DB were **not** limiting in these profiles.
- **Degradation begins:** by ~100 concurrent (error >5 %, p95 >2.8 s). The exact knee between 50 and 100 VUs is **not isolated** this pass (see Limitations).
- **Saturation:** ~100+ concurrent → p99 ~10 s, 60 s timeouts.
- **Next scaling action:** more vCPU first (vertical), then app replicas behind Caddy (horizontal); and reduce per-request CPU on the authenticated path (`/me` steady-state was already ~0.7–1.0 s median here).

## 4. Limitations (honest)

- **Per-step isolation not captured** — the summary export is aggregate, so the 50-vs-100 knee is not pinned. A targeted per-step run is needed for an exact safe-concurrency figure.
- **Soak (30–60 min) and spike (5×) were NOT run this pass** → **PENDING**, not claimed.
- No `sysstat` on the host (blocked on sudo) → sampling used `/proc` + `docker stats` at 4 s resolution.
- Search 429s are the rate limiter working, not a defect.

## 5. Verdict

**Stage 6 (load + capacity): PASS with limitations.** Capacity figures captured with workload assumptions and measured evidence; **first bottleneck = CPU**. **Soak & spike: PENDING.** No code defect surfaced by load; deployed SHA unchanged (`c050b2f`).
