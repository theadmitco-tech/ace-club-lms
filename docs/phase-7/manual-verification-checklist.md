# Phase 7 — Manual Verification Checklist

Status: Active — staging verification pending
Owner: Product owner, Engineering and QA
Last updated: 3 August 2026

## Database and authorization

- [x] Apply `20260803160000_add_admin_practice_progress.sql` successfully to staging once (`Success. No rows returned`, Product Owner report, 3 August 2026).
- [ ] An active Admin can call both Phase 7 read RPCs.
- [ ] A Student and a signed-out caller cannot call either Phase 7 RPC.
- [ ] The question inspector rejects a Student, worksheet or batch combination without matching enrollment.
- [ ] Unreleased and unpublished worksheets remain absent from cohort progress and question inspection.
- [ ] Admin inspection creates no Admin-owned tracker rows and changes no Student tracker row.
- [ ] Existing Phase 6 Student reads/writes and all three Student tracker RPCs remain passing.

## Cohort progress — `AC-ADMIN-01` and `AC-ADMIN-03`

- [ ] Every enrolled Student appears for each released worksheet with fixed question rows.
- [ ] Done, Come back for review and Not updated totals match the Student's canonical worksheet log.
- [ ] Not updated equals total questions minus Done minus review, never below zero.
- [ ] Completion equals Done divided by total worksheet questions.
- [ ] Review questions do not count as complete.
- [ ] Last update is absent for untouched worksheets and matches the latest real Student input.
- [ ] Inactive enrolled Students remain visible as historical programme records and are clearly labeled inactive.
- [ ] A batch with no Students shows an actionable empty state.
- [ ] A batch with no released eligible worksheets shows the deliberate empty state.

## Question inspection — `AC-ADMIN-02`

- [ ] Inspect log opens the selected Student and worksheet without switching ownership.
- [ ] Question number, Done/review/Not updated status, optional time, comment and last update match the Student record.
- [ ] Blank time/comment fields display clearly without implying missing questions.
- [ ] The page contains no input, save, bulk-update or other Admin write control.
- [ ] Returning to batch progress preserves the correct batch context.

## MVP simplification and navigation

- [ ] Admin navigation exposes Student progress and no longer exposes the legacy daily worksheet tracker.
- [ ] Dashboard, Batches and Users reach the same batch progress surface.
- [ ] `/admin/worksheets` redirects to `/admin/progress`.
- [ ] Rank, correctness, accuracy, daily targets, on-track/behind analytics, trends, alerts, filters and CSV exports are absent from the reachable Admin progress interface.
- [ ] Student access to `/admin/progress` redirects to the Student dashboard; signed-out access redirects to login.

## Quality and non-regression

- [x] `npx tsc --noEmit` passes locally.
- [x] Targeted ESLint passes with zero findings for Phase 7-touched TypeScript files.
- [x] Guarded Next.js 16.2.4 Production build passes locally.
- [x] Repository-wide lint remains exactly 22 errors and 3 warnings in untouched legacy files.
- [ ] Common laptop/desktop widths require no page-level horizontal scrolling; wide tables contain overflow locally.
- [ ] Keyboard order, visible focus, text zoom and non-colour status labels pass.
- [ ] Authentication, deactivation, Admin operations, Student Practice log and canonical worksheet tracking remain passing.
- [ ] Product Owner accepts the staging cohort totals and question-level inspection before Production rollout.
