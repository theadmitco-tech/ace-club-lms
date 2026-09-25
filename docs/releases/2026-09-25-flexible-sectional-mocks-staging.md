# Release — Flexible sectional GMAT mocks — 2026-09-25

Status: Staging correction in progress
Owner: Engineering
Last updated: 25 September 2026

## Objective

Allow an immutable published mock to contain any non-empty subset of QA, RC, CR, VA, and DI with positive question counts and proportional timing. Sectional mocks start in their published order. Only legacy full Quant, Verbal, and Data Insights mocks retain Student section-order selection.

## Included scope

- category-level composition and immutable snapshot metadata;
- proportional timing from the 45-minute full-section baselines;
- dynamic Student sections, timers, progress, breaks, and completion;
- direct start for every sectional mock;
- the existing six-order chooser for legacy full three-section mocks;
- course/batch assignment and release controls;
- Staging-only RC-only, mixed, and full-mock acceptance.

## Explicit exclusions

- no merge to `main`;
- no merge or modification of security-patch PR #21;
- no Production application deployment or migration;
- no Production data, Supabase, Student, course, mock, assignment, or enrollment change.

## Source and branch

- Branch: `codex/flexible-sectional-mocks`.
- Published implementation commits before this correction: `b62e65e`, `b2932a7`, `98c1869`, and `e9b20df`.
- The 25 September direct-start and category-order correction is pending a verified commit.

## Staging schema and package state

- Supabase project: `eyphkkginlgoaxflauog`.
- Applied migration: `20260924120000_add_mock_category_snapshots`.
- Pending Staging migration: `20260925100000_scope_mock_attempt_order_by_category`.
- Approved RC workbook package was uploaded exactly once as package `1f14b21e-df4f-4f5d-9eff-b972497a9da2`; its recorded fingerprint begins `5f800341`.
- Import result: 11 RC questions and 3 stimuli, with no import errors, warnings, or duplicate rows.

## Active Staging acceptance fixtures

| Fixture | Assessment | Published version | Intended composition |
|---|---|---:|---|
| RC-only | `510d2350-b886-4bce-8da7-b5fd4fdae567` | 1 | 1 RC question, 117 seconds |
| Mixed | `0568d9c3-8d0c-4934-867e-306613e0f91f` | 2 | 1 QA / 129 seconds, 1 CR / 117 seconds, 1 DI / 135 seconds |

Both published versions are assigned to the Staging-only `DI Test batch`. Assignment-scoped tester copies also remain active, so the tester account sees a standard and tester-access card for each fixture. These fixtures have not been cleaned up.

## Verification completed

- The Staging-backed Preview `dpl_FSu3UMxkVEZSUz3U1Rre4JB7tEYF` served branch commit `e9b20df` at `https://ace-club-94nnyu52x-theadmitco-techs-projects.vercel.app`.
- Builder verification confirmed RC-only composition and the mixed QA + CR + DI composition.
- The existing full mock displayed 21 Quant questions / 45 minutes, 23 Verbal questions / 45 minutes, and 20 Data Insights questions / 45 minutes.
- Authenticated Student verification confirmed the RC-only card displayed one section and 1.95 minutes, then opened an attempt containing one question.
- The mixed card displayed three included sections totaling 6.35 minutes and offered only QA, CR, and DI in its order dialog.
- Mixed attempt creation then failed with `mock_attempt_items_attempt_id_display_order_section_key`, proving that the legacy parent-section uniqueness rule must be replaced before acceptance can pass.

## Product decision and correction

On 25 September 2026, the Product Owner directed that section-order selection be removed everywhere except the full mock.

The local correction:

- starts sectional mocks directly using the immutable snapshot order;
- keeps the chooser only when the snapshot consists of legacy `quant`, `verbal`, and `data_insights` units;
- updates Student and reset copy;
- adds a forward migration that scopes the remaining attempt-item display-order uniqueness to `category_key` (attempt-section uniqueness was already converted by `20260924120000`);
- adds automated checks for RC-only, mixed, full, direct-start, proportional timing, and non-destructive constraint replacement.

## Pending Staging verification

1. Commit and push the exact correction.
2. Deploy a Staging-backed Preview from that commit.
3. Apply only `20260925100000_scope_mock_attempt_order_by_category.sql` to Staging and verify the migration ledger and constraints.
4. Confirm RC-only starts directly with its 117-second section.
5. Confirm QA + CR + DI starts directly in published order with 129-, 117-, and 135-second sections and breaks only between included sections.
6. Confirm the existing full mock still presents six orders and retains 45-minute sections.
7. Record browser/runtime evidence and decide fixture cleanup separately.

Local correction checks completed on 25 September: TypeScript, touched-file lint, all 42 Pilot V3 tests, the Next.js production build with 54 generated pages, documentation checks, and `git diff --check` all passed.

## Rollback and recovery

- Application rollback: restore Preview to commit `e9b20df` or the previously accepted Preview deployment.
- Database recovery: the category-key item constraint is compatible with existing full mocks and may remain if the application is rolled back. Prefer a reviewed forward correction over restoring the parent-section constraint.
- Fixture containment: unrelease or remove only the exact Staging assignments if requested; do not delete attempts or imported package history merely to simplify rollback.
- Production rollback: none required because Production is unchanged.

## Authorization boundary

Current approval covers implementation and Staging verification only. It does not authorize Production migration, Production deployment, publication or assignment of Production mocks, Production data changes, merging to `main`, or merging PR #21.
