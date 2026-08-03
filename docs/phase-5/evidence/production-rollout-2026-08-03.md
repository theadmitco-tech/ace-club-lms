# Phase 5 Production Rollout — 3 August 2026

Environment: `https://aceclub.theadmitco.com` connected to Production Supabase project `owmlxsnzogfapotmjrqk`.

No credentials, private Student data, material URLs, or database connection strings are recorded here.

## Recovery preparation

- Supabase reported that the Free Production project had no managed physical backups and PITR was disabled.
- Migration `20260801085900_snapshot_phase5_rollout_state.sql` created a restricted in-database rollback snapshot before any Phase 5 mutation.
- The snapshot includes only `master_sessions`, `master_materials`, `sessions`, and `materials`, plus public function, constraint, trigger, and index definitions relevant to recovery.
- Student profiles, enrollments, registrations, payments, and tracker data were deliberately excluded because Phase 5 does not mutate them.
- Source and snapshot row counts were asserted in the same transaction. The snapshot migration passed on staging before Production.
- The rollback schema remains inaccessible to `public`, `anon`, and `authenticated` and is retained until a later reviewed cleanup decision.

## Database rollout

The final Production dry run showed this ordered set only:

1. `20260801085900_snapshot_phase5_rollout_state.sql`
2. `20260801090000_refine_academic_curriculum_titles.sql`
3. `20260802100000_add_student_timeline_and_recording_sync.sql`
4. `20260802180000_remove_master_recordings_from_cohorts.sql`
5. `20260802230000_make_recordings_batch_specific.sql`
6. `20260802234500_remove_cross_batch_legacy_recording_copies.sql`
7. `20260802235900_cascade_master_material_removals.sql`

All seven migrations applied successfully. A subsequent Production dry run reported no pending migrations. The Docker catalog-cache warning did not affect remote migration application.

## Application promotion

- Phase 5 application commit: `d0f33651d3ea7df7e61fba748c5f75f66076379f`.
- Vercel deployment: `dpl_EemYMsyBq1g5vpV25Cw4tdevYKfG`.
- Vercel CLI inspection confirmed the deployment is Ready, targets Production, and owns `aceclub.theadmitco.com`, `ace-club-lms.vercel.app`, and the project Production aliases.
- Signed-out HTTP probes passed: `/login` returned 200; `/dashboard` and `/admin/recordings` redirected to `/login`.
- The local Supabase CLI link was restored to staging after Production migration work.

## Authenticated smoke tests

- Production Admin Google Sign-In reached the Admin interface.
- Recordings appeared in the Admin sidebar and loaded the batch selector and ordered sessions without error. No Production recording was added or changed during smoke testing.
- Production Student Google Sign-In reached the dashboard and loaded This week, Timeline, programme weeks, and curriculum items.
- Recommended practice was correctly absent during programme Week 0 rather than inventing prior practice.
- A Week 0 curriculum-item detail opened correctly; configured pre-read access worked, and missing or unavailable resources did not create broken actions.
- Student Sign out returned to `/login`, and a subsequent direct `/dashboard` request redirected to login.

## Result

Phase 5 Production rollout passed. Phase 6 remains the next product phase and must begin from updated `origin/main` on a new feature branch.
