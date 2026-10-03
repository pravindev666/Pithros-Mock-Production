# 12 — AUTHENTICATED E2E JOURNEYS · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f` · **Date:** 2026-10-03
**Method:** real Firebase signups (real domains) + the real API through **Caddy** on the VM at
`http://10.153.175.57`, against the real Supabase test DB and real R2. No business-truth mutation;
DB is untouched except by the app's own write paths.

---

## 1. Journey results — **17 / 17 PASS**

| # | Journey | Result | Boundary crossed |
|---|---------|--------|------------------|
| 1 | Create memorial (authenticated) | **PASS** 201 | UI→API→Supabase write |
| 2 | Private memorial is not public | **PASS** 404 | public serializer / privacy |
| 3 | Set visibility → publish | **PASS** 200 | version-checked publication |
| 4 | Published memorial publicly readable | **PASS** 200 | anon → public endpoint |
| 5 | Anonymous tribute accepted | **PASS** 201 | public write path |
| 6 | Tribute hidden until approved | **PASS** | moderation gate |
| 7 | Steward moderation queue | **PASS** 200 | steward scope |
| 8 | Approve tribute | **PASS** 200 | moderation decision |
| 9 | Approved tribute becomes public | **PASS** | state propagation |
| 10 | Steward invites contributor | **PASS** 201 | contributor invite |
| 11 | Invitation token withheld from API | **PASS** | `EXPOSE_INVITATION_TOKENS=false` (prod-safe) |
| 12 | Steward receives shareable invite link | **PASS** | `invitationUrl` carries the token |
| 13 | Contributor accepts invite | **PASS** 200 | token acceptance |
| 14 | Contributor can view the memorial | **PASS** 200 | membership grant |
| 15 | Viewer **cannot** edit | **PASS** 403 | role-based deny |
| 16 | Anonymous refused on 10 protected endpoints | **PASS** 10/10 (401/403) | object-level authorization |
| 17 | (from 06-r2-media) media upload→delete + cross-user 404 | **PASS** | media authorization |

**Media** (06-r2-media.md): server path verified; **browser upload BLOCKED on R2 CORS** (external config).

## 2. Email

| Item | Result |
|---|---|
| SMTP transport (app → Mailpit) | **PASS** — `send_email()` returned True; Mailpit received the message (1 message, correct recipient/subject) |
| Receipt email business flow | **BLOCKED — Cashfree credentials unavailable** (not FAILED: the code path is intact; it cannot be driven without a paid order) |
| Invitation email | **NOT IMPLEMENTED — product gap (see F-EM-1)** |

### Findings

**F-EM-1 · Product · P2 — invitations are never emailed.** `app/contributors/service.py` creates the
invitation and returns `invitation_url` but never calls `send_email`; `send_email` is used **only** by
`app/email/receipts.py`. Evidence: grep of `backend/app` shows `send_email` referenced only from
`email/receipts.py`; Mailpit had **0** messages after a successful invite. The flow still *works* because
the steward receives a shareable link (`…/invite/<token>`) and can pass it on — but no email is sent.
Class: product gap, not a deployment defect.

**F-EM-2 · External · BLOCKED — payment receipt.** Requires a real paid order. Marked **BLOCKED
(credentials unavailable)**, distinct from a failure. Transport underneath the receipt path is verified.

## 3. Verdict

**Stage 4c + journeys: PASS** (17/17 journeys; SMTP transport verified).
**BLOCKED:** browser media upload (R2 CORS, external) · payment receipt E2E (Cashfree, external).
**Defects found:** 0 code-controlled this stage; 2 findings (1 product gap, 1 external block).
**Deployed SHA unchanged: `c050b2f`** (no code change required by these findings).
