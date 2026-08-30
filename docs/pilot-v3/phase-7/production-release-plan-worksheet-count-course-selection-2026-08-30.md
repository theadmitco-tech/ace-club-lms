# Production release plan — worksheet counts and multi-course selection

Status: **Rollback rehearsal passed; Production changes are not authorized**  
Date: 30 August 2026  
Owners: Product Owner, Release Owner, Engineering, QA/Security

## Decision and boundary

Release the reusable-template worksheet question-count control and Student multi-course selection only after a fresh Production preflight and explicit Product Owner authorization. The RC template population is a later operational action and is not part of this deployment.

This document does not authorize a Production migration, deployment, environment change, data write, fixture, merge, rollback or cleanup.

## Exact release identity

| Item | Exact value |
|---|---|
| Production application | `https://aceclub.theadmitco.com` |
| Production Supabase | `owmlxsnzogfapotmjrqk` |
| Current Production deployment / rollback target | `dpl_DzZC5inr3jposbbgtkRc8WcPkeVm` (`READY`) |
| Current Production source metadata | `717bf537e5b189f20b9034bc67505b4e74257181` |
| Accepted application source | `49a7b22739337bf4a69e945995e51d239622984b` |
| Accepted Preview wrapper | `59b769ec0994f0dc5b579d3f3415600cf4ebc75b` |
| Accepted application tree | `9ca6ca3edfcdad82174b5c532faff8b3611349d1` |
| Accepted Staging Preview | `dpl_FrooqFx6aBAtSHS1ACYap4KTacsb` |
| Immutable Preview URL | `https://ace-club-4e98oeykk-theadmitco-techs-projects.vercel.app` |
| Tier 2 rollback artifact | `supabase/rollback/20260830160000_disable_student_course_selection_for_app_rollback.sql` |
| Tier 2 rollback SHA-256 | `6fc30658df8003462537fcf5fc535d24a3771b1b8f3b7d03c7ee6e14db8e6e80` |

`49a7b22` and `59b769e` have the same Git tree. The latter is only an empty Vercel attribution commit. Any later documentation commit must be proven documentation-only before release. Application files and the three migration checksums must remain identical to the accepted candidate.

Do not promote the Staging-backed Preview to Production: it was built with Preview/Staging environment variables. Production requires a fresh build of the same accepted application tree using Production-scoped variables.

## Exact migration set

Apply only these files, in this order:

1. `20260830112501_add_template_worksheet_question_count.sql`  
   SHA-256: `d7e1bfc23e8637d96329e1f7db3ac6b43630943e2f142f4c6e0ff0e80fdcab2f`
2. `20260830133000_add_student_course_selection.sql`  
   SHA-256: `65441dfcff5c0cff19aae5c1bb1bfdc18778772b85b3da53d4071dfe7e7f53e3`
3. `20260830133001_fix_template_worksheet_question_count_trigger_order.sql`  
   SHA-256: `52b9ebf2048ae628332d8788f62ca38ceb2951f0d820dbf51acdfd95f0ae053a`

Never apply or repair the intentionally excluded historical versions:

- `20260803120000_add_student_practice_log.sql`
- `20260803160000_add_admin_practice_progress.sql`
- `20260804120000_realign_weekly_course_schedule.sql`

Never use `supabase db push --include-all`, `--include-seed` or `--include-roles`.

The read-only Production ledger on 30 August 2026 was current through `20260827143000`; only the three migrations above were newer. A normal dry run correctly stopped on the three historical exclusions. An isolated dry run with only those excluded files removed listed exactly the three ordered migrations above, with no seed or role changes.

## Current sanitized Production baseline

Capture a fresh copy immediately before the authorized release. The 30 August planning baseline is:

| Aggregate | Count/state |
|---|---:|
| Profiles | 19 |
| Active Students | 15 |
| Courses | 3 |
| Sessions | 42 |
| Materials | 88 |
| Enrollments | 18 |
| Student question-log rows | 5,376 |
| Students with multiple enrollments | 3 |
| Template-resource rows | 91 |
| `student_course_preferences` | Absent |
| Template-resource `question_count` column | Absent |

The four required Production Supabase/site variables and four Razorpay variables are present in Vercel with Production scope; values were not read or recorded. The Production build guard must independently verify the Supabase URL and site URL during the release build.

Supabase reports PITR disabled and no available physical backups. Therefore a fresh encrypted manual logical recovery artifact and a tested compensating migration are mandatory before any Production migration.

## Prerequisites and hard stops

Stop before any Production write if any condition below is not satisfied:

- [ ] Product Owner names and authorizes the exact snapshot, three migrations, fresh Production deployment, smoke checks and automatic application rollback authority.
- [ ] Release Owner and QA/Security are available for the complete release window.
- [ ] The accepted application tree and all three migration hashes match this plan.
- [ ] Pilot V2, Pilot V3, targeted course-selection/template tests, touched-file ESLint, TypeScript, guarded Production build and `git diff --check` pass.
- [ ] The accepted Preview is still `READY` and Staging-backed.
- [ ] The current Production deployment is still resolved and recorded as the exact rollback target.
- [ ] The Production ledger and sanitized baseline are refreshed read-only.
- [ ] An isolated Production dry run lists exactly the three migrations above, in order, with no seed or role changes.
- [ ] The three historical exclusions remain absent from the Production ledger.
- [ ] The Production environment guard passes without any environment-variable edits.
- [ ] The encrypted manual recovery artifact is created, verified readable and stored outside the repository.
- [x] The function-only compensating migration was created, hash-pinned and tested transactionally on Staging on 30 August 2026; the test ended with `ROLLBACK` and left no ledger, function, grant or row-count change.
- [ ] No critical/high authorization, cross-course exposure, worksheet-release, data-integrity or privacy finding is open.

The current Supabase changelog has no breaking change affecting these hosted Postgres migrations. The Data API auto-exposure change is addressed explicitly: the new preference table has RLS enabled and direct `anon`/`authenticated` table grants revoked; access is only through internally authorizing functions.

## Recovery preparation

Because Production has no PITR or listed physical backup, prepare both items below before the release window.

### 1. Encrypted logical recovery artifact

Capture, without committing or printing sensitive values:

- the current definitions, ownership, grants and checksums for `get_portal_identity`, `get_student_practice_log` and `get_student_timeline`;
- current material triggers and the definition/grants of any worksheet-linking function touched by the migration;
- the schema, constraints, grants and RLS state of `course_template_resources`;
- an encrypted data-only snapshot of `course_template_resources`; and
- the pre-release migration ledger and sanitized aggregate/digest baseline.

Verify the artifact can be decrypted and parsed in a disposable environment. Do not restore it into Production as part of a normal rollback.

### 2. Function-only compensating migration

The prepared artifact is `supabase/rollback/20260830160000_disable_student_course_selection_for_app_rollback.sql`, SHA-256 `6fc30658df8003462537fcf5fc535d24a3771b1b8f3b7d03c7ee6e14db8e6e80`. It is deliberately outside `supabase/migrations` so the normal release cannot apply it accidentally. It must be copied into an isolated migration directory only after Tier 1 rollback and explicit Tier 2 authorization.

It:

- changes only `resolve_student_course_id` to use the pre-release latest-enrollment rule, which restores the old application behavior without replacing the larger timeline/practice functions;
- revokes `authenticated` execution on `get_student_course_options` and `select_student_course`, preventing cached/new clients from changing preferences while the old application is serving;
- keeps `resolve_student_course_id` unavailable for direct client execution;
- keeps the authenticated read grants needed by `get_portal_identity`, `get_student_practice_log` and `get_student_timeline`;
- preserves `student_course_preferences` and every student selection for diagnosis or later reactivation;
- preserves the template `question_count` column, constraint, values and corrected trigger; and
- does not drop a table/column, delete rows, rewrite migration history, change enrollments or alter course activity.

This compensating migration is used only after the application has been rolled back and only if the new database selection behavior continues to affect the restored application. Its complete assertions passed inside a Staging transaction that ended with `ROLLBACK`. The forward resolver hash, selection grants, one existing preference row and all audited aggregate counts were identical before and after the rehearsal. See the dated rollback-rehearsal evidence linked alongside this plan.

## Ordered release procedure

### Gate A — freeze and preflight

1. Freeze the accepted application tree; record the exact release/merge commit and prove any difference from `49a7b22` is documentation-only.
2. Refresh checks, Vercel deployment identity, environment-variable names/scopes, Production ledger, aggregates and backup status.
3. Create and verify the encrypted recovery artifact.
4. Freeze and record the tested compensating-migration hash.
5. Create a disposable isolated Supabase release directory. Remove only the three historical excluded migration copies from that directory.
6. Run a Production `db push --dry-run --skip-vault` without `--include-all`; require exactly the three ordered versions and empty seed/role lists.
7. Reconfirm the Product Owner authorization and exact Production project reference immediately before the write.

### Gate B — additive database migration

8. Apply the same isolated command without `--dry-run`. Do not deploy the new application if any migration or verification fails.
9. Verify all three versions are ledgered exactly once and the historical exclusions remain absent.
10. Verify:
    - `course_template_resources.question_count` exists with its positive worksheet-only constraint;
    - the corrected `set_template_resource_question_count` trigger is the active template-count trigger;
    - `student_course_preferences` exists with RLS enabled and no direct public/anon/authenticated table access;
    - `get_student_course_options` and `select_student_course` are callable only by `authenticated` and internally enforce active Student plus enrollment;
    - `resolve_student_course_id` is not directly callable by clients; and
    - Supabase security advisors have no new errors.
11. Compare aggregates with the preflight baseline. Profiles, courses, sessions, materials, enrollments, tracker rows and template-resource row count must be unchanged. The new preference table must initially contain zero rows.

If Gate B fails, leave the current Production application serving, stop, and inspect the exact ledger/schema state. Do not retry blindly, edit an applied migration, repair history or use the destructive schema rollback.

### Gate C — fresh Production application build

12. Build and deploy the exact accepted application tree freshly with Production-scoped variables. Do not promote the Staging Preview.
13. Require the environment guard, compilation, TypeScript, all expected routes, Vercel `READY`, `target=production`, Singapore function region and the `aceclub.theadmitco.com` alias.
14. Run anonymous checks: `/` and `/login` return `200`; `/courses`, `/dashboard`, `/practice` and `/admin/templates` redirect to `/login` without protected content.
15. Scan deployment runtime logs for errors before authenticated smoke testing.

### Gate D — bounded authenticated smoke

No Production fixture is created by default.

16. Admin, read-only:
    - open the reusable template editor;
    - confirm worksheet resources show **Number of questions**;
    - do not save a template revision, upload a file, sync a batch or change RC content.
17. One explicitly approved multi-enrolled Student:
    - confirm the selector lists all enrolled current and historical courses;
    - select the Student's intended course and confirm Home, Schedule, Resources and Practice remain scoped to it;
    - switch once to another enrolled course and back to the intended course;
    - confirm no unenrolled course is exposed.
18. Crash-course Student, read-only:
    - confirm Practice Log loads;
    - confirm the empty state when no worksheet is released, or read one already-released worksheet without changing tracker values.
19. Recheck the ledger, grants/RLS, runtime errors and sanitized aggregates. Only the explicitly approved Student preference row may be new; all legacy counts must remain unchanged.

Any selection performed in Production is a real user preference, not a disposable fixture. The approved Student must finish on the course they actually want. Do not delete the preference merely to make the aggregate return to zero.

## Rollback decision tree

### Tier 0 — before application deployment

If a migration or database verification fails, do not deploy. The current application remains live. Because the migrations are additive, preserve any successfully applied schema and diagnose forward. Do not drop columns/tables or delete rows.

### Tier 1 — immediate application rollback

Trigger this rollback for any of the following:

- `/login` or public pages return `5xx`;
- repeated authentication or redirect loops;
- a Student sees an unenrolled course or another Student's data;
- course selection cannot be changed or scopes pages inconsistently;
- existing Home, Schedule, Resources, Practice, Mock or Admin access regresses;
- error rate rises materially during smoke; or
- any critical/high privacy, authorization or release-boundary defect appears.

Action:

1. Stop Admin template changes and RC population.
2. Roll the Production alias back to exact deployment `dpl_DzZC5inr3jposbbgtkRc8WcPkeVm`.
3. Confirm `aceclub.theadmitco.com` resolves to that deployment.
4. Re-run `/`, `/login` and protected-route checks, then scan logs.
5. Leave all additive database schema and preference rows intact.

The Product Owner should pre-authorize this exact Vercel rollback in the release instruction so Engineering does not wait for new permission during an incident.

### Tier 2 — database behavior compensation

The restored old application does not provide a course switcher. If any Student remains scoped to a selected historical/alternate course, or the replacement RPC behavior otherwise affects the old app, apply the separately hash-pinned, Staging-tested function-only compensating migration described above. It disables selection RPC access and makes the shared resolver ignore preferences while preserving every preference row. Then verify the old latest-enrollment behavior, grants, RLS and unchanged row counts.

Do not apply Tier 2 for a purely visual application defect when Tier 1 restores healthy behavior.

### Data-integrity incident

If unexpected legacy row changes or cross-course exposure are found:

1. perform Tier 1 immediately;
2. stop all related Admin mutations;
3. preserve sanitized logs and before/after evidence;
4. do not restore the entire Production database, because that would discard unrelated live writes and PITR is unavailable; and
5. develop a narrow compensating migration from the encrypted artifact, test it outside Production and obtain separate exact authorization.

Never roll back by deleting `student_course_preferences`, removing the question-count column, withdrawing released worksheets, changing enrollments, dropping functions/tables or rewriting the migration ledger.

## Success and evidence

The release is successful only when:

- all three migrations are ledgered once and only once;
- the new security/grant checks pass;
- legacy aggregate counts remain stable;
- the fresh Production deployment is `READY` and aliased correctly;
- Admin question-count visibility passes without a template mutation;
- multi-course selection and historical-course access pass for the approved Student;
- Crash-course Practice Log passes;
- runtime error scan is clean; and
- the exact source, deployment, ledger, checks, sanitized before/after state and final decision are recorded in a dated immutable evidence file.

RC template population begins only after this release is accepted. It is not part of rollback testing and must not be performed during the release window.

## Required future authorization

The final Product Owner instruction should name, separately:

1. creation of the encrypted Production recovery artifact;
2. application of the three exact migrations and their hashes;
3. fresh Production deployment of the frozen application tree/merge commit;
4. the bounded anonymous and authenticated smoke checks, including the approved multi-course Student;
5. automatic Tier 1 rollback to `dpl_DzZC5inr3jposbbgtkRc8WcPkeVm` if a hard threshold is hit; and
6. Tier 2 authority for `20260830160000_disable_student_course_selection_for_app_rollback.sql`, SHA-256 `6fc30658df8003462537fcf5fc535d24a3771b1b8f3b7d03c7ee6e14db8e6e80`, only after Tier 1 rollback and confirmation that database selection behavior still affects the restored app.

Until that instruction is received, Production remains unchanged.
