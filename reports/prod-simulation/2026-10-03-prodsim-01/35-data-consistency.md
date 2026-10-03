# 35 — DATA CONSISTENCY / RECONCILIATION · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f` · **Date:** 2026-10-03
Method: SQL anti-joins executed inside the backend container against the Supabase test DB.

| Check | Orphans |
|---|---|
| `memorial_stewards` → memorial | **0** |
| `memorial_stewards` → user | **0** |
| `memorial_media` → memorial | **0** |
| `tributes` → memorial | **0** |
| `notifications` → user | **0** |
| `provider_services` → provider | **0** |

Dataset at check time: **34 memorials, 51 users, 71 media** — all created through real API paths.

**Findings:** **no orphan DB rows, no dangling references.** No impossible states detected on the checked relationships. **Orphan R2 objects** (objects without a DB row) were not enumerated — R2 object listing was **PENDING**, though delete → DB row removal was verified in 06.

**Verdict: PASS** for the checked relationships.
