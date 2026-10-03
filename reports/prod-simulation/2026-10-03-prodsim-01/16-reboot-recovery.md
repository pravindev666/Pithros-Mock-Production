# 16 — REBOOT / RECOVERY · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Tested app SHA:** `c050b2f` · **Date:** 2026-10-03

## Status: BLOCKED (requires sudo)

A VM reboot needs `sudo reboot`; the deploy user `pravin` has **no passwordless sudo**, so the agent cannot reboot the host. This is an **operator action** and is **not** performed.

**To test it (operator):** `sudo reboot`, wait for SSH, then run `scripts/prod-sim/smoke.sh` and `docker compose … ps`.

## Proxy evidence (container-level restart)

Container restarts exercise the same `restart: unless-stopped` policy that governs post-reboot recovery:

| Container | After restart | Recovery |
|---|---|---|
| backend | up (healthy) | 10 s |
| redis | up (healthy) | 1 s |
| worker | up | 1 s |
| caddy | up | 2 s |

All `pithros-sim-*` services carry `restart: unless-stopped`, and `docker.service` is enabled, so they are expected to come back after a host reboot — but the **full reboot path is UNVERIFIED**.

## Verdict
**Stage 8 reboot/recovery: BLOCKED — requires operator sudo.** Container-restart recovery verified as a proxy.
