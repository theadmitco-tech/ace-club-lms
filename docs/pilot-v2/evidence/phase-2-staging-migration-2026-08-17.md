# Pilot V2 Phase 2 Staging Migration — 17 August 2026

Status: Correction applied to Staging; focused authenticated and UI retests passed
Environment: Supabase Staging `eyphkkginlgoaxflauog`
Production impact: None

## Authorized application

The Product Owner explicitly authorized Staging-only application of `20260817143000_add_batch_schedule_builder.sql` and prohibited Production application.

Pinned Supabase CLI `2.114.0` applied the migration from the isolated directory whose dry run listed only that file. The repository and isolated copies both had SHA-256 `d212b87a0026a4fe08354f9d594a2712fdb4300e2e859622ecb76612f0d2d96b` immediately before application.

The remote ledger now records `20260817143000` exactly once after `20260817090845`. The excluded versions `20260803120000`, `20260803160000` and `20260804120000` remain absent. No Production, push, Preview, merge or deployment action occurred.

The CLI reported a non-blocking Docker warning while attempting to cache its optional pg-delta catalog. The remote migration transaction itself completed and was ledgered. A later schema dump attempt was also unavailable because Docker is not running; no database change resulted from that failed read-only export.

## Verification finding

The post-application remote database lint connected successfully and reported one error in `public.reorder_batch_events`: Staging's function checker could not resolve the function's `pg_temp.batch_reorder_slots` relation. All other checked Phase 2 functions produced no lint result.

Engineering treated the finding as a failed reorder verification and did not amend the applied migration. A separate additive migration, `20260817170000_fix_batch_event_reorder.sql`, replaces only that function with an array-backed, row-locked implementation that does not use a temporary relation.

Local verification for the correction passes five focused Phase 2 tests, TypeScript and `git diff --check`. Its reviewed SHA-256 is `7765916e6b627288853d20e5b4839f16d9e72fd910459b6a62bf60230f3759d9`. An isolated Staging dry run lists exactly:

```text
20260817170000_fix_batch_event_reorder.sql
```

## Corrective application and retest

The Product Owner separately authorized Staging-only application of `20260817170000_fix_batch_event_reorder.sql` and again prohibited Production application. The repository and isolated copies both had reviewed SHA-256 `7765916e6b627288853d20e5b4839f16d9e72fd910459b6a62bf60230f3759d9` immediately before application.

Pinned CLI `2.114.0` applied only the correction. The remote ledger now records both `20260817143000` and `20260817170000` exactly once. The three excluded versions remain absent, and Production was not contacted.

Remote database lint no longer reports the missing `pg_temp.batch_reorder_slots` relation or any Phase 2 error. It reports two related low-level warnings in `reorder_batch_events`: the integer `FOR` loop's implicit variable shadows the explicitly declared `v_position`, leaving the explicit declaration unused. This is a static scope warning, not an execution, authorization or integrity failure. It is recorded rather than hidden; no third migration is justified before the functional Staging journey establishes whether any behavior needs correction.

## Authenticated fixture verification

The Product Owner authorized bounded Staging fixture creation, authenticated Phase 2 verification and safe fixture cleanup. Production changes, pushes, Previews, merges and deploys remained prohibited.

An authenticated Staging administrator used the local application connected to Supabase Staging to create four Draft batches from accepted template revisions, all with a 10 February 2027 start date:

| Fixture | Accepted revision | Result |
| --- | ---: | --- |
| `V2 QA Full 2026-08-17` | 3 | 30 events and 13 reusable resources |
| `V2 QA CR 2026-08-17` | 7 | 6 events and 0 reusable resources |
| `V2 QA RC 2026-08-17` | 1 | 6 events and 0 reusable resources |
| `V2 QA DI 2026-08-17` | 2 | 6 events and 0 reusable resources |

The Full Course fixture has course id `625c726f-c6ef-496a-86ef-e8cde7d0aade`. Creation remained batch-isolated: crash-course batches retained six events and no reusable Full Course resources.

Authenticated mutation checks against the Full Course fixture established:

- add-extra passed: `V2 QA Extra Workshop` was appended only to the Full Course fixture, increasing it from 30 to 31 events; the consequence review explicitly excluded template, other-batch, recording, Session material, enrollment and tracker changes;
- shift passed: the UI disclosed every affected event and unreleased timestamp before applying a +2-day shift from the first event; all 31 eligible events moved and the application reported `Shifted 31 eligible events.`;
- single-event edit and reorder reached their application confirmation prompts, but the connected browser could not reliably accept native JavaScript confirmation dialogs; no pass is claimed for either journey;
- cancellation, idempotent retry, stale-revision rejection, completed/current-event protection, keyboard reorder and 200% zoom remain unverified.

The fixtures remain Draft and no cleanup has been performed. Deleting Staging records requires a separate action-time confirmation immediately before cleanup. No Production, push, Preview, merge or deployment action occurred during authenticated verification.

## Disposable authenticated RPC probe

Engineering added `scripts/phase2-staging-probe.mjs`, hard-locked it to Staging project `eyphkkginlgoaxflauog`, and ran it with a unique disposable Admin, Student, batch, enrollment, current event and release-boundary materials. The probe removes only records carrying its private run ids in a `finally` guard. A final read-only audit reported zero `Phase 2 authenticated probe %` courses and zero `phase2-(admin|student)-…@example.invalid` users.

Seventeen authenticated checks passed:

- no-write template proposal;
- same-token idempotent creation retry;
- future edit after enrollment;
- extra-class isolation;
- arbitrary complete-future-set reorder;
- complete eligible Section move;
- two-day shift and complete changed-event consequence list;
- eligible future cancellation with publication state preserved;
- current-event edit, cancellation and shift protection;
- permitted current-event venue/instruction correction;
- future-event edit inside a Section already underway;
- Student and anonymous mutation denial at the Admin/function-grant layers;
- reusable-template and another-batch immutability;
- enrollment preservation; and
- owned-fixture cleanup.

Two release-blocking defects remain:

1. Stale template and stale schedule conflicts raise PostgreSQL SQLSTATE `40001`. The Staging API gateway treats this as a retryable serialization failure and eventually returns `upstream request timeout` instead of the intended actionable conflict. Both calls were bounded and then skipped so the remainder of the matrix could run.
2. A shifted event's already-released material timestamp remains unchanged as required, but an unreleased material timestamp remains at the event's pre-shift end. The diagnostic delta is exactly two days. In `shift_batch_schedule`, the event and material updates are sibling data-modifying CTEs, so the material update reads the pre-shift session timestamp.

The probe produced 17 passes, one explicit failed assertion (`release_boundaries`) and two skipped stale-conflict assertions caused by the first defect. Phase 2 cannot exit until both defects are corrected through a separately reviewed additive migration and retested on Staging.

The Product Owner later authorized local-only implementation of that correction. `20260817233540_fix_phase2_conflicts_and_shift_materials.sql` now passes local verification with reviewed SHA-256 `835b7887ee080d4b64ded6ea81306c6b2d800ba74ec167efafb2a7f8568e0cbb`; it has not been applied or dry-run against Staging or Production. See the [local correction evidence](phase-2-correction-local-verification-2026-08-17.md).

## Accessibility check

The authenticated batch builder passed the Phase 2 accessibility checks performed in the local application connected to Staging:

- a 720px CSS viewport, equivalent to the 1440px layout at 200% zoom, had `scrollWidth 714` and `clientWidth 714`, with template, name, date, publication, Cancel and Review controls retained;
- keyboard traversal reached every builder input, both publication radios and both action buttons; text/date inputs used the visible three-pixel focus shadow and action buttons used a solid focus outline; and
- the temporary viewport override was reset after verification.

At that checkpoint, loading, empty, validation and failure/retry-state coverage remained pending; the final correction application and retest below complete those technical checks. Product Owner acceptance remains pending.

## Final correction application and focused retest

The Product Owner explicitly authorized Staging-only application of `20260817233540_fix_phase2_conflicts_and_shift_materials.sql` and the focused authenticated retest, while prohibiting Production, push, Preview, merge and deployment actions.

Immediately before application, the repository and isolated migration copies both had SHA-256 `835b7887ee080d4b64ded6ea81306c6b2d800ba74ec167efafb2a7f8568e0cbb`. The isolated directory contained the exact ledgered predecessors plus the correction and omitted the three excluded versions. Pinned Supabase CLI `2.114.0` dry-run output listed exactly:

```text
20260817233540_fix_phase2_conflicts_and_shift_materials.sql
```

The same isolated directory applied only that migration to Staging `eyphkkginlgoaxflauog`. The remote ledger records `20260817233540` exactly once after `20260817170000`. The Docker pg-delta cache warning recurred after the successful remote transaction; it did not affect application or ledgering. Production was not contacted.

Remote database lint reports no Phase 2 error. It continues to report only the previously recorded nonfunctional `reorder_batch_events` loop-variable shadow/unused warning.

The authenticated disposable RPC probe then ran with both stale-conflict skips removed and passed all 20 checks with zero failures and zero skips. In particular:

- stale-template and stale-schedule conflicts returned promptly and actionably;
- released material retained its exact timestamp;
- unreleased material exactly matched the shifted event end timestamp;
- retry, edit-after-enrollment, extra class, reorder, complete Section move, two-day shift, consequence list, cancellation, current/underway protections, authorization, isolation and enrollment preservation all passed; and
- the probe's cleanup guard removed its temporary Admin, Student, batch, sessions, materials and enrollment.

The authenticated UI-state retest also passed:

- loading feedback displayed a spinner while a schedule was fetched;
- a disposable zero-session batch displayed `No sessions yet` and `Create a session for this batch to get started.`;
- blank creation input produced the actionable `Batch name is required and must be 120 characters or fewer.` message;
- correcting the inputs recovered to the complete `30 events · Full Course revision 3` proposal without writing;
- two concurrent schedule reviews produced an immediate stale-review error in the older tab; and
- refreshing that tab and retrying the reviewed shift succeeded.

The zero-session and concurrent-review UI fixtures were deleted immediately after their checks. A final read-only audit reported zero remaining courses matching the owned authenticated, empty-state or UI-conflict probe prefixes.

All Phase 2 technical exit criteria have passed on Staging. Product Owner acceptance of the rendered Phase 2 workflow remains the only Phase 2 exit gate. The four earlier Draft `V2 QA …` batches remain intentionally untouched; their optional cleanup is not an exit criterion.
