# 28 — COST MODEL

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f`

**Measured inputs** (from load/soak, workload W in 27): ~27 req/s sustained; ~83 % DB-touching; media objects ~KB–MB; emails per transaction only.

| Driver | Basis | Note |
|---|---|---|
| Compute (VM) | 2 vCPU / 7.8 GiB dedicated | fixed; saturates at ~200 concurrent |
| Supabase Postgres | connection count + query volume | remote latency is the bottleneck; pool 10–28 conns |
| R2 storage | object count × size × months | $/GB-month |
| R2 egress / Class A/B ops | retrieve + PUT counts | presigned direct-to-R2 (no app egress) |
| Redis | internal container, negligible | in-VM |
| Celery | in-VM worker | no managed queue cost |
| Email | per receipt (SMTP provider) | **not exercised (Cashfree BLOCKED)** |
| OCR/AI | Tesseract in-container (CPU) | no external AI cost in the deployed image |
| Monitoring | none | no paid observability |
| Backup | nightly `pg_dump` → R2 | small |

**Cost drivers by scale:** media volume (R2 storage/ops) and request volume (DB round-trips + compute) dominate; observability/email are minor at this scale.

**Verdict: INDICATIVE only.** No external-dollar figures are asserted (per policy, no invented values). A real cost model needs the provider price sheet + a measured traffic forecast.
