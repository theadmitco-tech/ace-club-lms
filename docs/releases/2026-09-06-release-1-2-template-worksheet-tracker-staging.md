# Release 1.2 — Template worksheet tracker Staging record

Status: Staging accepted; Production completed on 7 September 2026
Date: 6 September 2026
Branch: `codex/template-worksheet-tracker`
Base: `codex/release-1-1-login-course-chooser` at `1e66549`
Staging Supabase project: `ace-club-lms-staging` (`eyphkkginlgoaxflauog`)
Production state at time of this Staging record: None

## Scope

Restore the existing worksheet manual log and Practice Log for template-native worksheets while preserving the established Master Base Full Course path. No Student-facing flow or component is added.

## Version-controlled changes

- `20260906132807_add_material_worksheet_tracker.sql`
- `20260906133456_add_material_tracker_rls_policies.sql`
- `20260906132807_disable_material_worksheet_tracker.sql` emergency rollback
- Static architecture and access-boundary tests
- Disposable authenticated Staging fixture and cleanup utility
- ADR-0005

## Automated Staging acceptance completed

- Released RC worksheet: 5 questions displayed.
- Locked DI worksheet: absent from Practice Log, tracker unavailable, direct log access rejected.
- Released template-based Full Course worksheet: 3 questions displayed.
- Existing Master Base Full Course worksheet: 2 questions displayed through the unchanged store.
- Template question update persisted after reload.
- Master Base question update persisted through the established path.
- Non-enrolled Student read and update attempts were rejected.
- Admin progress included the template-native RC worksheet and saved status.

## Local gates completed

- Template tracker tests: passed.
- Pilot V2 suite: 53 passed.
- Pilot V3 suite: 38 passed.
- Targeted lint for new QA scripts: passed.
- Repository-wide lint: pre-existing failures remain in registration and worksheet curriculum files; this release did not modify those files.

## Production follow-through

- Product owner approval was received and Production rollout completed on 7 September 2026.
- See [the Release 1.2 Production rollout](2026-09-07-release-1-2-template-worksheet-tracker-production.md) for exact migration versions, deployment identity, smoke evidence, and rollback target.

## Accepted preview

- Deployment: `dpl_B4GKdMvCZqdLrhWJPm99QxS4zfYt`
- URL: `https://ace-club-kf3qofcht-theadmitco-techs-projects.vercel.app`
- Target: Preview
- Status: Ready
- Environment validator: Preview/Production URLs correctly separated
- Runtime error scan: no error-level logs found

Authenticated deployed-page acceptance passed for:

- the four-course chooser;
- DI Practice Log empty state before release;
- DI protected upcoming-material screen;
- RC Practice Log card and five-row manual tracker;
- template-based Full Course Practice Log;
- existing Master Base Full Course Practice Log.

Two disposable cycles were audited. The first detected a cleanup-order gap for unpublished template revisions; the cleanup utility was corrected and the exact residual records were removed. A complete fresh setup, database acceptance, preview acceptance, and cleanup cycle then passed. Final exact-ID audits returned zero profiles, courses, template revisions, and Master Base sessions for both cycles.

## Rollback

The executed Production rollback plan is:

1. Restore previous Production deployment `dpl_5YJZJx6zM5bxNJfZgr5Us8fMHvo7`.
2. Apply `supabase/rollback/20260906132807_disable_material_worksheet_tracker.sql` if the database compatibility path must also be disabled.
3. Do not drop the new tables; retain Student entries for recovery.
