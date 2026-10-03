# 08 — EMAIL

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f`

| Item | Result |
|---|---|
| Mailpit service | **UP** (SMTP 1025 internal, UI 8025 LAN) |
| App SMTP config | `EMAIL_ENABLED=true`, `SMTP_HOST=mailpit`, `SMTP_PORT=1025` |
| **SMTP transport (app → Mailpit)** | **PASS** — `send_email()` returned True; Mailpit received the message (correct recipient/subject) |
| **Payment receipt E2E** | **BLOCKED — Cashfree credentials unavailable** (code path intact; cannot be driven without a paid order) |
| **Invitation email** | **NOT IMPLEMENTED (product gap F-EM-1)** — `send_email` is referenced only by `email/receipts.py`; Mailpit had 0 messages after a successful invite. Flow still works via the returned shareable link |

## Findings
- **F-EM-1 · P2** — invitations are never emailed (only receipts are). Product gap, not a deploy defect.
- **F-EM-2 · External BLOCKED** — payment receipt requires a real paid order.

**Verdict:** transport **PASS**; receipt E2E **BLOCKED**.
