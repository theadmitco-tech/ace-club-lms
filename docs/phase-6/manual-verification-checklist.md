# Phase 6 — Manual Verification Checklist

Status: Active — pending staging verification  
Owner: Product owner, Engineering and QA  
Last updated: 3 August 2026

## Database and privacy

- [x] Applying `20260803120000_add_student_practice_log.sql` to staging succeeds once (`Success. No rows returned`, Product Owner report, 3 August 2026).
- [ ] Existing enrolled Students receive one record per cohort worksheet question without duplicates.
- [ ] A new enrollment receives the same independent records.
- [ ] A newly copied worksheet or newly added master question provisions missing records once.
- [ ] Student A cannot read or update Student B records through table access or RPC calls.
- [ ] A signed-out caller cannot read or update tracker data.
- [ ] A deactivated Student cannot read or update tracker data.
- [ ] An unreleased worksheet cannot be found in Practice log or opened through a direct tracker call.
- [ ] An authorised Admin can read the records needed by Phase 7 and cannot accidentally become their Student owner.

## Practice log overview

- [x] Student navigation exposes Practice log.
- [x] Only released worksheets with fixed question rows appear (Week 0 empty state and past-cohort released MOCK worksheet verified).
- [x] Worksheets are grouped by curriculum section/type with QA, VA and DI first; other worksheet-bearing types are separate, and each row retains its programme week.
- [x] Done, review and Not updated totals match the worksheet rows.
- [ ] Last updated is absent for untouched worksheets and changes after a real Student update.
- [x] Opening an overview item reaches its released PDF and matching question log.

## Canonical entry points

- [ ] Recommended practice exposes Update log only when the tracker exists.
- [ ] Timeline exposes Log only when the released tracker exists.
- [ ] Browse by section exposes the same Log action and records.
- [ ] Curriculum-item Tracker opens the same worksheet workspace.
- [ ] Reopening from every entry point never creates duplicate records.

## Individual tracking

- [ ] Untouched rows show Not updated and do not present it as a selectable third status.
- [x] Done saves and persists after refresh.
- [x] Come back for review saves, is visually distinct and persists after refresh.
- [x] Choosing the other status replaces the previous status; overview totals changed from 15 Done / 5 review to 16 Done / 4 review after refresh.
- [ ] A blank optional time and comment do not block saving.
- [ ] Valid `mm:ss` time saves and persists; invalid input remains visible with actionable feedback. (Valid persistence passed; invalid feedback pending.)
- [x] A comment saves on blur and persists. Cross-student privacy remains a separate pending database probe.
- [ ] Saving, Saved and Retry states are understandable without relying only on colour.

## Bulk tracking and recovery

- [ ] Select all selects every visible question and can be cleared.
- [ ] Mark selected Done changes only selected questions.
- [x] Mark selected for review changes only selected questions.
- [x] Bulk confirmation states the exact number and target status.
- [ ] Successful records remain saved when a subset fails.
- [ ] Failed question numbers remain selected and identifiable.
- [ ] Retry failed only does not resubmit successful or unselected records.

## Quality and non-regression

- [ ] Keyboard navigation, visible focus, text zoom and common laptop/desktop widths pass.
- [ ] PDF loading or failure does not silently erase tracker input.
- [ ] Tracker loading or failure leaves the released PDF usable and offers retry.
- [ ] Rank, accuracy, correctness, daily targets and auto-grading remain absent from the Student experience.
- [ ] Authentication, logout, course enrollment, timeline, section browsing and material release remain passing.
- [ ] Cross-student RLS and direct-URL material release suites remain passing.
- [ ] `npx tsc --noEmit`, targeted ESLint and guarded Production build pass.
- [ ] Repository-wide lint is measured and any unchanged legacy baseline is recorded accurately.
