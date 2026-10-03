# PITHROS SIMULATION — HOST HARDENING PROPOSAL (DO NOT APPLY WITHOUT APPROVAL)

**Host:** `pravin-server` `10.153.175.57` · Ubuntu 24.04 · user `pravin`
**Status:** PROPOSED — **nothing has been applied.** `pravin` has no passwordless sudo, so every
command below is for you to run.

Current inbound listeners (from the VM): `22` (SSH, 0.0.0.0 + ::), `3000` (**Dokploy UI**),
`8025` (Mailpit UI), `80` (Caddy), plus Docker/Swarm ports `2377/7946/4789` and Tailscale.
The VM also has a **global IPv6 address** (`2402:3a80:…` on `enp0s3`), so IPv4-only rules are not enough.

---

## 0. Two traps this proposal avoids

1. **Docker bypasses ufw.** Docker inserts its own iptables/nftables rules; a `ufw deny` for a
   published container port (80, 8025, 3000) is **ignored** because traffic is accepted in the
   `DOCKER`/`FORWARD` chains before ufw sees it. Container ports must be filtered in the
   **`DOCKER-USER`** chain, or by publishing containers on `127.0.0.1`/specific IPs.
2. **IPv6.** ufw runs dual-stack only if `IPV6=yes` (default on Ubuntu). A global v6 address with
   no v6 rules is exposed even when IPv4 looks locked down.

## 1. Preflight (read-only, run first)

```sh
sudo ss -tulpen | grep -E ':(22|80|3000|8025)\b'
ip -brief addr
sudo iptables -S DOCKER-USER   # see current Docker-forwards
sudo nft list ruleset | head    # confirm which backend is active
# from YOUR workstation, BEFORE any change:
ssh -o ConnectTimeout=5 pravin@10.153.175.57 'echo still-reachable'
```

## 2. Proposed policy (ufw for host services + DOCKER-USER for container ports)

Intent: default-deny inbound; SSH preserved from the management sources; only `:80` (Caddy) and
the existing Dokploy `:3000` UI reachable, and only from the LAN/Tailscale; outbound allowed.

```sh
# --- management sources (adjust if your workstation is not on these) ---
LAN=10.153.175.0/24                 # VirtualBox host-only/LAN
TS=100.64.0.0/10                    # Tailscale CGNAT range

# 1. base policy (IPv6 included)
sudo sed -i 's/^IPV6=.*/IPV6=yes/' /etc/default/ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 2. SSH FIRST — preserve management access over BOTH stacks, before enabling
sudo ufw allow from $LAN to any port 22 proto tcp comment 'ssh from lan'
sudo ufw allow from $TS  to any port 22 proto tcp comment 'ssh from tailscale'
sudo ufw limit 22/tcp comment 'ssh rate-limit fallback'

# 3. application ingress (Caddy) — LAN + Tailscale only
sudo ufw allow from $LAN to any port 80 proto tcp comment 'caddy http lan'
sudo ufw allow from $TS  to any port 80 proto tcp comment 'caddy http tailscale'

# 4. keep the Dokploy UI reachable (you manage it) — tighten or drop as you wish
sudo ufw allow from $LAN to any port 3000 proto tcp comment 'dokploy ui lan'

# 5. Mailpit UI stays LAN-only (already published by Docker -> also needs DOCKER-USER)
sudo ufw allow from $LAN to any port 8025 proto tcp comment 'mailpit ui lan'

sudo ufw --force enable

# 6. IMPORTANT: filter Docker-published ports too (ufw alone will not)
#    Allow only LAN/Tailscale to the published container ports; drop the rest.
sudo iptables -I DOCKER-USER -i enp0s3 ! -s $LAN -p tcp -m multiport --dports 80,3000,8025 -j DROP
sudo iptables -I DOCKER-USER -i enp0s3 ! -s $TS  -p tcp -m multiport --dports 80,3000,8025 -j DROP
# (persist: iptables-persistent, or a small systemd unit re-applying the DOCKER-USER rules)
```

**Do NOT:** disable Docker/Swarm networking, touch the `dokploy`/`dokploy-postgres` services, or
add a blanket `ufw deny 3000` (it would not work anyway and could confuse debugging).

## 3. IPv6 specifically

- ufw rules above apply to v6 too once `IPV6=yes` (they are family-agnostic — good).
- Verify after enabling: `sudo ufw status verbose` must show `(v6)` entries for 22/80.
- Because containers are published on `0.0.0.0` **and** `::`, the `DOCKER-USER` rule must also be
  applied for the v6 path; add a v6 `DOCKER-USER` drop mirroring step 6 if `docker-proxy` listens on `::`.
- If the global v6 address is not needed, the safest single action is to remove it at the VM
  network level rather than fight per-port v6 rules.

## 4. Rollback (must be ready before enabling)

- If SSH breaks: from the VirtualBox **console** (not SSH), `sudo ufw disable`.
- Safer pattern: schedule an auto-disable while you verify:
  `sudo sh -c 'sleep 300; ufw disable' &` then test SSH + :80 from your workstation within 5 min.
- To remove the Docker filter: `sudo iptables -D DOCKER-USER -i enp0s3 ! -s $LAN -p tcp -m multiport --dports 80,3000,8025 -j DROP` (and the v6 twin).

## 5. Verification after apply

```sh
sudo ufw status verbose
# from YOUR workstation:
curl -sI http://10.153.175.57/         # expect 200
curl -sI http://10.153.175.57:8025/    # expect 200 from LAN
ssh -o ConnectTimeout=5 pravin@10.153.175.57 'echo ok'   # must still work
# from an unrelated host (if available): the above must FAIL
```

## 6. Approval checklist for you

- [ ] Confirm your workstation's source IP/CIDR for `$LAN` (and whether you use Tailscale).
- [ ] Decide whether Dokploy `:3000` should stay LAN-open (default above) or be closed.
- [ ] Decide whether to remove the global IPv6 address instead of per-port v6 rules.
- [ ] Approve ufw **+** DOCKER-USER (both, or neither).
