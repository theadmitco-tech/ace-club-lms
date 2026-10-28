# Phase 2 local completion — 28 October 2026

The corrected Phase 2 Admin publishing workflow is implemented and verified
locally. **Hosted acceptance is not complete. PR #24 remains Draft.**

Local branch: `work/phase2-delivery-2026-10-28`, starting from `19d20a7`.
GitHub checked on 28 October: PR #24 is open/Draft at `334ea029f9094093929610429e06a4c07259f942`,
base `codex/v2-integration` at `6447f5b5cae0b868de5f98d123c5af5b1c414bd6`.
The local follow-ups have not been uploaded; the older Preview does not verify them.

## Completed scope and evidence

| Phase 2 exit gate | Local result | Evidence |
| --- | --- | --- |
| Full Course includes Quant + Verbal + DI | Passed | Template validation and all-offering database lifecycle tests |
| Individual Quant, Verbal and DI can publish | Passed | Four offering-specific publication lifecycle cases |
| Ordered sessions and all four content collections survive without live events | Passed | Template/batch/enrolled-schedule database tests; mobile browser save/reopen |
| Draft changes leave published content unchanged until confirmed | Passed | Pinned revisions, content replacements/reordering and stale-review rejection |
| Publish/edit/unpublish/republish preserve history | Passed | Publication database lifecycle and browser confirmation/retry cases |
| Independent Full Course and individual schedules | Passed | Independent batch snapshots and rescheduling tests |
| Private Meet details stay Admin-only | Passed | Role/RLS checks and public projection tests |
| Course content works as an authoring structure without live scheduling | Passed | Undated course examples; delivery mode derived from actual live events |
| Published schedules appear only to entitled enrolled Students | Passed | Enrollment, expiry, revocation, inactive identity and latest-publication tests |

The last UI adjustment makes delivery mode visible in template, batch and
publication reviews without adding a contradictory configuration flag. Four new
PostgreSQL cases exercise complete course content and publication history for all
four offerings. No schema change was needed for this completion pass.

## Final local checks

- **348 automated tests passed:** 140 Phase 1/compatibility + 208 Phase 2.
  All 32 suite files passed, without failures or skips.
- **39 synthetic browser scenarios passed**, with no runtime errors or external
  browser requests; desktop/mobile, keyboard, draft recovery, reading rendering,
  publication and enrolled schedules covered.
- Lint, TypeScript and the webpack production build passed.
- Tests used Node 26.12.1, disposable local PostgreSQL and synthetic configuration.
  The existing CI environment remains a separate check.

See [machine-readable verification](verification-2026-10-28.json),
[browser results and source hashes](browser-2026-10-28.json), and
[independent source review](review-2026-10-28.md).

## Wireframes and phase boundaries

The [desktop wireframes](../../wireframes/index.html) demonstrate the broader
Student recordings/live and Admin journeys. They are review simulations, not a
claim that payment, feedback, shared assets or Student content delivery is live.
All 23 scenarios passed interaction/rendering checks. A [24-page PDF](../../wireframes/ace-v2-wireframes-2026-10-28.pdf)
is ready for review. The accompanying screen map records unresolved interaction choices.

Paid eight-seat allocation is Phase 3. Protected Student content delivery is
Phase 4. Shared recording management, five reading placements and independent/
universal item publication are Phase 5. The offline transfer planner prepares
reviewable mappings/drafts; it does not migrate existing content. These broader
requirements remain visible rather than being counted as completed Phase 2 gates.

## Required before hosted completion

1. Review the separate Phase 1 canonical-contract forward/rollback proposal and
   retained historical ledger identifiers. Do not edit or rerun the applied migration.
2. Upload/review the local candidate, keeping PR #24 Draft, then verify exact-head
   CI and LMS Preview. No prior Preview status proves this candidate.
3. Obtain explicit approval for the six Phase 2 staging migrations and setup.
   Follow [the current staging handoff](../review-and-release.md), including
   backups, exact checksums, schema/privileges and the three feature flags.
4. Perform authenticated staging acceptance using synthetic test identities and
   representative real reading sources; record results before requesting acceptance.

No shared migrations, Production/Flexible Mocks changes, real Student/course-data
changes, remote writes or merges were performed. The applied Phase 1 checksum is
unchanged. The blocked shared operations are not bypassed by this local completion.
