# 13 — SECURITY / RED-TEAM · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Tested app SHA:** `c050b2f` · **Date:** 2026-10-03
Method: real Firebase tokens + real API through Caddy; anonymous + second-user + normal-user personas.

## Results (15/15)

| Test | Result | Evidence |
|---|---|---|
| IDOR — user B reads A's memorial | **PASS** | 404 (no existence oracle) |
| Anonymous reads private memorial | **PASS** | 401 |
| Role escalation — admin endpoints as normal user | **PASS** | 403 on `/admin/verification`, `/admin/audit`, `/billing/admin/overview`, `/admin/users` |
| Signed-URL tamper | **PASS** | tampered signature → 400 (refused) |
| Malformed upload (bytes ≠ extension) | **PASS** | rejected at complete → 422 (server re-inspects bytes) |
| Oversized upload | **PASS** | upload-intent → 422 |
| XSS payload in memorial name | **PASS** | stored, returned inert (201) |
| SQL injection probe (`'; DROP TABLE …`) | **PASS** | normal 200, no error/stack trace |
| Path traversal (`..%2f..%2fetc%2fpasswd`) | **PASS** | 404 |
| Private media without auth (from media flow) | **PASS** | 401/404 |
| Cross-user media delete (from 06-r2-media) | **PASS** | 404 |

Additional from the journeys run: 10/10 protected endpoints refused anonymously.

## Not exercised (honest)

- Stale/expired real token rotation (a freshly minted token was used; malformed token → 401 verified). Expiry-replay of a previously-valid token not tested.
- Admin-role positive paths (would require minting admin claims via Firebase Admin — the local harness path; deferred to Stage 9 with a real admin persona).
- Rate-limit abuse curves (Stage 7E) — partially observed: `/public/search` returns 429 past 60/min/IP.

## Verdict
**Stage 7E/security: PASS.** No authorization or injection defect surfaced. **0 code-controlled defects.**
