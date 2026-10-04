# 35 — R2 ⇄ DB RECONCILIATION · OBSERVABILITY · FAILURE DRILLS

**RUN_ID:** `2026-10-04-prodsim-02` · **Deployed SHA:** `bc0d275` · **Date:** 2026-10-04
**Method:** `scripts/prod-sim/recon.py` run **inside the backend container** on the VM with the deployed
`runtime/app.env` (read-only: DB counts + R2 `list_objects_v2` in both directions + the `task_failures`
dead-letter table). R2 listing succeeded (`list_errors: {}`), so both directions are real.

## 1. Entity counts (dedicated Supabase **test** DB)

| Entity | Count |
|---|---|
| users | 60 |
| memorials | 46 |
| memorial_media (total) | 58 (1 soft-deleted) |
| — active by bucket | public 48 · private 7 · sensitive 2 |

## 2. Reconciliation (both directions)

| Bucket | DB object keys | R2 objects | DB→R2 missing | R2→DB orphans |
|---|---|---|---|---|
| pithros-public | 48 | 48 | 0 | 0 |
| pithros-sensitive | 2 | 2 | 0 | 0 |
| pithros-private | 9 | 12 | **3** | **6** |

- **DB → R2 (missing objects = 3):** three `memorials/<id>/photo/<hash>.png` rows exist with a
  `pithros-private` key but no stored object. These are **abandoned/incomplete uploads** (the row is
  created before the presigned PUT; a PUT that never completed leaves the row). Class: **cleanup
  candidate** — reaped by the existing `purge-abandoned-uploads` beat task (03:00).
- **R2 → DB (orphans = 6):** five `*.thumb.jpg` thumbnails and one `.png` with no matching non-deleted
  row. These are **expected retention artefacts** — deleting media soft-deletes the row (and the object
  is deliberately retained per the media retention policy), so the object/thumbnail outlives the row.
  Class: **expected**, not a defect.
- **public + sensitive tiers reconcile perfectly (0 discrepancies).**

No lost-update, no missing public asset, no cross-tenant leakage.

## 3. Observability — can an operator answer what/when/which/queried?

| Signal | Present | Evidence |
|---|---|---|
| Liveness / readiness | YES | `/health` 200; `/ready` `{database,redis,storage: true}` |
| Structured request logs + request id | YES | `core/logging.py`, observed in container logs |
| **Dead-letter read surface** | **YES** | `task_failures` readable: **1** row — `app.workers.tasks.media_tasks.process_uploaded_media`, last at `2026-10-03 21:52:14Z` |
| Worker queue/state | YES | `celery@… ready.`, connected to `redis://redis:6379/0` |
| Metrics endpoint / error aggregator | NO | still the known gap (F-19) — `/admin/metrics` not built |

The DLQ is **inspectable** (the historical "nobody can read the DLQ" gap is closed for diagnosis): the
one recorded failure is a real `process_uploaded_media` failure that was captured rather than swallowed.

## 4. Failure drill — worker/beat restart (recovery)

```
before : worker Up ~1h · beat Up ~1h
action : docker restart pithros-sim-worker-1 pithros-sim-beat-1
after  : worker Up 14s · beat Up 12s
worker log: Connected to redis://redis:6379/0 → mingle: all alone → celery@… ready.
/ready : {database:true, redis:true, storage:true}
```

**Result: PASS** — the worker and scheduler recover automatically after a restart, reconnect to Redis,
re-register their tasks, and the app stays ready. No duplicate-effect or lost-queue evidence.

**Not run this session (carried):** R2-timeout / OCR-failure / SMTP-outage injection and the
"failure visible + bounded retry + no duplicate business result" matrix per task type.

## 5. Verdict

**PASS with caveats.** Reconciliation is clean for public/sensitive and explains the private
discrepancies (abandoned uploads = cleanup candidates; retained thumbnails = expected). The DLQ has a
working read surface with one genuine recorded failure. Worker/scheduler restart recovery is proven.
Remaining: proactive metrics/aggregator and the deeper per-task failure-injection matrix.

---

## 6. Live finding — backend unresponsiveness under burst (observed & recovered)

**Severity: P2 (availability under burst).** After the anonymous + cross-user + signup journeys were
run repeatedly in quick succession, the app became unresponsive: through Caddy, `/health`/`/ready`
timed out (`000`, 30 s) while the SPA (`/`) still answered `200` in 5 ms. The backend log showed sync
requests blocking for **121 s and 204 s**:

```
psycopg.errors.QueryCanceled: canceling statement due to statement timeout
CONTEXT: while locking tuple (2,23) in relation "users"
SQL: INSERT INTO audit_logs (...)   -- FK check does SELECT 1 FROM users ... FOR KEY SHARE
GET /api/v1/memorials/<id>  404  duration_ms=204606
```

**Root cause.** `audit_logs` inserts run an FK check that takes a `KEY SHARE` row lock on `users`; under
bursty concurrent authenticated requests the lock wait exceeded and each sync request held a uvicorn
worker for minutes. With only **2** uvicorn workers, both were pinned, so the liveness probe itself
could not be served. This amplifies the already-known bottleneck (2 vCPU + remote Supabase
round-trip latency).

**Recovery (verified).** A DB probe right after showed **no** lingering `pg_blocking_pids` and no `users`
lock holders (the contention had cleared). `docker restart pithros-sim-backend-1` → `/health` `200`
(0.58 s), `/ready` `{database,redis,storage:true}`. **The VM is left healthy.**

**Impact / recommendation.** Not a correctness defect and not reproduced under normal pacing — but under
a burst the sync workers can be exhausted with no app-level short timeout on the lock wait. Recommend
(a) a short statement/lock timeout on request-path writes and (b) more uvicorn workers (or async DB) if
burst tolerance matters. Recorded, not fixed (needs your call; out of scope for this pass).
