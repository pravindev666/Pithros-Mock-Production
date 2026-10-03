# 05 — EXTERNAL INTEGRATIONS

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f`

| Integration | Status | Evidence |
|---|---|---|
| **Firebase** (`pithros-dev`) | **VERIFIED** | real signup → ID token → `GET /me` 200 (provisioned user); anon/bogus → 401 (fail-closed); `firebase_initialised` + `firebase_certificates_prewarmed` in logs |
| **Supabase PostgreSQL** (test/staging, remote) | **VERIFIED** | full `alembic upgrade head` applied; catalog read; real `User` row written (provisioning); 24–28 pooled connections, no leak |
| **Cloudflare R2** | **PARTIAL** | server-side path fully verified (PUT/complete/retrieve/delete, cross-user 404); **browser upload BLOCKED** — CORS origin mismatch (`http://10.153.175.57` not allowed); readiness `storage:true` |
| **Redis** | **VERIFIED** | worker connected; queue depth 0; brief restart tolerated |
| **Celery worker + beat** | **VERIFIED** | worker `ready`, beat scheduling, `process_uploaded_media` ran and produced a thumbnail |
| **SMTP / Mailpit** | **VERIFIED (transport)** | `send_email()` → Mailpit received the message; **receipt business flow BLOCKED (Cashfree)** |
| **Cashfree** | **BLOCKED** | real transactions intentionally deferred; test simulator is in-process only |

**Auth hardening in production confirmed:** structured `auth_verification_failed` logs with category `INVALID_TOKEN` and **no token value**.
