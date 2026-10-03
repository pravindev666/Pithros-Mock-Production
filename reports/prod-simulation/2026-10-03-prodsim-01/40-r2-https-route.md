# 40 — R2 BROWSER UPLOAD: HTTPS SIMULATION ROUTE (STOP — HUMAN ACTION REQUIRED)

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f` · **Date:** 2026-10-03

## Why this is blocked

The browser upload is blocked purely by an **origin mismatch** (see 06): the deployed simulation is served at **`http://10.153.175.57`** (no TLS, no tunnel), while R2 CORS allows the **HTTPS** Pithros origins. Per instruction I will **not** add the raw VM IP to the (shared) bucket policy. The realistic fix is an **isolated HTTPS hostname in front of the VM**.

Checked: **`cloudflared` is NOT installed** and there is no `~/.cloudflared`. **Tailscale is up** — a viable alternative.

---

## Option A (preferred): Cloudflare Tunnel — `sim.pithros.in`

**Exact steps (mostly human — needs the Cloudflare account + sudo):**

```sh
# 1. install (sudo)
sudo apt-get install -y cloudflared            # or the .deb from Cloudflare
# 2. authenticate (HUMAN: opens a browser, picks the pithros.in zone)
cloudflared tunnel login                        # writes ~/.cloudflared/cert.pem
# 3. create the isolated tunnel
cloudflared tunnel create pithros-sim           # prints TUNNEL-UUID, writes ~/.cloudflared/<UUID>.json
# 4. route an ISOLATED hostname (does NOT touch the production hostname)
cloudflared tunnel route dns pithros-sim sim.pithros.in
# 5. config  ~/.cloudflared/config.yml
#    tunnel: <TUNNEL-UUID>
#    credentials-file: /home/pravin/.cloudflared/<TUNNEL-UUID>.json
#    ingress:
#      - hostname: sim.pithros.in
#        service: http://localhost:80
#      - service: http_status:404
# 6. run
cloudflared tunnel run pithros-sim
```

- **DNS record needed:** `sim.pithros.in` → `CNAME <TUNNEL-UUID>.cfargotunnel.com` (**proxied**), created by step 4. **Do not touch `pithros.in` / `www.pithros.in`.**
- **R2 CORS origin needed:** add **`https://sim.pithros.in`** to `AllowedOrigins` on `pithros-public`, `pithros-private`, `pithros-sensitive` (keep the existing production origins).
- **Rollback:** `cloudflared tunnel delete pithros-sim`; delete the `sim.pithros.in` CNAME; revert the R2 CORS `AllowedOrigins`.
- **Risk:** a public hostname is exposed (mitigated by Cloudflare + the sim being synthetic). No production DNS is changed.

## Option B (alternative, no public exposure): Tailscale Serve — `https://pravin-server.<tailnet>.ts.net`

```sh
# HUMAN: enable HTTPS certificates in the Tailscale admin console (DNS page)
tailscale serve --bg https / http://localhost:80
tailscale serve status
```
- **Origin to add to R2 CORS:** `https://pravin-server.<tailnet>.ts.net`.
- **Rollback:** `tailscale serve reset`; revert R2 CORS.
- Tailnet-only (not public) — but reachable only by tailnet devices.

## After the HTTPS origin exists, prove (per §1)

`browser → upload intent → OPTIONS → PUT presigned → R2 → complete → refresh → media still visible` for **private / sensitive / public**. **No filesystem fallback.**

## Evidence of the current block (for reference)

- Presigned PUT targets **`pithros-private`**.
- `OPTIONS` with `Origin: http://10.153.175.57` → **403**, no `Access-Control-Allow-Origin`.
- Real Chromium from `http://10.153.175.57` → `fetch(PUT)` → **`TypeError: Failed to fetch`**.

**STOP — awaiting either (A) the tunnel, (B) `tailscale serve`, or (C) explicit approval to add `http://10.153.175.57` to the bucket CORS.**
