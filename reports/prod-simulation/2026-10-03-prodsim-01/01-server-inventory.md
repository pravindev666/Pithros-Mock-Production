# 01 — SERVER INVENTORY

**RUN_ID:** `2026-10-03-prodsim-01` · **Host:** `pravin-server` · **Deployed SHA:** `c050b2f`

| Item | Value |
|---|---|
| OS | Ubuntu 24.04.5 LTS (Noble), kernel 6.8.0-142, KVM guest |
| CPU | Intel Core i3-3240 @ 3.40 GHz — 2 cores / 2 threads |
| RAM | 7.8 GiB total (~6.5 GiB free idle) |
| Swap | 4 GiB (`/swap.img`, unused) |
| Disk | LVM ext4 57 G on `/` (28 G free, 50 % used), `/boot` 2 G, **HDD-class (rotational)** |
| Network | `enp0s3` 10.153.175.57/24 (IPv4 only; global IPv6 no longer present) · `tailscale0` 100.124.202.42 + `fd7a:…` ULA |
| Docker | Engine 29.8.1, Compose v5.5.1, storage driver `overlayfs`, root `/var/lib/docker` |
| Time | UTC, NTP synchronized |
| Pre-existing workload | **Dokploy** swarm (`dokploy` on :3000, `dokploy-postgres`) — left untouched |

Baseline idle: load1 ~0.6, RAM 2.53 GB (+ ~1.3 GB used), swap 0, backend ~0.5 % CPU / 409 MB.
