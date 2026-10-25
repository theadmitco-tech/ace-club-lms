# Content mapping review

Status: Local proposal validation. No approved curriculum mapping, import or
Student content delivery is implied.

The mapping tool prepares explicit legacy-material-to-V2-event associations for
review. It uses the existing template validator, so product sections and live
timing follow the same rules as Admin authoring. An undated outline is a valid
target; recording/material-only planning does not require an invented live date.

## Inputs

Run with Node's TypeScript stripping support, as used by the Phase 2 runner:

```sh
node --experimental-strip-types scripts/v2-content-mapping.mjs review \
  /private/inventory.json /private/templates.json /private/proposal.json
```

The command reads local files only. It opens no database or network connection,
does not modify its inputs and has no apply/publish command. Exit `0` means a
structurally valid proposal needing human review; `2` means invalid or stale
inputs. Each file is limited to 64 MiB.

1. `inventory.json`: a complete report from the
   [content-preservation inventory](content-preservation.md). Any hosted capture
   remains a separately authorized operation.
2. `templates.json`: an array of exact `V2TemplateDraft` objects (`id`,
   `productCode`, `revision`, `document`) from the intended target candidate.
   Each template and its event identities must validate. Duplicate template IDs
   are rejected. Saved JSON does not prove that a template is still current.
3. `proposal.json`: explicit source/target pairs, using this shape:

```json
{
  "format": "v2-content-mapping-proposal-1",
  "source": "synthetic-local",
  "bindings": [
    {
      "source": {
        "table": "master_materials",
        "id": "d1000000-0000-4000-8000-000000000001",
        "rowHash": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "schemaHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      },
      "target": {
        "templateId": "d1000000-0000-4000-8000-000000000011",
        "revision": 2,
        "eventKey": "d1000000-0000-4000-8000-000000000021"
      }
    }
  ]
}
```

These IDs/hashes are synthetic illustrations, not existing content. A real
proposal must use exact values from its reviewed inventory and template files.
Allowed source tables are `materials`, `master_materials` and
`course_template_resources`. An item can be proposed for multiple targets only
through separate bindings. There is no wildcard, inferred title match or automatic
Full Course access when three individual course targets are selected.

## Review output and invalidation

The report always says `review_required`. It lists every source and destination,
target product, section, event kind, template fingerprint, distinct source/event
counts, and unbound source/event counts. Unbound counts indicate incomplete
coverage for the supplied scope, not a demand to migrate every legacy item.
Raw source URLs, titles and answers are not available from the fingerprint inventory
and are never copied into the review. Target titles and instructor details are
fingerprinted rather than printed. Keep real input/output reports private.

Missing or changed source rows, column-schema drift, stale template revisions,
missing/cross-template event IDs, malformed templates and duplicate associations
reject the proposal. The `reviewHash` binds the explicit association list, all
scoped inventory fingerprints and the full contents of each referenced template.
Changing any bound content requires a new review. Object-key order, input-table
order, binding order and capture timestamps do not change the checksum. Event
ordering inside a template does matter. Mapping bindings themselves do not define
delivery order.

The checksum is not a signature or approval token. Captures and template files
are operator-supplied evidence; they do not authenticate origin, freshness or
permission. A future import must re-read authoritative records, recheck exact
revisions/fingerprints and enforce authorization transactionally. This offline
review must never be treated as that import gate by itself.

## Remaining review inputs

The [superseded source investigation](content-source-candidates.md) records legacy
seed names only. Under the [approved correction](../decisions/course-model-correction-2026-10-25.md), preserve complete current Quant, Verbal and DI content;
short-format seed schedules are not approved replacements for those courses.

For Quant, Verbal (including CR/RC) and DI, identify the existing source courses
or templates, then confirm exact material IDs and target event identities. Review
curriculum fit and intended product sharing; the tool cannot derive either from
fingerprints. Supply a representative recording/material-only example.

The inventory does not identify whether a source contains a recording, readable
material, multiple file variants or a usable remote asset. Those details and
their preservation need separate inspection. Proposed association validity does
not prove entitlement enforcement or complete Phase 2 delivery. Protected links,
recording hosting, real mappings, content-import design and staging execution
remain separate work. Nothing here changes existing Students/courses or PR #24.

## Synthetic checks

```sh
node --experimental-strip-types scripts/v2-content-mapping.test.mjs
npm run test:v2:phase2
```

Tests cover explicit sharing across all four products, independent source IDs,
stale/missing records, scope validation, checksum invalidation, undated targets,
malformed input and CLI output without mutation.
