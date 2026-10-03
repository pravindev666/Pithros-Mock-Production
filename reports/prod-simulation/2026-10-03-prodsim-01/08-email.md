# 08 — EMAIL · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `cb09a5a` (invitation-email fix) · **Date:** 2026-10-03

| Item | Result |
|---|---|
| Mailpit service | **UP** (SMTP 1025 internal, UI 8025 LAN) |
| App SMTP config | `EMAIL_ENABLED=true`, `SMTP_HOST=mailpit`, `SMTP_PORT=1025` |
| **SMTP transport (app → Mailpit)** | **PASS** |
| **Contributor invitation email** | **PASS — FIXED** (was a product gap) |
| **Payment receipt E2E** | **BLOCKED — Cashfree credentials unavailable** (code path intact) |

## Invitation email — fixed and verified end-to-end (11/11)

Previously the invitation was created and a shareable URL returned, but **no email was sent** (only receipts called `send_email`).

**Fix (`cb09a5a`):** `app/email/invitations.py` (branded message: recipient, memorial, inviter, Accept button/link, expiry, plain-text fallback — token only inside the link) + `app/workers/tasks/email_tasks.send_contributor_invitation_email` (Celery; token validated against the stored hash so stale/rotated/accepted/expired jobs are dropped; transient SMTP failures retried with backoff; token never logged). `contributors.service.invite` now enqueues the email **after commit** (best-effort, so broker/SMTP outage cannot fail the invite).

**Real E2E on the deployed VM:** invite → **Mailpit received the email** → token extracted from the email link → invited user accepts → steward sees the **active** contributor → persists on refresh → token cannot be reused (404). **11/11 PASS.**

Function inventory: `send_email` is now used by **receipts and invitations** (one email architecture; no second system).

## Verdict
**Email transport: PASS · Invitation email: PASS (fixed) · Receipt E2E: BLOCKED (Cashfree).**
