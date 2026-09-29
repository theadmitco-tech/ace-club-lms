# Phase 4 local verification — 24 August 2026

## Automated result

- Phase 4 scoring/results tests: 4/4 passed.
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

After fresh authentication, the loader succeeded but the page returned digest `759638202`. Vercel logs identified a Next.js Server/Client boundary violation: the Server Component invoked a client-only content helper and passed an event handler to the client question renderer. Correction `f0328fb` makes `MockResultView` the owning Client Component and adds a source-boundary regression test. Phase 4 tests pass 4/4; ESLint, TypeScript, build and diff checks pass.

READY deployment `dpl_3rMNoPHJcXmKgY8u22auXKJuSsKe` is assigned to stable Preview alias `https://ace-club-phase4-theadmitco-techs-projects.vercel.app`. Live navigation reaches its normal login boundary. Final authenticated content verification awaits one fresh Student sign-in on the stable alias.

## Sectional result redesign and authenticated acceptance

Commit `5cb34bc` implements the Product Owner's requested result hierarchy: Overall, DI, QA and VA. Overall and section diagnostics explicitly use average time per question. Each section begins with an accessible SVG response-time chart with a two-minute guide and the Student average, followed by the requested question-wise table. Question numbers are links into the completed-attempt review.

The focused Phase 4 suite passes 4/4, and touched-file ESLint, TypeScript, Production build and `git diff --check` pass. Vercel deployment `dpl_HEiQk2yZFZanKXq9wgNe1F3oLWpF` is READY at `https://ace-club-njo8516s7-theadmitco-techs-projects.vercel.app` and is assigned to the stable alias `https://ace-club-phase4-theadmitco-techs-projects.vercel.app`.

Authenticated live-browser acceptance on the stable alias confirmed:

- all four result tabs render for the completed Staging attempt;
- DI renders the pacing chart and all 20 question-wise rows;
- the table exposes response minutes, performance, content domain and question type;
- Question 1 links to `#question-data_insights-1` and renders the immutable question, selected answer, correct answer and note surface; and
- onscreen Back restores the DI question table and returns keyboard focus to the exact originating Question 1 link.

Production was not contacted or changed.

## Final desktop acceptance closeout

The Product Owner requested completion of all remaining acceptance checks and explicitly waived mobile verification. Authenticated desktop verification passed:

- Student and Admin totals reconcile exactly: 8/64 correct, 13% accuracy, 46 incorrect, 10 unanswered and 3m 39s total time.
- The Admin overview correctly shows one Completed assignment, one Not Started assignment and one In Progress assignment for the Staging Student.
- A Student note was created, edited to `Phase 4 acceptance note — edited and verified`, saved and confirmed after reload.
- Admin sees that exact note as read-only; the Admin detail contains no textarea or Save note control.
- The historical GI image is delivered through separate Student/Admin protected endpoints and renders at 1429 × 339 in both contexts.
- The four-tab sectional layout, linked detail and history-aware Back restoration remain verified on desktop.

Phase 4 is therefore closed and accepted on Staging/Preview. Production was not contacted or changed.
