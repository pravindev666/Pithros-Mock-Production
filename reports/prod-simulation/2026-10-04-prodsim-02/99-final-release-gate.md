# 99 — FINAL RELEASE GATE · PITHROS PRODUCTION SIMULATION (CLOSURE WAVE)

**RUN_ID:** `2026-10-04-prodsim-02` · **Date:** 2026-10-04
**VM deployed SHA (final):** `bc0d275` · **CI-green SHA (origin/main):** `7f62f7b`
**Host:** `10.153.175.57` (Ubuntu 24.04, 2 vCPU, 7.8 GB) · single-server Docker Compose sim.

## 0. Deployment state (Phase 0)

`7f62f7b` was rolled out and verified healthy first, then the Trivy-fix commit `bc0d275` was built and
deployed. Both deploys: `git rev-parse HEAD` = expected SHA, `/health` **200**, `/ready`
`{database:true, redis:true, storage:true}`, all 8 app containers up. `bc0d275` is **not yet run through
GitHub CI** (it passed the full local gate set only) — a push is needed for CI on this SHA.

## 1. Verification matrix (runtime evidence, this wave)

| Domain | Result | Evidence |
|---|---|---|
| Deploy at exact SHA | **VERIFIED** | SHA `7f62f7b` then `bc0d275`; `/health` 200; `/ready` all-true |
| Auth — real signup→verify→login→logout (browser, VM) | **VERIFIED** | `journey_signup` 6/6 PASS (clean run) |
| Anonymous boundaries (14 private 401, 3 public 200, UI gate) | **VERIFIED** | `journey_anon` 3/3 PASS (repeatable) |
| Cross-user security (A vs B; UI + direct URL + 7 API routes) | **VERIFIED** | `journey_cross_user` 6/6 PASS (clean run) |
| Mobile responsive, 360/390/412 × public+auth screens | **VERIFIED** | `journey_mobile` 18/18 PASS (repeatable) |
| Evidence/OCR → **human** admin decision → steward sees result | **VERIFIED** | `journey_evidence` 5/5 PASS (repeatable) |
| Container security (Trivy) | **VERIFIED** | actionably clean; BEFORE/AFTER below |
| Worker/scheduler restart recovery | **VERIFIED** | worker+beat restart → `celery ready`, `/ready` true |
| R2 ⇄ DB reconciliation | **VERIFIED (with caveats)** | public/sensitive 0 discrepancies; private explained |
| DLQ / observability read surface | **VERIFIED** | `task_failures` readable (1 real failure recorded) |
| Firewall — investigation + proposal | **VERIFIED (proposal only)** | port-owner map + minimum policy — NOT applied |
| Farewell browser E2E (provider/partner/admin personas) | **UNVERIFIED** | not run this wave (needs role personas) |
| Account-deletion browser journey | **UNVERIFIED** | not run this wave |
| Background-job / email failure-injection drills | **PARTIALLY VERIFIED** | worker restart done; R2/OCR/SMTP injection not run |
| VM host reboot recovery | **BLOCKED** | needs operator `sudo reboot` (no passwordless sudo) |
| Firewall apply | **BLOCKED** | needs your approval + sudo |
| CI run on `bc0d275` | **BLOCKED** | needs a push (GitHub) |
| Real Cashfree transaction | **DEFERRED BY DECISION** | no keys; simulator only |

## 2. Browser journey results (VM, real Chromium)

Artefact: `vm-browser-results.json`. Clean-run totals: **38 checks PASS / 0 FAIL** across
`anon` (3), `signup` (6), `cross_user` (6), `mobile` (18), `evidence` (5). Repeat runs of `signup`/
`cross_user` were **BLOCKED by external factors** — Firebase client-signup throttling ("Unable to
complete this action right now") and intermittent VM-link read timeouts — and are recorded as
`BLOCKED`, not `FAIL` (no app defect).

## 3. Container security (Trivy) — BEFORE / AFTER

| Target | BEFORE | AFTER | Δ |
|---|---|---|---|
| backend debian 13.7 | 85 (84 H, 1 C) | 84 (83 H, 1 C) | −1 (libpcre2 CVE-2026-103111 patched) |
| backend Python (pip **vendored** SBOM) | 4 H | 4 H | 0 — **false positive** (not installed) |
| backend secret `firebase.py` | 1 C | 0 | −1 (narrow allow-rule) |
| frontend caddy (gobinary) | 17 H | 0 | −17 (caddy v2.11.4 → v2.11.6) |

Real, actionable remaining: **0**. Remaining 84 Debian findings are **no-fix** base-image packages.
Detail: `18-container-security.md`.

## 4. Firewall / reconciliation / ops

- **Firewall:** default-deny proposal with exact rules (preserve SSH 22 + `tailscale0` + Caddy 80;
  Mailpit 8025 must not be LAN-exposed; Dokploy swarm ports 2377/7946/4789/3000 left untouched).
  **Not applied.** Detail: `02-firewall-investigation.md`.
- **Reconciliation:** public 48↔48, sensitive 2↔2 (perfect); private: 3 abandoned-upload rows
  (cleanup candidates) + 6 retained thumbnails (expected). Detail: `35-reconciliation-observability.md`.
- **Observability:** health/ready + structured logs + readable `task_failures`; **no** metrics endpoint
  (known gap F-19).

## 5. Regression gate (local, this wave)

| Gate | Result |
|---|---|
| `ruff check .` | clean |
| `ruff format --check .` | clean (168 files) |
| `mypy app` | Success (112 files) |
| `pytest -q` | **267 passed, 1 skipped** (Cashfree external), 16 e2e deselected |
| `npm run lint` (tsc) | clean |
| `npm run check:live` | OK |
| `npm run build` | built (1.41 MB / 340 KB gzip) |

Capacity regression: **not re-run this wave** (no closure change affects runtime behaviour); the prior
baseline stands (40 VU stable · 100 degraded · 200 saturated; first bottleneck = 2 vCPU + remote
Supabase latency).

## 6. FINAL VERDICT

# **NOT READY**

Not because of a code defect — the deployed application is healthy, secure against the tested matrices,
and reconciles. It is **NOT READY** because release-critical workflows still lack runtime evidence and
three items are blocked on external/human action.

**Blockers — code-controlled:** none outstanding.

**Blockers — external / human (BLOCKED, not failed):**
1. **VM reboot recovery** — needs operator `sudo reboot`.
2. **Firewall apply** — needs your approval (+ sudo); the exact rules are ready.
3. **CI on `bc0d275`** — needs a push.

**Unverified release workflows (need a further browser pass):**
4. Farewell Network browser E2E (provider/partner/admin personas).
5. Account-deletion browser journey + post-deletion policy.
6. Background-job / email failure-injection matrix.

**Risk:**
7. No metrics/error-aggregator (F-19); abandoned-upload rows accumulate without the RUN_ID cleanup tool.

**Deferred by decision:** real Cashfree transaction (application-side billing lifecycle is covered).
