# 02 — HOST SECURITY

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f`

## Current state (observed, read-only)

- User `pravin`: groups `sudo, docker, lxd, libvirt, kvm, adm, …`; **no passwordless sudo**.
- Listening: `22` (v4+v6), `80` (v4+v6), `8025` (v4+v6), `3000` (v4+v6, Dokploy), `2377/7946/4789` (swarm), `41641` (tailscale).
- **`ufw` is installed but its status could not be read** (`sudo` required).
- The VM has **no global IPv6** on `enp0s3` now (only link-local) — reduces exposure vs the earlier state.

## Hardening proposal — **NOT APPLIED** (awaiting explicit approval)

Full rules in `scripts/prod-sim/host-hardening.md`. Summary: default-deny inbound; SSH preserved from `10.153.175.0/24` and Tailscale `100.64.0.0/10` (v4+v6, rate-limited); expose only `:80` (Caddy) + existing Dokploy `:3000` + Mailpit `:8025` to LAN; **DOCKER-USER** drops for Docker-published ports (ufw alone does not filter them); explicit IPv6 handling; rollback = `ufw disable` from the console.

## Verdict
**BLOCKED on operator approval.** No firewall mutation performed. The VM is on a private LAN; the main exposure is the swarm ports and Dokploy UI.
