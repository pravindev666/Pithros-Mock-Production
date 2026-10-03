# 00 — PREFLIGHT · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01`
**Date:** 2026-10-03
**Scope:** production-simulation deployment of Pithros onto VM `10.153.175.57` (user `pravin`).
**Mode:** resume from verified state. No re-audit, no redesign. This report is evidence only.

---

## 1. Repository state

| Item | Value |
|---|---|
| Branch | `main` |
| Base HEAD (pre-checkpoint) | `8f6a37d` |
| Remote | `https://github.com/pravindev666/Pithros-Mock-Production.git` |
| **Deploy ref (this checkpoint)** | **`777ee5e92e3e6f6954e518b69e7fcd5b88efe3cb`** |
| Checkpoint diff | 44 files changed, 1524 insertions(+), 230 deletions(-) |
| Push | **not pushed** (by policy — push only when asked; CI phase needs explicit go-ahead) |

**Committed at the checkpoint:** Session A/B hardening — billing IDOR/order/verify/sponsorship stewardship binding, race-safe webhook capture, 11 live demo bindings removed, MFA bypass gated, payment/Razorpay self-gated, explore fallback + 404 route, CI workflow, `backup.sh` + `pg_dump`, lifecycle schedulers + tests, users query bounded/eager/escaped, catalog seed, firebase cert prewarm + bounded retry.

**Intentionally left uncommitted (named, not ignored):** `Pithros/debug_timeline_dump.html` (debug artifact), `gold_master_prompt.txt`, `gold_master_prompt_full.txt`, `phases_detailed.txt` (mission/planning notes).

## 2. Verification gates (run this session, on `777ee5e`)

| Gate | Command | Result |
|---|---|---|
| Backend tests | `.venv\Scripts\python.exe -m pytest -q` | **258 passed, 1 skipped, 16 deselected** (228 s) |
| Skip reason | `test_payments_cashfree.py:315` | Cashfree sandbox keys not configured — **external, expected** |
| Ruff lint | `ruff check .` | clean |
| Ruff format | `ruff format --check .` | 164 files already formatted |
| Types | `mypy app` | Success, 110 source files |
| Migration drift | `alembic upgrade head` + `alembic check` on **local scratch DB** | clean, **zero drift** |
| Frontend types | `npm run lint` (tsc) | clean |
| Live-mode guard | `npm run check:live` | OK — no production-reachable demo bindings |
| Frontend build | `npm run build` | built (`dist/` incl. `index.html`, hashed assets, `sw.js`) |
| Secret scan | literal scan for private keys / `AIza…` / `AKIA…` / credential literals | clean — only `localhost` placeholder DSNs |

## 3. Deployment surface (verified, read-only)

**Topology:** `docker-compose.yml` (base: postgres, redis, minio, minio-init, backend, worker, beat, frontend) + `docker-compose.prod.yml` (overlay + `proxy`/`backup` profiles). Backend image `python:3.14-slim`, non-root uid 1001, **no entrypoint, migrations not run at boot**, CMD `uvicorn … --workers 2`. Frontend image = **Caddy 2** serving the built SPA on `:80`.

**Expected ports:** Caddy `80`/`443` (prod proxy profile); frontend `80` (container) → `3000` (base host map); backend `8000` (container, internal); Postgres `5432`, Redis `6379` (base host maps; none in prod).

**Health/readiness:** `GET /health`, `GET /ready` (DB+Redis gate; storage reported, not gating), and `GET /api/v1/health`, `GET /api/v1/ready`.

**Production boot guard** (`app/core/config.py`, refuses to start when `ENVIRONMENT=production`): `DEMO_MODE=false`; `CORS_ORIGINS` without `*`; `STORAGE_BACKEND=s3`; `EXPOSE_INVITATION_TOKENS=false`; non-empty `FIREBASE_PROJECT_ID`; Firebase credentials present.

**Required env var NAMES (values never recorded):**
- Runtime: `ENVIRONMENT`, `DEBUG`, `DEMO_MODE`, `LOG_LEVEL`, `LOG_JSON`, `APP_BASE_URL`, `FRONTEND_BASE_URL`, `CORS_ORIGINS`
- DB: `DATABASE_URL`, `DATABASE_POOL_SIZE`, `DATABASE_MAX_OVERFLOW`
- Redis: `REDIS_URL`
- Firebase: `FIREBASE_SERVICE_ACCOUNT_FILE`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- Storage/R2: `STORAGE_BACKEND`, `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_REGION`, `R2_BUCKET_PUBLIC`, `R2_BUCKET_PRIVATE`, `R2_BUCKET_SENSITIVE`, `R2_PUBLIC_BASE_URL`, `R2_PRESIGN_EXPIRY_SECONDS`, `R2_BACKUP_BUCKET`
- Email: `EMAIL_ENABLED`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_USE_TLS`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`
- Cashfree: `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_WEBHOOK_SECRET`, `CASHFREE_BASE_URL`, `CASHFREE_API_VERSION`
- Security/limits: `RATE_LIMIT_ENABLED`, `IDEMPOTENCY_ENABLED`, `MAX_UPLOAD_BYTES`, `TESSERACT_CMD`
- Lifecycle/flags: `INVITE_TOKEN_TTL_HOURS`, `EXPOSE_INVITATION_TOKENS`, `ACCOUNT_DELETION_GRACE_DAYS`, `RECENT_REAUTH_WINDOW_MINUTES`, `VERIFICATION_DOCUMENT_RETENTION_DAYS`
- Frontend build args: `VITE_API_BASE_URL`, `VITE_DEMO_MODE`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`

**External targets:** Firebase project `pithros-dev` (identity); dedicated Supabase **test/staging** Postgres (business truth); Cloudflare R2 **test bucket/prefix** (`prod-sim/<RUN_ID>/`) — media; Mailpit SMTP for the simulation; **no Cloudflare Tunnel** → ingress is Caddy on the VM LAN IP. Live Cashfree = **intentionally deferred** (test simulator only).

## 4. Deploy blockers found (to fix in Stage 3)

| ID | Sev | Defect |
|----|-----|--------|
| B1 | P0 | `VITE_FIREBASE_*` build args never passed by compose → built SPA has no Firebase config → live browser auth dead |
| B2 | P0 | Base compose sets `DATABASE_URL`/`REDIS_URL`/`R2_ENDPOINT_URL` under `environment:` (beats `env_file`) → prod silently targets local postgres/redis/minio; stale `depends_on` |
| B3 | P0 | Migrations never run at deploy → empty schema |
| B4 | P1 | `tesseract-ocr` binary absent from backend image → verification OCR disabled |
| B5 | P1 | No `Pithros/.dockerignore` → build-context leakage |
| B6 | P1 | Backup has no restore counterpart / no encryption |
| B7 | P1 | No Mailpit service; prod `Caddyfile` hardcoded to `pithros.in` + public ACME |
| B8 | P1 | No deterministic synthetic-data generator / RUN_ID cleanup |
| B9 | P1 | No load tooling |
| B10 | P2 | No VM-targeted E2E journey suite |

## 5. Blocked on you

1. **Authorize the SSH key (one-time)** — you type the VM password in your terminal; I never handle it. **Rotate the password** you pasted (now in chat history).
2. **Place VM secrets** — `firebase-service-account.json` in `/opt/pithros/secrets/`; `/opt/pithros/env/*.env` with the test Supabase DSN, R2 test-bucket keys, Firebase web config, Mailpit SMTP. Names-only template supplied by me.
3. **Confirm the Supabase DSN is genuinely non-production** (gate before any destructive/load DB leg).
4. **CI phase (43) requires a push** — explicit go-ahead needed.

## 6. Rules in force

No secrets in repo/commands/reports (names only). No cheating (no `email_verified=True`, role/entitlement injection, sessionStorage auth, accepting unverified tokens, fabricated payment success). Server stays authority; fail closed. Destructive DB/load/chaos → dedicated test Supabase or a disposable local Postgres **only**. Expiry never deletes user content. No redesign. Commit at clean checkpoints; push only when asked.

**Stage 0 verdict: COMPLETE — all local gates green; deploy ref `777ee5e` recorded; blockers enumerated.**
