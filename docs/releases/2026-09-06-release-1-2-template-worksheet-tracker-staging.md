# Release 1.2 — Template worksheet tracker Staging record

Status: In validation; not approved for Production
Date: 6 September 2026
Branch: `codex/template-worksheet-tracker`
Base: `codex/release-1-1-login-course-chooser` at `1e66549`
Staging Supabase project: `ace-club-lms-staging` (`eyphkkginlgoaxflauog`)
Production changes: None

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

## Remaining gates

- Build and deploy a Preview-environment artifact.
- Confirm that the preview resolves to Staging with the disposable QA account.
- Run browser acceptance for login, course switching, locked DI, released RC, released template Full Course, and Master Base Full Course.
- Check preview logs and Staging database advisors.
- Remove every disposable fixture and record zero residue.
- Obtain explicit Product owner approval before any Production database migration or Vercel promotion.

## Rollback

If Production is later approved:

1. Record the exact current Production deployment ID.
2. Apply the two additive migrations.
3. Promote the exact accepted preview artifact.
4. If rollback is needed, restore the previous Vercel deployment and apply `supabase/rollback/20260906132807_disable_material_worksheet_tracker.sql`.
5. Do not drop the new tables; retain Student entries for recovery.
