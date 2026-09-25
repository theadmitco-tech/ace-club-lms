# Flexible sectional mocks — Production rollout

Status: Production application/schema accepted; RC CC mock released
Owner: Engineering
Date: 25 September 2026

## Authorized boundary

The Product Owner first authorized applying the two named flexible-mock migrations, deploying integrated commit `3681f6b5a645a3cbf5c9f682d430b469911e550c`, and running non-mutating Production smoke checks. In a later explicit gate, the Product Owner approved importing the exact supplied RC workbook, publishing its 11 questions, creating an RC-only mock, and releasing it immediately to `Reading Comprehension - CC` with no due date. The authorization still excludes starting or resetting Student attempts, changing unrelated Student/course data, merging PR #21, and merging to `main`.

## Release identity

| Item | Verified value |
|---|---|
| Source branch | `codex/flexible-mocks-security-integration` |
| Source commit | `3681f6b5a645a3cbf5c9f682d430b469911e550c` |
| Next.js | `16.3.6` |
| Production deployment | `dpl_Hk1X2tMnSUU8rzDGgs9u3ewt96Ds` — `READY` |
| Deployment URL | `https://ace-club-nc4eoohwr-theadmitco-techs-projects.vercel.app` |
| Production alias | `https://aceclub.theadmitco.com` |
| Stable LMS alias used for the content release | `https://ace-club-lms.vercel.app` |
| Production Supabase | `owmlxsnzogfapotmjrqk` — `ACTIVE_HEALTHY` |
| Immediate application rollback | `dpl_DPSTQTeEcdJoTtzjF8N4ef5dz1L9` |

The build validated Production environment separation, compiled and typechecked successfully, generated all 54 pages, and placed Vercel functions in `sin1`.

## Database migration

The preflight found no blocking or long-running query. A fresh Production ledger read ended at `20260907064221`; the affected mock aggregates were 64 assessment items, 3 assessment sections, 512 attempt items, 24 attempt sections, and 8 attempts.

An isolated migration directory represented every existing Production ledger version and included only the two authorized pending migrations. Its dry run listed only:

1. `20260924120000_add_mock_category_snapshots.sql` — SHA-256 `83fa135b9e3046a50c8cbf36d657cdc063eaa355e8e67b8b6c6f66be9820c3cb`;
2. `20260925100000_scope_mock_attempt_order_by_category.sql` — SHA-256 `9e50243dd7d1f8dabe0678efe81ca20ed8805e73a5b1d1d0cf8d0931c5fe5aa2`.

Migration 1 was applied as one transaction and verified before migration 2. All existing category backfills were non-null; category checks and uniqueness constraints were present; and `start_mock_attempt`, `mutate_mock_attempt`, and `advance_mock_attempt_timeout` remained unavailable to `anon` and executable by `authenticated`. Migration 2 then replaced the legacy parent-section attempt-item uniqueness rule with `UNIQUE (attempt_id, display_order, category_key)`. Each migration has exactly one ledger row.

The post-migration aggregates remained 64 / 3 / 512 / 24 / 8, with no blocking or long-running query.

## Production smoke

- `/` and `/login` returned `200`.
- Signed-out `/mocks` and `/admin/mock-builder` redirected to `/login`.
- Authenticated Student course and `/mocks` pages rendered normally.
- The existing full mock remained 3 sections and 135 minutes; no order, answer, timer, attempt, or reset action was submitted.
- An existing attempt page rendered its saved state; its transition control was not used.
- The Admin Mock Builder loaded the existing assessment and displayed category-aware QA, RC, CR, VA, DI, mixed, and full-mock composition copy.
- Browser console warnings/errors and Vercel error/fatal logs were empty.
- Supabase remained `ACTIVE_HEALTHY`; Security Advisor returned zero errors.

## RC CC content release

The approved workbook was `/Users/tanishagarg/Downloads/ACE-QUESTION-PACKAGE-UNNATI-20260923-1f14b21e-df4f-4f5d-9eff-b972497a9da2.xlsx`, package `1f14b21e-df4f-4f5d-9eff-b972497a9da2`, SHA-256 `5f800341fe2c0aa64fd20db967c9935da17cf5b7038c1bccbbd66e96247bf6e1`. Its dry run returned 11 questions, three stimuli, zero validation errors, and zero likely duplicates. Production import `b2e25cdb-2e1c-4649-8e22-515c31b24841` completed once with 11 revisions, 55 options, 11 protected answer keys, and three stimuli; all 11 question revisions were then published.

`RC CC End-of-Course Mock` was created as assessment `c8af4540-d653-4320-a780-1774baf3ba2e`. Its 11 RC questions were ordered into three contiguous source-passage groups. The saved draft and immutable snapshot both contain one `rc` category, parent section `verbal`, 11 items, and exactly 1,291 seconds under the 45/23 proportional baseline.

Version `a85a3fdd-b57b-4692-929a-9b210d65de30` (version 1) was published at `2026-09-25 16:20:03.262483+00`. Assignment `618d2a28-3843-49fc-af63-a59f5ce77c51` targets only course `4763d048-9cbe-4488-95dc-3df25d873299` (`Reading Comprehension - CC`), has release time `2026-09-25 11:00:00+00`, no due date, and covers the course's nine enrollments.

Authenticated Student verification with `ishan.shreyash@gmail.com` showed the released mock on `/mocks` as a one-section version with an enabled `Start mock` control. No attempt was started. Browser diagnostics contained no application warning/error, and Production Vercel error/fatal queries for the release window were empty. The list card exposes a presentation defect: it renders the exact duration as `21.516666666666666 minutes total`; the stored timer is correct at 1,291 seconds. Fixing that copy requires a separately reviewed application change and deployment.

## Isolation

The final read-only check returned 25 profiles, 32 enrollments, 5 courses, 6,576 Student question-log rows, 3 prior mock imports, 64 mock question revisions, 1 assessment, 1 version, 1 assignment, 8 attempts, and 512 attempt items. These values match the release preflight where comparable.

The content release changed only the approved mock domain: one import, 11 published question revisions, one assessment/version, and one assignment to the existing RC CC course. It did not create or change profiles, courses, enrollments, attempts, responses, or Student/course progress. PR #21 and `main` remain unmerged.

## Rollback and recovery

If Student or general application behavior regresses, restore the Production alias to `dpl_DPSTQTeEcdJoTtzjF8N4ef5dz1L9`. Because that prior application cannot author against the new non-null category schema, keep Admin mock authoring frozen during application rollback and use a reviewed forward correction. Existing legacy snapshots and attempts remain compatible. Do not drop category columns, restore old uniqueness constraints, or rewrite the migration ledger.

For a content-only rollback, obtain explicit Product Owner approval, move assignment `618d2a28-3843-49fc-af63-a59f5ce77c51` to a future release time, and insert the matching audit record. This removes the mock from the released Student list while preserving the immutable version and any attempt evidence. Do not delete the assignment after attempts exist, and do not delete imported/published questions that may be referenced by the snapshot.

## Exact next action

Monitor the first real RC CC starts and timer transitions without changing Student answers or progress. Prepare a separate small application patch for the fractional-minute list-card copy, run it through Preview, and request a new Production deployment approval. PR #21 and `main` remain unmerged and outside this content release.
