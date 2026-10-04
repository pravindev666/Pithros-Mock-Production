# Pithros frontend forensic audit — frozen defect inventory

**Run ID:** `2026-10-04-uiux-01`  
**Frontend source:** local `fb94661` / VM frontend-equivalent `aba3d47`  
**Inventory state:** frozen before product fixes  
**Evidence:** 208 Chromium route×viewport checks, 44 screenshots, targeted route/accessibility/trust probes, source inspection

## Coverage completed

- Chromium public/auth routes at all 16 required viewports: 320×568, 320×800, 360×800, 375×667, 375×812, 390×844, 412×915, 414×896, 768×1024, 820×1180, 1024×768, 1280×720, 1366×768, 1440×900, 1920×1080, 2560×1440.
- Routes: landing, memorial registry, how-it-works, pricing, Farewell directory, sign-in, sign-up, forgot/reset password, verify email, phone auth, forbidden, public 404.
- Targeted checks: query reload, account/protected unknown routes, rejected-verification rendering, modal semantics/focus, SEO tags, city filters, pricing table, control naming.
- 208/208 route loads completed; 0 navigation failures; 0 JavaScript page exceptions; exactly one H1 on every audited route.
- Reduced-motion mode was enabled for the matrix.

## Blocked / not tested

- VM `/ready` and `/api/v1/ready` still time out from Caddy and inside the backend container, even after backend CPU fell to 0.39%. Authenticated/data-dependent VM routes are therefore BLOCKED.
- Firefox and WebKit: NOT TESTED — Playwright browser binaries are not installed. They were not installed during investigation because existing tooling was reused first.
- Full family/partner/admin authenticated route matrix, same-browser User A→B cache isolation, real modal long-content paths, and real API error matrix remain UNVERIFIED until readiness is restored.
- No approved screenshot baseline exists; screenshots are evidence, not a visual-regression PASS.

## Confirmed findings

### FE-001

- **TITLE:** Rejected memorials are falsely presented as document reviewed
- **SEVERITY:** P1
- **CATEGORY:** BUG / TRUST
- **ROUTE:** `/memorials`, `/m/:slug`
- **COMPONENT:** `VerificationBadge`, registry card, public memorial hero
- **VIEWPORT:** reproduced at 360×800; source affects all widths
- **PERSONA:** public visitor
- **USER ACTION:** View a public memorial whose server verification status is `rejected`
- **EXPECTED:** The UI must not claim approval or archival verification
- **ACTUAL:** Registry and detail show `Document Reviewed`; detail also says `Archival record verified`
- **ROOT CAUSE:** Both public call sites omit `status`; `VerificationBadge` defaults missing status to `approved`; rejected has no explicit branch; hero copy is unconditional
- **AFFECTED CSS/COMPONENT:** `components/ui/Badge.tsx`, `views/ExploreMemorialsView.tsx`, `views/PublicMemorialView.tsx`
- **WHY THIS IS REAL:** Trust status is objective server data, not design preference
- **EVIDENCE:** `05-trust-modal-probe.json` lines 2–17
- **FIX:** Pass real status, fail closed when absent, add rejected rendering using existing variants, condition/remove unconditional verified copy
- **REGRESSION TEST:** Draft/pending/under-review/needs-info/rejected never render an approved label; approved remains unchanged
- **STATUS:** VERIFIED

### FE-002

- **TITLE:** Registry city chips are clipped and unreachable on phones
- **SEVERITY:** P2
- **CATEGORY:** RESPONSIVE BUG / USABILITY
- **ROUTE:** `/memorials`
- **COMPONENT:** City filter row
- **VIEWPORT:** 320, 360, 375, 390, 412, 414 widths
- **PERSONA:** public visitor
- **USER ACTION:** Filter memorials by Pune or Chennai
- **EXPECTED:** Every chip remains visible or sits in an intentional, bounded horizontal scroller
- **ACTUAL:** Pune starts at x=410 and Chennai ends at x=543 while a 320–390 px viewport is globally clipped
- **ROOT CAUSE:** The inner `overflow-x-auto` flex row has no bounded width/min-width rule inside a wrapping justify-between parent, so it expands to max content width
- **AFFECTED CSS/COMPONENT:** `views/ExploreMemorialsView.tsx`
- **WHY THIS WAS REPORTED:** The raw out-of-bounds detector flagged chip buttons beyond the viewport — which is also exactly how the off-screen children of a horizontal scroll container appear
- **EVIDENCE:** `13-registry-prefix-scroll-probe.json` (pre-fix) — the chip container was already `overflow-x: auto` with `clientWidth 288 / scrollWidth 527` at 320 px; setting `scrollLeft` brought Chennai fully into view (right 543→304) while page `scrollWidth` stayed 320. `12-registry-scroll-probe.json` (post-fix) matches.
- **CORRECTION:** **NOT REPRODUCIBLE.** The chip row was already a bounded, horizontally scrollable container with no page overflow; there is no clipping defect. The `min-w-0`/`w-full` change is retained only as defensive hardening and is **not** claimed as a fix.
- **STATUS:** NOT REPRODUCIBLE

### FE-003

- **TITLE:** Registry sort and verification filters overflow the phone viewport
- **SEVERITY:** P2
- **CATEGORY:** RESPONSIVE BUG / ACCESSIBILITY
- **ROUTE:** `/memorials`
- **COMPONENT:** Filter selects
- **VIEWPORT:** 320, 360, 390 widths
- **PERSONA:** public visitor
- **USER ACTION:** Sort or filter memorial results
- **EXPECTED:** Both selects wrap or size within the viewport and have accessible names
- **ACTUAL:** The second select ends at x=407 on 320/360/390 widths; both selects and search input have no label/accessible name
- **ROOT CAUSE:** Fixed intrinsic select widths in a non-wrapping row; placeholders/options substitute for labels
- **AFFECTED CSS/COMPONENT:** `views/ExploreMemorialsView.tsx`
- **WHY THIS IS REAL:** One filter is clipped and assistive technology cannot identify the controls reliably
- **EVIDENCE:** `03-targeted-probe.json` lines 43–79, 364–400, 685–721
- **FIX:** Responsive wrapping/full-width behavior plus explicit labels/`aria-label`
- **REGRESSION TEST:** Controls stay within all required widths and expose stable accessible names
- **STATUS:** VERIFIED

### FE-004

- **TITLE:** Pricing comparison table is clipped on mobile with no intentional scroller
- **SEVERITY:** P2
- **CATEGORY:** RESPONSIVE BUG
- **ROUTE:** `/pricing`
- **COMPONENT:** Capability comparison table
- **VIEWPORT:** 320, 360, 390, 412 widths
- **PERSONA:** public visitor
- **USER ACTION:** Compare plan capabilities
- **EXPECTED:** Wide comparison content uses component-scoped horizontal scrolling
- **ACTUAL:** The table is 479 px wide and extends to x=496 inside 320–390 px viewports; global clipping hides later columns
- **ROOT CAUSE:** Wide table lacks a bounded `overflow-x-auto` wrapper/min-width contract
- **AFFECTED CSS/COMPONENT:** `views/PricingView.tsx`
- **WHY THIS WAS REPORTED:** The out-of-bounds detector flagged the table and its cells beyond the viewport — which is how a wide table inside a horizontal scroller appears
- **EVIDENCE:** `17-pricing-scroll-probe.json` — the table already sits inside an `overflow-x: auto` wrapper (client 286 / scroll 465 at 320 px); setting `scrollLeft` brought the final column fully into view (right 482→303) while page `scrollWidth` stayed 320; at 1440 the table fits with no scroll.
- **CORRECTION:** **NOT REPRODUCIBLE.** The comparison table was already a bounded, horizontally scrollable region; the earlier "clipped columns" reading was a detector artifact.
- **STATUS:** NOT REPRODUCIBLE

### FE-005

- **TITLE:** Signed-out visitors can render account profile/security surfaces
- **SEVERITY:** P1
- **CATEGORY:** BUG / ACCESS PRESENTATION
- **ROUTE:** `/account/profile`, `/account/security`
- **COMPONENT:** `App` route guard
- **VIEWPORT:** all
- **PERSONA:** anonymous visitor
- **USER ACTION:** Open account route directly
- **EXPECTED:** Sign-in screen/redirect; no authenticated account UI claims
- **ACTUAL:** Account Security renders and claims a current active verified browser session, offers sign-out, password/MFA and deletion controls
- **ROOT CAUSE:** `/account/*` is classified as AuthShell content but has no authentication guard
- **AFFECTED CSS/COMPONENT:** `App.tsx`, account views
- **WHY THIS IS REAL:** The frontend communicates a false authenticated state and exposes unusable sensitive controls; server authority is not weakened, but the UX contract is objectively wrong
- **EVIDENCE:** `03-targeted-probe.json` lines 247–300 and repeated across viewports
- **FIX:** Gate known account routes after auth initialization; signed out sees sign-in with return URL
- **REGRESSION TEST:** Anonymous direct/reload account routes show sign-in; authenticated account still opens the requested page
- **STATUS:** VERIFIED

### FE-006

- **TITLE:** Unknown account routes render a blank shell
- **SEVERITY:** P2
- **CATEGORY:** BUG / USABILITY
- **ROUTE:** `/account/unknown`
- **COMPONENT:** Auth route dispatcher
- **VIEWPORT:** 390×844 reproduced; source affects all
- **PERSONA:** public visitor
- **USER ACTION:** Open an invalid account URL
- **EXPECTED:** Explicit not-found or recovery screen
- **ACTUAL:** Auth chrome/footer render with an empty main region before and after reload
- **ROOT CAUSE:** Prefix classification accepts all `/account/*`; dispatcher has no child fallback
- **AFFECTED CSS/COMPONENT:** `App.tsx`
- **WHY THIS IS REAL:** Blank screens give no status or recovery path
- **EVIDENCE:** `04-route-crossbrowser-probe.json` lines 17–27
- **FIX:** Restrict known account paths or render an explicit fallback
- **REGRESSION TEST:** Unknown account URL never produces empty main content
- **STATUS:** VERIFIED

### FE-007

- **TITLE:** Shared modal overlays lack dialog semantics and focus entry
- **SEVERITY:** P1
- **CATEGORY:** ACCESSIBILITY
- **ROUTE:** Public memorial report flow; shared impact across modal consumers
- **COMPONENT:** `components/ui/Modal.tsx`
- **VIEWPORT:** 360×800 reproduced
- **PERSONA:** public visitor
- **USER ACTION:** Open Report
- **EXPECTED:** `role=dialog`, `aria-modal=true`, labelled title, focus moves inside, Tab is contained, close restores trigger focus, body scroll is locked
- **ACTUAL:** No dialog element exists; focus remains on the background trigger; body is not scroll locked
- **ROOT CAUSE:** Modal only handles Escape and visual overlay; no semantic/focus lifecycle
- **AFFECTED CSS/COMPONENT:** `components/ui/Modal.tsx` and consumers
- **WHY THIS IS REAL:** Keyboard/screen-reader users are not placed in or informed of the modal
- **EVIDENCE:** `05-trust-modal-probe.json` lines 19–27
- **FIX:** Add labelled dialog semantics, initial focus, focus trap/restoration, scroll lock, viewport max-height/scrolling using the existing component
- **REGRESSION TEST:** Keyboard open→Tab cycle→Escape→restored trigger at phone and desktop widths
- **STATUS:** VERIFIED

### FE-008

- **TITLE:** Password visibility controls have no accessible names
- **SEVERITY:** P2
- **CATEGORY:** ACCESSIBILITY
- **ROUTE:** `/reset-password`; account-security also contains an unnamed icon control
- **COMPONENT:** Password fields
- **VIEWPORT:** all 16 widths
- **PERSONA:** public/authenticated
- **USER ACTION:** Use password visibility control with screen reader/voice control
- **EXPECTED:** Button announces Show/Hide password
- **ACTUAL:** Icon-only button has no text, title, or ARIA label
- **ROOT CAUSE:** Visual icon is the only content
- **AFFECTED CSS/COMPONENT:** `views/auth/ResetPasswordView.tsx`, account security control
- **WHY THIS IS REAL:** Control purpose is unavailable to assistive technology
- **EVIDENCE:** `03-targeted-probe.json` lines 208–220 and repeated viewports
- **FIX:** Dynamic `aria-label` and pressed/state semantics where applicable
- **REGRESSION TEST:** Accessible name changes correctly with visibility state
- **STATUS:** VERIFIED

### FE-009

- **TITLE:** Public 404 pages are indexable and canonicalize to nonexistent URLs
- **SEVERITY:** P2
- **CATEGORY:** SEO / BUG
- **ROUTE:** unknown public paths
- **COMPONENT:** `SEOHead`, App fallback
- **VIEWPORT:** all
- **PERSONA:** crawler/public visitor
- **USER ACTION:** Open invalid route
- **EXPECTED:** Not-found UI carries `noindex`; canonical does not endorse a nonexistent page
- **ACTUAL:** The page emits index/follow and canonical `/does-not-exist`
- **ROOT CAUSE:** SEO classification treats every non-private route as indexable; no not-found signal is passed to `SEOHead`
- **AFFECTED CSS/COMPONENT:** `App.tsx`, `components/common/SEOHead.tsx`
- **WHY THIS IS REAL:** Crawlers receive a positive index/canonical signal for arbitrary invalid URLs
- **EVIDENCE:** `03-targeted-probe.json` lines 305–315 and repeated viewports
- **FIX:** Pass noindex for unknown routes and avoid arbitrary canonical endorsement
- **REGRESSION TEST:** Unknown route has one effective noindex directive and no invalid canonical
- **STATUS:** VERIFIED

### FE-010

- **TITLE:** Every route emits duplicate canonical metadata; private routes emit conflicting robots directives
- **SEVERITY:** P2
- **CATEGORY:** SEO / INCONSISTENCY
- **ROUTE:** all; especially auth/account/private
- **COMPONENT:** static HTML metadata + `SEOHead`
- **VIEWPORT:** all
- **PERSONA:** crawler
- **USER ACTION:** Load any SPA route directly
- **EXPECTED:** One canonical and one unambiguous robots directive per route
- **ACTUAL:** Public routes include homepage canonical plus route canonical; private routes include both index/follow and noindex/nofollow
- **ROOT CAUSE:** Static `index.html` defaults remain alongside dynamic Helmet tags
- **AFFECTED CSS/COMPONENT:** `Pithros/index.html`, `components/common/SEOHead.tsx`
- **WHY THIS IS REAL:** Search metadata is contradictory/ambiguous
- **EVIDENCE:** `03-targeted-probe.json` lines 8–14, 195–202, 229–236
- **FIX:** Keep route-owned dynamic canonical/robots tags single-source; preserve other static metadata
- **REGRESSION TEST:** Exactly one canonical and one robots directive with correct public/private values
- **STATUS:** VERIFIED

### FE-011

- **TITLE:** Clickable memorial cards are not keyboard operable
- **SEVERITY:** P2
- **CATEGORY:** ACCESSIBILITY
- **ROUTE:** `/memorials`
- **COMPONENT:** Memorial result card
- **VIEWPORT:** all
- **PERSONA:** public visitor
- **USER ACTION:** Navigate result cards using keyboard
- **EXPECTED:** Semantic link/button reachable by Tab and activatable by Enter/Space as appropriate
- **ACTUAL:** Card is a `div` with `onClick`, no role, no tabIndex, and no key handler
- **ROOT CAUSE:** Pointer-only interaction on non-semantic element
- **AFFECTED CSS/COMPONENT:** `views/ExploreMemorialsView.tsx`
- **WHY THIS IS REAL:** Keyboard users cannot open memorial results
- **EVIDENCE:** Source lines around result card; synthetic rejected card rendered in `05-trust-modal-probe.json`
- **FIX:** Use a semantic button/link contract without changing visual styling
- **REGRESSION TEST:** Card is tab-reachable and opens on keyboard
- **STATUS:** VERIFIED

### FE-012

- **TITLE:** Clickable verification badges are not keyboard operable
- **SEVERITY:** P2
- **CATEGORY:** ACCESSIBILITY
- **ROUTE:** `/m/:slug`
- **COMPONENT:** `VerificationBadge`
- **VIEWPORT:** all
- **PERSONA:** public visitor
- **USER ACTION:** Open verification details using keyboard
- **EXPECTED:** Semantic button or full keyboard contract
- **ACTUAL:** Click handler is attached to a `span role=button` without tabIndex or key handling
- **ROOT CAUSE:** Incomplete custom-button semantics
- **AFFECTED CSS/COMPONENT:** `components/ui/Badge.tsx`
- **WHY THIS IS REAL:** The verification explanation is pointer-only
- **EVIDENCE:** Source inspection + public detail render
- **FIX:** Render an actual button wrapper when interactive while preserving badge visuals
- **REGRESSION TEST:** Tab/Enter/Space opens verification drawer; noninteractive badge remains plain text
- **STATUS:** VERIFIED

## Not reproduced / design decisions

- **Query reload loss for `/signup?role=partner`: NOT REPRODUCIBLE.** Direct load and reload both preserved the URL and partner signup copy (`04-route-crossbrowser-probe.json` lines 4–14). No fix.
- **Signed-out unknown dashboard/partner/admin paths:** show their respective sign-in surface, not a blank shell. Authenticated child-fallback behavior remains UNVERIFIED.
- **Atmospheric SVGs outside viewport:** DESIGN DECISION where their containing region intentionally clips decoration; not treated as page overflow.
- **Global `overflow-x: clip`:** retained for now; confirmed component defects must be fixed locally rather than changing the global rule.
- **Main JS chunk warning:** KNOWN ISSUE / UNVERIFIED PERFORMANCE impact. No optimization without route-load measurement.

## Frozen totals

- Total confirmed defects: **10** (after reclassifying FE-002 and FE-004 as not reproducible)
- P0: **0**
- P1: **3** (`FE-001`, `FE-005`, `FE-007`)
- P2: **7**
- P3: **0**
- Fixed: **0** at freeze time (see `08-fix-log.md` for current status)
- Remaining: **10** at freeze time
- Not reproducible: **3** (`FE-002`, `FE-004`, and the `/signup?role=partner` suspicion)
- Blocked/partially unverified domains: authenticated VM matrix, Firefox, WebKit, cross-user cache isolation, full performance measurements

## Fix queue

1. FE-001 verification truth
2. FE-005/FE-006 account routing and fallback
3. FE-007 shared modal accessibility
4. FE-003/FE-011 registry responsiveness and semantics
5. FE-008 accessible controls
6. FE-009/FE-010 SEO metadata
8. Re-run focused Chromium checks, frontend gates, then Firefox/WebKit if browser binaries can be reused or installed project-locally
