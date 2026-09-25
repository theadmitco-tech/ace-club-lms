# Flexible sectional mocks — Production readiness plan

Status: Integration approved; compact Staging verification pending, Production not authorized
Owner: Engineering
Last updated: 25 September 2026

## Decision boundary

This record prepares a release path only. It does not authorize a merge, Production migration, Production deployment, mock publication or assignment, tester grant, attempt reset, course change, or Student-data mutation. PR #21 remains open and unchanged.

## Accepted behavior

The Staging-accepted candidate supports any non-empty subset of QA, RC, CR, VA, and DI, positive question counts, proportional timing, immutable category/timing snapshots, dynamic Student progress and breaks, direct published-order start for sectional mocks, and the existing six-order chooser for legacy full Quant/Verbal/Data Insights mocks.

Acceptance evidence is in [Flexible sectional mocks — Staging](2026-09-25-flexible-sectional-mocks-staging.md).

## Verified release identities

| Boundary | Verified state |
|---|---|
| Current Production application | `dpl_DPSTQTeEcdJoTtzjF8N4ef5dz1L9`, commit `8e6052336f9274922ecad63c8d9772e644473c01` |
| Current Production database | `owmlxsnzogfapotmjrqk`; latest remote migration `20260907064221` |
| Flexible-mock branch | `codex/flexible-sectional-mocks`; application correction through `65464bd` |
| Accepted flexible-mock Preview | `dpl_EnqC5waqKdBjvc1BJWFKa4GKxhmF`, `READY`, Staging-backed |
| Security patch PR | [#21](https://github.com/theadmitco-tech/ace-club-lms/pull/21), head `fcbd42ffd6a6b06645ab5819fcf6c403347d4d00`, mergeable and checks successful |
| Security application commit | `9437533c8ced217b02c9b9d5d0fa1846dd391457`, Next.js `16.3.6` |
| Integration branch | `codex/flexible-mocks-security-integration`, created from PR #21 head; verification pending |

The flexible-mock and security branches share base `096f5b392876635498da2da2a3cd988982aa09df`. The isolated flexible branch remains preserved on Next.js `16.2.4`. The integration branch combines the accepted feature with Next.js `16.3.6` without modifying or merging PR #21.

## Read-only database preflight

On 25 September 2026, Supabase reported both projects `ACTIVE_HEALTHY`. A fresh ledger comparison confirmed:

- Staging contains `20260924120000` and `20260925100000`;
- Production contains neither migration;
- older Staging and Production ledger differences remain, so a blind `supabase db push`, `--include-all`, or migration replay is prohibited.

Production table statistics showed a small affected data set: approximately 64 assessment items, 3 assessment sections, 512 attempt items, 24 attempt sections, and 8 attempts. No long-running Production query was reported. These are planning observations, not authorization to mutate the database; repeat the checks immediately before an approved rollout.

## Approved integration gate

On 25 September 2026, the Product Owner approved source integration and explicitly directed that the already accepted manual Staging cycle not be repeated. The integration branch therefore uses risk-based delta verification:

1. The accepted security-patch head `fcbd42f` is the integration base; PR #21 remains unchanged.
2. The accepted flexible-mock branch is merged only into `codex/flexible-mocks-security-integration`.
3. Run TypeScript, touched-file lint, all Pilot V3 tests, documentation checks, `git diff --check`, dependency audit, and a Production-mode build.
4. Deploy a new Staging-backed Preview from the integrated source.
5. Verify one RC-only direct start, the legacy full-mock order chooser, reset recovery, and runtime logs.
6. Do not repeat the mixed QA + CR + DI manual journey unless an integration failure or code change affects that flow.

This scoped decision is durable for this release: a dependency-lineage integration does not invalidate completed feature acceptance when the feature code and Staging schema are unchanged. The existing Preview remains valid feature evidence; the compact check validates only the combined source.

## Production migration plan

The approved order must be database first, then application:

1. Announce and enforce a short Admin mock-authoring freeze.
2. Recheck Production deployment identity, migration ledger, blocking/long-running queries, and affected table counts.
3. Apply only `20260924120000_add_mock_category_snapshots.sql` as one explicit transaction and record exactly one ledger entry.
4. Verify category columns, non-null backfill, category constraints, function definitions/grants, and unchanged legacy snapshot counts.
5. Apply only `20260925100000_scope_mock_attempt_order_by_category.sql` as one explicit transaction and record exactly one ledger entry.
6. Verify the new `(attempt_id, display_order, category_key)` constraint exists and the retired parent-section item constraint does not.
7. Deploy a fresh Production-environment build from the integrated, approved source. Do not promote the Staging-backed Preview.
8. Re-run the environment validator and verify that Vercel functions remain in `sin1`.

The two migrations must not be applied with a blind repository-wide push because the remote ledgers intentionally differ.

## Production smoke plan

Without additional data-mutation approval, checks are limited to existing data and read-only journeys:

- anonymous protected-route denial;
- Student login, course selection, and `/mocks` rendering;
- existing legacy full mock still shows 3 sections, 135 minutes, and the six order choices;
- existing attempt/result pages render without mutation;
- Admin Mock Builder loads existing assessments and category-aware composition;
- Production runtime logs and Supabase security/runtime signals show no new errors.

A true flexible-mock Production start requires an exact Production assessment version, assignment/tester grant, and attempt. Creating, publishing, assigning, starting, resetting, or cleaning such a fixture is a separate Production-data mutation and requires explicit approval with exact targets.

## Rollback and recovery

### Before either migration

No database rollback is required. Keep Production on `dpl_DPSTQTeEcdJoTtzjF8N4ef5dz1L9`.

### After database migration, before or after application deployment

- Roll the application alias back to `dpl_DPSTQTeEcdJoTtzjF8N4ef5dz1L9` if Student or general application behavior regresses.
- Keep Admin mock authoring frozen. The previous Admin Mock Builder does not provide the new non-null `category_key` on create/save, so application rollback alone is not full authoring rollback.
- Existing legacy Student snapshots and attempts remain supported by the migration compatibility fallback.
- Prefer a reviewed forward correction. Do not drop columns or restore parent-section uniqueness while flexible Production rows may exist.
- A database reversal may be considered only after proving no flexible Production assessment, snapshot, assignment, attempt, or response exists and after reviewing restoration of the prior constraints and function definitions.

## Approval gates

Separate explicit approvals are required for:

1. creating the integrated security-plus-flexible release branch and Preview;
2. applying the two named Production migrations;
3. deploying the integrated application to Production;
4. any Production tester fixture, mock publication/assignment, attempt, reset, or cleanup;
5. merging PR #21 or merging any branch to `main`.

## Exact next action

Complete the compact integration checks and Staging Preview verification, document the result, and stop for separate Production migration/deployment approval. Production remains unchanged.
