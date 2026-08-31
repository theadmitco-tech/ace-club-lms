# Release 0 — Source-Lineage Reconciliation — 31 August 2026

Status: Candidate verified and published to GitHub; Product Owner acceptance pending
Owner: Product owner and Engineering
Last updated: 31 August 2026

## Objective

Create one reviewable source baseline containing the already accepted worksheet-question-count and course-selection implementation, the Production Notion embedding fix, and the consolidated documentation. Release 0 is source-governance work only.

## Reconciled lineage

All relevant branches share commit `65aa63f`.

- worksheet question count and course selection: `b10a7c1` through acceptance record `838b782`;
- documentation consolidation: `0ea118f` through publication record `85ae2ba`;
- current Production Notion fix: original commit `b5ad0e2`, cherry-picked as `1b5a01e`;
- candidate branch: `codex/release-0-reconciled-baseline`.
- GitHub publication record: `e92a829` before this status-only follow-up commit.

The Notion fix applied without a merge conflict. `package.json` retains both the documentation and Notion test commands.

## Included behavior and artifacts

- reusable template worksheet question counts and generated-batch persistence;
- multi-course option retrieval, persistent selection, `/courses`, and “Switch course” navigation;
- historical enrolled courses remain selectable regardless of operational status;
- public Notion link validation and iframe normalization;
- the three August 30 migration files and the application rollback SQL;
- Project Manual, Current State, Engineering Handbook, documentation inventory, and validation command.

## Database reconciliation boundary

No SQL was run and no ledger was changed.

The candidate includes:

- `20260830112501_add_template_worksheet_question_count.sql`;
- `20260830133000_add_student_course_selection.sql`;
- `20260830133001_fix_template_worksheet_question_count_trigger_order.sql`.

Production and Staging both report the last of those versions, but their older ledgers still differ as recorded in Current State. A future release must compare effective definitions and must not issue a blind `db push`.

## Verification

Passed:

- `npm run test:docs` — 111 Markdown files and 138 inventoried artifacts before adding this record;
- `npm run test:notion-links` — 3 tests;
- `npm run test:student-course-selection` — 4 tests;
- `npm run test:templates` — 13 tests;
- `npm run test:pilot-v2` — 53 tests;
- `npx tsc --noEmit`;
- ESLint for every changed TypeScript, TSX, and MJS file;
- `npx next build --webpack` — successful production build including `/courses`.

The default Turbopack build could not traverse this QA checkout because `node_modules` is a symlink outside the worktree root. The supported Webpack production builder compiled, type-checked, generated all pages, and collected build traces successfully.

Repository-wide `npm run lint` remains red on 14 errors and 2 warnings in pre-existing registration/curriculum/storage files outside this release. Changed-file lint is green; Release 0 does not silently mix unrelated lint cleanup into the reconciliation.

## Runtime impact

None. This work does not:

- merge to `main`;
- deploy to Vercel;
- change a Vercel environment variable or domain;
- apply or repair a Supabase migration;
- create fixtures or modify Student data;
- grant Admin or Super Admin access.

## Rollback

Before deployment, rollback means abandoning or reverting the candidate branch. No runtime rollback is required because no environment changed.

For the later course-selection release, the rollback unit must be a separately recorded application deployment. Database support is already live and backward-compatible; its removal is not part of the application rollback.

## Next gate

Request Product Owner acceptance of the published candidate. Only then prepare a separate Staging-backed Release 1 preview and acceptance run.
