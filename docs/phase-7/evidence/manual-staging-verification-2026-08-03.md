# Phase 7 Manual Staging Verification — 3 August 2026

Status: Passed — Product Owner accepted staging
Environment: Vercel Preview backed by staging Supabase `eyphkkginlgoaxflauog`

## Browser verification

- The Admin progress landing listed four staging batches. A populated batch showed one enrolled Student and one released worksheet with 20 fixed questions: 18 Done, 2 Come back for review, 0 Not updated and 90% completion.
- The corresponding Student Practice log and canonical worksheet log returned the same 18/2/0 totals and the same saved question-level status, optional time and comment values. No Student data was changed during browser verification.
- Admin question inspection showed the same 20 question rows and displayed blank optional values as an em dash. The surface contained no input, save, bulk-update or other write control.
- Returning from question inspection preserved the batch context. A mismatched batch, Student and worksheet URL failed safely and showed no question-level Student information.
- A batch without enrolled Students showed the deliberate `No enrolled Students` state.
- Dashboard, Batches, Users and Admin navigation reached Student progress. `/admin/worksheets` redirected to `/admin/progress`, and legacy accuracy, ranking, daily-target, trend, alert, filter and export concepts were absent.
- Direct Student access to `/admin/progress` redirected to the Student dashboard. Signed-out access redirected to login.
- At a 1280px viewport and a 640px CSS viewport representing 200% text zoom, there was no page-level horizontal overflow; wide tables contained overflow locally.
- Keyboard checks confirmed visible 3px focus outlines on the Admin sidebar control and navigation link after commit `e4237d7`. Statuses retained visible text labels and did not rely on colour alone.
- Existing Admin master content, recordings, schedule, Batches and Users routes remained operational. Student Practice log and canonical worksheet tracking remained available.
- The final browser session produced no console warnings or errors.

## Database and authorization verification

The Product Owner ran the rollback-only `staging-authorization-probe.sql` as one script in the staging SQL Editor. The final result was:

`PASS: Phase 7 Admin auth, Student/signed-out denial, totals, ownership, untouched/inactive history, release and empty-data boundaries`

The probe verified:

- both Phase 7 RPCs succeed as an active Admin and reject Student and signed-out callers;
- Admin summary and question detail match the canonical Student tracker rows;
- Admin reads create no Admin-owned rows and do not change Student tracker rows;
- all three Phase 6 Student tracker RPCs remain callable by the active Student, including a rollback-only write;
- a naturally untouched rollback fixture returns no last-update timestamp;
- a temporarily inactive enrolled Student remains visible to Admin while losing Student tracker read/write access;
- future-release and unpublished worksheets remain absent and direct inspection is denied; and
- a batch with enrolled Students but no released eligible worksheet returns Students with empty worksheet and progress arrays.

Every temporary enrollment, tracker, profile, release and publication change was enclosed in one transaction and rolled back. Earlier probe attempts also failed inside the transaction and retained no changes.

## Privacy note

No screenshots or private Student names, email addresses or comments are stored. This record contains only anonymized behavior and aggregate totals.

## Product Owner acceptance

The Product Owner opened the immutable Preview, reviewed the Admin progress surface and reported `Okay works` on 3 August 2026. All 34 Phase 7 staging checks pass. The reviewed Production rollout preflight is next.
