# Phase 4 local verification — 24 August 2026

## Automated result

- Phase 4 scoring/results tests: 3/3 passed.
- Phase 3 player regression tests: 9/9 passed.
- Phase 3 format regression tests: 3/3 passed.
- Touched-file ESLint: passed.
- TypeScript (`npx tsc --noEmit`): passed.
- Production build (`npm run build`): passed, including Student and Admin result routes and protected media/note endpoints.
- `git diff --check`: passed.

The full repository lint command remains blocked by 14 inherited errors and two inherited warnings in unrelated registration, legacy payment, worksheet-editor and storage files. No Phase 4 file appears in that output.

## Acceptance mapping

- A-01/A-02/A-04/A-05: exact response-map equality provides all-slots-required, no-partial-credit scoring; unanswered is separate from incorrect; time is read from attempt items.
- A-03/AR-05: UI states raw results only and disclaims official GMAT score, rank and prediction.
- A-06/A-07: completed-attempt review exposes selected/correct answers and deliberately excludes explanations.
- A-08/A-09: Student-owned notes use RLS and a completion/ownership trigger; Admin receives select only.
- A-10: result review renders attempt question/stimulus/response snapshots and protected attempted media.
- AR-01–AR-04/AR-06: Admin reporting derives states and detail from the same assignment/attempt rows and supplies no mutation surface.

## Environment boundary

The initial checkpoint was local-only. The Product Owner then requested a Preview link. Engineering created an isolated Supabase work directory containing all already-ledgered Staging versions, the remote-only ledger placeholder and only the new Phase 4 migration. The dry run listed exactly `20260824173000_add_mock_results_and_notes.sql`, with no seeds or roles. That exact migration applied successfully and the final ledger lists it once while preserving all historical exclusions.

Vercel built immutable Staging-backed Preview `dpl_EsqAH492gioUvzEqMsUBF4McpYVS` at `https://ace-club-4hu7zdq85-theadmitco-techs-projects.vercel.app`. Environment validation, compilation and TypeScript passed; Vercel reports READY and functions in `sin1`. The hostname is protected by Vercel SSO and requires an authorized browser session before the normal Ace Club sign-in.

No Production system was queried or changed.

## Results-route correction

Product Owner verification of the first Preview found `/mocks/{attemptId}/results` returning the application 404. The route existed and built correctly; the server loader was attempting to query `private.mock_attempt_keys` through PostgREST, while `private` is intentionally not an exposed API schema.

Commit `5a408ca` replaces that direct read with `get_completed_mock_attempt_keys(uuid)`. Migration `20260824190000_add_mock_result_key_reader.sql` restricts the function to completed attempts, returns only answer JSON, revokes execution from public/anonymous/authenticated roles and grants execution only to `service_role`. Its isolated dry run listed exactly that correction, and it applied and ledgered once on Staging.

Phase 4 tests, touched-file ESLint, TypeScript, build and diff checks passed. Corrected Preview `dpl_Ar2iW7PJDEbgLEqMkpvrmbuvWECE` is READY at `https://ace-club-fp197k4y4-theadmitco-techs-projects.vercel.app`. Live navigation reaches the normal Ace Club login boundary rather than the 404; authenticated content verification requires a fresh sign-in on that hostname.
