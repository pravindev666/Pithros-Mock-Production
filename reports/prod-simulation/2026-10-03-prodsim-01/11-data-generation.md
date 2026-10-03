# 11 — DATA GENERATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f`

Synthetic data created **through the real API** (real Firebase accounts, real Supabase rows), not injected:

| Source | What | Scope |
|---|---|---|
| Firebase REST signup | personas (drivers, viewers, intruders) | `@gmail.com` synthetic addresses, `RUN_ID`-tagged |
| `POST /memorials` | memorials (private → published) | tagged "Journey/K6/Stage7 Subject" |
| media pipeline | real R2 objects + DB rows | `memorials/<uuid>/photo/<uuid>.png` |
| tribute flow | pending → approved | — |
| contributor flow | invite → accept | — |
| load generator | K6 personas + published memorials | per-run |

**Cleanup:** synthetic rows are identifiable by their slugs/names/emails. A `RUN_ID`-scoped cleanup script was **not** completed this pass → **PENDING** (the mission requires RUN_ID-keyed cleanup before final teardown).

**Verdict: PARTIAL** — generation via real paths; formalized cleanup **PENDING**.
