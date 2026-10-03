# 32 — API / ERROR MATRIX

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f`

| Case | Observed | Notes |
|---|---|---|
| 200 | health, ready, plans, public memorial, media list | ok |
| 201 | create memorial, upload-intent, tribute | ok |
| 204 | owner media delete | ok |
| 400 | malformed upload complete / tampered signed URL | refused cleanly |
| 401 | anonymous protected, bogus token, valid-but-unconfigured earlier | generic message, **no token/DB internals** |
| 403 | viewer edit, normal-user admin endpoints, tampered CORS | ok |
| 404 | IDOR (no existence oracle), private memorial public GET, path traversal | ok |
| 409 | optimistic-lock edit conflict; publish-while-private | ok |
| 422 | malformed/oversized upload, invalid email, invalid role | ok |
| 429 | `/public/search` past 60/min/IP | rate limiter works |
| 503/502 | during container restarts (backend) | recovered automatically |
| 500 / timeout | **not observed at low load**; timeouts (60 s) appeared only under saturation | documented in 20/21 |

- Error bodies are generic JSON `{error:{code,message,requestId}}` — **no stack traces, DB internals, or credentials** were exposed.

**Verdict: PASS** for the exercised matrix.
