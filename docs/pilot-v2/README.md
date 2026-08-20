# Pilot V2 — Consolidated Bootstrap and Running Handoff

Status: Active — Phase 1–6 accepted; Phase 7 preflight/recovery complete; Production unauthorized
Owner: Product owner and Engineering
Last updated: 20 August 2026

## Purpose

This is the single bootstrap and running-handoff document for Pilot V2. It consolidates the current Production baseline, signed MVP and Pilot V1 history, approved V2 scope, batch/course ownership rules, complete repository reading map, planning status, implementation guardrails and exact next action.

Pilot V1 is complete and deployed. Do not continue V2 inside the signed V1 section of the [Pilot Iterations Running Handoff](../handoffs/pilot-iterations-running-handoff.md). Preserve that file and the [Pilot V1 Production rollout evidence](../pilot-v1/evidence/production-rollout-2026-08-13.md) as history.

This document coordinates approved-scope discovery and planning. The Product Owner closed the Pilot V2 scope review and approved the [Pilot V2 Product Roadmap](product-roadmap.md) on 17 August 2026. The approved outcomes and exclusions are in the [Pilot V2 Acceptance Criteria](acceptance-criteria.md).

The Product Owner subsequently authorized and accepted Phase 1 through Phase 5. Phase 6 froze the combined source, created one Staging-backed Preview and found one template-reorder schedule-slot blocker. Engineering corrected it with regression coverage, pushed exact source `547581efccf74300f3902df024db8bf47a27fa25`, and Vercel built immutable Preview `dpl_5rfTN5pyze99mCPzHnuhNyHymsDU`. The Product Owner accepted that exact source/Preview pair on 20 August 2026. Read-only Staging and Production readiness baselines pass. No merge, Production deployment, Production migration or Production data change is authorized.

## Exact resume instruction

> Continue Ace Club LMS from `docs/pilot-v2/README.md`. Pilot V2 Phase 1–6 are accepted at source `547581efccf74300f3902df024db8bf47a27fa25` and Preview `dpl_5rfTN5pyze99mCPzHnuhNyHymsDU`. The seven V2 migrations are Staging-only; Production remains on Pilot V1. The [conditional Production release plan](production-release-plan-2026-08-20.md) and [read-only preflight evidence](evidence/phase-7-production-preflight-2026-08-20.md) are prepared. The exact dry run and encrypted manual snapshot restore rehearsal pass. Release remains unauthorized until the documentation-only tip is committed/frozen, the volatile preflight is refreshed, a fresh snapshot is taken and the Product Owner names every authorized Production action. Do not merge, migrate, deploy or change Production first.

## Current checkpoint

| Item | Current state |
|---|---|
| Production application | [aceclub.theadmitco.com](https://aceclub.theadmitco.com) |
| Production Supabase | `owmlxsnzogfapotmjrqk` |
| Staging Supabase | `eyphkkginlgoaxflauog` |
| Deployed Pilot V1 baseline | Production merge `7c35466a34d20726945544ae98d2e368ca277b01` |
| Phase 0 Git baseline | `origin/main` at `c3bc1851553d44aaa48c88f542e64bf9ae68da1d` |
| Pilot V1 source | PR [#16](https://github.com/theadmitco-tech/ace-club-lms/pull/16), frozen source `2ab175788cd037984399f14a0fc4a900c380067d` |
| Pilot V1 deployment | Vercel Production deployment `5886517926`, successful on 13 August 2026 |
| V1 migrations in Production | `20260811170000`, `20260813081141` |
| Explicitly excluded Production migrations | `20260803120000`, `20260803160000`, `20260804120000` |
| V2 state | Phase 0 complete; Phase 1–6 accepted; Phase 7 preflight/recovery complete; Production unauthorized |
| V2 documentation branch | `codex/pilot-v2-handoff`, based on the Production merge and carrying the V1 rollout evidence |
| V2 working branch | `codex/pilot-v2`, created from `origin/main` at `c3bc1851553d44aaa48c88f542e64bf9ae68da1d` through the approved Phase 0 workflow |
| V2 acceptance criteria | Approved; Phase 1–6 accepted |
| V2 product roadmap | Approved; Phase 1–6 accepted; Phase 7 preflight/recovery complete |
| V2 migrations | Through `20260818173000` applied and ledgered on Staging only except the three documented excluded versions; none applied to Production |
| V2 staging/Preview/Production state | Phase 1–6 accepted; immutable Staging-backed Preview accepted at `547581e`; Production unchanged |

The V1 post-release documentation commit was not part of the Production deployment. This V2 documentation line starts from the Production merge and carries that immutable release record forward.

## Authority and complete reading map

When documents conflict, follow the authority order in the [Instruction Register](../../instruction/README.md). Accepted evidence records what happened; it does not silently expand product scope.

### Tier 0 — mandatory before every V2 work session

Read these completely before planning or changing V2:

1. [`AGENTS.md`](../../AGENTS.md) — repository rule requiring the bundled Next.js 16 documentation before framework changes.
2. [Instruction Register](../../instruction/README.md) — authority order, document register and reading paths.
3. This [Pilot V2 bootstrap](README.md) — current V2 state, boundaries and exact next action.
4. [Pilot V2 Acceptance Criteria](acceptance-criteria.md) — approved V2 outcomes, exclusions, safety rules and staging journeys.
5. [Pilot V2 Product Roadmap](product-roadmap.md) — approved Phase 0–7 sequence and exit gates.
6. [MVP Acceptance Criteria](../../instruction/Ace_Club_LMS_MVP_Acceptance_Criteria.md) — binding shipped behavior unless expressly amended.
7. [Product Roadmap](../../instruction/Ace_Club_LMS_Product_Roadmap.md) — signed delivery history, ownership and gates.
8. [Living Coding Rules](../development/coding-rules.md) — environment, authorization, migration, Next.js, testing and definition-of-done rules.
9. [Document Conventions](../governance/document-conventions.md) — authority, naming, evidence, privacy, status and link rules.
10. [Documentation Index](../README.md) — repository-wide document router.
11. The latest signed [MVP Running Handoff](../handoffs/ace-club-lms-running-handoff.md), beginning with Phase 8.
12. The signed [Pilot Iterations Running Handoff](../handoffs/pilot-iterations-running-handoff.md), especially the V1 checkpoint and Production transition.
13. [Pilot V1 Production Rollout Evidence](../pilot-v1/evidence/production-rollout-2026-08-13.md) — exact live baseline, exclusions and sanitized post-smoke state.
14. [Current Code Landscape and Cleanup Plan](../development/current-code-landscape-and-cleanup-plan.md) — historical architecture map and unresolved cleanup register; it is not cleanup authorization.

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
9. [Recommended Reading Bug and Revised Contract](recommended-reading-revision.md) — approved section-wise V2 behavior for next-class pre-reads and previous-class worksheets/Session materials inside their distinct between-class windows.

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

## Approved Pilot V2 scope

The Product Owner approved four connected product outcomes on 17 August 2026. The complete testable wording is in the [Acceptance Criteria](acceptance-criteria.md).

### A. Editable template model

- Provide four seeded, editable templates: Full Course, Critical Reasoning Crash Course, Reading Comprehension Crash Course and Data Interpretation Crash Course.
- Use a structured editor and preview rather than hard-coding later template edits.
- Existing batches are independent snapshots and never change automatically after a template edit.
- Blank-template creation, duplication and a fifth course template are deferred.

### B. Flexible batch creation and scheduling

- Admin selects a template, start date, IST display and publication state, then reviews the complete proposed schedule.
- Admin may add an extra future class, edit eligible future events, reorder arbitrary eligible events or Sections and shift subsequent eligible events by a chosen number of days.
- Every bulk or Student-affecting change requires a before/after consequence review.
- Completed/current events are protected while eligible future events remain editable under the approved running-batch rules.

### C. Flexible resources

- A resource may belong to the batch, one Section, one event or no event.
- Starter packs release at batch creation behind enrollment and publication authorization.
- Existing session-linked pre-read, worksheet, recording and Session-material release rules remain unchanged.
- Released material is not silently withdrawn.
- Reusable Master pre-read/worksheet behavior and batch-owned recording/Session-material isolation remain binding.

### D. Flexible Student experience

- Home, Schedule and Resources are the three primary destinations.
- Full Course Students browse Schedule by Week; crash-course Students browse Schedule by Day. Section browsing belongs to Resources.
- Empty placeholders, a separate History destination and a separate Chronological mode are excluded.
- Home includes next event, Recommended Reading and Recommended Practice. Next Mock, Recently Released and Explore panels are excluded; mocks remain first-class in Schedule.
- Before the batch start date, released Starter Packs appear in Recommended Reading; after the batch starts they remain available through Resources.
- Resources uses consistent instant-selection Sections, Topic and Category dropdowns with no Apply button. QA, VA and DI are ordered academically, contextual choices narrow automatically, and Starter Packs remain under All Sections and All Topics.
- For each academic Section independently, the immediately previous completed class supplies Recommended Practice worksheets and Session materials until the next same-Section class starts. Next-class pre-reads appear only after the previous same-Section class ends and remain until the next class starts.
- The detailed [Recommended Reading contract](recommended-reading-revision.md) remains authoritative for its section-wise two-subsection timing behavior.

### E. Explicit exclusions

- public registration/payment;
- new analytics, grading or progress systems;
- broad mobile redesign beyond responsive non-regression;
- destructive legacy or repository-wide cleanup;
- automatic migration of running Production batches;
- withdrawal of already-released material; and
- weekly-schedule replacement, including the excluded `20260804120000` migration.

The Product Owner supplied the crash-course curriculum screenshots and confirmed the exact schedule, instructor, Full Course, resource and Admin-interface defaults on 17 August 2026. The resulting [template/interface specification](template-interface-specification.md) authorized local Phase 1 implementation and one additive migration file. A later instruction authorized that exact migration on Staging only; Production remains unauthorized.

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
| [Pilot V2 Bootstrap and Running Handoff](README.md) | Active | Single current V2 entry point, approved-scope checkpoint, inherited history, guardrails and exact next action |
| [Pilot V2 Product Review and Acceptance Criteria](acceptance-criteria.md) | Phase 1–6 accepted | Binding V2 outcomes, exclusions, running-batch rules, resource ownership and staging journeys |
| [Pilot V2 Product Roadmap](product-roadmap.md) | Phase 1–6 accepted; Phase 7 preflight/recovery complete | Phase 0–7 product sequence, focused review sets and exit gates |
| [Recommended Reading Bug and Revised Contract](recommended-reading-revision.md) | Approved for implementation planning | Production defect evidence, section-wise two-subsection contract, start/end windows, multi-file behavior and verification requirements |
| [Approved Template and Admin Interface Specification](template-interface-specification.md) | Approved for local Phase 1 implementation | Exact Full Course/crash-course seed rules, instructors, timing and Admin editor/preview contract |
| [Phase 0 Readiness](phase-0-readiness.md) | Complete | Exact Git/deployment/environment/schema/ledger/batch/code baseline and closed Phase 1 start gate |
| [Implementation Plan](implementation-plan.md) | Phase 1–6 accepted; Phase 7 preflight/recovery complete | Ordered implementation phases, commit boundaries and exit gates |
| [Conditional Production Release Plan](production-release-plan-2026-08-20.md) | Prepared; Production unauthorized | Exact release, preflight, rollback, smoke and evidence procedure |
| [Phase 7 Production Preflight Evidence](evidence/phase-7-production-preflight-2026-08-20.md) | Complete; release unauthorized | Sanitized source, Vercel, ledger, aggregate, Auth, tested snapshot recovery and exact dry-run result |
| [Data, Compatibility and Rollback Plan](data-compatibility-and-rollback-plan.md) | Phase 2 migrations verified on Staging | Additive model, compatibility rules, migration sequence, reconciliation constraint and rollback |
| [Manual Verification Checklist](manual-verification-checklist.md) | Complete; Phase 6 accepted | Complete staging acceptance and non-regression journeys |
| [Phase 1 Local Verification Evidence](evidence/phase-1-local-verification-2026-08-17.md) | Passed locally; staging pending | Focused tests, migration execution, revision probe, lint, TypeScript, build and environment boundary |
| [Phase 1 Staging Verification Evidence](evidence/phase-1-staging-verification-2026-08-17.md) | Engineering checks passed; Product Owner accepted Phase 1 | Exact Staging migration, schema/RLS/advisors, authenticated revision journey and batch non-regression |
| [Phase 2 Local Verification Evidence](evidence/phase-2-local-verification-2026-08-17.md) | Passed locally; followed by accepted Staging verification | Proposal, atomic/idempotent creation, schedule mutations, focused tests, lint, TypeScript and build |
| [Phase 2 Staging Migration Evidence](evidence/phase-2-staging-migration-2026-08-17.md) | Technical exit matrix passed; Product Owner accepted Phase 2 | Exact applications, ledger/lint, 20-check authenticated probe, UI states and cleanup audit |
| [Phase 2 Correction Local Verification](evidence/phase-2-correction-local-verification-2026-08-17.md) | Passed locally and applied to Staging only | Exact additive correction, five-function conflict guard, shift/material sequencing, local checks and reviewed hash |
| [Phase 3 Local Verification](evidence/phase-3-local-verification-2026-08-18.md) | Historical local pass before Staging application | Flexible scopes/categories/formats, protected upload, release/ownership guards, focused tests, lint, TypeScript and build |
| [Phase 3 Staging Verification](evidence/phase-3-staging-verification-2026-08-18.md) | Passed; Product Owner accepted | Staging migration, 8/8 isolation/access/sync probe, cleanup and manual protected-PDF confirmation |
| [Phase 4 Local Verification](evidence/phase-4-local-verification-2026-08-18.md) | Passed locally; followed by Staging evidence | Student projection, Home/Schedule/Resources, focused tests, lint, TypeScript, build and environment boundary |
| [Phase 4 Staging Verification](evidence/phase-4-staging-verification-2026-08-18.md) | Passed; Product Owner accepted Phase 4 | Exact migration/correction, Full/crash journeys, protected PDF, disposable authorization, responsive and native-keyboard evidence |
| [Phase 5 Local Integrated Safety](evidence/phase-5-local-integrated-safety-2026-08-18.md) | Passed; followed by final Staging evidence | Route authorization, private-file delivery, tracker immutability/Admin read-only behavior, compatibility and consolidated 45/45 regression evidence |
| [Phase 5 Staging Integrated Safety](evidence/phase-5-staging-verification-2026-08-18.md) | Passed; Phase 5 accepted | Two-schedule isolation, cross-student denial, tracker persistence, Admin parity/read-only behavior, exact shift and cleanup restoration |
| [Phase 6 Preview Acceptance and Phase 7 Readiness](evidence/phase-6-preview-acceptance-and-readiness-2026-08-20.md) | Passed; Product Owner accepted Phase 6 | Exact source/Preview acceptance, reorder correction, Staging compatibility audit and read-only Production baseline |

### Inherited signed handoffs and release records

These files remain immutable historical authority. They are linked rather than copied into V2:

| Document | Status | V2 use |
|---|---|---|
| [Ace Club LMS Running Handoff](../handoffs/ace-club-lms-running-handoff.md) | Signed through MVP Phase 8 | Shipped MVP behavior, accepted evidence exceptions and post-MVP transition |
| [Pilot Iterations Running Handoff](../handoffs/pilot-iterations-running-handoff.md) | Signed off for Pilot V1 | Detailed V1 implementation and ownership history; do not append V2 state |
| [Pilot V1 Acceptance Criteria](../pilot-v1/acceptance-criteria.md) | Signed | V1 scope and the ownership boundaries carried into V2 |
| [Pilot V1 Implementation Plan](../pilot-v1/implementation-plan.md) | Signed/executed | Historical phase method and release isolation |
| [Pilot V1 Phase 0 Readiness](../pilot-v1/phase-0-readiness.md) | Complete | Historical Git/environment/schema baseline; do not treat as current V2 readiness |
| [Pilot V1 Manual Verification Checklist](../pilot-v1/manual-verification-checklist.md) | Complete | Historical staging acceptance coverage |
| [Pilot V1 Conditional Production Release Plan](../pilot-v1/production-release-plan.md) | Executed | Historical release procedure; no authority for V2 Production work |
| [Pilot V1 Production Rollout Evidence](../pilot-v1/evidence/production-rollout-2026-08-13.md) | Passed | Exact current Production baseline and exclusions |

Add later, only when created and approved:

- `production-release-plan-2026-08-20.md` — separately reviewed Production procedure; and
- `evidence/` — dated immutable staging and Production records.

Do not create parallel copies of V1 evidence or rewrite the signed MVP/V1 handoffs. Link them.

## Current V2 handoff checkpoint

- Current internal phase: Phase 7 read-only preflight and tested snapshot recovery complete; Production unauthorized.
- Current owner: Engineering to freeze the documentation-only tip and refresh volatile checks; Product Owner retains authorization of every Production action.
- Documentation branch: `codex/pilot-v2-handoff` at pre-change commit `078256a`, based on Production merge `7c35466a34d20726945544ae98d2e368ca277b01` and carrying the Pilot V1 rollout evidence.
- Working branch: `codex/pilot-v2`, created from freshly fetched `origin/main` at exact start commit `c3bc1851553d44aaa48c88f542e64bf9ae68da1d` in the separate worktree `/Users/tanishagarg/Developer/ace-club-lms-pilot-v2`.
- Working tree state: accepted application source is committed and pushed; this handoff update records the later acceptance evidence.
- Committed/pushed state: accepted Pilot V2 source `547581efccf74300f3902df024db8bf47a27fa25` is pushed on `codex/pilot-v2`; `origin/main` remains unchanged at `c3bc1851553d44aaa48c88f542e64bf9ae68da1d`.
- Application state: Production currently serves `c3bc185`, which includes the separately merged/deployed PR #17 Recommended Reading correction. No Pilot V2 application code is deployed.
- Migration state: the accepted Phase 1–3 migrations plus `20260818170000_add_student_portal_projection.sql` and `20260818173000_fix_student_portal_projection_compatibility.sql` are each applied and ledgered exactly once on Staging only. None is applied to Production. The excluded `20260803120000`, `20260803160000` and `20260804120000` versions remain excluded.
- Environment state: Phase 1–6 verification ran against Staging. The accepted immutable Preview is Staging-backed. Read-only compatibility checks show zero orphan, cross-batch, ownership or schedule-inversion violations. Production was queried read-only and remains on the Pilot V1 ledger; no Production mutation occurred.
- Product Owner evidence: scope, roadmap, exact template/interface specification and Phase 0 plan set were approved on 17 August 2026; Phase 1 was accepted on 17 August, Phase 2–5 on 18 August, and Phase 6 source/Preview on 20 August 2026.
- Phase 0 artifacts: the [readiness record](phase-0-readiness.md), [template/interface specification](template-interface-specification.md), [implementation plan](implementation-plan.md), [data/compatibility/rollback plan](data-compatibility-and-rollback-plan.md) and [manual verification checklist](manual-verification-checklist.md) are approved and linked.
- Open design input: none for Phase 1.
- Product Owner amendment: Venue was removed from the Phase 1 reusable-template editor and preview on 17 August 2026. The database field remains available for later batch/mock scheduling.
- Product Owner amendment: the template actions now read `Preview changes` and `Save template`; the interface explains that saving updates the selected template, preserves history and does not create another template or alter an existing batch.
- Open findings: Phase 0 has identified Git/documentation baseline drift and a staging/Production schedule-generator definition/grant difference; neither environment has been changed.
- Phase 1 verification: [local evidence](evidence/phase-1-local-verification-2026-08-17.md) and [Staging evidence](evidence/phase-1-staging-verification-2026-08-17.md) pass the focused suites, exact migration, seed/constraint/RLS/grant checks, authenticated edit/review/save, invalid and stale denial, existing-batch aggregate comparison and final Product Owner interface review. Phase 1 is accepted.
- Phase 2 verification: the [final Staging evidence](evidence/phase-2-staging-migration-2026-08-17.md) records the four exact Staging-only migrations, 20/20 authenticated checks, UI/accessibility verification and fixture cleanup. The Product Owner accepted Phase 2 on 18 August 2026.
- Phase 3 verification: [local evidence](evidence/phase-3-local-verification-2026-08-18.md) records the additive migration hash, focused 28/28 template/inheritance/resource/recommendation/private-file checks, touched-file lint, TypeScript, Production build and diff checks. No environment or authenticated fixture was changed.
- Phase 4 local verification: [local evidence](evidence/phase-4-local-verification-2026-08-18.md) records the backward-compatible Student projection, recommendation-driven Home with pre-batch Starter Packs, Full Course Week and crash-course Day grouping, first-class Schedule mock details, contextual Sections/Topic/Category resource browsing and Starter Pack discovery, focused 37/37 checks, touched-file lint, TypeScript, Production build and diff checks. No environment or authenticated fixture was changed.
- Phase 4 Staging verification: [Staging evidence](evidence/phase-4-staging-verification-2026-08-18.md) records both exact migrations, authenticated Full/crash journeys, responsive layouts, protected PDF delivery, 12/12 disposable authorization/Starter-Pack/mock checks, native-keyboard traversal and cleanup at zero remaining owned courses/users. Phase 4 is accepted.
- Phase 5 purpose: the end-to-end sanity, safety and non-regression gate across the template, schedule, resource and Student-portal work delivered in Phases 1–4; it introduced no additional product feature.
- Phase 5 local verification: [integrated-safety evidence](evidence/phase-5-local-integrated-safety-2026-08-18.md) records the new 8/8 safety suite, consolidated 45/45 Pilot V2 checks, touched-file lint, TypeScript and Production build.
- Phase 5 Staging verification: [final Staging evidence](evidence/phase-5-staging-verification-2026-08-18.md) records 10/10 two-schedule isolation, role-crossover, cross-student tracker, Student-owned persistence, Admin parity/read-only and exact shift checks. Cleanup restored exact global course/session/material/enrollment/tracker counts with zero disposable batches/users. Phase 5 is accepted.

## Phase 2 handoff

Status: Accepted by the Product Owner on 18 August 2026.

This section preserves the Phase 2 starting baseline, completed batch-creation and schedule-editing contract, exit evidence and authorization history. It does not authorize any further migration, commit, push, Preview, merge, deployment or Production action.

### Accepted starting baseline

| Item | State |
|---|---|
| Working branch | `codex/pilot-v2` |
| Worktree | `/Users/tanishagarg/Developer/ace-club-lms-pilot-v2` |
| Inherited start commit | `c3bc1851553d44aaa48c88f542e64bf9ae68da1d`, equal to `origin/main` at Phase 0 start |
| Local state | Phase 0/1 work is uncommitted and unpushed; preserve it and do not clean or replace this worktree |
| Production | No Pilot V2 application or migration change |
| Staging | `20260817090845_add_versioned_course_templates.sql` applied and ledgered exactly once |
| Templates accepted on 17 August | Full Course: 30 events, revision 3; CR: 6 events, revision 7; RC: 6 events, revision 1; DI: 6 events, revision 2 |
| Existing batches | Unchanged; no template identity was assigned automatically |

These revision numbers are the accepted checkpoint, not permanent curriculum locks. A later template save may create a new revision. Each new batch must pin the exact immutable revision used for its proposal and confirmation.

### Outcome

An Admin can enter a batch name; choose Full Course, CR Crash Course, RC Crash Course or DI Crash Course from a dropdown; choose a start date and Draft/Published state; review a complete no-write proposal in `Asia/Kolkata`; confirm it atomically and idempotently; and safely edit only that batch's eligible future delivery.

### Creation contract

- Opening, editing or abandoning a proposal writes and publishes nothing.
- The proposal shows every event's title, event type, Section, order, date, start time, duration, instructor, applicable venue, publication state and inherited reusable-resource associations.
- Generation uses one explicitly selected immutable template revision and canonical `Asia/Kolkata` calculations.
- Confirmation carries the expected template revision and a unique idempotency key.
- One Admin-authorized transaction creates the batch, sessions and permitted reusable-resource assignments, or creates none.
- Retrying a successful confirmation returns the original result without a second schedule or duplicate resource assignment.
- A template edit after preview makes the stale confirmation fail safely; it never silently switches revisions.

### Schedule-editing contract

- Supported event types are Live class, Mock, Orientation, Break and Support. Window remains removed.
- Break is a planned no-class pause; Support is a scheduled staff-led interaction.
- An eligible future event can change title, Section, order, date, time, duration, instructor, venue and publication state where applicable.
- An extra class belongs only to that batch and never changes the reusable template.
- Eligible future events and complete eligible Sections can be reordered across Programme, Verbal, Quant and DI.
- Shift subsequent moves the selected eligible event and all eligible later events by the confirmed number of days.
- Cancellation preserves history rather than hard-deleting a delivered event.
- Before a bulk change, the Admin sees affected events and the before/after timestamps for affected unreleased materials.

### Running-batch and resource protections

- Completed events cannot be moved or deleted.
- A currently running event is locked against schedule changes; only approved non-scheduling corrections such as venue instructions remain eligible.
- Enrollment does not freeze all future delivery. Eligible future events can still be added, edited, reordered, shifted or cancelled after consequence review.
- Already-released material stays available. Only unreleased timestamps follow an approved schedule change.
- Eligibility and expected schedule revision are checked again inside the transaction so stale changes fail safely.
- No operation changes the source template, another batch, enrollment/tracker ownership, recordings or Session materials.
- Optional instructions may be copied to a batch event. Blank or whitespace-only instructions must later render no Student-facing label, row, card or placeholder.
- Only approved reusable starter packs, pre-reads and worksheets may be inherited. Recordings and Session materials remain batch/event-owned and are never copied from Master Base or synchronized across batches.

### Deferred and excluded

- Flexible Master Base/resource-library management and crash-course material filtering are Phase 3.
- Student Home, Schedule and Resources presentation is Phase 4.
- Venue/reporting details may be collected for applicable batch/mock scheduling; reporting time is not restored to the reusable-template editor.
- Template changes never synchronize structurally into an existing batch.
- Existing running or historical batches are not retrofitted with a template revision.
- The excluded migrations `20260803120000`, `20260803160000` and `20260804120000` must not be applied, repaired or marked as applied.
- Production migration, backfill and rollout remain separately gated.

### Implementation map and order

Start from `src/app/admin/courses/page.tsx`, `src/app/admin/sessions/`, `src/app/admin/templates/`, `src/lib/courseTemplates.ts`, `src/lib/server/courseTemplates.ts`, the Student timing/release helpers, the legacy cohort generator and the Phase 1 template migration. Reconcile legacy behavior against the approved criteria before reuse.

1. Re-inventory the dirty worktree, branch/commit and live Staging definitions read-only.
2. Add focused domain types and pure proposal/consequence calculations with tests.
3. Add a separately reviewable **new additive migration**; do not amend the applied Phase 1 migration.
4. Add nullable batch provenance, creation idempotency, schedule revision, course mode, event type/Section/order, optional source event, applicable venue/instructions and cancellation history.
5. Preserve legacy `session_number` and `class_type` until all consumers are migrated and verified; do not backfill source templates onto existing batches.
6. Add least-privilege Admin-only proposal/confirm/mutation functions, constraints, indexes, grants and RLS.
7. Build no-write proposal and atomic confirmation with expected-template-revision checking and clear top-right feedback.
8. Add server-owned eligibility and schedule-revision checks, then individual edit, extra class, reorder/Section move, cancellation and shift subsequent.
9. Add before/after consequence review for events and unreleased material timestamps.
10. Run focused engineering checks and the complete approved Staging matrix before requesting Product Owner acceptance.

The authorized local implementation chose `20260817143000_add_batch_schedule_builder.sql`. Before any later authorized Staging application, prove the dry run contains only that exact reviewed migration. Never use `supabase db push --include-all`.

### Exit matrix

| Gate | Required proof |
|---|---|
| Full Course creation | Expected IST schedule is created from one pinned revision |
| Crash-course creation | One crash template creates its expected shorter schedule and course mode |
| No-write proposal | Opening/editing/abandoning leaves no batch, session or resource rows |
| Retry and stale safety | Retry creates no duplicates; stale template/schedule revisions fail safely |
| Extra class | Added only to the selected batch |
| Two-day shift | Selected and subsequent eligible events move; locked events do not |
| Arbitrary reorder | Eligible events and a complete eligible Section reorder without subject assumptions |
| Consequences | Before/after events and unreleased timestamps match the confirmed change |
| Running protections | Completed/current events reject forbidden changes; released material remains available |
| Isolation | Template, other batches, recordings, Session materials, enrollments and trackers remain unchanged |
| Security/accessibility | Unauthorized requests are denied; keyboard and 100%/equivalent 200% layouts expose all controls and feedback |
| Engineering | Focused tests, touched-file lint, TypeScript, build where permitted and `git diff --check` pass |

Phase 2 exited on 18 August 2026 after the Full Course, crash-course, retry, extra-class, two-day-shift, arbitrary-reorder, isolation and running-batch journeys passed on Staging and the Product Owner accepted the rendered workflow.

### Historical authorization record

Phase 2 local implementation, its four exact Staging-only migrations and bounded authenticated verification were separately authorized and completed. Phase 2 acceptance does not authorize push, Preview, merge, deployment or Production changes.

Phase 3 Staging application and verification were subsequently authorized and completed; the next authorization belongs to Phase 4.

## Phase 3 handoff

Status: Accepted by the Product Owner on 18 August 2026.

The Admin now has a dedicated Resources destination for whole-batch, Section, event and standalone batch associations, plus reusable-resource authoring inside each of the four Course templates. Full Course Master Base remains the source library for linked Full Course pre-reads and worksheets; crash-course and template-specific resources no longer require fake Master sessions. Controlled categories map to the approved Notion, protected PDF, YouTube and short-text formats. Starter packs release from the batch-creation timestamp behind active publication/enrollment checks. Existing event-linked pre-read, worksheet, recording and Session-material release times remain database-owned. Recordings and Session materials require one event in one batch, cannot acquire a reusable origin and are protected from update/removal after release.

The additive migration is `20260818113000_add_flexible_batch_resources.sql` with SHA-256 `976e93fbd551ded352824915bfa2dc5e135b0846472c544e3b327f366e57f5b8`. It is applied and ledgered on Staging only, not Production. The application includes immutable template-resource content, atomic/idempotent batch inheritance, reviewed stale-safe explicit sync, server-authorized resource data layers/actions, protected signed-upload routes, failed/replaced private-file cleanup, validation tests and compatibility classification for existing session-linked rows and later legacy generation/sync writes.

Recommended Reading already implements the approved independent QA/VA/DI next-class pre-read and last-class Session-material contract on the inherited branch; its focused seven-case suite remains green. Recommended Practice code and timing were not changed.

The exact Staging probe passed 8/8 access, isolation, rescheduling and idempotent-sync checks, removed all fixtures, and the Product Owner manually confirmed protected template PDF upload. Phase 3 is accepted; see the [Staging evidence](evidence/phase-3-staging-verification-2026-08-18.md).

## Phase 0 to Phase 1 ownership transfer

### Completed Phase 0 technical work

- Fresh remote refs were fetched and `codex/pilot-v2` was created from exact `origin/main` commit `c3bc1851553d44aaa48c88f542e64bf9ae68da1d`.
- Current Production deployment identity was verified read-only; PR #17 is inherited baseline.
- Staging and Production schemas, migration ledgers, storage configuration, key policies/functions/triggers and representative anonymized batches were inventoried read-only.
- Current Admin creation/edit/resource flows and Student release consumers were mapped.
- The relevant bundled Next.js 16.2.4 guides were selected and recorded.
- The implementation, additive data, existing-batch compatibility/rollback and manual staging plans were drafted.
- `git diff --check`, local Markdown-link validation and changed-document privacy/secret review pass.

### Phase 1 start gate

Phase 1 may start only after all of the following are recorded:

- [x] Product Owner supplied the template/curriculum screenshots.
- [x] The exact Full Course, CR Crash Course, RC Crash Course and DI Crash Course event/Section/resource rules are documented and approved.
- [x] The Admin template editor/preview is approved; Phase 1 has no Student interface change.
- [x] Product Owner approved the Phase 0 implementation, data/compatibility/rollback and manual-verification plan set.
- [x] The Phase 0 and Phase 1 working changes remain local and uncommitted; commit/push was not requested.

After those checks pass, Engineering updates the current internal phase to `Phase 1 — Editable template foundation`, records the Phase 1 start commit and implements only the approved template foundation against local/staging configuration.

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

Prepare a dated conditional Phase 7 Production release plan naming exact source `547581efccf74300f3902df024db8bf47a27fa25`, every proposed migration, environment validation, rollback target and non-mutating smoke check. Then obtain a new Product Owner instruction naming every authorized merge, migration, deployment and Production action. Until then, do not merge, migrate, deploy or change Production.
