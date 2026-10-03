# 06 — R2 MEDIA ROUND-TRIP · PITHROS PRODUCTION SIMULATION

**RUN_ID:** `2026-10-03-prodsim-01` · **Deployed SHA:** `c050b2f` · **Date:** 2026-10-03
**Path exercised (from the Windows host, through Caddy on the VM):**

```
client → Caddy :80 → FastAPI → presigned URL → R2 (PUT) → complete (byte inspection)
       → list → retrieve → authorization checks → delete → verify
```

No business-truth mutation was used; the memorial/media were created through the real API with a **real Firebase token**.

---

## 1. Result

| Step | Evidence | Verdict |
|---|---|---|
| Firebase signup (real) | 200, token issued | **PASS** |
| Create memorial | `POST /api/v1/memorials` → **201** | **PASS** |
| Upload intent | `POST …/media/upload-intent` → **201**, `mediaId` issued | **PASS** |
| **R2 CORS preflight** | `OPTIONS` on the presigned URL with `Origin: http://10.153.175.57` → **403, no `Access-Control-Allow-Origin`** | **FAIL — BLOCKED (external)** |
| PUT straight to R2 | `PUT` → **200**, `ETag` returned | **PASS** |
| Complete (server re-inspects bytes) | `POST …/{mediaId}/complete` → **200**, `status=ready`, `sizeBytes=70` | **PASS** |
| List media | item present | **PASS** |
| Retrieve bytes | signed URL GET → **200** | **PASS** |
| Anonymous access | `GET …/media` → **401** | **PASS** |
| Second user read | → **404** (no existence oracle) | **PASS** |
| Second user delete | → **404** | **PASS** |
| Owner delete | `DELETE …/{mediaId}` → **204** | **PASS** |
| Deleted no longer listed | 0 remain | **PASS** |

**Server-side media pipeline: VERIFIED.** Worker `process_uploaded_media` ran and produced a thumbnail (`…png.thumb.jpg`, task succeeded).

## 2. Finding — R2 bucket CORS is not configured for the SPA origin

**Severity:** P1 (browser-blocking) · **Class:** EXTERNAL CONFIGURATION (owner-applied)
**Reproduction:** `OPTIONS <presigned-put-url>` with `Origin: http://10.153.175.57`, `Access-Control-Request-Method: PUT` → **HTTP 403**, no `Access-Control-Allow-Origin`.

**Impact:** A real browser PUT to R2 is a cross-origin request that triggers a CORS preflight; without an allow-origin rule, **the browser blocks the upload before it starts**. The API and server-side pipeline are correct — this is purely the bucket CORS policy. This is the previously-unconfirmed “R2 browser CORS” item, now **confirmed broken**.

**Fix (owner-applied):** apply `scripts/prod-sim/r2-cors-policy.json` to the R2 buckets `pithros-public`, `pithros-private`, `pithros-sensitive` (Cloudflare R2 → bucket → Settings → CORS, or `aws s3api put-bucket-cors` against the R2 endpoint). Then **browser** upload must be re-tested.

**Note on ownership:** R2 CORS is a provider-side setting on a shared bucket. I have **not** changed it. Say the word if you want me to apply the policy with the existing R2 credentials instead.

## 3. Observation (not a defect) — retrieved object is a processed derivative

Uploaded 70 bytes; the served object is **69 bytes**. `complete` measured 70 (pre-processing); the worker then ran `process_uploaded_media` (thumbnail + EXIF handling). The media is retrievable and valid, but is **not guaranteed byte-identical to the upload** — that is the existing (tested) pipeline behaviour. Not a deployment defect; recorded so the E2E assertion uses “retrievable & valid”, not “byte-identical”.

## 3b. Update — CORS policy applied, but to origins that do NOT match the deployed frontend

Owner applied a CORS rule to the buckets. Verified against the deployed stack:

| OPTIONS preflight (`Request-Method: PUT`, `Request-Headers: content-type`) | Status | ACAO | ACAM | ACAH | Result |
|---|---|---|---|---|---|
| Origin `http://10.153.175.57` — **the deployed sim origin** | **403** | *(none)* | *(none)* | *(none)* | **BLOCKED** |
| Origin `https://pithros.in` | 204 | `https://pithros.in` | `PUT, GET, HEAD` | `content-type` | ALLOWED |
| Origin `https://www.pithros.in` | 204 | `https://www.pithros.in` | `PUT, GET, HEAD` | `content-type` | ALLOWED |

- **Target bucket = `pithros-private`.** Presigned URL: `https://d6a21c…r2.cloudflarestorage.com/pithros-private/memorials/<uuid>/photo/<uuid>.png?<signature redacted>`. The policy is present on that bucket (it answers 204 for the allowed origins).
- **Real Chromium**, page origin `http://10.153.175.57`: `fetch(presignedUrl, {method:'PUT'})` → **`TypeError: Failed to fetch`** (preflight rejected). Browser upload **FAILS**.
- **Root cause = origin mismatch:** the applied `AllowedOrigins` do not include the deployed simulation origin `http://10.153.175.57`. The `pithros.in` entries are believed to be placeholders, but they are the values actually stored in the bucket.
- **Not changed** (per instruction). To unblock: add `http://10.153.175.57` to the bucket CORS, **or** serve the sim under an allowed `https://` origin (needs TLS/tunnel — the VM has neither).
- The R2 credentials in `.env` **cannot manage CORS** — `GetBucketCors`/`PutBucketCors` return `AccessDenied`; a token with bucket-config permission (or the Cloudflare dashboard) is required.
- `scripts/prod-sim/r2-cors-policy.json` already carries the correct sim origin; its `AllowedHeaders` should be `["content-type"]` (only what the browser sends) rather than `*` — not changed yet.

## 4. Verdict — RESOLVED

**Owner added `http://10.153.175.57` to the `pithros-private` bucket CORS (PUT/GET/HEAD).**
Re-verified: `OPTIONS` with `Origin: http://10.153.175.57` → **204**, `ACAO=http://10.153.175.57`, `ACAM=PUT, GET, HEAD`, `ACAH=content-type`.

**Real Chromium browser upload — PASS (6/6):** from page origin `http://10.153.175.57`, `fetch(PUT presignedUrl)` returned **200** with `access-control-allow-origin: http://10.153.175.57` → `upload-complete` **200** → media listed → retrievable (200) → still present on re-read. No filesystem fallback.

**Stage 4c: PASS — browser-to-R2 path proven end-to-end.** The earlier origin mismatch is closed.
