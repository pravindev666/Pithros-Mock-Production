# Pithros frontend forensic audit — baseline

- Run ID: `2026-10-04-uiux-01`
- Local branch: `main`
- Local/origin SHA: `fb94661578b2fb5804a8f4c54b632067c6687cad`
- VM repository SHA: `aba3d47c7816d6169883cd63414d12f763e2dd11`
- VM target: `http://10.153.175.57`
- Scope: investigation-first frontend audit; no product code changed in this stage

## Source alignment

`git diff aba3d47..fb94661 -- Pithros` returned no differences. The VM and local repository have different overall SHAs, but their committed frontend trees are identical. Frontend visual/behavior observations may therefore be compared, while backend-dependent conclusions must still name the exact target SHA.

## Working tree

The following pre-existing untracked files were present and intentionally untouched:

- `Pithros/debug_timeline_dump.html`
- `gold_master_prompt.txt`
- `gold_master_prompt_full.txt`
- `phases_detailed.txt`

## Frontend gates

Executed from `Pithros/`:

- `npm run lint`: PASS (`tsc --noEmit`)
- `npm run check:live`: PASS (`Live-mode guard OK: no production-reachable demo bindings.`)
- `npm run build`: PASS (Vite 8.3.1, 2,228 modules, 7.15 s)
- Main JS bundle: 1,406.46 kB / 339.72 kB gzip
- Main CSS bundle: 133.84 kB / 21.45 kB gzip
- PWA precache: 27 entries / 4,861.14 KiB
- Build warning: main JS chunk exceeds 500 kB. This is an observation only until route-load measurements prove user impact.

## VM health evidence

- `GET /health`: PASS — HTTP 200
- `GET /ready`: FAIL — timed out after 15 s and again after 30 s with no response
- `GET /api/v1/ready`: FAIL — timed out after 30 s with no response
- Direct readiness call inside `pithros-sim-backend-1`: FAIL — timed out after 20 s
- Container state: backend, frontend, Redis, Mailpit report healthy; worker and beat are up
- Resource sample: backend 44.32% CPU, 417 MiB / 1 GiB; Redis 0.63%; worker 0.04%; beat 0.00%
- Recent backend logs show a prior/current high-volume authorization-refusal workload with request durations commonly around 1.5–2.0 s and one at 9.9 s.

## Baseline verdict

**PARTIALLY VERIFIED / BLOCKED**

The frontend build baseline is clean and the local/VM frontend source trees are aligned. The VM is live but not ready: readiness hangs within the backend rather than only at Caddy. This audit may continue with static investigation, local browser work, and VM public-route observations, but authenticated/data-dependent VM results must not be called PASS until readiness recovers and is rechecked.
