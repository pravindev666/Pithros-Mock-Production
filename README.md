# Pithros — Digital Memorial Platform

A permanent digital place to remember a life.

This repository holds the frontend and the backend that now powers it:

```
Pithros-Rememberence-Project/
  Pithros/     React + Vite frontend (the approved visual design, unchanged)
  backend/     FastAPI + PostgreSQL + Redis + Celery
  scripts/     Local development helpers
```

**Responsibility split.** Firebase is identity. FastAPI is the business
authority. PostgreSQL is the source of truth. Object storage holds files. Redis is
transport and cache. Celery executes work asynchronously. None of these overlap.

---

## Running it locally

### 1. Start the databases

PostgreSQL and Redis are installed locally (via scoop — no Docker required).

```powershell
.\scripts\dev-db.ps1 start
.\scripts\dev-db.ps1 status
```

### 2. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt

.\.venv\Scripts\alembic.exe upgrade head     # create the schema
.\.venv\Scripts\python.exe -m app.seed       # optional demo data

.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

- API docs: <http://localhost:8000/docs>
- Readiness: <http://localhost:8000/ready>

### 3. Frontend

```powershell
cd Pithros
npm install
npm run dev          # http://localhost:3000
```

### Quality gates

Run these before considering any change finished.

```powershell
# backend
cd backend
.\.venv\Scripts\ruff.exe check .
.\.venv\Scripts\ruff.exe format --check .
.\.venv\Scripts\mypy.exe app
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\alembic.exe check          # fails if models drifted from migrations

# frontend
cd Pithros
npm run lint                                # tsc --noEmit
npm run build
```

---

## Demo mode vs live mode

The frontend can talk to either the real API or the original in-browser
implementation. The switch is explicit and lives in `Pithros/.env.development`:

| `VITE_DEMO_MODE` | Behaviour |
|---|---|
| `true` | Uses the original localStorage implementation. No backend needed. |
| `false` | Uses the real API. Every request carries a Firebase ID token. |

Production **must** use `false`; `src/lib/config.ts` logs loudly if a production
build starts in demo mode, and the backend refuses to run with `DEMO_MODE=true`
in production.

**Why the frontend did not need rewriting.** `src/services/api.ts` is the single
seam every view already called. It now selects between `demoApi` and `liveApi`,
and its type is derived from the demo implementation:

```ts
export const api: ApiClient = DEMO_MODE ? demoApi : liveApi;
```

That makes coverage a compile-time property: if `liveApi` is missing any method
the demo client has, `tsc --noEmit` fails the build.

---

## What is wired

| Area | Status |
|---|---|
| Firebase sign-in → Pithros user resolution | Wired (`GET /api/v1/me`) |
| Memorial create / read / update / delete | Wired |
| Ownership and privacy enforced server-side | Wired |
| Timeline events | Wired |
| Tribute + offering submission with moderation | Wired |
| Media upload → object storage (presigned URLs) | Wired (API + client) |
| Background jobs (thumbnails, cleanup) | Wired (Celery) |
| Public memorial page + search | Wired |
| Family invitations and roles | Not yet — Phase 2 |
| Verification workflow | Not yet — Phase 2 |
| Providers, leads | Not yet — Phase 3 |
| Payments, invoices, refunds | Not yet — Phase 3 |
| Admin console, notifications, archive, QR | Not yet — Phase 4 |
| Docker, CI/CD, backups | Not yet — Phase 5 |

Endpoints that are not implemented throw `FeatureNotAvailableError` rather than
returning invented data. **A production build never fakes a record for a real
family.**

### One known wiring gap

`MediaUploader.tsx` (the existing drag-and-drop component) still simulates
progress and returns a `blob:` URL; the real pipeline lives in
`src/services/api/media.ts` as `mediaApi.uploadFile`. The screenshot-to-storage
control needs to call that method — a small component change that was deliberately
left until the API behaviour could be reviewed.

---

## Security model

The prototype's authorization was client-side. This one is not.

**Every object access passes an object-level check.**
`backend/app/memorials/permissions.py` resolves a user's role and permissions *on
one specific memorial*, and routes declare what they need:

```python
def update_memorial(
    memorial: Memorial = Depends(authorized(MemorialPermission.EDIT_DETAILS)),
    ...
):
```

The handler cannot run without the check having passed. Hiding a button is a
convenience; it is never the control.

**Privacy rules**

| Privacy | Anonymous | Signed in, not a member | Member |
|---|---|---|---|
| `public` | public fields | public fields | full |
| `unlisted` | public fields, exact URL only, `noindex` | same | full |
| `family` | **404** | **404** | full |
| `private` | **404** | **404** | full |

Private and family memorials return 404 rather than 403 so the API cannot be used
to discover whether a memorial exists.

**Ownership is a relation, not a name.** Creating a memorial sets
`memorial_stewards.user_id` to the authenticated caller, taken from the verified
Firebase token. The request body cannot influence it — the schema forbids the
fields outright. A partial unique index enforces exactly one primary steward per
memorial, so the old hardcoded-steward bug cannot reappear even through an
application mistake.

**Public responses are an allowlist.** `MemorialPublicOut` is built by hand and a
test freezes its exact key set. Adding a field that leaks will fail CI.

**Untrusted input is re-checked.** Uploads are validated twice: declared
type/size at upload-intent, then the real file signature once the bytes land in
storage. A PNG named `.jpg`, or an executable wearing an `image/jpeg` content
type, is rejected.

---

## Firebase setup

Identity is not yet configured. To turn it on:

1. <https://console.firebase.google.com> → **Add project**.
2. **Authentication → Sign-in method** → enable Email/Password, Google, Phone.
3. **Project settings → General → Your apps → Web** — copy the config into
   `Pithros/.env.development` as `VITE_FIREBASE_*`.
4. **Project settings → Service accounts → Generate new private key** — save the
   JSON to `backend/secrets/firebase-service-account.json`.

That file is gitignored. Never commit it.

Until this is done, the backend still runs and the frontend still works in demo
mode. `GET /api/v1/me` will report that authentication is not configured rather
than failing obscurely.

---

## Object storage

Local development writes uploads to `backend/var/media` through a
filesystem-backed adapter that signs URLs with an HMAC and an expiry — the same
security property a presigned S3 URL has.

Production uses Cloudflare R2 (`STORAGE_BACKEND=s3`), which the config validator
enforces. R2 and the local adapter sit behind one `ObjectStorage` port, so
switching is an env-var change and no application code moves.

Three logical tiers map to three buckets: `public` (CDN-served), `private`
(signed GET only), `sensitive` (signed GET plus an audit record on every access).
Verification documents always land in `sensitive`.

---

## Testing

The authorization suite is the important one. It runs against a real PostgreSQL
database with the schema built from the models, and each test rolls back.

Firebase is replaced by a fake token verifier injected through FastAPI's
dependency override — which is what lets the full matrix run in CI with **no
Firebase credentials**:

```
backend/tests/test_authorization.py    40+ cases: who may read, edit, upload,
                                       moderate, or even learn that a memorial exists
backend/tests/test_memorial_creation.py  ownership regression tests
backend/tests/test_media_pipeline.py     upload flow + content-sniffing rejections
```

`TEST_DATABASE_URL` overrides the test database if you need to point elsewhere.
