# Phase 2 local verification — 21 August 2026

## Scope

Local implementation of the accepted Phase 2 Admin mock builder, immutable mock versioning, release and batch assignment boundary. Student attempts/player and all environment operations were excluded.

## Evidence

- `npx tsc --noEmit`: PASS.
- Targeted ESLint for Mock Builder component, page, navigation, API route and server module: PASS.
- `npm run build`: PASS on Next.js 16.2.4; `/admin/mock-builder` and `/api/admin/mock-builder` compiled successfully.
- Migration review: additive tables for assessments, sections, items, versions, assignments and audit; RLS enabled on every new table; Admin policies and released active-enrollment Student read policies included.
- Composition guard: server rejects duplicate revisions, unpublished revisions, section mismatches and invalid order values before replacing Draft composition.
- Publish guard: incomplete counts, non-45-minute section timing and non-Published revisions block publication; successful publication stores a JSON snapshot with a monotonically increasing version number.
- Assignment guard: assignment references a Published version and requires release time; due time cannot precede release time at the database level.

## Acceptance matrix

| Criterion | Local status | Evidence |
|---|---|---|
| M-01/M-02/M-03 | Pass | Draft creation and default three-section settings in Mock Builder and migration |
| M-04/M-05 | Pass locally | Published-question filter, composition reload, add/remove and explicit reorder controls |
| M-06/M-07 | Pass locally; Staging verification pending | Stimulus group keys, contiguous-order validation, selected-order controls and count badges |
| M-08/M-10 | Pass locally | Validation gate, immutable version snapshot and incremented Draft version after later edits |
| M-09 | Pass locally; renderer parity probe pending | Full selected-order Admin preview uses the shared rich-content renderer; Student route parity is verified in Phase 3 |
| R-01/R-02 | Pass locally | Assignment route/schema with release and optional due time; no expiry column |
| R-03/R-06 | Implemented; Staging verification pending | RLS release/enrollment policy; requires database-backed role/enrollment probe |

## Environment boundary

The linked project was confirmed as Staging (`eyphkkginlgoaxflauog`). A privileged catalog check confirmed all Phase 1 relations/functions and found Phase 2 relations absent despite the ledger reporting `20260821123000`; this was schema drift, not a failed Phase 1 runtime acceptance. The exact Phase 2 additive SQL was applied once in a transaction under the authorized postgres role, with the inherited enrollment schema corrected (`enrollments` has no `is_active` column) and authenticated read grants added for assignment/version reads. Post-repair catalog and anonymous API checks see the Phase 2 relations with zero rows, as expected. No Production system was queried or changed.

Transactional synthetic RLS probe passed and rolled back all rows: an active enrolled Student could see a released assignment and its version; the same Student could not see a future-release assignment. Staging currently has no Published Question Bank revisions, so a positive 21/23/20 publication probe requires a separately prepared synthetic Question Bank fixture; no existing content was mutated.
