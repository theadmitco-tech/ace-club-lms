# Worksheet count and course selection — rollback rehearsal

Status: **Passed on Staging; Production unchanged and unauthorized**
Date: 30 August 2026

## Scope

Engineering prepared and transactionally rehearsed the Tier 2 database compensation required by the Production release plan. The rehearsal targeted Staging Supabase `eyphkkginlgoaxflauog` only. It did not deploy an application, apply or ledger a migration, create a fixture, change a preference, contact Production with a write, or expose an identity or credential.

Rollback artifact:

- file: `supabase/rollback/20260830160000_disable_student_course_selection_for_app_rollback.sql`;
- SHA-256: `6fc30658df8003462537fcf5fc535d24a3771b1b8f3b7d03c7ee6e14db8e6e80`; and
- storage: deliberately outside `supabase/migrations`, preventing accidental inclusion in the normal forward release.

## Rollback behavior

The compensating migration is intentionally non-destructive. After the exact Production application rollback it:

- changes the internal course resolver to the pre-release latest-enrollment rule;
- disables authenticated access to the course-options and course-selection RPCs;
- keeps the internal resolver unavailable to direct clients;
- preserves the preference table and every Student preference row;
- preserves template worksheet question counts and their corrected trigger; and
- does not change profiles, courses, sessions, materials, enrollments, tracker rows or course activity.

The current Production definitions and grants of the three affected portal read functions were captured read-only before designing the compensation. The smaller resolver-only change was chosen because it restores the old application's observable course behavior without replacing the larger timeline, Practice Log or portal-identity functions.

## Transactional Staging test

A temporary test copy replaced only the artifact's final `COMMIT` with `ROLLBACK`. Staging executed the entire function replacement, grant revocation and embedded assertion block in one transaction. Every assertion passed, and the transaction explicitly rolled back.

Assertions inside the transaction confirmed:

- `student_course_preferences` remained present;
- `course_template_resources.question_count` remained present;
- authenticated clients could not execute the course-options or selection RPCs;
- authenticated clients could not directly execute the internal resolver;
- authenticated access to portal identity, timeline and Practice Log reads remained available; and
- for every enrolled Staging profile, the compensated resolver matched the latest-enrollment rule.

## Zero-change proof

| Check | Before | After |
|---|---:|---:|
| Forward resolver definition hash | `6efcf1f750b50c8908bf55a71cc5db6d` | `6efcf1f750b50c8908bf55a71cc5db6d` |
| Course-options authenticated execute | enabled | enabled |
| Course-selection authenticated execute | enabled | enabled |
| Internal resolver authenticated execute | disabled | disabled |
| Preference rows | 1 | 1 |
| Profiles | 4 | 4 |
| Courses | 12 | 12 |
| Sessions | 221 | 221 |
| Materials | 59 | 59 |
| Enrollments | 2 | 2 |
| Student question-log rows | 300 | 300 |
| Template question-count column | present | present |

The Staging ledger still records forward versions `20260830112501`, `20260830133000` and `20260830133001` and contains no `20260830160000` entry. The existing preference row is normal accepted Staging state, not a rehearsal fixture, and was not read or changed.

Post-rehearsal local verification also passed:

- focused course-selection tests: 4/4;
- focused reusable-template tests: 13/13;
- rollback SQL destructive-operation scan: passed;
- rollback artifact SHA-256 recheck: matched; and
- `git diff --check`: passed.

## Release gate

Tier 2 is now technically prepared but remains unauthorized for Production. A future Production instruction must name the exact artifact and hash. It may be used only after application rollback to `dpl_DzZC5inr3jposbbgtkRc8WcPkeVm` and only if preference-aware database behavior still affects the restored application.
