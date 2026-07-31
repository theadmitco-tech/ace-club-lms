# Phase 3 — Align the Master Course

Status: Active
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
- Staging row inventory is pending authenticated, read-only access; anonymous access is correctly blocked by RLS.

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
| Read-only staging master/cohort inventory | Pending authenticated access |
| Existing journey smoke baseline | Covered by signed Phase 2 evidence; new Phase 3 pre-change probe pending |
| Worksheet PDF reference/storage contract | Approved: Admin upload to private master library; protected signed delivery |
| Worksheet question-row contract | Approved: manual positive question count per worksheet for Phase 3 |
| Notion/PDF/question associations per teaching session | Pending source content |

## Exit gate

Phase 3 passes when one complete master course contains the approved titles, event/class types, fixed instructors, Notion pre-reads, PDF worksheets, and worksheet question rows, with reviewed placeholders and duplicates removed.

## Master-content workflow decision

An Admin can attach multiple Notion pre-reads and multiple PDF worksheets to each master-course item. Each worksheet has its own manually entered positive question count. New cohorts copy all master pre-reads, worksheets, file references, and counts. Worksheet PDFs use a private Supabase Storage bucket and are opened through an authenticated, release-aware route; the browser never receives elevated storage credentials.
