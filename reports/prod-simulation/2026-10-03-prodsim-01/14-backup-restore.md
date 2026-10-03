# 14 — BACKUP / RESTORE · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Tested app SHA:** `c050b2f` · **Date:** 2026-10-03
**Target:** a **disposable local Postgres** (`pg-drill` profile) — never the app database or production.

## Drill result

| Step | Result |
|---|---|
| Seed disposable DB with representative rows | 2 rows created |
| `pg_dump -Fc` (custom format) | **356 ms**, 2 783 bytes |
| Destroy disposable DB + recreate | done |
| `pg_restore --clean --if-exists` | **285 ms** |
| **Verify representative records survived** | **`2 rows -> record-A,record-B`** |

- **RPO:** ≤ backup interval (nightly `backup.sh`; ad-hoc here).
- **RTO (data):** restore ≈ **0.3 s** for a tiny dataset (not representative of full-size restore — size-dependent).
- The production `backend/scripts/backup.sh` (custom-format `pg_dump` + optional R2 upload) and the new `backend/scripts/restore.sh` were used as the procedure.

## Caveats
- Full-size restore timing was **not** measured (only a tiny dataset); the real RTO must be measured against a production-sized snapshot on a disposable DB.
- The drill used a **local disposable** database, per policy — the remote Supabase test DB was not destroyed.

## Verdict
**Stage 8 backup/restore: PASS** (mechanics proven end-to-end; records survived). Full-scale RTO **PENDING**.
