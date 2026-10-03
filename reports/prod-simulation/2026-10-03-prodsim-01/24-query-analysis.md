# 24 — QUERY ANALYSIS (EXPLAIN) · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f` · **Date:** 2026-10-03
Method: `EXPLAIN (ANALYZE, BUFFERS)` executed inside the backend container against the Supabase test DB.

| Query | Plan | Time |
|---|---|---|
| memorial by slug | **Index Scan** `ix_memorials_slug` | 0.69 ms |
| media by memorial | **Index Scan** `ix_memorial_media_memorial_id` | 0.99 ms |
| user by email | **Index Scan** `ix_users_email` | 1.10 ms |
| notifications by user | **Index Scan** `ix_notifications_user_created` | 1.78 ms |
| tributes by memorial | **Index Scan** `ix_tributes_memorial_status` | 0.61 ms |
| plans catalog | Seq Scan (3 rows — trivial) | 0.02 ms |

**Findings:** every hot path is **index-backed**; **no sequential scans on real queries**, **no N+1 / unbounded query evidence**, joins are absent or index-driven. The one Seq Scan is a 3-row catalog table (correct).

- **No indexes added** (per instruction: not speculatively). No missing useful index identified on the hot paths.
- Note: these are single-row/limited lookups on a small synthetic dataset (34 memorials / 51 users / 71 media). **Scale behaviour under large tables was not tested.**

**Verdict: PASS for hot paths** (index usage confirmed). Deep `pg_stat_statements` slow-query ranking **PENDING**.
