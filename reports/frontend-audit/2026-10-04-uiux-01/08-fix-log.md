# Pithros frontend audit — fix log

**Run ID:** `2026-10-04-uiux-01`  
**Rule:** one confirmed finding or tightly coupled cluster per verified commit; gates re-run before each commit.

## Verification gate (frontend)

| Gate | Result |
|---|---|
| `npm run lint` (tsc --noEmit) | PASS |
| `npm run check:live` | PASS |
| `npm run build` | PASS (main JS 1,406.53 kB / 339.73 kB gzip) |

## Fix 1 — FE-001 verification truth (+ FE-012 interactive badge semantics)

- **Files:** `components/ui/Badge.tsx`, `views/ExploreMemorialsView.tsx`, `views/PublicMemorialView.tsx`, `views/dashboard/DashboardOverviewView.tsx`
- **Change:** `status` made required; `rejected` gets an explicit danger badge; interactive badge renders a real `<button>` that keeps the existing badge visuals; the three call sites that omitted status now pass it; the registry used `mapVerificationStatus` instead of casting every non-approved result to an invalid `'unverified'`; the hero’s `Archival record verified` line now renders only for `approved`.
- **Regression evidence:** `07-verification-fix-probe.json`
  - Registry rejected memorial: `Verification Rejected`, `badgeReviewed: 0` (was `Document Reviewed`, `1`)
  - Detail rejected memorial: `Verification Rejected`, `archivalVerified: 0` (was `1`)
- **Approved path:** unchanged — `approved` still renders the sage `Document Reviewed` badge and the hero verified line.
- **Second-order check:** badge consumers in dashboard verification/overview and memorials already passed status; typing now prevents a future omission.
- **STATUS:** FIXED / VERIFIED (Chromium). Firefox/WebKit still NOT TESTED.

## Fix 2 — FE-005 / FE-006 account route guarding and fallback

- **File:** `App.tsx`
- **Change:** `/account/*` now has an explicit branch. Unknown account paths render a recovery message; signed-out users get the sign-in screen; loading shows a spinner; authenticated users get the requested account view. The previous duplicate account children were removed.
- **Regression evidence:** `09-account-route-probe.json` (360×800 and 1440×900)
  - `/account/security` signed out → sign-in form, no account-security content
  - `/account/profile` signed out → sign-in form
  - `/account/unknown` → "could not be found", main region not empty
- **STATUS:** FIXED / VERIFIED (Chromium). Server authority unchanged; this is a presentation/route-correctness fix.

## Fix 3 — FE-007 dialog accessibility (reproduced `ReportModal` + shared `Modal`)

- **Files:** `lib/useDialogA11y.ts` (new), `components/ui/Modal.tsx`, `components/ui/ReportModal.tsx`
- **Change:** one small shared hook moves focus into the dialog, traps Tab/Shift+Tab, closes on Escape, restores focus to the trigger, and locks body scroll. Both overlays now render `role="dialog"` + `aria-modal` + a labelled title, an `aria-label`led close button, `tabIndex={-1}`, and `max-h-[85vh] overflow-y-auto` for long content on mobile. Visual styling is unchanged.
- **Regression evidence:** `10-modal-a11y-probe.json`
  - Report dialog: `dialogCount: 1` (was `0`), `aria-modal: "true"`, focus inside the dialog, `bodyOverflow: "hidden"`, `focusAfterClose` restored to the trigger.
  - Rejected memorial still correct in the same run (`badgeReviewed: 0`, `archivalVerified: 0`).
- **Second-order check:** shared `Modal` consumers inherit the behavior without per-modal changes; Escape handling was consolidated into the hook (the old standalone listener was removed to avoid double-close).
- **STATUS:** FIXED / VERIFIED (Chromium). Firefox/WebKit NOT TESTED.

## Fix 4 — FE-003 / FE-011 registry filters and cards (+ FE-002 correction)

- **Files:** `views/ExploreMemorialsView.tsx`
- **Change:** the filter bar becomes a column on mobile and a wrapped row from `sm` up; the search input and both selects gained accessible names; memorial cards are now keyboard-operable (`role="button"`, `tabIndex=0`, Enter/Space handler, visible focus ring).
- **Regression evidence:**
  - `11-registry-fix-probe.json` — unlabeled controls 3 → 0
  - `14-registry-selects-probe.json` — verification select right edge 407 px → 207 px at 320/360/390; both selects side-by-side at 1440; page `scrollWidth == innerWidth` at every width
  - `15-card-keyboard-probe.json` — card exposes `role=button`, receives focus, and Enter navigates to `/m/kb-test`
- **CORRECTION — FE-002 is NOT REPRODUCIBLE.** `13-registry-prefix-scroll-probe.json` measured the pre-fix chip container and it was already `overflow-x: auto` and scrollable (client 288 / scroll 527 at 320 px; Chennai reachable at right 304 after scroll; page scrollWidth 320). The chip row was never clipped. The extra `min-w-0`/`w-full` is defensive hardening only; FE-002 is withdrawn, not fixed.
- **STATUS:** FE-003 FIXED / VERIFIED; FE-011 FIXED / VERIFIED; FE-002 NOT REPRODUCIBLE (Chromium).

## Fix 5 — FE-008 controls and FE-009 / FE-010 SEO metadata

- **Files:** `views/auth/ResetPasswordView.tsx`, `views/account/AccountSecurityView.tsx`, `views/FarewellNetworkView.tsx`, `components/common/SEOHead.tsx`, `App.tsx`, `index.html`
- **Change:**
  - Password visibility toggle now has a dynamic `aria-label` (Show/Hide password) and `aria-pressed`; the MFA control is a `role="switch"` with `aria-checked` and a name; the Farewell provider search input is labelled.
  - Static `robots`/`canonical` removed from `index.html`; `SEOHead` omits the canonical when a page is `noindex`; unknown public paths (the 404 fallback) are now `noindex`.
- **Regression evidence:** `16-seo-a11y-fix-probe.json` (390×844)
  - `/memorials`, `/pricing`, `/farewell`: exactly one canonical, no duplicate.
  - `/signin`, `/reset-password`, `/account/security`: single `noindex, nofollow`, no canonical (was both `index,follow` and `noindex`).
  - `/does-not-exist`: `noindex, nofollow`, no self-canonical (was `index,follow` + canonical to the bad URL).
  - Unnamed buttons 0 and unlabeled inputs 0 on all probed routes (was 1 unnamed on reset/account, 1 unlabeled on farewell).
- **STATUS:** FIXED / VERIFIED (Chromium).

## Correction — FE-004 pricing table is NOT REPRODUCIBLE

- **Evidence:** `17-pricing-scroll-probe.json` — the comparison table is already inside `overflow-x: auto` (client 286 / scroll 465 at 320 px; final column reachable at right 303 after scroll; page `scrollWidth` 320). No clipping defect; no source change made for FE-004.

## 6. Final regression (post-fix)

- `02-public-browser-final.json` — 78 checks (13 routes × 320/360/390/412/768/1440): 0 navigation failures, 0 page exceptions, **0 page-level overflow**, 0 unnamed buttons (was 4), 0 unlabeled inputs (was 8), exactly one H1 per route.
- `18-final-trust-modal-probe.json` — trust + dialog fixes still hold after the full changeset.
- `19-vm-deployed-check.json` — the deployed VM build (`aba3d47`, pre-fix) loads public routes cleanly and still reproduces the verification-trust defect (`Document Reviewed` under a rejected fixture), confirming FE-001 was real in the deployed build.
- VM `/ready` recovered at the end of the session: `{database, redis, storage: true}`.

## 7. Authenticated VM journeys on the deployed fix (c96f18f)

- **`mobile` — 18/18 PASS** (`22-vm-journey-mobile.txt`): signed-in `/dashboard`, `/create-memorial`, `/dashboard/contributors` show no page overflow at 360/390/412.
- **`anon` — 3/3 PASS** (`28-vm-journey-anon.txt`): 14/14 private endpoints refuse an anonymous caller, 3/3 public endpoints stay readable, and anonymous `/dashboard` shows a sign-in affordance rather than the dashboard.
- **`cross_user` — 5 PASS / 1 FAIL** (`23`, `23b`, `27-cross-user-triage.md`): all browser-level isolation checks pass (B refused 7/7; B's direct URL reveals nothing; A's memorial absent from B's dashboard). The single FAIL is an unreliable test-harness memorial-id assertion, **not** an app defect — independently verified that both the API and the UI create path return `fullName` exactly and `GET /memorials/{id}` is 200 (`24`, `25`, `26`).

## Still open (next queue)

1. ~~Deploy the fix commits to the sim VM~~ — DONE: VM deployed `c96f18f`, `/health` 200, `/ready` 200, public/auth fixes verified on the deployed build (`21-vm-postfix-verification.json`).
2. Remaining authenticated VM journeys: `signup`, `anon`, `evidence`, `burst` (run one at a time). Harden the `cross_user` id resolution first.
3. Partner/admin route audit and the API-error state matrix (VM `/ready` now healthy).
4. Firefox/WebKit remain NOT TESTED (binaries not installed).
5. FE-013 heading-hierarchy skips (P3) recorded, not yet fixed.

## Blockers / limitations

- VM `/ready` and `/api/v1/ready` timed out inside the backend; authenticated/data-dependent VM verification is BLOCKED until readiness recovers.
- Firefox/WebKit binaries are not installed → NOT TESTED (not a PASS).
- 44 generated screenshots remain uncommitted local evidence (no approved baseline).
