# 29 — FAREWELL NETWORK

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f`

Endpoints exist and are authorization-guarded: partner (`/partner/profile`, `/partner/services`, `/partner/leads`), admin (`/admin/providers/*`, `/admin/leads`), public (`/public/providers/{slug}`).

- **Anonymous** access to `/admin/leads` refused (verified in the 10/10 boundary matrix).
- **Full provider → service → family lead → partner → admin propagation journey was NOT run through the deployed stack this pass** — it requires minting partner/admin Role claims via the Firebase Admin SDK (the local harness path), which was deprioritized.
- Backend coverage for this domain is green in the repo suite (from the Titan report), but that is **not** deployed-environment evidence.

**Verdict: PARTIAL / PENDING.** Authorization boundary verified; the end-to-end marketplace journey on the VM is **PENDING**. No defect claimed either way.
