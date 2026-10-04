# Cross-user VM journey — triage of the single FAIL

**Run:** `tests/e2e_vm/vm_journeys.py --journeys cross_user` against the deployed fixed VM (`c96f18f`)
**Result:** 5 PASS / 1 FAIL / 6 checks (deterministic across two runs)

## The failing check

`A's memorial is intact after B's attempts` — asserts
`GET /memorials/{memorial_id}` returns 200 **and** `fullName == "VM Journey Private Memorial"`.

## What actually passed (browser-level isolation)

- A creates a private memorial through the real wizard (UI).
- A can read A's memorial (200).
- B is refused on all 7 protected routes (7/7).
- B's direct URL to A's memorial does not reveal it.
- A's memorial is absent from B's dashboard.

## Root cause — harness id resolution, not the application

1. The check depends on `memorial_id`, which the journey takes from its POST-response capture (`created.get("id")`) with a regex fallback over observed URLs.
2. In an **identical** reproduction (`25-cross-user-diagnostic-ui.txt`) that capture was empty, so `memorial_id` became `None` and `GET /memorials/None` returned `422 uuid_parsing`. The capture is therefore unreliable.
3. The fallback scans `seen`, which contains the dashboard's GETs of the steward's **other** memorials, so it can select the wrong id.
4. Independently verified correct:
   - `24-cross-user-diagnostic.txt` — API-created memorial: POST 201, GET 200, `fullName == 'VM Journey Private Memorial'`.
   - `26-cross-user-diagnostic-list.txt` — UI-created memorial resolved through `/me/memorials`: id `d3a9c9d3-…`, slug `vm-journey-private-memorial-12`, `fullName == 'VM Journey Private Memorial'`, GET 200.

## Classification

**TEST-HARNESS UNRELIABILITY** for that one assertion. Not a frontend defect and not a backend data-integrity defect: the API and the UI create path both return the exact name, and every browser-level cross-user isolation check passed. Reported as `FAIL (harness)` — not a PASS, not an app bug.

## Recommendation

Harden the harness: resolve the created memorial from `GET /me/memorials` (newest match) instead of the POST capture/regex fallback, then re-run. Left unfixed here because it is test tooling outside the frontend scope of this campaign.
