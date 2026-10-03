# 19 — PERFORMANCE PROFILING

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f`

Measured (not speculated):

- **Dominant cost = remote Supabase round-trips.** `/billing/plans` (a simple DB read) took **380–810 ms idle** and **3 055 ms** under the 200-VU spike. The app is latency-bound on network DB round-trips, not CPU-bound at low load.
- **CPU is the first local saturation point** — backend ~90 % at 200 VUs on 2 vCPU.
- **Authenticated path (`/me`) is slower** than public reads (token verification + DB provisioning lookup).
- **Media pipeline is asynchronous** — `process_uploaded_media` runs off the request path (thumbnail ~0.8–2.2 s), so uploads don't block on thumbnailing.
- **No N+1 / duplicate-call evidence collected** at the API layer this pass (would need query logging); DBMS deep profiling is **PENDING** (see 23/24).
- **Redis** stays tiny (~1.9 MB) — not a bottleneck.

**Verdict: PARTIAL.** Latency profile and first bottleneck identified from measurements; deep query/CPU flamegraph profiling **PENDING**. No optimization applied (nothing speculative).
