# Phase 3 — Align the Master Course

Status: Staging implementation verified; content population and Production release pending
Owner: Product owner and Engineering
Last updated: 31 July 2026

## Objective

Create one fixed master course with the approved sequence, explicit class types, fixed instructor mappings, and reusable Notion pre-reads, PDF worksheets, and worksheet question rows.

## Baseline

- Git baseline: `origin/main` at merge commit `ccd887e`.
- Working branch: `codex/phase-3-master-course`.
- Approved curriculum source: [Revised course structure](revised-course-structure.md).
- Current code fallback: 16 legacy Saturday/Sunday sessions in `src/lib/curriculum.ts`.
- Current database model: `master_sessions` has only title and sequence; it cannot yet represent week, weekday, event type, instructor, or curriculum identity.
- Initial staging inventory found one course with 16 legacy cohort sessions and no master sessions, master materials, worksheet plans, practice sets, or practice questions.

## Confirmed rules

- The supplied week/day table is the Phase 3 curriculum source of truth.
- Class-type mappings are `DI` → Ishan, `VA` → Tanya, and `QA` → Unnati.
- Orientation, mocks, calls, and breaks do not inherit a DI/VA/QA instructor.
- Release-time behaviour remains Phase 4 scope.
- Student tracker behaviour remains Phases 6–7 scope.

## Current interpretation

Every non-empty cell is retained as a stable master-course timeline item. `Break` is a non-class marker, calls are support events, and the later mock sessions are placed on Saturday because they appear in the Saturday column of the supplied table.

This interpretation must be corrected before import if the Product Owner intended calls or breaks to be excluded, or intended the Week 10/12/14/16 mocks for another weekday.

## Start-gate status

| Gate | Status |
| --- | --- |
| Branch from verified `origin/main` | Pass |
| Revised curriculum frozen | Pass, subject to the interpretation above |
| Read-only staging master/cohort inventory | Pass |
| Existing journey smoke baseline | Pass; signed Phase 2 baseline preserved |
| Worksheet PDF reference/storage contract | Approved: Admin upload to private master library; protected signed delivery |
| Worksheet question-row contract | Approved: manual positive question count per worksheet for Phase 3 |
| Notion/PDF/question associations per teaching session | Workflow verified with a DI 1 vertical slice; remaining source content may be populated later |

## Exit gate

Phase 3 passes when one complete master course contains the approved titles, event/class types, fixed instructors, Notion pre-reads, PDF worksheets, and worksheet question rows, with reviewed placeholders and duplicates removed.

## Master-content workflow decision

An Admin can attach multiple Notion pre-reads and multiple PDF worksheets to each master-course item. Each worksheet has its own manually entered positive question count. New cohorts copy all master pre-reads, worksheets, file references, and counts. Worksheet PDFs use a private Supabase Storage bucket and are opened through an authenticated, release-aware route; the browser never receives elevated storage credentials.

## Staging verification evidence

- All three ordered Phase 3 migrations applied successfully to staging.
- The master timeline contains 31 ordered items with the approved DI, VA, and QA counts and instructor mappings.
- Admin Preview displays all 31 items and supports adding multiple Notion pre-reads and PDF worksheets.
- The DI 1 vertical slice contains one pre-read, one private PDF worksheet, a manual question count of 20, and exactly 20 generated worksheet-question rows.
- A newly created staging cohort inherited the available DI 1 materials. An enrolled Student could see the released pre-read and open the worksheet.
- Future sessions and materials remained locked until their staging release timestamps were temporarily moved into the past.
- Signed-out worksheet access did not create a new signed URL. The already-issued URL expired after 60 seconds and returned `InvalidJWT`, confirming private time-limited delivery.
- Targeted lint, TypeScript, and the production build pass. The pre-existing full-repository lint baseline remains separately deferred.

## Known boundary for Phase 4

Cohorts are currently snapshots: adding a new master material after a cohort has been created does not retroactively add it to that cohort. The staging probe confirmed this by adding another pre-read after creating `Aug test`; the Student continued to see only the originally copied pre-read. Existing-cohort propagation must be designed in Phase 4 rather than treated as a Phase 3 regression.

The legacy cohort generator also still creates 16 sessions and infers some class metadata incorrectly. Replacing that generator with the 31-item master timeline is Phase 4 scope.

## Remaining before Phase 3 sign-off

- Populate or explicitly approve the remaining master-course content as it becomes available.
- Record the final Product Owner content acceptance against the exit gate.
- Apply the ordered migrations to Production only through the reviewed release process; no Phase 3 Production schema or data change has yet been authorized.
