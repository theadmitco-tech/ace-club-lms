# Mock time copy and passage highlights

Status: Production complete
Owner: Engineering
Date: 27 September 2026

## Objective

Render proportional mock durations as readable minutes and seconds, and preserve question-specific RC passage highlights declared by the canonical question-package workbook.

## Confirmed cause

The live RC mock correctly stores 1,291 seconds, but the Student list divides that integer by 60 and renders the raw decimal. The approved workbook contains two non-empty `stimulus_display_config_json` values: `the learning curve` in passage block `p1` for `Q-RC-9628e8b8-7fd9-4ab0-8f86-bb25ab02d3e2`, and `nonfunctional features` in passage block `p1` for `Q-RC-484bf9ff-c704-42d8-8ceb-f824845eed98`. The package parser previously ignored that column, so neither imported question retained the per-question display instruction and the player had nothing to render.

Production assignment `618d2a28-3843-49fc-af63-a59f5ce77c51` currently has two completed attempts. Their immutable attempt snapshots do not contain highlight configuration and must not be rewritten as part of this correction.

## Candidate behavior

- The mock list renders 1,291 seconds as `21 minutes 31 seconds` and exact-minute totals without a seconds suffix.
- Package validation checks `stimulus_display_config_json` as a JSON object and checks each highlight for a non-empty `block_id` and exact `text`.
- The importer persists non-empty display configuration inside the existing per-question `interaction_json` under `stimulus_display_config`; no schema migration is required.
- The Admin dry-run preview and Student player highlight the exact configured text only inside the configured passage block.
- Existing packages with `{}` or a blank display configuration retain their current rendering.

## Verification

- The exact approved workbook parsed successfully: 11 questions, three stimuli, zero warnings/errors/duplicates, and exactly the two expected highlight configurations.
- TypeScript and touched-file ESLint passed.
- All 44 Pilot V3 tests passed, including new duration and block-scoped highlight assertions.
- The Next.js 16.3.6 Production build compiled, typechecked, and generated all 54 pages.
- `git diff --check` passed before documentation closeout.

## Staging acceptance

- Candidate commit: `6b78948` on `codex/flexible-mocks-security-integration`.
- Separate draft pull request: [#22](https://github.com/theadmitco-tech/ace-club-lms/pull/22). Pull request #21 remains unchanged and unmerged.
- The `ace-club-lms` Git integration produced a successful Preview for commit `6b78948` at `https://ace-club-zu7f495p5-theadmitco-techs-projects.vercel.app`; its stable branch alias is `https://ace-club-lms-git-codex-flexibl-a78ea8-theadmitco-techs-projects.vercel.app`.
- A direct edit of the two original Published Staging revisions was correctly rejected by the immutable-revision guard. No original Published row was modified.
- The supported revision lifecycle produced current Published revisions `038ba249-f7f4-4510-8450-83a0849a8f11` for `the learning curve` and `5f812d6d-ddd8-44fe-bc58-780dcf3ec32e` for `nonfunctional features`.
- A disposable Staging assessment used all 11 RC questions with a 1,291-second section. Starting it as a disposable enrolled Student produced 11 attempt-item snapshots and exactly two `stimulus_display_config` snapshots. The expected card copy is `21 minutes 31 seconds`; the component regression test exercises that exact value.
- The disposable assessment, version, assignment, enrollment, attempt, and Student were removed. Two short-lived Admin auth identities could not be deleted because immutable revision provenance references them; their profile and namespace-membership rows were removed, so they cannot access the portal. Two duplicate revision-2 rows created during the interrupted acceptance rerun were retired; the verified revision-3 rows are the current Published pointers.
- The unrelated empty Vercel project `ace-club-flexible-mocks` again reported a failed check because it has no environment variables. The authoritative `ace-club-lms` Preview check passed and no Production alias changed.

## Production boundary and rollback

The Product Owner explicitly approved Production deployment on 27 September 2026. Application commit `f2e67cb` deployed successfully as `dpl_FDJi63kvpBJX8HAc5vbVe5fKYsfY`; `aceclub.theadmitco.com` and the stable Vercel aliases point to that `READY` deployment. The build validated Production/Staging environment separation, compiled Next.js 16.3.6, and generated all 54 pages.

The committed transactional operation `scripts/production-mock-highlight-release.sql` passed a fail-closed Staging rehearsal and then completed against Production project `owmlxsnzogfapotmjrqk`. It created Published revision `9e704cef-bea9-40cd-8fc5-9eafd6ad8339` for `the learning curve` and Published revision `f8762a64-6552-4dc4-95e7-27e5806de998` for `nonfunctional features`. It published assessment version 2 as `67707f60-1141-4243-be42-872baf9a6d1e` and moved existing assignment `618d2a28-3843-49fc-af63-a59f5ce77c51` to that version without changing its course, release time, due date, or identity.

The two pre-existing completed attempts remain on immutable version 1 `a85a3fdd-b57b-4692-929a-9b210d65de30`; no attempt, answer, timing, or Student record was rewritten. An authenticated Production Student smoke showed `RC CC End-of-Course Mock`, one section, `21 minutes 31 seconds`, and Version 2. Root and login returned 200, protected `/mocks` redirected signed-out traffic to login, and the post-release Vercel error/5xx scans were empty.

Application rollback is `dpl_Hk1X2tMnSUU8rzDGgs9u3ewt96Ds`. Data rollback is the committed, fail-closed `scripts/production-mock-highlight-rollback.sql`: restore the assignment to version 1, restore the two assessment-item/current-question pointers, retire the two version-2 question revisions, preserve both immutable assessment versions and all attempts, and append rollback audit rows. Do not delete version 2 or rewrite attempt snapshots.

## Exact next action

Product Owner may visually inspect the card and future unstarted Version 2 journey in Production. No further Production mutation is required. Pull requests #21 and #22 remain unmerged, and `main` remains unchanged.
