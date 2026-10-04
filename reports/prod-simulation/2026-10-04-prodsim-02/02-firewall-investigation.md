# 02 — HOST FIREWALL / PORT INVESTIGATION (PROPOSAL ONLY — NOT APPLIED)

**RUN_ID:** `2026-10-04-prodsim-02` · **Host:** `pravin@10.153.175.57` · **Date:** 2026-10-04
**Status: INVESTIGATION COMPLETE · NO CHANGE APPLIED.** `sudo` requires a password (`NO_PASSWORDLESS_SUDO`),
so no `ufw`/`iptables`/`DOCKER-USER` rule was (or could be) touched. This is a proposal for your approval.

## 1. Interface / exposure map

| Interface | Address | Notes |
|---|---|---|
| `enp0s3` | `10.153.175.57/24` + **global IPv6** `2402:3a80:...:b5b3/64` | LAN + public IPv6 — the app is reachable here |
| `tailscale0` | `100.124.202.42/32` + `fd7a:115c:a1e0::.../128` | Tailscale up (management path) |
| `docker_gwbridge` | `172.19.0.1/16` | Docker |
| `br-e44f3dbd1d46` | `172.20.0.1/16` | Dokploy swarm overlay |
| `virbr0` | `192.168.122.1/24` | libvirt bridge, **DOWN** |

## 2. Every listening socket — owner, purpose, exposure

| Port | Proto | Bind | Owner (evidence) | Purpose | Needed externally? |
|---|---|---|---|---|---|
| `22` | tcp | `0.0.0.0` / `[::]` | sshd | SSH management | **YES** (LAN + tailnet only) |
| `80` | tcp | `0.0.0.0` / `[::]` | `pithros-sim-caddy-1` (`0.0.0.0:80->80`) | Pithros front door (SPA + `/api` proxy) | **YES** (LAN) |
| `8025` | tcp | `0.0.0.0` / `[::]` | `pithros-sim-mailpit-1` (`0.0.0.0:8025->8025`) | Mailpit test mail UI | **NO** — leaks test email; restrict to localhost/tailnet |
| `3000` | tcp | `0.0.0.0` / `[::]` | `dokploy.1...` | **Dokploy control plane (pre-existing, DO NOT TOUCH)** | out of scope |
| `2377` | tcp | `*` | docker swarm (Dokploy) | Swarm Raft control | it is Dokploy's; leave as-is |
| `7946` | tcp+udp | `*` | docker swarm (Dokploy) | Swarm gossip | it is Dokploy's; leave as-is |
| `4789` | udp | `0.0.0.0` | docker swarm (Dokploy) | Swarm VXLAN overlay | it is Dokploy's; leave as-is |
| `41641` | udp | `0.0.0.0` / `[::]` | tailscaled | Tailscale direct | **YES** (tailnet) |
| `48692`/`44648` | tcp | tailscale0 only | tailscaled | Tailscale | internal to tailscale |
| `53` | udp/tcp | `127.0.0.53`, `127.0.0.54`, `192.168.122.1` | systemd-resolved / libvirt dnsmasq | local DNS | loopback/virbr0 only |

**Notes.** The Swarm ports (`2377/7946/4789`) are **Dokploy's**, not Pithros — they appear because a Dokploy
single-node swarm is running. Per scope they are left untouched. `5432` is **not** exposed on the host
(Dokploy-postgres is internal to the Docker network). The public IPv6 on `enp0s3` means **IPv6 must be
covered** by any policy (a v4-only firewall would leave the host reachable over IPv6).

## 3. Important Docker caveat

Docker inserts its own `nat`/`filter` rules ahead of `ufw`, so **`ufw` alone will NOT restrict the
published ports** (`80`, `8025`, `3000`). Restricting published ports requires the **`DOCKER-USER`**
chain (which is evaluated before Docker's own accept rules). Docker does **not** manage IPv6 publish
rules unless `ip6tables` is enabled — verify the IPv6 path explicitly.

## 4. Proposed minimum policy (for approval — do NOT apply yet)

**Intent:** default-deny inbound; expose only SSH and the Pithros front door; keep Mailpit private;
leave Dokploy/swarm untouched; preserve SSH and the Tailscale management path first.

```
# 0. Safety: ensure SSH + tailscale are allowed BEFORE default-deny
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow in on tailscale0
ufw allow 41641/udp

# 1. Pithros ingress (only the reverse proxy)
ufw allow 80/tcp

# 2. IPv6 parity — ufw manages both stacks when IPV6=yes (verify /etc/default/ufw)
#    (ufw allow 80/tcp covers [::]:80 too)

# 3. Mailpit: never on the LAN. Two options:
#    (a) stop publishing 8025 on the host (compose change: "127.0.0.1:8025:8025"); preferred
#    (b) ufw deny 8025/tcp   ← ufw will NOT stop Docker's publish; use DOCKER-USER instead:
#        iptables -I DOCKER-USER -p tcp --dport 8025 ! -i docker0 -j DROP
#        ip6tables -I DOCKER-USER -p tcp --dport 8025 ! -i docker0 -j DROP
```

**Dokploy / Swarm:** since it must not be touched, either (i) leave `2377/7946/4789/3000` reachable as
they are today (the policy above does not add explicit allows, but Docker's own rules will still accept
them — ufw cannot override Docker's published/swarm ports without a `DOCKER-USER` DROP), **or**
(ii) explicitly restrict them via `DOCKER-USER` after confirming Dokploy still functions. This is the
one decision that needs your call; blocking swarm transport could destabilise Dokploy.

## 5. Rollback

`ufw disable` (or `ufw reset`) restores the current state; `iptables -D DOCKER-USER ...` removes any
added DOCKER-USER rules. Have a second SSH session open before applying, and keep `22` + `tailscale0`
allowed first.

**STOP — awaiting your explicit approval and decision on the Dokploy/swarm ports before applying anything.**
