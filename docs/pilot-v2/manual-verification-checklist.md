# Pilot V2 — Manual Verification Checklist

Status: Complete; Phase 6 accepted against the immutable Preview
Owner: Product owner, Engineering and QA/Security
Last updated: 20 August 2026

Record the exact commit, immutable Preview, staging migration versions and anonymized fixtures before execution. Never use Production data or accounts for these journeys.

## A. Templates

- [x] Exactly four seeded templates appear: Full Course, CR Crash Course, RC Crash Course and DI Crash Course.
- [x] Each matches the approved event/Section/resource definition.
- [x] Admin can edit all approved required/optional fields.
- [x] Review validates the draft and shows the selected template, change counts, resulting event total and proposed revision in the standard top-right notification; Venue and Reporting time are absent from the reusable-template editor.
- [x] Invalid structure cannot save and gives an actionable field error.
- [x] Editing a template leaves an already-created batch unchanged.

## B. Batch creation and schedule

- [x] Create and confirm one Full Course batch in `Asia/Kolkata`.
- [x] Create and confirm each crash-course template.
- [x] Proposal shows every event and inherited reusable resource before confirmation.
- [x] Retry with the same idempotency key creates no duplicate schedule or resources.
- [x] Add one extra future class to one batch only.
- [x] Edit an eligible future event after enrollment.
- [x] Reorder arbitrary eligible future events.
- [x] Move one complete eligible Section.
- [x] Shift one future event and all eligible subsequent events by two days.
- [x] Consequence review lists every changed event and unreleased resource timestamp.
- [x] Cancel an eligible future event with consequence review.
- [x] Completed/current events reject schedule or deletion changes.
- [x] Eligible future events in an underway Section remain editable.
- [x] Another batch and the reusable template remain unchanged.

## C. Resources

- [x] Add multiple standalone/batch starter packs without fake sessions.
- [x] Add and browse one Section-scoped resource.
- [x] Add and browse one event-scoped resource.
- [x] Add one standalone resource with no Section/event.
- [x] Supported Notion, protected PDF, YouTube and approved text instruction paths work.
- [x] Starter packs release at creation only to active enrolled Students in a published batch.
- [x] Pre-read and worksheet generation/sync preserve current timing and idempotency.
- [x] Recording and Session-material release remains after the exact batch event ends.
- [x] A released resource remains available after rescheduling.
- [x] Recording and Session material in batch A never appear or change in batch B or a template.
- [x] Private PDF delivery remains no-store and uses short-lived signed access.

## D. Student experience

- [x] Home shows course, next event, Recommended Reading and Recommended Practice without Next Mock, Recently Released or Explore panels.
- [x] Before the batch start date, released Starter Packs appear in Recommended Reading; from the start date onward they remain in Resources without the Home callout.
- [x] Full Course Schedule groups chronologically by Week without a Section mode.
- [x] Crash-course Schedule groups chronologically by Day without a Section mode.
- [x] Empty weeks, days, sessions and irrelevant placeholders are absent.
- [x] Resources browse by Section, category and event while standalone items remain discoverable.
- [x] A mock shows date, time, venue, reporting time, instructions and preparation resources.
- [x] Completed events remain reachable through Schedule.
- [x] Still-available released material remains reachable through Resources.
- [x] Next-class pre-reads and last-class Session materials show zero/one/many items independently for QA/VA/DI.
- [x] Empty Sections do not render recommendation placeholders; an entirely empty subsection shows one compact subsection-level state.
- [x] Resources filters are instant-selection dropdowns ordered Sections, Topic and Category with no Apply button; Sections/topics group QA, VA and DI in that order, contextual choices update, and Starter Packs remain visible under All Sections and All Topics.
- [x] Previous-class worksheets, Session materials and next-class pre-reads follow the approved same-Section end-to-next-start windows.

## E. Authorization, isolation and non-regression

- [x] Signed-out access is denied.
- [x] Inactive-account access is denied.
- [x] Student-to-Admin and Admin-to-Student protected journeys are denied.
- [x] Unenrolled, unpublished and pre-release access is denied by the Student projection and database policy; the signed-out route redirects to login.
- [x] Cross-student tracker access is denied.
- [x] Cross-batch material access is denied.
- [x] Student tracker ownership and saved values persist after schedule/resource changes.
- [x] Admin progress remains read-only and numerically matches canonical Student rows.
- [x] Existing running/historical batch session, material, enrollment and tracker aggregates are unchanged; the bounded Staging probe restored exact global counts after deleting only its UUID-scoped fixtures.
- [x] No credentials, signed URLs, private paths or identities enter evidence.

## F. Quality and acceptance

Phase 1 interface review completed on 17 August 2026:

- [x] Keyboard Tab order reaches navigation, all four template selectors, title, review/save controls and revision history with visible focus treatment.
- [x] Enter activates template selection, review notification and revision-history disclosure.
- [x] Normal 1440px desktop layout has no page-level horizontal overflow.
- [x] A 720px CSS viewport, equivalent to the 1440px layout at 200% zoom, has no page-level horizontal overflow and retains all critical controls.
- [x] Product Owner accepted the four current template revisions and Phase 1 editing workflow.

- [x] Loading, empty, validation, failure and retry states are actionable.
- [x] Keyboard-only operation previously passed for the accepted Phase 1 controls.
- [x] Native Tab/Shift+Tab traversal passes across Phase 4 Home, Schedule and Resources; one missing Resources-select focus ring was fixed and retested.
- [x] 200% text zoom passes without clipped controls or page-level overflow.
- [x] Supported desktop widths pass; responsive non-regression passes.
- [x] Focused automated suites pass.
- [x] Touched files pass targeted lint.
- [x] TypeScript passes.
- [x] Guarded Next.js Production build passes with staging configuration.
- [x] `git diff --check`, documentation links and changed-file secret/privacy review pass.
- [x] Product Owner accepted the rendered Phase 4 result by instructing Engineering to conduct the remaining tests and close Phase 4 on 18 August 2026.
- [x] Product Owner accepted Phase 6 on 20 August 2026 against commit `547581efccf74300f3902df024db8bf47a27fa25` and the immutable Preview recorded in the [Phase 6 evidence](evidence/phase-6-preview-acceptance-and-readiness-2026-08-20.md).
