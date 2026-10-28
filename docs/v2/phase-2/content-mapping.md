# Content mapping review

Status: offline proposal validation only. No approved curriculum mapping, import,
Student delivery or shared database mutation is implied.

## Current course-session format

Format 2 maps source records to independent, undated course sessions and an explicit
content collection. It does not require a live event. Run:

```sh
node --experimental-strip-types scripts/v2-content-mapping.mjs review \
  /private/inventory.json /private/templates.json /private/proposal.json
```

Inputs are a complete [preservation inventory](content-preservation.md), exact
`V2TemplateDraft` objects with canonical offering codes/revisions and `sessions`,
and an explicit proposal:

```json
{
  "format": "v2-content-mapping-proposal-2",
  "source": "synthetic-local",
  "bindings": [{
    "source": {
      "table": "master_materials",
      "id": "d1000000-0000-4000-8000-000000000001",
      "rowHash": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "schemaHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    },
    "target": {
      "templateId": "d1000000-0000-4000-8000-000000000011",
      "revision": 2,
      "sessionKey": "d1000000-0000-4000-8000-000000000021",
      "contentKind": "preSessionReads"
    }
  }]
}
```

These are synthetic examples. Real files require exact reviewed IDs/fingerprints.
The four content kinds are `materials`, `recordings`, `preSessionReads` and
`postSessionReads`. Sources can be `materials`, `master_materials` or
`course_template_resources`; `sessions` and `master_sessions` can also be selected
for a recording reference. Their row fingerprints do not prove that a usable
recording exists. The reviewed source manifest must identify the actual asset.

Explicit sharing requires one binding per destination. The same source can be
bound to different placements only explicitly; this is not an automatic duplicate
or universal-publishing operation. The tool does not infer the correct content
kind, source subject, delivery order or curriculum fit from a row fingerprint.

## Validation and limits

The tool reads local files only (64 MiB maximum each), without network connections,
input mutation or an apply command. Exit 0 means `review_required`, not approval;
exit 2 means invalid/stale inputs. Output contains scoped IDs, hashes, canonical
product, section, session/content placement and coverage counts. It omits raw
source URLs, titles, answers and instructor details. Keep actual reports private.

Changed/missing source records, schema drift, wrong target revision, missing or
cross-template sessions, invalid content kinds and duplicate bindings fail closed.
The review hash binds explicit placements, scoped inventory and referenced template
contents. Any content/order change requires another review. Object-key order,
input ordering and capture timestamp alone do not affect the hash. A hash is not
an approval token and does not authenticate freshness or origin.

Format 1 remains readable for older event-based proposals and produces a format-1
review. It is historical compatibility, not the format for new course transfers.
Current format-2 output reports target sessions rather than target events.

A reviewed format-2 mapping can feed the [offline transfer planner](content-transfer-dry-run.md)
to prepare unpublished course documents from matching source row exports.
The mapping tool does not fetch remote content, copy assets or import records. A real
import must re-read authoritative sources, enforce authorization and revisions,
preserve titles/ordering/shared assets, and verify the actual student renderer.
See the [content transfer and journey plan](content-transfer-plan.md) for rollout,
rollback and outstanding inputs. No source course is selected automatically.

## Synthetic checks

```sh
node --experimental-strip-types scripts/v2-content-mapping.test.mjs
```

Coverage includes old proposals, undated sessions, explicit pre/post placement,
shared recording references, missing/stale records, invalid targets, duplicate
bindings, hash invalidation and CLI output without mutation.
