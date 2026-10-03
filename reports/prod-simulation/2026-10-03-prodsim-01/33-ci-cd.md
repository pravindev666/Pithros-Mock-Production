# 33 — CI/CD (REAL RUN) · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Tested SHA:** `c050b2f` · **Pushed:** `46d7f43`

## Actual GitHub Actions result — **FAILED**

Run **#1** (`id 37154237901`, trigger `push`, repo **public**) executed for real after the approved push.

| Job | Result |
|---|---|
| Frontend (types, guard, build) | **✅ success** |
| Backend (lint, types, tests, migrations) | **❌ failure** — failing step: **Tests (pytest)**; ruff/format/mypy/migration-drift **passed** |
| Secret scan (gitleaks) | **❌ failure** |

**Log access:** job logs require GitHub auth; the step-level conclusions were read from the public API. The exact pytest assertion output and the gitleaks rule were **not** retrieved (no token).

## Assessment

- **Backend pytest fails in CI but passes locally** (258 passed locally). Difference: CI runs on **Python 3.12** with fresh Postgres/Redis services and no Mailpit/Tesseract-optional deps; local venv differs. **Root cause not yet identified** — needs the CI log (or a Python-3.12 local repro). **Diagnose → fix → re-run** loop is open.
- **gitleaks failure:** most likely the **public Firebase web API key** committed in `Pithros/.env.development` (`AIza…` matches the `google-api-key` rule). That key is a **public client key by design**; the correct fix is a scoped `.gitleaks.toml` allowlist (with justification), **not** removing the key. Not yet confirmed from the log.

## Verdict
**Stage 10 CI/CD: FAILED (real run).** The pipeline executes and catches real issues; two failures are open and require the CI logs / a fix. Do **not** treat this as green.
