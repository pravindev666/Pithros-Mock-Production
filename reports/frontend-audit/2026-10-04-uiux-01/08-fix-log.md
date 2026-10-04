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

## Still open (next queue)

1. FE-005 / FE-006 — account route guard + unknown account fallback
2. FE-007 — shared `Modal` dialog semantics, focus entry/trap/restore, scroll lock, mobile max-height
3. FE-002 / FE-003 / FE-011 — registry chip scroller, filter wrapping, labelled controls, keyboard-operable cards
4. FE-004 — pricing table component-scoped scrolling
5. FE-008 — accessible password visibility controls
6. FE-009 / FE-010 — 404 noindex and duplicate canonical/robots metadata
7. Re-run focused Chromium checks per fix, then final regression.

## Blockers / limitations

- VM `/ready` and `/api/v1/ready` timed out inside the backend; authenticated/data-dependent VM verification is BLOCKED until readiness recovers.
- Firefox/WebKit binaries are not installed → NOT TESTED (not a PASS).
- 44 generated screenshots remain uncommitted local evidence (no approved baseline).
