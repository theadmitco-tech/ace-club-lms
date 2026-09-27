# Mock time copy and passage highlights

Status: Local candidate verified; Staging pending
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

## Staging plan

Deploy the candidate as a Staging-backed Preview. Use the existing imported RC package rather than importing it again. Add the two display configurations only to the matching Staging question revisions, verify the 21-minute-31-second list copy and both highlighted phrases in a disposable/resettable tester attempt, inspect browser/Vercel logs, and record the exact inverse update.

## Production boundary and rollback

No Production application or data correction is authorized by this record. After Staging acceptance, obtain explicit approval for both the application deployment and the two exact published-question updates. Recheck attempts before release. Do not rewrite completed attempt snapshots.

Application rollback is the currently live deployment `dpl_Hk1X2tMnSUU8rzDGgs9u3ewt96Ds`. The two question updates are backward-compatible because the current application ignores the nested key. Their data inverse removes only `interaction_json.stimulus_display_config` from the two exact revision IDs.

## Exact next action

Commit and push the locally verified candidate, deploy a Staging-backed Preview, and perform the bounded time-copy and two-question highlight acceptance. Stop before Production.
