# Phase 7 — Adapt Admin Progress

Status: Active — staging migration applied; authorization and UI acceptance pending
Owner: Product owner and Engineering
Last updated: 3 August 2026

## Objective

Implement `AC-ADMIN-01` through `AC-ADMIN-04` as read-only Admin views over the Student-owned `student_question_logs` records delivered in Phase 6.

## Scope and boundaries

- Show each enrolled Student's Done, Come back for review, Not updated, completion and last-update totals for every released worksheet in a batch.
- Let authorised Admins inspect question number, Student-selected status, optional time, comment and last update.
- Calculate completion only as `Done ÷ total worksheet questions`.
- Preserve Student ownership, Student-only writes, enrollment matching, worksheet release rules and fixed question rows.
- Keep the Admin experience read-only and exclude rank, correctness, accuracy, daily targets, trends, alerts, filters and CSV exports.

Phase 7 does not change the three Phase 6 Student RPCs or the `student_question_logs` ownership/RLS model.

## Implementation status

- Ordered migration `20260803160000_add_admin_practice_progress.sql` adds two authenticated, Admin-only read RPCs:
  - `get_admin_course_practice_progress` returns enrolled Students, released worksheets and matching manual totals for one batch;
  - `get_admin_student_worksheet_progress` returns one enrolled Student's question-level records for one released worksheet in that batch.
- `/admin/progress` lists batches and links to batch progress.
- `/admin/progress/[courseId]` shows per-worksheet Student totals and completion.
- `/admin/progress/[courseId]/student/[userId]/worksheet/[materialId]` provides question-level read-only inspection.
- Dashboard, Batches and Users link into the same progress surface.
- The legacy `/admin/worksheets` daily-target/accuracy interface redirects to `/admin/progress`, and the Admin dashboard no longer queries or presents V2 worksheet analytics.

## Local verification

The current local results are recorded in [automated verification evidence](evidence/automated-verification-2026-08-03.md).

- `npx tsc --noEmit`: pass.
- Targeted ESLint for all Phase 7-touched TypeScript files: pass with zero findings.
- Guarded Next.js 16.2.4 Production build: pass.
- Repository-wide lint: unchanged signed baseline of 22 errors and 3 warnings, all outside Phase 7-touched files.

## Staging migration

The Product Owner applied `20260803160000_add_admin_practice_progress.sql` to staging Supabase `eyphkkginlgoaxflauog` on 3 August 2026. The SQL Editor returned `Success. No rows returned`. The immutable record is in [staging migration evidence](evidence/staging-migration-application-2026-08-03.md).

## Risks and pending evidence

- SQL execution passed in staging. Admin-only RPC denial, enrollment/release matching and totals against live Phase 6 records remain unproved.
- Empty Production-like data must remain a deliberate non-error state; Production must not be seeded merely for positive coverage.
- Positive question-level coverage should use staging fixtures or rollback-only probes and must not expose private Student data in evidence.
- Common desktop widths, keyboard focus, text zoom and role redirects still require signed-in staging verification.

## Exit gate

Phase 7 is complete only when the [manual verification checklist](manual-verification-checklist.md) passes in staging, Admin totals match the same Student records, role/privacy/release probes pass, Product Owner acceptance is recorded and the reviewed rollout reaches Production through the normal release preflight.
