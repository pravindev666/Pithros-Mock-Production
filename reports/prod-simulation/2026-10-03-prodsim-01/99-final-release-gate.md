# 99 — FINAL RELEASE GATE (CLOSURE) · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Measured app SHA:** `cb09a5a` · **Date:** 2026-10-03

## Per-domain status

| Domain | Status | Needed to close |
|---|---|---|
| Authentication | **VERIFIED** | — |
| Authorization | **VERIFIED** | — |
| Memorial | **VERIFIED** | — |
| **Media / R2 (browser)** | **VERIFIED** | — (owner added the sim origin; Chromium upload 6/6) |
| Evidence / OCR | **UNVERIFIED** | verification-chain journey on the VM |
| Contributor | **VERIFIED** | — (invite → email → accept → active → persists, 11/11) |
| Public tribute | **VERIFIED** | — |
| Farewell | **UNVERIFIED** | provider/applicant/partner/admin journey (needs role claims) |
| Billing / Invoice / Receipt | **BLOCKED** | Cashfree test keys |
| **Email** | **VERIFIED (transport + invitation)** | receipt E2E blocked by Cashfree |
| Account deletion | **UNVERIFIED** | paid-user deletion UI journey |
| Cross-user security | **VERIFIED** | — |
| Mobile | **UNVERIFIED** | mobile-viewport journey |
| Database | **VERIFIED** | hot-path indexes confirmed |
| Concurrency | **PARTIALLY VERIFIED** | payment/invite/lead races pending |
| Redis / Celery | **VERIFIED** | — |
| Backup / restore | **VERIFIED** | full-size RTO optional |
| Rollback | **VERIFIED** | — |
| Reboot | **BLOCKED** | operator `sudo reboot` |
| CI/CD | **FAILED** | fix pytest (Py 3.12) + gitleaks allowlist; re-run |
| Containers | **FAILED / PARTIAL** | base-image CVEs; `msgpack` bump; Trivy secret = false positive |
| Ingress | **VERIFIED** | — |
| Cloudflare | **BLOCKED (not needed)** | sim proven over HTTP; tunnel optional |
| Performance | **PARTIALLY VERIFIED** | profiling/A-B pending |
| Load / Soak / Stress | **VERIFIED** | measured, workload-conditional |
| Observability | **PARTIALLY VERIFIED** | metrics/DLQ surfaces missing |
| Cost | **UNVERIFIED** | provider price sheet + forecast |
| Maintainability | **PARTIALLY VERIFIED** | RUN_ID cleanup script pending |

## Remaining external blockers (exact)

1. **Cashfree test keys** — unblocks billing/invoice/receipt/expiry/repurchase.
2. **CI logs + fixes** — the pytest (Py 3.12) failure is undiagnosed without the log; gitleaks needs a scoped allowlist for the public Firebase web key.
3. **`sudo`** — VM reboot; firewall approval.
4. **Role-claim personas** — to run Farewell / admin / premium journeys on the VM.
5. **Container CVE remediation** — base image + `msgpack`; Trivy secret false-positive suppression.

## Resolved this wave
- **R2 browser upload** — owner added `http://10.153.175.57`; real Chromium upload **PASS** (06).
- **Invitation email** — implemented + verified end-to-end (`cb09a5a`, 11/11) (08).

## FINAL VERDICT: **NOT READY** for production

Broadly functional and secure; two prior blockers (R2 browser, invitation email) are now closed. But billing is unvalidated, CI is red, container CVEs are unaddressed, and several release-critical journeys (Farewell, account deletion, mobile, Evidence/OCR) remain unverified, with capacity modest (~40 concurrent safe).

**No untested area is reported as PASS.**
