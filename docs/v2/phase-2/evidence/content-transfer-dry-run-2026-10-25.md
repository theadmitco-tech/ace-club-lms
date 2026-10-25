# Content transfer dry-run evidence — 25 October 2026

Prepared locally on `work/content-transfer-dry-run-2026-10-25`, based on
`5cd143c`. This follow-up is not published to PR #24 and has no hosted Preview.
The separate Phase 1 proposal remains on its existing local review branch.

## Delivered

- An offline planner consumes fingerprinted source rows, reviewed format-2 mappings,
  exact template revisions and explicit source fields/item positions.
- It prepares unpublished course documents with original titles and references,
  stable asset identities for explicitly shared sources and a placement manifest.
- It rejects stale/missing data, scope expansion, ambiguous duplicates, unsafe
  references and conflicting existing content. Existing inputs are not modified.
- Its CLI writes a new private output directory, refuses overwrite, and prints only
  a sanitized report. No network fetch, database connection or import command exists.
- The report explicitly marks import, publication and rendering as unverified.

## Verification

`npm run test:v2:phase2` passed **198 tests across all 16 suite files**, with no
failures or skips. This includes 10 transfer-planner tests covering:

- exact title/reference preservation and undated course content;
- explicit shared recordings and multiple source URL fields;
- stable draft preparation and preservation of existing items;
- stale/missing exports, incorrect target revisions and unauthorized scope changes;
- invalid titles/references, duplicate records and conflicting item positions;
- private output permissions, overwrite refusal and sanitized CLI output;
- actual PostgreSQL `to_jsonb(row)::text` fingerprints, including Unicode, without
  reserializing the source text and accidentally changing its hash.

Targeted ESLint and `git diff --check` passed. Application runtime code did not
change, so the earlier application build was not repeated for this offline tool.
PostgreSQL tests used disposable local clusters only.

## Remaining work

Use the [dry-run instructions](../content-transfer-dry-run.md) with reviewed real
source records and mappings. No current course material has been captured or
migrated. This manifest is not a shared asset store, full Notion renderer or hosted
importer. Actual student preview, access checks, full file/worksheet coverage and
transactional import/rollback still need implementation and acceptance.

No shared migrations, Production changes, existing Student/course-data changes,
remote branch updates or PR merges were performed. PR #24 remains Draft.
