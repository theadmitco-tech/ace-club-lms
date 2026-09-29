# Release 1.2 — Template worksheet tracker Production rollout

Status: Production deployed and verified
Date: 7 September 2026
Branch: `codex/template-worksheet-tracker`
Source commit: `8e6052336f9274922ecad63c8d9772e644473c01`
Production Supabase project: `owmlxsnzogfapotmjrqk`

## Outcome

The existing worksheet manual log and Practice Log now support template-native worksheets in Production. The established Master Base Full Course path and the Student UI/RPC contracts remain unchanged. This is a compatibility fix to the existing flow, not a new Student flow.

## Production changes

The following accepted SQL files were applied in order through the Supabase Management API:

| Production ledger version | Migration | Source SHA-256 |
|---|---|---|
| `20260907064032` | `add_material_worksheet_tracker` | `71d02b6cca32a8d28b3d9544ba0fd094e4341a0a7c46bdb49e7f670c7ccf3e41` |
| `20260907064221` | `add_material_tracker_rls_policies` | `a74178ae1d8d82b03cd5576c06159997cda8d6a14e1611ef05695e956808698a` |

The ledger versions are the Production application timestamps. The version-controlled source files remain:

- `20260906132807_add_material_worksheet_tracker.sql`;
- `20260906133456_add_material_tracker_rls_policies.sql`.

Vercel built the accepted source again with Production environment variables; the Staging-backed Preview artifact was not promoted.

- Production deployment: `dpl_DPSTQTeEcdJoTtzjF8N4ef5dz1L9`
- Deployment URL: `https://ace-club-1vz3tlyqv-theadmitco-techs-projects.vercel.app`
- Canonical alias: `https://aceclub.theadmitco.com`
- State: `READY`

## Production acceptance

Pre-migration baselines were 548 Master Base question rows and 6,576 Master Base Student log rows. Both values remained unchanged after both migrations.

- The material-backed catalog generated 227 rows, exactly equal to the saved template-native worksheet totals.
- Reading Comprehension CC generated 147 of 147 questions across four configured worksheets, with zero mismatches.
- Data Interpretation CC generated 80 of 80 questions across four configured worksheets, with zero mismatches.
- No `student_material_question_logs` row was created by deployment or testing.
- Four explicit RLS policies are active on the new tables.
- Direct `anon` and `authenticated` table privileges remain revoked.
- Supabase Security Advisor reported zero error-level findings and no finding for either new table.

Read-only authenticated RPC checks used the existing designated multi-course test Student without changing course preference or progress:

- released RC `RC: Intro 2` returned 42 questions and zero existing material-backed entries;
- existing Master Base Full Course `CR: Inferences` returned 30 questions;
- the Student's currently selected `Aug 7th Batch` Practice Log returned 14 released worksheets;
- DI `Worksheet 1` was rejected with `Released worksheet access required`, as expected before its 7 September 2026 21:00 IST release.

The canonical `/dashboard` and `/practice` routes returned successfully and redirected signed-out requests to `/login`. The new deployment had no error-level Vercel logs during the rollout window.

Staging acceptance, including signed-in deployed-page checks, save/reload, non-enrolled denial, Admin reporting, and fixture cleanup, is recorded in [the Release 1.2 Staging record](2026-09-06-release-1-2-template-worksheet-tracker-staging.md).

## Rollback

The immediate application rollback is Production deployment `dpl_5YJZJx6zM5bxNJfZgr5Us8fMHvo7`.

If the compatibility path must be disabled:

1. restore `dpl_5YJZJx6zM5bxNJfZgr5Us8fMHvo7` as the Production alias;
2. apply `supabase/rollback/20260906132807_disable_material_worksheet_tracker.sql` (SHA-256 `0ae33c26da3c1c1a99c9bc2b7f82ae4b7ba207b74b5d51067d445cc01ed48f7c`);
3. do not drop either new table, so any future Student entries remain recoverable;
4. re-run RC, DI-lock, and existing Full Course smoke checks.

No rollback was required during this rollout.
