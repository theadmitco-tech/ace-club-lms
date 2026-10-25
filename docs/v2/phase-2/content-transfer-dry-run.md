# Content transfer dry run

Status: local preparation only. No hosted capture, import, publication or migration
is performed. Use this alongside the [journey-aligned transfer plan](content-transfer-plan.md).
The Phase 1 contract proposal and PR #24 remain under review.

## What the planner does

The planner combines an exact fingerprint inventory, reviewed course-session
mapping, scoped source rows and explicit field/position selections. It produces
unpublished draft documents, a source-asset manifest and a sanitized review report.
It never connects to a database, fetches URLs, renders Notion, uploads recordings
or saves an Admin revision. There is no `apply` command.

- Source row bytes must match the reviewed SHA-256 fingerprint. Missing, changed,
  unrelated or duplicate rows fail rather than being skipped.
- The mapping review hash and target revisions must match. Every binding must be
  covered; additional destinations cannot be introduced through the selection file.
- Titles and references are copied exactly. Invalid or overlong titles and unsafe,
  empty or structured URL values fail; the planner does not trim, truncate or guess.
- Final item positions are explicit. Existing content is preserved. Gaps, duplicate
  positions and conflicting existing items fail. An identical generated item is
  reused when rehearsing the same transfer against a refreshed mapping.
- Each source row/URL field gets one stable asset identity, reused across explicitly
  mapped destinations. Equal URLs from unrelated source rows are not silently
  deduplicated. Select an authoritative shared source during mapping review.
- Distinct URL fields can be selected explicitly as separate variants. Nested file
  arrays, worksheet/question structures and rendered Notion content are not imported
  by this planner; those require dedicated extraction and preservation checks.
- Course sessions remain undated. The planner neither creates live events nor
  changes template or batch scheduling.

The resulting draft JSON still contains title/URL references, as required by the
current Admin model. Its asset manifest records intended sharing; it is not yet a
shared asset store that propagates edits across existing batches.

## Inputs

Run from the candidate checkout with Node's TypeScript stripping support:

```sh
node --experimental-strip-types scripts/v2-content-transfer.mjs plan \
  /private/inventory.json /private/templates.json /private/mapping.json \
  /private/source-export.json /private/selection.json /private/new-plan-directory
```

All five inputs are local JSON files, limited to 64 MiB each. Keep real exports
and outputs out of Git. The output directory must not already exist.

1. `inventory.json`: complete content-preservation inventory from the separately
   approved source capture.
2. `templates.json`: exact current `V2TemplateDraft` objects with independent
   `sessions`, valid canonical offering codes and saved revisions.
3. `mapping.json`: [format-2 mapping proposal](content-mapping.md), including the
   exact source row/schema fingerprints and destination session/content collection.
4. `source-export.json`: scoped original PostgreSQL row text, shaped as below.
5. `selection.json`: the mapping review hash and explicit source fields/positions.

Source export shape:

```json
{
  "format": "v2-content-source-export-1",
  "source": "synthetic-local",
  "rows": [
    {"table": "master_materials", "rowJson": "<exact to_jsonb(source_row)::text>"}
  ]
}
```

The placeholder is not runnable content. Preserve the exact PostgreSQL text that
was hashed by the inventory, including whitespace and Unicode. Do not parse and
reserialize the row before placing it in `rowJson`. JSON-encoding that text as an
outer string is expected. Use the same source snapshot and capture settings as the
inventory. A local fingerprint match proves consistency of the supplied files,
not their origin, freshness, approval or connected project identity.

Selection shape (illustrative identifiers):

```json
{
  "format": "v2-content-transfer-selection-1",
  "source": "synthetic-local",
  "mappingReviewHash": "<exact hash returned by the mapping review>",
  "items": [{
    "source": {"table": "master_materials", "id": "d2000000-0000-4000-8000-000000000001"},
    "target": {
      "templateId": "d2000000-0000-4000-8000-000000000010",
      "revision": 2,
      "sessionKey": "d2000000-0000-4000-8000-000000000020",
      "contentKind": "preSessionReads"
    },
    "titleField": "title",
    "urlField": "file_url",
    "position": 0
  }]
}
```

`titleField` is `title`; `urlField` can be `file_url`, `video_url`, `recording_url`
or `url`, only when that field exists and is a valid HTTPS string. `position` is
zero-based within the destination content collection after insertion. Use exact
source/target pairs from the mapping; no wildcard or inferred universal scope.
Select multiple URL fields with separate items and different positions when needed.

## Outputs and review

The tool creates a mode-0700 directory with mode-0600 files:

- `plan.json`: private asset references, placement manifest and proposed documents
  with `expectedRevision` and `sourceTemplateHash`. These are not saved revisions.
- `report.json`: counts, product scope, mapping hash and a hash of the full plan.
  It explicitly reports `imported: false`, `published: false` and
  `renderingVerified: false`. Standard output contains only this report.

Exit 0 means preparation succeeded and review is required. Exit 2 means the entire
plan was rejected; input files and any pre-existing output directory are unchanged.
A partial newly created output directory is removed if writing fails.

Changing source content, scope, placement or destination documents invalidates the
plan hash. It is not an approval token. Before any future importer writes, it must
re-read authoritative records, enforce identity/authorization and exact revisions,
revalidate the manifest and record a rollback log transactionally. Dry-run files
cannot stand in for those checks.

## Acceptance still outstanding

Reviewed real source IDs and captures, complete file-variant/worksheet coverage,
shared asset lifecycle, exact student-rendered preview, private delivery controls,
and approved staged import/publication remain outstanding. A valid local draft is
not evidence that existing content has been migrated or renders correctly.
