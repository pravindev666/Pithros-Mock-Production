# 00 — EXECUTIVE SUMMARY · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Tested app SHA:** `c050b2f` · **Date:** 2026-10-03

## What was done

Pithros was deployed to a single VirtualBox VM (`10.153.175.57`, Ubuntu 24.04, 2 vCPU / 7.8 GiB / HDD) as a one-server production simulation: Caddy front door, FastAPI + Celery + beat + Redis + Mailpit in containers, with **real** Firebase (`pithros-dev`), a dedicated **Supabase test/staging** Postgres, and **real R2**. Docker Compose, no Kubernetes/microservices. The exact revision `c050b2f` is running; a pre-existing **Dokploy** swarm on `:3000` was left untouched.

## What works (evidence-backed)

- **Deploy**: exact-SHA deploy via git bundle; migrations + catalog seed; all containers healthy; `/ready` reports `{database,redis,storage}` true.
- **Auth**: real Firebase signup → token → `/me` 200; anonymous/bogus → 401 (fail-closed); structured auth logs, no token leakage.
- **Journeys**: **17/17** — publication/privacy transition, tribute moderation, contributor invite→accept→permissions, media server path, 10/10 anonymous authorization boundaries.
- **Security**: **15/15** — IDOR, role escalation, signed-URL tamper, malformed/oversized uploads, XSS/SQLi/traversal all refused or inert.
- **Chaos/DR**: container restarts recover in seconds; **backup→destroy→restore→verify** proven on a disposable DB.
- **Soak**: 40 VUs for 30 min — **stable**, 0.29 % errors, no leaks.

## What is blocked / not done (honest)

- **R2 browser upload: BLOCKED** — the applied bucket CORS allows `https://pithros.in`, but the deployed origin is `http://10.153.175.57`; preflight **403**. (Server path works.)
- **Billing/receipt E2E: BLOCKED** — Cashfree credentials unavailable (not a failure).
- **VM reboot: BLOCKED** — needs operator `sudo`.
- **PENDING**: mobile journey, CI run (needs a push), Trivy scan, DB query-plan profiling, farewell E2E, full reconciliation, RUN_ID cleanup.
- **Firewall: NOT applied** — awaiting approval.

## Capacity (workload-conditional, not a user count)

Under a mixed read workload (60 % public / 30 % `/me` / 10 % media): **~40 concurrent = safe** (27 req/s, p95 < 1 s, <0.5 % err); **~100 = degraded** (13 % err, p95 2.8 s); **~200 = saturated** (p95 32–40 s, 11–21 % err). **First bottleneck: CPU (2 vCPU) + remote-DB latency.** Recovery from a 5× spike is automatic.

## Headline defects fixed this campaign

3 code-controlled defects found and fixed with regression coverage: beat `/app` permissions, Mailpit SMTP-auth startup, and the Firebase env-var credential path (D1–D3).

## Verdict

**The deployed system is FUNCTIONAL and reasonably secure; it is NOT production-hardened and capacity is modest.** See `99-final-release-gate.md`.
