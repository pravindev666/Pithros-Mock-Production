# 38 — FINAL FINDINGS

**RUN_ID:** `2026-10-03-prodsim-01` · **Tested app SHA:** `c050b2f`

## Code-controlled defects (fixed this campaign)

| ID | Sev | Defect | Fix | Commit |
|----|-----|--------|-----|--------|
| D1 | P1 | Celery beat crash-loop — `/app` root-owned, non-root user couldn't write `celerybeat-schedule` | `chown pithros:pithros /app` | `c34ef29` |
| D2 | P1 | Mailpit exited 1 — SMTP auth enabled over non-TLS | removed `MP_SMTP_AUTH_ACCEPT_ANY` | `c34ef29` |
| D3 | P1 | Firebase env-var credential path built an incomplete service account (`missing fields token_uri`) → "Authentication is not configured" | full service-account field set + regression test | `c050b2f` |

## Findings (not code defects)

| ID | Class | Sev | Description |
|----|-------|-----|-------------|
| F1 | **External** | P1 | **R2 CORS origin mismatch** — browser media upload blocked (`http://10.153.175.57` not in bucket origins). Not changed; owner action. |
| F2 | **External** | P1 | **Cashfree credentials unavailable** — billing/receipt E2E BLOCKED. |
| F3 | **Product gap** | P2 | **Invitations are never emailed** (`send_email` used only by receipts). Steward must share the returned link. |
| F4 | **Capacity** | P1 | **CPU + remote-DB latency** saturate at ~100–200 concurrent; 8–21 % errors, p99 10–43 s. Not a clean production pass. |
| F5 | **Ops** | P2 | No `sysstat`/metrics/DLQ surface; host firewall unset (awaiting approval). |
| F6 | **Observability** | P3 | No metrics endpoint / error aggregator. |

## Deferred / PENDING (no claim)

Mobile journey · CI run (needs push) · Trivy scan · DB query-plan analysis · farewell E2E · full reconciliation · RUN_ID cleanup · VM reboot · rollback drill · R2/Mailpit outage injection.
