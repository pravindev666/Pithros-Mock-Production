# 99 — FINAL RELEASE GATE · PITHROS CLOSURE WAVE 3

**RUN_ID:** `2026-10-04-prodsim-03` · **Date:** 2026-10-04
**CI-green SHA:** `0d675ab` (origin/main) · **VM deployed:** `aba3d47` (same application code as `0d675ab`)
**Commits this wave:** `aba3d47` (lock fix), `0d675ab` (burst probe + report)

## 1. CI (GitHub Actions — authoritative)

| Run | SHA | Result |
|---|---|---|
| #3 | `3a41e4e` | **success** — Backend (Ruff lint/format, Mypy, migration drift, pytest), Frontend (tsc, check:live, build), gitleaks |
| #4 | `0d675ab` | **success** — same jobs and steps, all green |

## 2. Phase 2 — burst lock-contention defect (release-critical) — FIXED

**Root cause.** `resolve_or_provision_user` runs on every authenticated request and `db.flush()`es an
UPDATE on the caller's `users` row (last-seen/profile) without committing. A refusal then called
`record_independently`, which opened a **second** connection whose `audit_logs` FK check needs
`FOR KEY SHARE` on that same row → it waited on the caller's own uncommitted lock until the statement
timeout (121–204 s observed), pinning the 2 uvicorn workers so `/health` went unresponsive.

**Fix (`aba3d47`).** Inside a request the refusal audit is queued on the session and written by
`get_db` **after the session closes** (locks released); the actor is snapshotted at defer time; the
independent write is bounded by `SET LOCAL lock_timeout = 2000ms` and falls back to dropping the actor
reference (label kept). Audit + FK enforcement untouched.

**Regression/concurrency tests** (`tests/test_audit_concurrency.py`, 2 tests) + full suite
**269 passed / 1 skipped**.

| | BEFORE (`bc0d275`) | AFTER (`aba3d47`) |
|---|---|---|
| Lock behaviour | blocked sessions, `FOR KEY SHARE` wait on `users`, statement-timeout cancels | **worst_blocked = 0**, **worst users-lock waiting = 0** (325 samples) |
| Request latency | 121 s / 204 s single requests | 40 refusals in 36 s, max single 27 s, **0 > 60 s** |
| `/health` | **`000` timeout**, unresponsive | **200 throughout** (slow under saturation — 2 workers) |

Residual: the 40-concurrent burst saturates 2 uvicorn workers (queueing), independent of the lock fix.

## 3. Verification matrix (Wave 2 + 3 runtime evidence)

| Domain | Persona | Result | Evidence |
|---|---|---|---|
| Real signup→verify→login→logout | steward | **VERIFIED** | VM browser `journey_signup` 6/6 (clean run) |
| Anonymous boundaries | anon | **VERIFIED** | `journey_anon` 3/3 (14 private 401, 3 public 200, UI gate) |
| Cross-user isolation (UI+URL+API) | steward/intruder | **VERIFIED** | `journey_cross_user` 6/6 (clean run) |
| Responsive 360/390/412 | steward | **VERIFIED** | `journey_mobile` 18/18 |
| Evidence/OCR → human decision | steward/admin | **VERIFIED** | `journey_evidence` 5/5 |
| Burst lock behaviour | 40 actors | **VERIFIED** | `journey_burst` + `lockwatch` (0 lock waits) |
| Trivy container security | — | **VERIFIED** | `18-container-security.md` (actionably clean) |
| Redis outage + bounded retry + recovery | — | **VERIFIED** | `/ready` degraded→ready; worker logs `retry n/100` |
| Worker/beat restart recovery | — | **VERIFIED** | `celery ready`, `/ready` true |
| Reconciliation | — | **VERIFIED (caveats)** | public/sensitive clean; private = abandoned uploads + retained thumbnails |
| DLQ read surface | — | **VERIFIED** | `task_failures` readable (1 real failure recorded) |
| CI/CD | — | **VERIFIED** | runs #3, #4 success |
| Farewell Network browser E2E | provider/partner/admin | **UNVERIFIED** | not run this wave |
| Account-deletion browser E2E | steward | **UNVERIFIED** | not run this wave |
| Email failure drill (SMTP outage/retry) | — | **UNVERIFIED** | not run this wave |
| Mobile full workflows | — | **PARTIALLY VERIFIED** | viewport/overflow only, not every flow |
| Host reboot recovery | — | **BLOCKED** | needs operator `sudo reboot` |
| Firewall apply | — | **BLOCKED / REQUIRES HUMAN DECISION** | proposal ready (`2026-10-04-prodsim-02/02-firewall-investigation.md`); not applied |
| Capacity regression (40/100/200 VU) | — | **UNVERIFIED** | not re-run this wave |
| Real Cashfree transaction | — | **DEFERRED BY DECISION** | no keys; app-side lifecycle covered |

## 4. FINAL VERDICT

# **NOT READY**

Release-critical code: the burst lock-contention defect is **fixed, tested, deployed and CI-green**.
What remains is unproven workflows and operator-blocked steps — not code defects.

**Code-controlled blockers:** none outstanding.

**Blocked on external / human:**
1. Host reboot recovery — operator `sudo reboot`.
2. Firewall apply — approval + sudo (rules ready).
3. Real Cashfree transaction — deferred by decision.

**Unverified release workflows (need a further browser/ops pass):**
4. Farewell Network browser E2E (provider/family/partner/admin).
5. Account-deletion browser E2E + post-deletion policy.
6. Email failure/retry drill (SMTP outage, token edge cases).
7. Capacity regression (40/100/200 VU) with lock-wait telemetry.

**Risk:**
8. Under a 40-concurrent burst, 2 uvicorn workers saturate (bounded, no lock wait, `/health` stays up);
   raise worker count/DB pooling only if burst tolerance matters.
9. No metrics/error-aggregator endpoint (F-19); DLQ is readable but not surfaced in a UI.
