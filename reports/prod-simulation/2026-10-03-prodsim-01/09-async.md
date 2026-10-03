# 09 — ASYNC (REDIS / CELERY)

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f`

| Item | Evidence |
|---|---|
| Redis | up (healthy), internal only, `noeviction` + appendonly |
| Celery worker | `celery@… ready`, connected to `redis://redis:6379/0` |
| Celery beat | started; beat schedule file created (after the `/app` permission fix) |
| Task execution | `process_uploaded_media` received + succeeded (thumbnail `…png.thumb.jpg`) |
| Queue depth | 0 throughout soak/spike (workload is synchronous) |
| Schedulers | `expire-due-subscriptions` 02:30, `execute-due-account-deletions` 02:45, `purge-soft-deleted-media` 03:00, `purge-abandoned-uploads` 03:15, `purge-expired-idempotency-keys` 03:45 |
| Retry policy | `RETRY_POLICY` (bounded, backoff, jitter, max 3) → no infinite retry |
| Worker/redis restart | tolerated (see 26) |

**Verdict: PASS.** Async plumbing healthy; no queue growth or runaway retries.
