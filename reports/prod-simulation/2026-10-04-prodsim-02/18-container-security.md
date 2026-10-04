# 18 — CONTAINER SECURITY (Trivy) · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-04-prodsim-02` · **Date:** 2026-10-04
**Scanner:** `aquasec/trivy:latest` (Trivy 0.75) run **on the VM** against the built images (no host install).
**Scope:** `HIGH,CRITICAL` vulnerabilities + secret scanning, images `pithros-backend:sim` and `pithros-frontend:sim`.

| Image | BEFORE sha | AFTER sha |
|---|---|---|
| pithros-backend:sim | `7f62f7b` build (msgpack 1.1.2 era base) | `bc0d275` (surgical libpcre2 patch) |
| pithros-frontend:sim | `7f62f7b` build (caddy v2.11.4) | `bc0d275` (caddy v2.11.6) |

---

## 1. BEFORE / AFTER

| Target | Type | BEFORE | AFTER | Δ |
|---|---|---|---|---|
| `pithros-backend:sim` (debian 13.7) | debian | **85** (84 HIGH, 1 CRIT) | **84** (83 HIGH, 1 CRIT) | **−1** |
| Python (`pip/_vendor` SBOM) | python-pkg | 4 HIGH | 4 HIGH | 0 — **FALSE POSITIVE** (vendored) |
| `/app/app/auth/firebase.py` | secret | **1 CRIT** | **0** | **−1** (narrow allow-rule) |
| `pithros-frontend:sim` (alpine 3.23.6) | alpine | 0 | 0 | 0 |
| `usr/bin/caddy` | gobinary | **17 HIGH** | **0** | **−17** (caddy v2.11.4 → v2.11.6) |
| **Totals (raw)** | | **107** | **88** | **−19** |
| **Real, actionable remaining** | | | **0** | the 4 Python are a documented FP |

Raw evidence: `backend-before.txt`, `backend-after.txt`, `frontend-before.txt`, `frontend-after.txt`,
`backend-no-sbom.txt` (this directory).

---

## 2. Fixes applied

**FIX-1 · Backend OS — the single fixable Debian CVE.**
- `libpcre2-8-0` `10.46-1~deb13u2` → `10.46-1~deb13u3` clears `CVE-2026-103111` (OOB write in pcre2).
- Fix: `backend/Dockerfile` runtime stage now runs `apt-get install --only-upgrade -y libpcre2-8-0`
  (narrowest possible change — only the one package with a shipped fix; no mass `apt-get upgrade`).
- It was the **only** Debian finding whose status was `fixed`; all others are `affected` /
  `will_not_fix` / `fix_deferred` (no Debian 13 patch exists).
- Verified: `dpkg-query -W libpcre2-8-0` in the rebuilt image → `10.46-1~deb13u3`.

**FIX-2 · Frontend — caddy base refresh.**
- Rebuilding the frontend image picked up a newer `caddy:2-alpine`: **v2.11.4 → v2.11.6**, whose Go
  toolchain carries the fixes for all 17 Go stdlib / `golang.org/x/*` / `grpc` CVEs.
- Fix: no code change — the base image refresh that the normal deploy performs. Verified:
  `caddy version` → `v2.11.6`.

**FIX-3 · Secret false positive — narrowest possible exception.**
- The GCP-service-account rule matched the **shape** of the dict `app/auth/firebase.py` builds at
  runtime from environment variables (`settings.firebase_*`). No credential value is present.
- Fix: `scripts/prod-sim/trivy-secret.yaml` with a single global `allow-rules` entry whose `path`
  is scoped to `app/auth/firebase\.py$`. Every other file and every other secret rule stays enabled;
  the secret scanner is **not** disabled.
- Verified: the AFTER scan reports **0** secrets and no `(secrets)` section.

**FIX-4 · Real Python packages (already fixed by the rebuild).**
- The application's own `msgpack` is **1.2.3** (not 1.1.2) and `urllib3` is **2.8.0** (not 2.7.0) in
  `/opt/venv` — a fresh image build resolved the fixed versions. No `setuptools` is installed.

---

## 3. False positive — the 4 Python "HIGH"

Trivy emits `Third-party SBOM may lead to inaccurate vulnerability detection` for this image: it
ingests **`pip/_vendor/bom.cdx.json`** (the SBOM pip ships describing *its own vendored libraries*)
and reports those vendored versions as if they were installed packages.

Evidence (read from the running image):
- `pip/_vendor/bom.cdx.json` lists exactly `msgpack 1.1.2`, `urllib3 2.7.0`, `setuptools 70.3.0`
  — the four findings.
- `pip/_vendor/vendor.txt` → `msgpack==1.1.2`, `urllib3==2.7.0`, `setuptools==70.3.0`.
- The installed (top-level) packages are msgpack **1.2.3** and urllib3 **2.8.0**; **no setuptools**
  is installed anywhere (`find / -name 'setuptools-*.dist-info'` → nothing).
- Re-scanning with `--skip-files '**/pip/_vendor/bom.cdx.json'` reports **no Python target at all** →
  the four findings come solely from pip's bundled SBOM metadata.

Classification: **FALSE POSITIVE — vendored pip libraries, not on the application runtime import
path.** Not fixed (nothing to upgrade: pip 26.2.1 is current); documented as an accepted exception.

---

## 4. Remaining — accepted base-image backlog (no fix available)

84 Debian findings remain, all `affected` / `will_not_fix` / `fix_deferred` in Debian 13 trixie:

| Package family | Examples |
|---|---|
| `util-linux` (bsdutils, mount, login, libblkid/libmount/libsmartcols/libuuid/liblastlog2) | CVE-2026-76642, -78408, -78409, -78410 |
| `libxml2` | **CVE-2026-6653 (CRITICAL)**, -74860, -86138…-86144 |
| `curl`/`libcurl4t64` | CVE-2026-12064, -8286, -8458, -8927 |
| `libexpat1` | CVE-2026-66046, -76956, -76957, -93990 |
| `tesseract-ocr`/`libtesseract5` | CVE-2026-73066, -88047, -88048, -88051…-88053 |
| `libtiff6`, `libx11`, `libxrender`, `ncurses`, `perl`, `systemd` | misc |

These are base-image OS packages pulled in by `python:3.14-slim` and the runtime apt installs
(`curl`, `postgresql-client`, `tesseract-ocr`). The fix is a future base-image refresh once Debian
ships patches — not a code change. The one CRITICAL (`libxml2` DoS) is `affected`/no-fix.

**Base-image decision (evaluated, not changed):** the current `python:3.14-slim` (glibc/Debian 13) is
retained. Switching to an Alpine/musl base would cut the OS finding count but risks the
`psycopg`/`tesseract`/`reportlab` binary stack and is out of scope for a hardening pass. Recommend a
scheduled rebuild to pick up Debian point releases.

---

## 5. Verdict

**Trivy: actionably CLEAN.** Every finding that has a fix is fixed (1 OS CVE, 17 frontend CVEs, 1
secret suppression); the previously-reported actionable Python bump (`msgpack`) is already resolved
in the rebuilt image. The only remaining findings are (a) a pip-vendored-SBOM **false positive** and
(b) **no-fix** base-image packages — both documented, neither code-controlled.
