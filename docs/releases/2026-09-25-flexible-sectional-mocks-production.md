# Flexible sectional mocks — Production rollout

Status: Production application and schema accepted; RC CC mock not authorized
Owner: Engineering
Date: 25 September 2026

## Authorized boundary

The Product Owner explicitly authorized applying the two named flexible-mock migrations, deploying integrated commit `3681f6b5a645a3cbf5c9f682d430b469911e550c`, and running non-mutating Production smoke checks. The authorization did not include importing, creating, publishing, assigning, releasing, starting, or resetting the supplied RC mock; changing Student/course data; merging PR #21; or merging to `main`.

## Release identity

| Item | Verified value |
|---|---|
| Source branch | `codex/flexible-mocks-security-integration` |
| Source commit | `3681f6b5a645a3cbf5c9f682d430b469911e550c` |
| Next.js | `16.3.6` |
| Production deployment | `dpl_Hk1X2tMnSUU8rzDGgs9u3ewt96Ds` — `READY` |
| Deployment URL | `https://ace-club-nc4eoohwr-theadmitco-techs-projects.vercel.app` |
| Production alias | `https://aceclub.theadmitco.com` |
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

## Isolation

The final read-only check returned 25 profiles, 32 enrollments, 5 courses, 6,576 Student question-log rows, 3 prior mock imports, 64 mock question revisions, 1 assessment, 1 version, 1 assignment, 8 attempts, and 512 attempt items. These values match the release preflight where comparable.

The supplied RC package `1f14b21e-df4f-4f5d-9eff-b972497a9da2` has zero Production imports. No mock was created, published, assigned, or released by this rollout.

## Rollback and recovery

If Student or general application behavior regresses, restore the Production alias to `dpl_DPSTQTeEcdJoTtzjF8N4ef5dz1L9`. Because that prior application cannot author against the new non-null category schema, keep Admin mock authoring frozen during application rollback and use a reviewed forward correction. Existing legacy snapshots and attempts remain compatible. Do not drop category columns, restore old uniqueness constraints, or rewrite the migration ledger.

## Exact next action

Ask the Product Owner for fresh explicit approval before importing the supplied RC package into Production, publishing its questions, creating the 11-question RC mock, or assigning/releasing it to the **RC CC batch**. No PR #21 or `main` merge is required or authorized by this release.
