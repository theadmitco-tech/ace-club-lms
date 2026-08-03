# Phase 6 — Manual Verification Checklist

Status: Passed — staging verification complete
Owner: Product owner, Engineering and QA  
Last updated: 3 August 2026

## Database and privacy

- [x] Applying `20260803120000_add_student_practice_log.sql` to staging succeeds once (`Success. No rows returned`, Product Owner report, 3 August 2026).
- [x] Existing enrolled Students receive one record per cohort worksheet question without duplicates (staging audit and rollback-only provisioning probe passed, 3 August 2026).
- [x] A new enrollment receives the same independent records (rollback-only staging probe passed, 3 August 2026).
- [x] A newly copied worksheet or newly added master question provisions missing records once (rollback-only staging probe passed, 3 August 2026).
- [x] Student A cannot read or update Student B records through table access or RPC calls (staging privacy probe passed, 3 August 2026).
- [x] A signed-out caller cannot read tracker data through the worksheet-log URL or write through the tracker RPC.
- [x] A deactivated Student cannot read or update tracker data (staging privacy probe passed, 3 August 2026).
- [x] An unreleased worksheet cannot be found in Practice log or opened through table/RPC/Timeline tracker access (rollback-only staging probe passed, 3 August 2026).
- [x] An authorised Admin can read the records needed by Phase 7 and cannot accidentally become their Student owner (rollback-only staging probe passed, 3 August 2026).

## Practice log overview

- [x] Student navigation exposes Practice log.
- [x] Only released worksheets with fixed question rows appear (Week 0 empty state and past-cohort released MOCK worksheet verified).
- [x] Worksheets are grouped by curriculum section/type with QA, VA and DI first; other worksheet-bearing types are separate, and each row retains its programme week.
- [x] Done, review and Not updated totals match the worksheet rows.
- [x] Last updated is absent for untouched worksheets and changes after a real Student update.
- [x] Opening an overview item reaches its released PDF and matching question log.

## Canonical entry points

- [x] Recommended practice exposes Update log only when the tracker exists (conditional link contract verified; current staging correctly shows no recommendation when none is eligible).
- [x] Timeline exposes Log only when the released tracker exists.
- [x] Browse by section exposes the same canonical Log action and records through the shared Timeline item/resource component; current QA, VA and DI section data has no released worksheet for a positive click.
- [x] Curriculum-item Log opens the same worksheet workspace.
- [x] Reopening from every entry point uses the canonical material route and never creates duplicate records; the staging database audit returned zero duplicate identity groups.

## Individual tracking

- [x] Untouched rows show Not updated and do not present it as a selectable third status (new-enrollment rows provision with null status; the component exposes only Done and Review controls).
- [x] Done saves and persists after refresh.
- [x] Come back for review saves, is visually distinct and persists after refresh.
- [x] Choosing the other status replaces the previous status; overview totals changed from 15 Done / 5 review to 16 Done / 4 review after refresh.
- [x] A blank optional time and comment do not block saving (persisted Done rows with both fields blank were present in the canonical staging workspace).
- [x] Valid `mm:ss` time saves and persists; invalid input remains visible with actionable feedback.
- [x] A comment saves on blur and persists; the staging privacy probe also confirmed another Student cannot read or change the owner's tracker row.
- [x] Saving, Saved and Retry states are understandable without relying only on colour.

## Bulk tracking and recovery

- [x] Select all selects every visible question and can be cleared.
- [x] Mark selected Done changes only selected questions.
- [x] Mark selected for review changes only selected questions.
- [x] Bulk confirmation states the exact number and target status.
- [x] Successful records remain saved when a subset fails.
- [x] Failed question numbers remain selected and identifiable.
- [x] Retry failed only does not resubmit successful or unselected records.

## Quality and non-regression

- [x] Keyboard navigation, visible focus, text zoom and common laptop/desktop widths pass. The deployed Select all fix produces a solid 3px gold focus outline with 2px offset; laptop and 200%-equivalent layouts pass without page overflow.
- [x] PDF loading/failure is isolated in its client component and cannot erase tracker state; it exposes a dedicated Retry PDF state. Live request interception was unavailable in the browser surface.
- [x] Tracker failure renders beside the independent released PDF and exposes Retry log. Live request interception was unavailable in the browser surface.
- [x] Rank, accuracy, correctness, daily targets and auto-grading remain absent from the Student experience.
- [x] Authentication, logout, course enrollment, timeline, section browsing and material release remain passing.
- [x] Cross-student RLS and direct-URL material release suites remain passing.
- [x] `npx tsc --noEmit`, targeted ESLint and guarded Production build pass.
- [x] Repository-wide lint is measured and the unchanged Phase 5 baseline of 22 errors and 3 warnings is recorded accurately.
