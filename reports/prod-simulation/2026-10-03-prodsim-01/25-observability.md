# 25 — OBSERVABILITY

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f`

Can an engineer answer the key questions?

| Question | Answer? | Evidence |
|---|---|---|
| WHAT failed? | **Y** | structured JSON logs with `message`, `level`, `logger` |
| WHEN? | **Y** | ISO timestamps (UTC) |
| FOR WHOM? | **Y** | `user_id` in access logs |
| WHICH REQUEST? | **Y** | `request_id` (correlation id) on every access + auth log line |
| WHICH WORKER? | **Y** | Celery `ForkPoolWorker-N` + task id in worker logs |
| WHICH EXTERNAL SERVICE? | **Y** | `auth_verification_failed` carries `category` (`INVALID_TOKEN`, `CERTIFICATE_FETCH_FAILURE`, `NETWORK_FAILURE`, …) and **no token** |
| Health/readiness | **Y** | `/health` (liveness), `/ready` (`database/redis/storage`) |
| Metrics (rates/latency) endpoint | **N** | no `/admin/metrics` (deferred F-19) |
| Failed-task (DLQ) read surface | **N** | `TaskFailure` rows written, no UI |
| Error aggregation / Sentry | **N** | not present |

**Gaps:** no metrics endpoint, no DLQ UI, no error aggregator. Logs are safe (no secrets/tokens printed).

**Verdict: PARTIAL** — logs/health/request-id/worker-correlation are good; metrics/DLQ surfaces missing (known, deferred).
