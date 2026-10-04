# 17 — BURST LOCK-CONTENTION DEFECT: ROOT CAUSE, FIX, AND VERIFICATION

**RUN_ID:** `2026-10-04-prodsim-03` · **Date:** 2026-10-04
**Defective SHA:** `bc0d275` (observed live) · **Fixed SHA:** `aba3d47` · **VM:** `10.153.175.57`

## 1. Symptom (observed, release-critical)

Under a burst of authenticated requests the API became unresponsive: `/health` and `/ready` timed
out (`000`) while Caddy still served the SPA (`/` → 200 in 5 ms). Backend logs showed sync requests
held for **121 s and 204 s**, then:

```
psycopg.errors.QueryCanceled: canceling statement due to statement timeout
CONTEXT: while locking tuple (2,23) in relation "users"
SQL: INSERT INTO audit_logs (...)        -- FK check: SELECT 1 FROM users WHERE id=$1 FOR KEY SHARE
GET /api/v1/memorials/<id>  404  duration_ms=204606
```

## 2. Root cause (traced in code)

1. `get_optional_user` → `resolve_or_provision_user` runs on **every** authenticated request. It
   `_touch_last_seen`/`_sync_profile`s the caller and **`db.flush()`es an UPDATE on the caller's
   `users` row** (`app/auth/service.py:63`). The request's transaction is **not committed** until the
   service commits it or the session closes — so the row lock is held for the whole request.
2. On a refusal, `app/memorials/permissions.py` (and contributors) call `record_independently`, which
   opened a **second** connection (`audit/service.py`). Its `audit_logs.actor_id` FK check needs
   `FOR KEY SHARE` on the actor's `users` row.
3. That second connection therefore waited on the **caller's own uncommitted row lock**. The caller
   could not proceed until the audit returned; the audit could not proceed until the caller's
   transaction ended — so it stalled until the DB statement timeout. With **2** uvicorn workers, a few
   such requests pinned both workers and even the liveness probe could not be served.

`FOR KEY SHARE` conflicts with the `UPDATE`'s row lock, so the audit needs the row only to satisfy the
FK — the lock is **not** semantically required; it is an artefact of writing the refusal on a separate
connection while the caller's transaction is still open and holding that row.

## 3. Fix (smallest correct)

`backend/app/audit/service.py` + `backend/app/core/database.py`:

- **Defer the refusal audit inside a request.** `record_independently` now queues the row on the
  request session (`session.info["_pithros_audit_queue"]`); `get_db` writes it **after `db.close()`**
  (locks released). The caller never waits and the audit still lands.
- **Snapshot the actor at defer time** (`actor_id`/`actor_label`/`actor_role`), because the ORM
  instance is expired once the request session closes.
- **Bound the independent write**: `SET LOCAL lock_timeout = '2000ms'`; on a lock timeout it retries
  with the actor reference dropped (label kept) instead of hanging or losing the row. Audit and FK
  enforcement are untouched; nothing is disabled.

Transaction ordering: the primary business mutation still commits in the caller's transaction first;
the audit is written immediately afterwards, in its own short transaction.

## 4. Regression / concurrency tests — `backend/tests/test_audit_concurrency.py`

- `test_refusal_audit_defers_and_never_waits_on_the_request_lock`: with a request session holding the
  actor row's write lock, `record_independently` returns in **<1 s** and queues (does not wait); after
  the session closes the deferred audit is written with the actor id intact.
- `test_immediate_audit_is_bounded_when_the_actor_row_is_locked`: outside a request, a conflicting
  lock is bounded by the `lock_timeout` and falls back to dropping the actor (row still written).

Full suite: **269 passed / 1 skipped** (was 267). Ruff + format + mypy clean.

## 5. BEFORE / AFTER — repeated burst scenario

Scenario: a memorial owned by A; **40 concurrent authenticated refusals** (each request updates the
actor's stale `users` row *and* refuses → the exact path). A `pg_stat_activity` watcher sampled
`pg_blocking_pids` and ungranted `users` locks throughout.

| | BEFORE (`bc0d275`) | AFTER (`aba3d47`) |
|---|---|---|
| Lock behaviour | blocked sessions; `FOR KEY SHARE` wait on `users`; statement-timeout cancels | **worst_blocked = 0**, **worst users lock waiting = 0** (325 samples) |
| Request latency | **121 s / 204 s** single requests; stall until statement timeout | 40 refusals in **36.2 s**, max single **26.8 s**, **0 requests > 60 s** |
| `/health` | **`000` — timed out** (30 s), unresponsive | **200 throughout**, 0 failures |
| Recovery | required a backend restart | none needed |

Residual: during the 40-concurrent burst `/health` responds but is slow (≈12–20 s) because the burst
saturates the **2 uvicorn workers** (40 requests queue 20-deep on 2 workers over a remote DB). That is
the known capacity characteristic (2 vCPU + remote Supabase latency), **not** the lock defect — the
lock wait is eliminated.

## 6. Verdict

**FIXED and verified.** The refusal audit no longer contends on the caller's own `users`-row lock:
requests complete without hanging, `/health` stays up, and the DB watcher recorded zero lock waits.
The remaining burst latency is worker-count/remote-DB capacity, unaffected by this change.
