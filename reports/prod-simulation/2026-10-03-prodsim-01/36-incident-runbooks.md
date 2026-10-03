# 36 — INCIDENT RUNBOOKS

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f`

Format: DETECT · CONTAIN · RECOVER · VERIFY · COMMUNICATE · DOCUMENT.

**DB outage (Supabase)** — DETECT: `/ready` `database:false`, 5xx on DB routes. CONTAIN: read-only/queue writes, surface generic errors. RECOVER: provider restores; app reconnects (pool). VERIFY: `/ready` 200 + representative read. COMMUNICATE: status page. DOCUMENT: incident + RPO/RTO.

**Redis outage** — DETECT: `/ready` `redis:false`. CONTAIN: rate-limit/cache fail-open (already designed). RECOVER: restart `redis`. VERIFY: `/ready`. Root: `docker compose restart redis`.

**R2 outage** — DETECT: `storage:false` in `/ready`; upload `complete` failures. CONTAIN: reject new uploads honestly (no silent local fallback). RECOVER: provider restored. VERIFY: round-trip.

**Firebase outage** — DETECT: `auth_verification_failed` with `NETWORK_FAILURE`/`CERTIFICATE_FETCH_FAILURE`. CONTAIN: **fail closed** (401, never accept). RECOVER: dependency returns. VERIFY: login.

**Email outage** — DETECT: SMTP errors; receipts unsent. CONTAIN: payment stays valid (email is separate). RECOVER: provider/Mailpit back. VERIFY: one receipt.

**Worker outage** — DETECT: queue depth grows. CONTAIN: requests unaffected. RECOVER: restart worker. VERIFY: queue drains.

**Bad deployment** — DETECT: smoke fails / `/ready` fails. CONTAIN: stop new traffic. RECOVER: `git checkout <good-sha>` → `deploy.sh`. VERIFY: smoke. (see 15)

**Bad migration** — DETECT: startup/migration failure. CONTAIN: do not run destructive downgrades. RECOVER: forward-fix migration (chain is additive). VERIFY: `alembic check`.

**Host outage / reboot** — DETECT: unreachable. CONTAIN: n/a. RECOVER: reboot; containers `restart: unless-stopped`. VERIFY: smoke. (see 16)

**Disk full** — DETECT: `df` / write errors. CONTAIN: prune Docker, rotate logs. RECOVER: free space. VERIFY: writes succeed.

**RAM pressure** — DETECT: load/`free`. CONTAIN: restart heavy container, reduce concurrency. RECOVER: normal. VERIFY: `/ready`.

**Traffic spike** — DETECT: latency/error rise (see 21). CONTAIN: rate limits, shed load. RECOVER: automatic (verified). VERIFY: latency normalizes.

**Security incident** — DETECT: audit anomalies / auth failures. CONTAIN: rotate keys, disable account. RECOVER: patch/redeploy. VERIFY: red-team re-test. DOCUMENT: timeline.

**Verdict:** runbooks documented (concise). Not all rehearsed.
