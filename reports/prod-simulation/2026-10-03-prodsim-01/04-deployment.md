# 04 — DEPLOYMENT · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Date:** 2026-10-03
**Deployed revision:** `c050b2f0592f6ed7230a93aa121a4eace434a73f` (main)
**Host:** `pravin-server` · Ubuntu 24.04.5 LTS · kernel 6.8.0-142 · KVM guest · IP `10.153.175.57`

---

## 1. Hardware baseline

| Resource | Value |
|---|---|
| CPU | Intel Core i3-3240 @ 3.40 GHz · 2 cores / 2 threads (no HT) |
| Memory | 7.8 GiB total, ~6.5 GiB available at idle |
| Swap | 4 GiB (`/swap.img`, unused at idle) |
| Disk | LVM ext4 57 G on `/`, **28 G free (50 % used)** · `/boot` 2 G · **rotational (HDD-class)** |
| Network | `enp0s3` 10.153.175.57/24 (LAN) · `tailscale0` 100.124.202.42 · global IPv6 present |
| Time | UTC, NTP synchronized |
| Docker | Engine 29.8.1 · Compose v5.5.1 · storage driver `overlayfs` · root `/var/lib/docker` |

**Pre-existing workload (left untouched):** a **Dokploy** install running in Docker **Swarm** — `dokploy` (port **3000**, healthy) and `dokploy-postgres`, on overlay networks `dokploy-network`/`ingress`. The simulation stack coexists on **:80** (Caddy) and **:8025** (Mailpit).

**Privilege:** user `pravin` is in the `docker` group (**no sudo password available non-interactively**). All app work runs via the Docker daemon without sudo. Host firewall hardening is **blocked on a one-time operator `sudo` action** (see §5).

## 2. Deployment method

- Exact revision delivered by **git bundle** (no push): full bundle → `git clone` on the VM, then **delta bundles** for subsequent commits. VM checkout is at the exact SHA above.
- Stack: `docker-compose.sim.yml` (standalone) + `Caddyfile.sim`, deployed by `scripts/prod-sim/deploy.sh` (explicit `alembic upgrade head` → idempotent `seed_catalog.py` → `up -d` → readiness wait).
- Secrets: generated merged `runtime/app.env` (mode 600) from the local test credentials — **no secret value was printed**.

## 3. Services and post-deploy state

| Service | Status | Notes |
|---|---|---|
| backend | Up (healthy) | uvicorn ×2, `/health` 200 |
| worker | Up | `celery@… ready`, connected to Redis |
| beat | Up | schedule file created in `/app`; scheduler starting |
| redis | Up (healthy) | internal only |
| frontend | Up (healthy) | built SPA (Vite, real Firebase config baked in) |
| caddy | Up | single LAN door `:80` |
| mailpit | Up (healthy) | SMTP 1025 internal, UI 8025 LAN |

**Ingress through Caddy:** `/` 200 · `/health` 200 · `/ready` 200 · `/api/v1/health` 200 · `/api/v1/ready` 200 · `/api/v1/billing/plans` 200 · unknown route → SPA 200 (client-routed 404).
**Readiness:** `{"status":"ready","checks":{"database":true,"redis":true,"storage":true}}` — Supabase + Redis + R2 all reachable **from the deployed container**.

## 4. External integrations proven

- **Supabase (test/staging DB):** `alembic upgrade head` applied the full migration chain to the Supabase database at deploy; `/api/v1/billing/plans` served seeded catalog rows (read); first `/me` **wrote a real `User` row** (provisioning) — read **and** write proven.
- **Firebase (`pithros-dev`):** real email/password signup via the public REST API (200) → ID token → `GET /api/v1/me` **200** with a provisioned Pithros user (role `visitor`). Anonymous → 401; bogus token → 401 (**fail-closed**).
- **R2:** readiness `storage: true` (server-side reachability). Full browser upload/round-trip is Phase 9.
- **Celery/Redis:** worker connected, beat scheduling; queues live.
- **Mailpit:** listening on 8025 (SMTP 1025 in-network). Receipt E2E is blocked on the deferred Cashfree leg.

**Auth observability confirmed in the deployed logs:** `firebase_initialised` (project `pithros-dev`), `firebase_certificates_prewarmed`, and `auth_verification_failed` with category `INVALID_TOKEN` and **no token value** — the Session B hardening behaves correctly in production.

## 5. Defects found and fixed during deployment (reproduce → fix → test → regression → redeploy)

| ID | Sev | Defect (evidence) | Root cause | Fix |
|----|-----|-------------------|-----------|-----|
| **D1** | P1 | `beat` crash-looped: `PermissionError: [Errno 13] Permission denied: 'celerybeat-schedule'`; `ls -ld /app` = `root root`, `APP_NOT_WRITABLE` | `WORKDIR /app` creates `/app` as root; `COPY --chown` does not chown the directory itself | `RUN chown pithros:pithros /app` in the backend image (`c34ef29`) |
| **D2** | P1 | `mailpit` exited 1: `[smtp] authentication requires STARTTLS …` | `MP_SMTP_AUTH_ACCEPT_ANY` enables SMTP auth over a non-TLS connection | removed the auth flag (app sends no SMTP credentials) (`c34ef29`) |
| **D3** | P1 | `GET /me` → *"Authentication is not configured on this server."* even with a valid token | (a) bind-mounted SA unreadable by container uid 1001 in a 700 host dir; (b) **the env-var credential path built an incomplete service-account dict** and google-auth rejected it (`missing fields token_uri`) | fixed `_credential()` to supply the full service-account field set + regression test (`c050b2f`); simulation uses env-var credentials, no key file |

D1 and D2 also affect the **real** production overlay, not just the simulation. All three are committed; the backend suite and lint/type gates stay green.

## 6. Fixes committed this stage

`c34ef29` (writable `/app`, Mailpit auth) · `c050b2f` (Firebase env-var credential path + regression test). Earlier stage commits: `777ee5e` (deploy ref), `50ea22d` (sim stack), `24cded9` (repo-relative runtime).

## 7. Open / blocked

- **Host firewall / sysstat:** requires a one-time operator `sudo` (default-deny inbound, expose only :80). Not applied — do not want to risk SSH/Docker. The VM has a global IPv6 address, so this is worth doing.
- **Billing / receipt email through the deployed stack:** blocked — Cashfree keys intentionally deferred; the test payment simulator is in-process only (test suite), not reachable from the deployed app. Receipts cannot be produced end-to-end until that leg is re-scoped.
- **R2 browser round-trip, 2nd-user isolation, media, verification, contributor, farewell journeys:** Phase 9/16.
- **`R2_PUBLIC_BASE_URL`** is unset in the test env — public-tier media URL behavior to be confirmed in Phase 9.

**Stage 4 verdict: stack deployed at the exact revision and RUNNING, with real Firebase + Supabase + Redis + R2 reachability proven through Caddy. Three real defects found and fixed.**
