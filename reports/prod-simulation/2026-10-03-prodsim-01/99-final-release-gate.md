# 99 — FINAL RELEASE GATE (CLOSURE) · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Measured app SHA:** `c050b2f` · **Date:** 2026-10-03
**Pushed:** `46d7f43` (CI ran for real — FAILED; see 33).

## Per-domain status

| Domain | Status | Needed to close |
|---|---|---|
| Authentication | **VERIFIED** | — |
| Authorization | **VERIFIED** | — |
| Memorial | **VERIFIED** | — |
| Media / R2 | **PARTIALLY VERIFIED** | HTTPS origin (40) → browser upload proof |
| Evidence / OCR | **UNVERIFIED** | verification-chain journey on the VM |
| Contributor | **VERIFIED** | — |
| Public tribute | **VERIFIED** | — |
| Farewell | **UNVERIFIED** | provider/applicant/partner/admin browser journey (needs role claims) |
| Billing / Invoice / Receipt | **BLOCKED** | Cashfree test keys |
| Email | **PARTIALLY VERIFIED** | receipt E2E (Cashfree); invitation email is a product gap |
| Account deletion | **UNVERIFIED** | paid-user deletion UI journey |
| Cross-user security | **VERIFIED** | — |
| Mobile | **UNVERIFIED** | mobile-viewport journey |
| Database | **VERIFIED** | hot-path indexes confirmed; scale test optional |
| Concurrency | **PARTIALLY VERIFIED** | payment/invite/lead races pending (Cashfree/auth personas) |
| Redis / Celery | **VERIFIED** | — |
| Backup / restore | **VERIFIED** | full-size RTO optional |
| Rollback | **VERIFIED** | — |
| Reboot | **BLOCKED** | operator `sudo reboot` |
| CI/CD | **FAILED** | fix pytest (3.12) + gitleaks allowlist; re-run |
| Containers | **FAILED / PARTIAL** | base-image CVE backlog; `msgpack` bump; Trivy secret = false positive |
| Ingress | **VERIFIED** | — |
| Cloudflare | **BLOCKED** | tunnel (40) |
| Performance | **PARTIALLY VERIFIED** | profiling/A-B pending |
| Load / Soak / Stress | **VERIFIED** | measured, workload-conditional |
| Observability | **PARTIALLY VERIFIED** | metrics/DLQ surfaces missing |
| Cost | **UNVERIFIED** | provider price sheet + forecast |
| Maintainability | **PARTIALLY VERIFIED** | RUN_ID cleanup script pending |

## Remaining external blockers (exact)

1. **R2 HTTPS origin** — tunnel `sim.pithros.in` (40 Option A) or `tailscale serve` (Option B), then CORS origin added.
2. **Cashfree test keys** — unblocks billing/invoice/receipt/expiry/repurchase.
3. **CI log + a fix** — the pytest (Py 3.12) failure is undiagnosed without the log; gitleaks needs a scoped allowlist for the public Firebase web key.
4. **sudo** — VM reboot; firewall approval.
5. **Role-claim personas** — to run Farewell / admin / premium journeys on the VM.
6. **Product gap (not a blocker)** — invitation emails are not sent.

## FINAL VERDICT: **NOT READY** for production

Functionally correct and secure across everything exercised; capacity modest (~40 concurrent safe); browser media upload, cloudflare, billing unvalidated and CI red. Meaningful release-critical areas remain unverified/blocked → **no READY claim**.

**No untested area is reported as PASS.**
