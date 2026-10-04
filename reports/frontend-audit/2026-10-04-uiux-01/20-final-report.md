# Pithros frontend forensic audit — final report

**Run ID:** `2026-10-04-uiux-01`  
**Audited frontend source:** local `fb94661` == VM `aba3d47` frontend tree  
**Fixes applied:** `bf9fcdb`, `160bdcc`, `f214800`, `dd529ab`, `466d10a`  
**Scope:** entire `Pithros/` frontend; no backend change was required  
**Visual identity:** unchanged — colors, fonts, copy, hierarchy, navigation, cards, radii, shadows, icons, atmosphere and motion were preserved.

## 1. Method

Investigation first, then fixes. Route/component/persona/state inventory, then a Chromium sweep of public/auth routes across 16 required viewports (208 checks) with element-geometry, nested-overflow, control-naming, heading, console, page-error, SEO and reduced-motion capture. Findings were frozen (`06-confirmed-defect-inventory.md`) before any code change. Each fix was reproduced, fixed, re-probed with new evidence, gated (`lint` / `check:live` / `build`) and committed separately.

Fixtures used synthetic API responses (in the browser only) to prove rendering with a rejected verification status. No application data, schema or production state was modified.

## 2. Environment / baseline

- Local gates at baseline and after every fix: PASS (`tsc --noEmit`, `check:live`, `vite build`).
- VM `/health` 200 throughout. VM `/ready` **hung for most of the session** (timed out from Caddy and inside the backend container) and **recovered near the end**: `/ready` → 200 with `database:true`, `redis:true`, `storage:true`.
- Deployed VM build (`aba3d47`, pre-fix) loads public routes correctly (200, one H1, no page overflow) and reproduces the verification-trust defect.

## 3. Defects — final disposition

| ID | Severity | Title | Status |
|---|---|---|---|
| FE-001 | P1 | Rejected memorials shown as "Document Reviewed" + "Archival record verified" | **FIXED / VERIFIED** |
| FE-005 | P1 | Signed-out visitors rendered Account Security (false active session) | **FIXED / VERIFIED** |
| FE-007 | P1 | Dialogs had no role/focus entry/trap/scroll-lock | **FIXED / VERIFIED** |
| FE-003 | P2 | Registry sort/filter controls overflowed phones; unlabeled | **FIXED / VERIFIED** |
| FE-011 | P2 | Memorial cards were pointer-only | **FIXED / VERIFIED** |
| FE-012 | P2 | Clickable verification badge was not keyboard operable | **FIXED / VERIFIED** |
| FE-006 | P2 | Unknown `/account/*` rendered a blank shell | **FIXED / VERIFIED** |
| FE-008 | P2 | Unnamed password-visibility / MFA controls | **FIXED / VERIFIED** |
| FE-009 | P2 | 404 fallback was indexable with a self-canonical | **FIXED / VERIFIED** |
| FE-010 | P2 | Duplicate/conflicting canonical + robots tags | **FIXED / VERIFIED** |
| FE-002 | — | City chips clipped on phones | **NOT REPRODUCIBLE** (already a bounded scroller) |
| FE-004 | — | Pricing table clipped on mobile | **NOT REPRODUCIBLE** (already a bounded scroller) |

Plus one suspicion (`/signup?role=partner` losing its query on reload) — **NOT REPRODUCIBLE**.

### 3.1 Additional finding (not in frozen inventory, not fixed)

- **FE-013 · P3 · ACCESSIBILITY · heading hierarchy.** Most public pages skip a heading level (e.g. `h1 → h3`); the landing page skips twice. Real but minor; recorded for a future pass rather than expanded into this campaign's scope.

## 4. Evidence index (`reports/frontend-audit/2026-10-04-uiux-01/`)

- `00-baseline.md` — environment, gates, VM health
- `01-route-component-state-inventory.md` — route/persona/state map
- `02-public-browser-{phonesA,phonesB,tablets,desktops}.json` — 208 pre-fix checks
- `02-public-browser-final.json` — 78 post-fix regression checks
- `03-targeted-probe.json` — pre-fix geometry/a11y/SEO
- `04-route-crossbrowser-probe.json` — routing + browser availability
- `05-trust-modal-probe.json` — pre-fix trust + modal proof
- `06-confirmed-defect-inventory.md` — frozen inventory (+ corrections)
- `07`…`18` — per-fix verification evidence
- `19-vm-deployed-check.json` — deployed VM build + defect reproduction
- `screenshots-public/` — 44 screenshots (uncommitted local evidence)

## 5. Verification — what each fix is proven by

- **FE-001/012:** `07` / `18` — rejected fixture renders `Verification Rejected`, `badgeReviewed: 0`, `archivalVerified: 0`; interactive badge is a real button.
- **FE-005/006:** `09` — signed-out account routes → sign-in; unknown → not-found (360 + 1440).
- **FE-007:** `10` / `18` — `dialogCount: 1`, `aria-modal: true`, focus inside, `bodyOverflow: hidden`, focus restored to trigger.
- **FE-003/FE-011:** `11` / `14` / `15` — unlabeled 3→0; filter select right edge 407→207 px at 320–390; page width == viewport; card `role=button` + Enter navigates.
- **FE-008/FE-009/FE-010:** `16` — one canonical on public routes, single `noindex,nofollow` on private/404, no self-canonical on 404, unnamed/unlabeled 0.
- **Final regression:** `02-public-browser-final.json` — **78/78 checks**, 0 navigation failures, 0 page exceptions, 0 page-level overflow, 0 unnamed buttons, 0 unlabeled inputs, exactly one H1 per route.

## 6. Responsiveness matrix (post-fix, Chromium)

| Route | 320 | 360 | 390 | 412 | 768 | 1440 |
|---|---|---|---|---|---|---|
| `/` | PASS | PASS | PASS | PASS | PASS | PASS |
| `/memorials` | PASS | PASS | PASS | PASS | PASS | PASS |
| `/how-it-works` | PASS | PASS | PASS | PASS | PASS | PASS |
| `/pricing` | PASS | PASS | PASS | PASS | PASS | PASS |
| `/farewell` | PASS | PASS | PASS | PASS | PASS | PASS |
| `/signin` | PASS | PASS | PASS | PASS | PASS | PASS |
| `/signup` | PASS | PASS | PASS | PASS | PASS | PASS |
| `/forgot-password` | PASS | PASS | PASS | PASS | PASS | PASS |
| `/reset-password` | PASS | PASS | PASS | PASS | PASS | PASS |
| `/verify-email` | PASS | PASS | PASS | PASS | PASS | PASS |
| `/auth/phone` | PASS | PASS | PASS | PASS | PASS | PASS |
| `/forbidden` | PASS | PASS | PASS | PASS | PASS | PASS |
| 404 | PASS | PASS | PASS | PASS | PASS | PASS |

`PASS` = loads, exactly one H1, no page-level horizontal overflow. No `BROKEN`; `MINOR` only for the heading-skip note (FE-013). Public/auth only — authenticated shells are NOT TESTED.

## 7. Honest answers (condensed)

1. **Accidental page scrolling?** No — 0/78 post-fix checks, and the two "overflow" hits were already-bounded component scrollers.
2. **Overlap?** None confirmed in audited routes.
3. **Clipped headings/badges/buttons?** No.
4. **Unusable tabs/chips on mobile?** No — chips/tables are bounded scrollers with all items reachable.
5. **Fixed dimensions causing failures?** None confirmed.
6. **Absolute content that should flow?** Only decorative atmosphere, intentionally clipped.
7. **Inconsistent spacing?** Not confirmed.
8. **Inconsistent components?** Not confirmed beyond the fixed badge/control issues.
9. **Stale state after logout/login?** NOT TESTED (needs authenticated sessions).
10. **User data surviving in cache?** NOT TESTED; PWA caching design already restricts API caching to anonymous public reads.
11. **Broken loading/error/empty states?** Not in audited routes; authenticated states NOT TESTED.
12. **Modals usable on mobile?** Yes — fixed dialogs now trap focus, lock scroll and cap height.
13. **Keyboard accessible?** Fixed for cards, badges, dialogs, password/MFA; full app-wide pass NOT TESTED.
14. **Touch targets?** Global 44px minimum on coarse pointers; not individually re-measured.
15. **Animations causing layout problems?** No, under reduced-motion.
16. **Measurable perf issues?** Main bundle 1.41 MB (340 KB gzip) with a >500 KB chunk warning — KNOWN ISSUE, not optimized without route-load evidence.
17. **Public/private behavior correct?** Public routes indexable with one canonical; private/404 now `noindex`. Authenticated route guards NOT TESTED beyond account routes.
18. **Did a fix create a secondary problem?** No regressions in the 78-check sweep; the two withdrawn findings were detector artifacts, not fixes.
19. **Did any fix affect desktop?** Verified unchanged at 1440 in the final sweep.
20. **Remaining risks:** authenticated/role routes unverified; Firefox/WebKit untested; heading hierarchy (FE-013); bundle size; VM runs the pre-fix build.

## 8. Verdict

**NOT READY** for a full frontend release sign-off.

Every defect confirmed and fixed in this campaign is verified at the local gate and in Chromium. The verdict is NOT READY because explicitly unverified areas remain:

- **Blockers/unknowns:** authenticated family/partner/admin frontend routes, cross-user browser cache isolation, and the full API-error matrix were not audited (VM readiness was down for most of the session and only recovered at the end).
- **External/limitation:** Firefox and WebKit engines are not installed → NOT TESTED, not PASS.
- **Deployment:** the VM still runs the pre-fix SHA `aba3d47`; the fixes are committed locally and not deployed or pushed.

## 9. Next actions

1. **Me (agent), on your go-ahead:** deploy the fix commits to the sim VM (git bundle + `deploy.sh`) and re-run the audit against the deployed post-fix SHA, including the authenticated matrices now that `/ready` has recovered.
2. **You:** approve the VM deploy/push, and decide whether to install Firefox/WebKit for cross-browser verification.
3. **Follow-up queue:** authenticated route audit; cross-user cache isolation test; API-error state matrix; FE-013 heading hierarchy; measure bundle split before any optimization.
