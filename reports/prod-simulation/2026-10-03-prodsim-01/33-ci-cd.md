# 33 — CI/CD (REAL RUN) · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Fix commit:** `7f62f7b` · **Date:** 2026-10-03

## Original failure — run #1 (`46d7f43`) → FAILED
Frontend ✅ · Backend ❌ (pytest step) · Secret scan (gitleaks) ❌.

## Root cause (evidence-backed)
**Backend pytest failed only on the Linux runner.** `tests/test_verification_ai.py` renders its
OCR fixtures with `arial.ttf` (a Windows font that does not exist on the runner). The fallback,
`ImageFont.load_default()` (fixed-size, pre-3.10 bitmap), renders the digits too small, so **Tesseract
misread them** — reproduced directly: with the fallback, `15/03/2026` is read as **`15/03/2028`** and
`…08129` as `…08128`, so the exact-value OCR assertions fail. On Windows (`arial.ttf`) the same fixture
reads correctly, which is why it passed locally.

**Python version was NOT the cause:** the full suite passes under an isolated **Python 3.12.13** venv
(267 passed), and also with `.env*` files removed. (`uv` was used to create the 3.12 env.)

## Fix (`7f62f7b`) — smallest root cause
`test_verification_ai.py`: fall back to the **size-aware** `ImageFont.load_default(size=22/26)`
(Pillow ≥ 10.1, repo pins `Pillow>=11.0`) so the glyphs are legible on any platform. No assertion was
loosened; no test was skipped.

## gitleaks finding
The leaked value was the **public Firebase Web API key hardcoded as a default in `load/k6/*.js`**
(not in `.env.development`, which is gitignored and untracked). It matches gitleaks's `google-api-key`
rule. It is a **public client-side identifier**, not a server secret.

**Fix:** stop hardcoding it — the scripts now require `FIREBASE_API_KEY` — and add a **narrowly scoped**
`.gitleaks.toml` allowlist (exact value, only `^load/k6/.*\.js$`) covering the historical commit. The
default rule set stays enabled; nothing broad is ignored. The key was **not** revoked.

## Verified locally before pushing
pytest 267 passed / 1 skipped · ruff + format + mypy clean · tsc + check:live + build clean.

## Authoritative result — run #2 (`7f62f7b`) → **SUCCESS**

| Job | Result |
|---|---|
| Frontend (types, guard, build) | **✅ success** |
| Backend (lint, types, tests, migrations) | **✅ success** |
| Secret scan (gitleaks) | **✅ success** |

**Stage 10 CI/CD: PASS (real GitHub Actions run is green).**
