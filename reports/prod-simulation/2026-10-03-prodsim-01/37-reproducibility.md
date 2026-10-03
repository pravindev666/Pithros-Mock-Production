# 37 — REPRODUCIBILITY

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f`

## From-scratch reproduction (a new engineer)

1. **Exact code**: repo delivered by `git bundle`; `git checkout c050b2f` on the VM.
2. **Config**: `scripts/prod-sim/env.template` → `runtime/app.env` (mode 600); Firebase env-cred path.
3. **Deploy**: `scripts/prod-sim/deploy.sh` (build → `alembic upgrade head` → seed catalog → `up -d`).
4. **Smoke**: `scripts/prod-sim/smoke.sh`.
5. **Load**: `load/k6/{sim-mixed,capacity-100,spike}.js` (k6 from a separate host).
6. **Restore**: `backend/scripts/restore.sh` (+ `docker-compose.sim.yml` `pg-drill` profile for the disposable DB).

## Artifacts
- Compose: `docker-compose.sim.yml`; ingress `Caddyfile.sim`; env `scripts/prod-sim/env.template`.
- Reports + raw JSON/CSV under `reports/prod-simulation/2026-10-03-prodsim-01/`.

## Gaps
- **No automated RUN_ID cleanup script** yet (synthetic data cleanup is manual) → **PENDING**.
- Host firewall/runtime extras intentionally excluded (awaiting approval).

**Verdict: PASS (deploy/verify/load/restore reproducible); cleanup automation PENDING.**
