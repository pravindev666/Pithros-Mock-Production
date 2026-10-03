# 18 — CONTAINER SECURITY (Trivy) · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f` · **Date:** 2026-10-03
**Scanner:** `aquasec/trivy` (image scan, `HIGH,CRITICAL`) run on the VM against the deployed images.

## Findings — `pithros-backend:sim`

| Target | Type | Vulns | Sev |
|---|---|---|---|
| `pithros-backend:sim` (debian 13.7) | debian | **85** | 84 HIGH, **1 CRITICAL** |
| Python (`/opt/venv`) | python-pkg | **4** | 4 HIGH |
| `/app/app/auth/firebase.py` | secret | **1** | 1 CRITICAL — **FALSE POSITIVE** |

- **CRITICAL debian:** `libxml2` (CVE-2026-6653 DoS) + util-linux (bsdutils CVE-2026-76642 HIGH) etc. These are **base-image OS packages** (`python:3.14-slim`, Debian 13) — mostly `affected`/no-fix. Class: **base-image hygiene**, fix = rebuild on a patched base, not a code change.
- **Python HIGH x4:** includes `msgpack` GHSA-6v7p-g79w-8964 (fixed in 1.2.1; image has 1.1.2) → **actionable** dependency bump.
- **Secret CRITICAL — FALSE POSITIVE:** the GCP-service-account rule matched the **shape** of the credentials dict in `app/auth/firebase.py` (the D3 fix builds `{"type":"service_account","private_key":settings.firebase_private_key,...}`). **No credential value is present** — it's a template read from env. Recommended: a Trivy secret-rule exclusion / `.trivyignore`, or restructure the literal. **Not a leak.**

## Image structure (verified)

Non-root users; no DB/Redis/broker ports published; secrets injected as env from `runtime/` (600), not baked; `/app` owned by `pithros`; frontend is Caddy serving static assets.

## Frontend image
Scan was still running when this report was finalized → **PENDING**.

**Verdict: FAILED (actionable) + PARTIAL.** Base-image CVE backlog + one actionable Python dep (`msgpack`); one false-positive secret. No mass upgrades performed.
