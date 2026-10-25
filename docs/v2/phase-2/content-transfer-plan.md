# Existing content transfer and journey alignment

Status: preparation only — 25 October 2026. No existing material has been
imported, changed, deleted or published. PR #24 stays Draft; Phase 2 migrations
remain paused while the Phase 1 contract correction is reviewed.

## Source and precedence

The supplied `V2-student-and-admin-journeys.md`, updated 24 October, was read from
local Downloads. Its incorporated current rules supersede its earlier annotated
draft. The 25 October Full Course / individual offering correction governs product
names. The journey is broader than PR #24's current Admin-authoring scope.
Source SHA-256: `c1500fecb999b84eeb08290f6d534b0a77a7aa93322616b0f8e80db4be7285f8`.

It requires existing session material, meaningful editable reading titles,
pre/post placement and order, one shared recording asset referenced across batches,
and a student preview using the real renderer. An external URL opening or a
successful import of link metadata is not evidence of full student delivery.

## Transfer plan

1. **Inventory privately, when authorized.** Identify the authoritative current
   Quant, Verbal (CR/RC) and DI courses and master/template sources. Record exact
   IDs, revisions, material types, titles, ordering, file variants, Notion page
   identifiers, recordings, worksheet/question relations and publication/release
   metadata. The existing 17-table fingerprint tool verifies row preservation;
   it does not fetch Notion content, storage bytes or reconstruct titles/URLs.
   Extend the inventory for any additional asset tables discovered before import.
2. **Review explicit mappings.** Map each source to a canonical offering, course
   session and content collection (`preSessionReads`, `materials`, `recordings`,
   `postSessionReads`). Use proposal format 2 in the offline mapping tool. Never
   attach undated content to a fabricated live event. Explicitly map shared content
   to Full Course as well as individual offerings where approved. Do not infer
   sharing from a title, a matching section or possession of three individual grants.
3. **Resolve source ambiguity.** Legacy material types may not contain a distinct
   post-read type. Classify by reviewed source content, not guessed suffixes.
   Preserve original title, source key and ordering; do not replace everything with
   generic “Pre-read” or “Post-read”. Record exclusions and missing/broken assets.
4. **Design an additive importer.** Before implementing hosted writes, define an
   import manifest with source revision/hash, destination session/item IDs, content
   kind, position and shared asset ID. Re-read authoritative sources at execution,
   check exact target revisions and authorize the selected scope transactionally.
   Reject stale/missing items and collisions. Make retry idempotent; keep a batch
   log of created records and previous destination revisions. No legacy deletion
   or enrollment/progress rewrite is part of content transfer.
5. **Preserve asset identity and rendering.** Reuse one recording asset per shared
   session, not a copy per batch. Preserve Notion structure, images, formatting and
   links through the controlled renderer, retaining an explicitly reviewed working
   path for unmigrated items. The current draft JSON stores references; it does not
   yet implement the shared asset lifecycle or full rendering/import pipeline.
6. **Dry-run and preview.** Show counts, every source/destination, scope, title,
   placement, ordering and exclusions. Preview exact student components for readings
   and recordings without changing real progress or feedback. Broken rendering
   blocks acceptance even when a URL resolves. Test representative full/individual,
   live/recording and shared-content cases on an isolated restore first.
7. **Staged application only after approval.** Import an approved small cohort into
   unpublished drafts. Compare all scoped before/after fingerprints; legacy data
   should remain unchanged. Require reviewed publication separately. Keep a precise
   manifest so rollback can unpublish imported revisions and restore destination
   pointers without deleting shared assets or pre-existing content.

## Journey requirements that constrain delivery

- Offerings can be browsed before purchase without exposing protected assets.
- Entitlement, expiry and enrollment rules still apply; recordings alone do not
  grant live registration or Meet access. Students see their enrolled batches.
- Students can choose any available session, including Quant 4 first. Preserve
  recommended ordering without inventing sequential completion requirements.
- Opening a pre-read/outline does not trigger feedback. Pending feedback locks
  other sessions in that subject, including previously opened ones, while the
  current session/feedback and entitled other subjects remain available.
- Live feedback starts when Admin marks a class completed. “I didn't attend” is a
  valid unlock without a recording watch. Reuse feedback completion across routes.
- Recording watch threshold remains unresolved (80% or 90% in the source). No
  threshold, new pricing difference or extra attendance integration is inferred.
- Admin corrections/overrides require scoped confirmation and an audit trail;
  neither grants unpaid access. Mocks and existing worksheet/progress data remain
  unchanged. Preserve source release metadata as evidence, then explicitly map it
  to the approved V2 availability rules rather than silently copying old locks.

## Current deliverables and gaps

Available: preservation fingerprints, versioned offline session mappings,
independent course sessions and Admin reference previews. Missing: reviewed real
source manifest, shared asset store/importer, full student rendering preview,
independent/universal item publication, hosted acceptance and feedback workflows.
These gaps are not marked passed by the 34 synthetic Admin browser checks.

Next input for an eventual import is the exact authoritative source course/template
IDs and asset sources. It does not require sending private URLs or credentials in
chat. Preparing this plan does not authorize a shared capture or migration.
