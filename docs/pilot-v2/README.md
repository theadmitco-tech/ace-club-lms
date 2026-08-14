# Pilot V2 — Consolidated Bootstrap and Running Handoff

Status: Proposed — scope definition only
Owner: Product owner and Engineering
Last updated: 14 August 2026

## Purpose

This is the single bootstrap document for Pilot V2. It consolidates the current Production baseline, the signed MVP and Pilot V1 history, the batch/course ownership rules, the complete repository reading map, the V2 intake questions, implementation guardrails and the exact next action.

Pilot V1 is complete and deployed. Do not continue V2 inside the signed V1 section of the [Pilot Iterations Running Handoff](../handoffs/pilot-iterations-running-handoff.md). Preserve that file and the [Pilot V1 Production rollout evidence](../pilot-v1/evidence/production-rollout-2026-08-13.md) as history.

This document coordinates discovery and planning. It does not approve a V2 feature, migration, staging mutation, merge, Production deployment or live-data change. Candidate items become V2 scope only after the Product Owner approves explicit acceptance criteria and exclusions.

## Exact resume instruction

> Continue Ace Club LMS from `docs/pilot-v2/README.md`. Treat it as the single Pilot V2 bootstrap. Pilot V1 is deployed at Production merge commit `7c35466a34d20726945544ae98d2e368ca277b01`; preserve its evidence and do not repeat its release. Read the mandatory tier below, verify Git and environment state, and complete V2 scope definition before implementation. Treat flexible course templates, crash-course construction, free-form batch schedule building, session ordering/timing changes and a new event model as candidate V2 areas, not approved requirements. Preserve the current distinction between reusable Master pre-reads/worksheets and batch-owned recordings/Session materials. Do not apply, repair or mark `20260804120000_realign_weekly_course_schedule.sql` as applied. Weekly-schedule replacement requires its own explicit decision, migration/data plan, staging evidence and Production authorization. Make no Production change without a new exact Product Owner instruction.

## Current checkpoint

| Item | Current state |
|---|---|
| Production application | [aceclub.theadmitco.com](https://aceclub.theadmitco.com) |
| Production Supabase | `owmlxsnzogfapotmjrqk` |
| Staging Supabase | `eyphkkginlgoaxflauog` |
| Production code baseline | `origin/main` at `7c35466a34d20726945544ae98d2e368ca277b01` |
| Pilot V1 source | PR [#16](https://github.com/theadmitco-tech/ace-club-lms/pull/16), frozen source `2ab175788cd037984399f14a0fc4a900c380067d` |
| Pilot V1 deployment | Vercel Production deployment `5886517926`, successful on 13 August 2026 |
| V1 migrations in Production | `20260811170000`, `20260813081141` |
| Explicitly excluded Production migrations | `20260803120000`, `20260803160000`, `20260804120000` |
| V2 state | Proposed; no acceptance criteria, implementation plan or migration is approved yet |
| V2 documentation branch | `codex/pilot-v2-handoff`, based on the Production merge and carrying the V1 rollout evidence |
| V2 working branch | Create `codex/pilot-v2` from freshly fetched `origin/main` only after scope approval |

The V1 post-release documentation commit was not part of the Production deployment. This V2 documentation line starts from the Production merge and carries that immutable release record forward.

## Authority and complete reading map

When documents conflict, follow the authority order in the [Instruction Register](../../instruction/README.md). Accepted evidence records what happened; it does not silently expand product scope.

### Tier 0 — mandatory before every V2 work session

Read these completely before planning or changing V2:

1. [`AGENTS.md`](../../AGENTS.md) — repository rule requiring the bundled Next.js 16 documentation before framework changes.
2. [Instruction Register](../../instruction/README.md) — authority order, document register and reading paths.
3. This [Pilot V2 bootstrap](README.md) — current V2 state, boundaries and exact next action.
4. [MVP Acceptance Criteria](../../instruction/Ace_Club_LMS_MVP_Acceptance_Criteria.md) — binding shipped behavior unless expressly amended.
5. [Product Roadmap](../../instruction/Ace_Club_LMS_Product_Roadmap.md) — signed delivery history, ownership and gates.
6. [Living Coding Rules](../development/coding-rules.md) — environment, authorization, migration, Next.js, testing and definition-of-done rules.
7. [Document Conventions](../governance/document-conventions.md) — authority, naming, evidence, privacy, status and link rules.
8. [Documentation Index](../README.md) — repository-wide document router.
9. The latest signed [MVP Running Handoff](../handoffs/ace-club-lms-running-handoff.md), beginning with Phase 8.
10. The signed [Pilot Iterations Running Handoff](../handoffs/pilot-iterations-running-handoff.md), especially the V1 checkpoint and Production transition.
11. [Pilot V1 Production Rollout Evidence](../pilot-v1/evidence/production-rollout-2026-08-13.md) — exact live baseline, exclusions and sanitized post-smoke state.
12. [Current Code Landscape and Cleanup Plan](../development/current-code-landscape-and-cleanup-plan.md) — historical architecture map and unresolved cleanup register; it is not cleanup authorization.

### Tier 1 — batch, course-template and schedule work

Read all of these before defining or implementing any V2 batch/course change:

1. [Phase 3 status](../phase-3/README.md) and [Approved Revised Course Structure](../phase-3/revised-course-structure.md) — current Master Course identity, curriculum keys, instructors and content associations.
2. [Phase 4 status](../phase-4/README.md), [Phase 4 checklist](../phase-4/manual-verification-checklist.md) and [staging evidence](../phase-4/evidence/staging-verification-2026-07-31.md) — cohort generation, `Asia/Kolkata` timing, release timestamps, inheritance, sync and legacy archival.
3. [ADR-0002 — Cohort Schedule and Material Synchronization](../decisions/adr-0002-cohort-schedule-and-material-sync.md) — current reusable-material generation/sync contract.
4. [ADR-0003 — Historical Weekly Course Schedule](../decisions/adr-0003-weekly-course-schedule.md) and [ADR-0004 — Defer Weekly Schedule Redesign](../decisions/adr-0004-defer-weekly-schedule-redesign.md) — the later ADR controls; the weekly migration remains excluded.
5. [Phase 5 status](../phase-5/README.md), [Student Experience Foundation Plan](../phase-5/student-experience-foundation-plan.md), [Decision Summary](../phase-5/student-experience-foundation.md), [UI State and Content Matrix](../phase-5/ui-state-and-content-matrix.md), [Phase 5/6 checklist](../phase-5/manual-verification-checklist.md), [automated evidence](../phase-5/evidence/automated-verification-2026-08-02.md), [staging evidence](../phase-5/evidence/manual-staging-verification-2026-08-02.md) and [Production evidence](../phase-5/evidence/production-rollout-2026-08-03.md) — Student timeline behavior and the final batch-specific recording decision.
6. [Pilot V1 Acceptance Criteria](../pilot-v1/acceptance-criteria.md) — explicitly reserves flexible templates, crash courses and free-form batch schedule building for V2 while locking batch ownership rules.
7. [Pilot V1 Implementation Plan](../pilot-v1/implementation-plan.md), [Phase 0 Readiness](../pilot-v1/phase-0-readiness.md), [Phase 7 checklist](../pilot-v1/manual-verification-checklist.md), [Production Release Plan](../pilot-v1/production-release-plan.md) and [read-only Production verification](../pilot-v1/production-read-only-verification.sql) — implementation/release method and V1 migration isolation.
8. All Pilot V1 evidence: [Phase 4 database authorization](../pilot-v1/evidence/phase-4-staging-migration-and-authorization-2026-08-11.md), [Phase 4 Preview lifecycle](../pilot-v1/evidence/phase-4-preview-route-lifecycle-2026-08-11.md), [Phase 5 Session-resource lifecycle](../pilot-v1/evidence/phase-5-staging-session-resource-lifecycle-2026-08-13.md), [Phase 6 integrated checks](../pilot-v1/evidence/phase-6-integrated-verification-2026-08-13.md), [Phase 6 logo amendment](../pilot-v1/evidence/phase-6-logo-amendment-verification-2026-08-13.md), [Phase 7 staging acceptance](../pilot-v1/evidence/phase-7-staging-acceptance-2026-08-13.md) and [Production rollout](../pilot-v1/evidence/production-rollout-2026-08-13.md).
9. [Recommended Reading Bug and Revised Contract](recommended-reading-revision.md) — approved V2 behavior for all next-class pre-reads and all last-class Session materials; Recommended practice remains unchanged.

### Tier 2 — authentication, tracker, Admin progress and launch boundaries

Read the relevant complete set whenever V2 touches these areas:

- Authentication/accounts: [ADR-0001](../decisions/adr-0001-google-sign-in.md), [Phase 2 status](../phase-2/README.md), [Phase 2 checklist](../phase-2/manual-verification-checklist.md) and `docs/phase-2/evidence/`.
- Student tracker: [Phase 6 status](../phase-6/README.md), [checklist](../phase-6/manual-verification-checklist.md), [authorization probe](../phase-6/staging-privacy-probe.sql), [automated evidence](../phase-6/evidence/automated-verification-2026-08-03.md), [staging migration evidence](../phase-6/evidence/staging-migration-application-2026-08-03.md), [staging acceptance](../phase-6/evidence/manual-staging-verification-2026-08-03.md) and [Production evidence](../phase-6/evidence/production-rollout-2026-08-03.md).
- Admin progress: [Phase 7 status](../phase-7/README.md), [checklist](../phase-7/manual-verification-checklist.md), [authorization probe](../phase-7/staging-authorization-probe.sql), [automated evidence](../phase-7/evidence/automated-verification-2026-08-03.md), [staging migration evidence](../phase-7/evidence/staging-migration-application-2026-08-03.md), [staging acceptance](../phase-7/evidence/manual-staging-verification-2026-08-03.md) and [Production evidence](../phase-7/evidence/production-rollout-2026-08-03.md).
- Launch/operational exceptions: [Phase 8 status](../phase-8/README.md), [closeout checklist](../phase-8/manual-verification-checklist.md), [superseded pilot plan](../phase-8/pilot-and-launch-plan.md) and [operational evidence](../phase-8/evidence/operational-closeout-2026-08-10.md).

### Tier 3 — complete repository reference set

These are not mandatory for every task, but they complete the repository documentation inventory and must be read when affected:

- Historical recovery and audit: [Phase 0.5 sign-off](../../instruction/Phase_0.5_Setup_Recovery_Signoff.md), [Phase 1 status](../phase-1/README.md), [Phase 1 checklist](../phase-1/manual-verification-checklist.md), [inventory SQL](../phase-1/supabase-inventory.sql), [schema inventory SQL](../phase-1/supabase-schema-definition-inventory.sql) and `docs/phase-1/evidence/`.
- Setup and operations: [Mac Setup](../setup/mac-setup.md), repository root `README.md`, `.env.example`, `package.json`, `scripts/validate-deployment-env.mjs` and `supabase/README.md` when present.
- Grandfathered feature references: [Question Bank](../question-bank.md), [Master Worksheet Questions](../master-worksheet-questions.md) and [Worksheet PDF Conversion](../worksheet-pdf-conversion.md). Their old `scratch/` commands are known cleanup debt; do not run them merely because they are documented.
- Every ordered SQL file under `supabase/migrations/` must be inventoried before proposing a database change. Historical root SQL files are not migrations and must not be applied.
- Before changing Next.js code, select and read the relevant bundled guides under `node_modules/next/dist/docs/`. For likely V2 work this includes Server/Client Components, Route Handlers, Authentication, Data Security, Forms, Caching, Error Handling and Deploying.

Do not reread every immutable JSON/evidence artifact by default. Read its registered summary first, then load the raw dated evidence when V2 touches that boundary or when the summary is insufficient or contradicted.

## Current shipped model — do not blur these ownership boundaries

| Concern | Reusable Master-owned behavior | Batch-owned behavior | Student-owned behavior |
|---|---|---|---|
| Course structure | Current active Master curriculum and stable Master session links | Generated course/batch and its copied sessions | Read-only through enrollment |
| Pre-reads | Master material; reusable | Copied into a batch at generation or explicit Sync materials | Read after enrollment, publication and release |
| Worksheets | Master material, private PDF and Master question rows; reusable | Copied into a batch at generation or explicit Sync materials | Own tracker rows for the copied worksheet after release |
| Recordings | Not Master content | One selected batch session only; never generated or synced across batches | Read after that session ends |
| Session materials | Explicitly prohibited from Master materials | One selected batch session only; never generated or synced across batches | Read after that session ends through protected private delivery |
| Schedule | Current generator uses Master metadata and `Asia/Kolkata` rules | Each batch stores its own session timestamps and publication state | Reads database-owned timestamps; UI does not grant release |
| Progress | No separate analytics ownership | Admin may inspect enrolled Student records read-only | Student owns and writes only their own canonical question-log rows |

The current `Sync materials` contract adds or updates reusable Master pre-reads and worksheets. It must never copy or overwrite recordings or Session materials. Creating a new batch must also begin without recordings or Session materials.

## Candidate Pilot V2 scope carried forward from V1

The following areas were explicitly reserved for Pilot V2, but were not approved as a final V2 bundle:

1. Course-template creation rather than one permanently fixed template.
2. Crash-course construction.
3. Free-form or guided batch schedule building.
4. Session reordering and deliberate date, time or duration changes.
5. A decision on whether and how the fixed Master Course becomes one template among several.
6. A possible new event model for breaks and week-long support windows.

Batch-related V2 work may also need to define template selection during batch creation, schedule preview/edit/confirmation, material inheritance, rescheduling effects, release recalculation and safeguards for already-running batches. These are discovery questions, not inferred approval.

## Product decisions required before V2 implementation

The Product Owner must approve answers and acceptance criteria for each included item:

### A. Template model

- Is V2 creating multiple reusable course templates, only one additional crash-course template, or a general template builder?
- Which fields belong to a template item: title, type, section, instructor, relative day/time, duration, publication default and material associations?
- Can templates be edited after batches exist? If yes, are existing batches snapshots or can an Admin explicitly sync structural changes?
- Are reusable pre-reads/worksheets shared between templates or owned by one template version?

### B. Batch creation and schedule building

- Does Admin select a template, start date and time zone, then preview the full schedule before confirmation?
- Which fields may be changed before creation and which may be changed after Students are enrolled or a session has started?
- Must every batch have unique session order and dates, or only approved overrides from a template?
- What confirmation, audit trail and rollback are required for bulk schedule generation or rescheduling?

### C. Releases and live-batch safety

- When a session moves, should unreleased pre-read/worksheet/recording/Session-material timestamps move automatically?
- What happens to content already released to Students? A reschedule must not silently revoke previously available private content without an explicit approved rule.
- Are tracker rows preserved and relinked when a worksheet-bearing session moves or changes template position?
- Are existing running Production batches completely excluded from V2 migration, migrated only by explicit selection, or included through a reviewed compatibility path?

### D. Weekly schedule

- Is the replacement weekly-schedule design part of V2 or a separate version?
- If included, approve the target class days, Orientation treatment, Week 3 exception, recommendation timing and handling of every existing batch.
- Any approved replacement must supersede ADR-0004 through a new ADR. Do not reactivate ADR-0003 or its migration.

### E. Scope and release bundle

- Select at most three or four coherent changes that can be independently accepted and released.
- Explicitly list exclusions such as destructive legacy cleanup, public registration/payment, mobile redesign, analytics, grading, broad lint cleanup or Production data fixtures.
- Decide whether V2 is application-only or requires additive database changes. Any database plan must address the current migration-ledger exceptions below.

## Database and migration boundary

Production is verified through Pilot V1 with the two V1 migrations ledgered and the aggregate live state unchanged. V2 must begin with a new read-only schema and migration-ledger inventory; do not rely only on filenames.

Known special cases:

- `20260811170000_add_batch_session_materials.sql` and `20260813081141_revoke_session_material_trigger_rpc_access.sql` are applied and ledgered in Production.
- `20260804120000_realign_weekly_course_schedule.sql` is explicitly excluded. Never apply it, include it in a general push, repair it or mark it applied.
- `20260803120000_add_student_practice_log.sql` and `20260803160000_add_admin_practice_progress.sql` were not added to the Production ledger during V1, while the corresponding tracker/Admin functionality and data exist. Treat this as a ledger/schema reconciliation constraint, not permission to push either migration.
- Never use `supabase db push --include-all` against Production. Require an isolated checkout, pinned CLI, exact dry-run migration list and explicit Product Owner authorization naming every Production version.
- Do not amend an applied migration. Add a newly ordered, staging-tested migration after the V2 data model is approved.
- Do not use a Production fixture or mutate a running batch merely to obtain positive coverage unless separately authorized in writing.

## Non-regression boundaries

V2 must preserve unless a new approved decision explicitly changes one:

- separate staging/Preview and Production Supabase projects and Vercel scopes;
- Google-only access for controlled, pre-provisioned active Admin and Student accounts;
- server-side authorization before service-role use and Supabase RLS at data boundaries;
- enrollment, publication and release-time checks for direct routes and database reads;
- private PDFs through protected, no-store, short-lived signed delivery;
- Student ownership and privacy of tracker rows;
- read-only Admin progress over the same canonical Student rows;
- no cross-batch propagation of recordings or Session materials;
- reusable Master pre-read/worksheet generation and explicit idempotent sync;
- existing live batches, historical records and tracker data unless a separately approved compatibility migration says otherwise;
- clear loading, empty, failure, retry, keyboard, 200%-zoom and supported desktop behavior; and
- no credentials, authentication artifacts, signed URLs, private object paths or private Student data in Git or evidence.

## Likely implementation map for V2 discovery

Inspect only after scope approval, and read relevant Next.js 16 guides first:

- Batch creation and list: `src/app/admin/courses/page.tsx`
- Batch session list/detail: `src/app/admin/sessions/page.tsx`, `src/app/admin/sessions/[id]/page.tsx`
- Master curriculum: `src/app/admin/curriculum/page.tsx`, `src/lib/curriculum.ts`
- Batch Session resources: `src/app/admin/recordings/page.tsx`
- Student schedule and recommendations: `src/lib/studentTimeline.ts`, `src/lib/server/studentTimeline.ts`, `src/lib/sessionAvailability.ts`
- Private file boundaries: `src/app/api/materials/file/route.ts`, `src/app/api/admin/session-material-upload/route.ts`, `src/app/api/admin/session-materials/route.ts`, `src/lib/materialFiles.ts`
- Authorization: `src/lib/server/requireAdmin.ts`, `src/lib/server/portalAuthorization.ts`, `src/proxy.ts`
- Tracker/Admin compatibility: `src/app/practice/`, `src/app/admin/progress/`
- Data history: every file under `supabase/migrations/`, especially schedule generation, batch-specific recordings, tracker/Admin progress and Pilot V1 Session materials.

## Required V2 workflow

### Phase 0 — definition and read-only readiness

1. Product Owner approves V2 scope, exclusions and acceptance criteria.
2. Fetch remote refs read-only and create `codex/pilot-v2` from updated `origin/main`.
3. Confirm the working tree is clean and record the exact start commit.
4. Inventory current staging and Production schema/ledger read-only, with special attention to course/template/session/material relationships and the three excluded migrations.
5. Inventory at least two staging batches and classify reusable versus batch-owned data without recording identities.
6. Map the current Admin batch creation/edit flows and Student release consumers.
7. Read and record the exact relevant Next.js 16 guides.
8. Produce a phase-wise implementation plan, migration/data plan, rollback/compatibility plan and manual verification checklist before code.

### Implementation and staging

1. Work only against staging/local configuration.
2. Keep schema, data migration, server authorization, Admin UI and Student compatibility in focused commits.
3. Use additive migrations and stable IDs; never identify live targets only by title, position or an inferred weekday.
4. Apply migrations to staging first and record ledger, constraints, functions, RLS, triggers and before/after aggregate evidence.
5. Verify at least two batches with different schedules and prove recordings/Session materials remain isolated.
6. Verify new-batch generation, explicit sync, rescheduling, release boundaries and tracker preservation according to approved V2 rules.
7. Run focused tests, targeted lint, TypeScript, guarded Production build, `git diff --check`, link checks and changed-file privacy/secret review.
8. Complete Product Owner staging acceptance on one immutable staging-backed Preview.

### Production gate

Planning or staging acceptance is not Production authorization. Before Production:

1. Create a dated conditional release plan naming the exact source commit, migrations, environment checks, rollback target and non-mutating smoke checks.
2. Run a read-only Production preflight and preserve sanitized aggregates only.
3. Obtain one new Product Owner instruction naming each authorized merge, migration, deployment, environment change, fixture and smoke action.
4. Apply only the named migrations after an exact pinned-CLI dry run.
5. Verify schema and live aggregates before merging the application.
6. Deploy the exact reviewed merge commit, run anonymous and authenticated role checks, then repeat the aggregate comparison.
7. Record a separate immutable Production evidence file.

## Verification minimum for a batch-focused V2

- A new batch is created from the intended template with the reviewed session count, order, dates, times, durations, instructors, publication state and time zone.
- Repeating the same generation action cannot create a second schedule or duplicate materials.
- A schedule preview and confirmation make every destructive or release-affecting consequence clear.
- Reusable pre-reads and worksheets inherit/sync exactly as approved.
- Recordings and Session materials never copy, sync or leak across batches.
- Rescheduling recalculates only the approved unreleased timestamps and preserves any explicitly protected already-released state.
- Student Timeline, recommendations, direct material routes and Practice log remain consistent with database timestamps.
- Tracker records remain owned by the Student and Admin progress remains read-only and numerically consistent.
- Signed-out, Student-to-Admin, cross-student, inactive, unenrolled, unpublished, pre-release and cross-batch access is denied.
- Existing running batches and historical data are unchanged unless the approved plan names and verifies a compatibility operation.
- Supported desktop widths, keyboard use, 200% zoom, loading, empty, validation, failure and retry states pass.

## Known debt that V2 must not absorb accidentally

- Repository-wide lint remains a signed legacy baseline rather than zero; touched V2 files must be clean and the full result must be reported honestly.
- Public registration/payment scope remains undecided.
- Legacy practice/analytics data retention and physical cleanup remain separately gated.
- Several package scripts reference absent `scratch/` utilities; do not rebuild or run them without approved operational scope.
- The weekly-schedule replacement is undefined after ADR-0004.
- Phase 8 lacks the originally proposed complete first-time pilot and monitoring evidence. Do not claim those unchecked gates passed.

## V2 document register

Keep all new V2 working material under `docs/pilot-v2/` and link it here and from `docs/README.md`.

| Document | Status | Purpose |
|---|---|---|
| [Pilot V2 Bootstrap and Running Handoff](README.md) | Proposed; active bootstrap | Consolidated state, complete reading map, candidate scope, guardrails and exact next action |
| [Recommended Reading Bug and Revised Contract](recommended-reading-revision.md) | Approved for implementation planning | Production defect evidence, two-subsection product contract, timing, multi-file behavior and verification requirements |

Add later, only when created and approved:

- `acceptance-criteria.md` — Product Owner-approved outcomes and exclusions;
- `phase-0-readiness.md` — exact Git/environment/schema/code baseline;
- `implementation-plan.md` — ordered internal phases and exit gates;
- `manual-verification-checklist.md` — staging acceptance journeys;
- `production-release-plan.md` — separately reviewed Production procedure; and
- `evidence/` — dated immutable staging and Production records.

Do not create parallel copies of V1 evidence or rewrite the signed MVP/V1 handoffs. Link them.

## Handoff update contract

Before pausing or transferring V2, update this file with:

- approved scope and explicit exclusions;
- current internal phase, owner and exit status;
- branch, exact start/current commit and relationship to `origin/main`;
- committed, uncommitted, pushed, Preview and deployed state;
- every migration and the environments where it is applied or ledgered;
- latest automated, staging and Product Owner evidence;
- findings with severity, owner, disposition and retest;
- any account-dependent task; and
- one exact next action.

Add every new durable V2 file to the document register and `docs/README.md`. Never put secrets, private Student data, authentication artifacts, signed URLs or private object paths in the handoff.

## Exact next action

Product Owner defines and approves the first V2 bundle by answering sections A–E above and selecting no more than three or four coherent changes. Until that decision is recorded, perform documentation and read-only discovery only; do not create a V2 migration or change application behavior.
