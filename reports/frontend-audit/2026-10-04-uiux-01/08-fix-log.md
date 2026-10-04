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

## Still open (next queue)

1. Re-run the focused Chromium checks and the full frontend gates.
2. Final regression sweep across the affected routes.
3. Firefox/WebKit remain NOT TESTED (binaries not installed).
4. VM authenticated verification remains BLOCKED on `/ready`.

## Blockers / limitations

- VM `/ready` and `/api/v1/ready` timed out inside the backend; authenticated/data-dependent VM verification is BLOCKED until readiness recovers.
- Firefox/WebKit binaries are not installed → NOT TESTED (not a PASS).
- 44 generated screenshots remain uncommitted local evidence (no approved baseline).
