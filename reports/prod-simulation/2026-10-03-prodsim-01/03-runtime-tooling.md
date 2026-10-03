# 03 — RUNTIME TOOLING

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f`

Installed on the VM (detected, not added): Docker Engine **29.8.1**, Compose **v5.5.1**, git 2.43, curl 8.5, jq 1.7. The application runs entirely in containers, so **no host app runtime was needed**.

Not installed (blocked on sudo): `sysstat`/`iostat`, `htop`. Metrics were gathered via `/proc`, `free`, `df`, `docker stats`, and `docker exec` instead.

On the Windows generator host: **k6 v2.3.0** (via `scoop`), Python 3.13 venv (backend), Playwright Chromium.

**Verdict: PASS** — all required tooling present; only optional observability packages deferred (sudo).
