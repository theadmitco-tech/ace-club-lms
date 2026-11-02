# Phase 2 acceptance checklist

Status: functionality and cleanup verified in staging; final delivery verification remains pending. Production is unchanged and PR #24 remains Draft.

This checklist synthesizes the [acceptance review](acceptance-review.json), [main hosted checks](hosted-results.json), [authoring lifecycle](authoring-results.json), [targeted reading recheck](resource-recheck.json), [IST schedule](ist-schedule.json), and [reviewed library publication](../phase2-preview-activation/evidence/material-acceptance-2026-11-02-publish-reviewed.json). Earlier interrupted attempts remain retained and explained in the review.

| Gate | Requirement | Verified evidence |
|---|---|---|
| [x] P2-01 | Four offerings can be configured and edited | Four imported templates and exact library batches; hosted Verbal form save/reopen; local four-offering editor coverage. |
| [x] P2-02 | Existing subject material is migrated | 70 import checks, four real templates, 19 shared assets and 33 exact placements; published Student content matches. |
| [x] P2-03 | Five session fields remain independent | Hosted session heading and four resource collections saved/reopened; four-stage Student order passed. |
| [x] P2-04 | Shared recordings retain stable references | Shared asset and placement comparisons passed; four recording placements use three existing provider references; no re-upload. |
| [x] P2-05 | Live classes use dates, times and optional private meetings | Calendar browser coverage plus exact hosted IST start/end timestamps and live-registration role matrix. |
| [x] P2-06 | Non-live course content remains undated | Four published libraries have no fabricated live events; hosted undated batch edits passed. |
| [x] P2-07 | Outline publishes with its offering | Exact published headings, revision pins and edited-session/outline publication verified together. |
| [x] P2-08 | Preview/edit/publish/unpublish/republish remain safe | Hosted lifecycle, retry receipts, stale-review rejection and immutable template history passed. |
| [x] P2-09 | Universal publication has explicit scope | Exact four-library server scope reviewed and published; existing batches excluded from synthetic-scope mutation. |
| [x] P2-10 | Reading titles remain independently editable | Hosted editing and exact real Student session/resource title comparisons passed. |
| [x] P2-11 | Student preview/delivery preserves ordered content | Shared renderer, mobile checks, protected PDFs, two rendered original Notion embeds and recognized recording players verified. |
| [x] P2-12 | Import preserves sources and avoids duplicates | Guarded original-data fingerprint, exact source/asset comparisons and operator-confirmed idempotent replay passed. |
| [x] P2-13 | Private meetings require eligible live registration | Active/expired/revoked/inactive/unregistered/wrong-subject role matrix passed; manual registration does not imply a payment. |
| [x] P2-14 | Class completion is separately audited | Hosted confirmation, audited completion and idempotent replay passed; no attendance claim. |
| [x] P2-15 | Publication, content and completion remain separate | Template edits preserve published content; class completion closes joining while preserving course content; no feedback/payment/attendance mutation. |
| [x] P2-16 | Existing mocks remain unchanged | Original 60-table fingerprints and migration preservation passed, with 18 Phase 1 regression suites and legacy worksheet route checks. |
| [x] P2-17 | Students cannot read private drafts or Admin data | Private-table denials, unpublished denial, exact resource authorization and anonymous/wrong-Student file/reading denials passed. |

The API reader remains unavailable for the two legacy Notion embed references; their original embedded content is the verified delivery path. Recording provider metadata confirms availability, without a sustained-playback claim. Manual live registration remains separate from later payment fulfillment.

- [x] Exact fixture cleanup restores the recorded 78-table baseline.
- [x] Nine synthetic QA accounts are removed.
- [x] The retained content operator is deactivated after baseline verification.
- [ ] Final evidence is committed and the Preview build is verified.
