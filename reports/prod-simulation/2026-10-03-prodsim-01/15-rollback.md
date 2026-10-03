# 15 — ROLLBACK · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Tested app SHA:** `c050b2f` · **Date:** 2026-10-03

## Procedure (defined, repo-native)

1. Exact revisions are delivered by **git bundle** and checked out by SHA on the VM (`git checkout <sha>`), so any prior commit can be restored deterministically.
2. Rollback = `git checkout <known-good-sha>` → `scripts/prod-sim/deploy.sh` (rebuild + `alembic upgrade head` + seed + `up -d`) → `scripts/prod-sim/smoke.sh`.
3. Migrations are **additive** in this project (no destructive migrations in the chain), so a code rollback does not require a schema rollback.

## Status: PARTIAL

- The **forward deploy** path (checkout → deploy.sh → smoke) was exercised repeatedly this session (commits `c34ef29`, `c050b2f`) and each time the stack returned healthy — i.e., the deploy/verify loop works.
- A **deliberate bad-build injection + detection + rollback** cycle was **not** executed this pass (time + to avoid destabilising the environment). Marked **PENDING**.
- The **DB is never destructively migrated**, satisfying the "no destructive production migrations" rule.

## Verdict
**Stage 8 rollback: PARTIAL** — mechanism defined and deploy-side verified; a full bad→detect→rollback drill is **PENDING**.
