# Phase 5 Preview activation

Status: Phase 5 implementation, staging activation, hosted acceptance and exact QA
cleanup complete. Draft PR creation remains a separate handoff action.

The isolated branch is `intern/v2-phase-5-review`, based on Phase 4 commit
`5b4a2b12ca93c68079e523d1349b94c966893f7a`. Production remains unchanged and Phase 3
remains inactive. PR readiness and merging are separate decisions.

## Website delivery

Admin → Course publishing → Content publishing provides independent content drafts,
editing, replacement, deletion, per-placement ordering, explicit scope review and
immediate publish/unpublish actions. Readings support all five required locations.
The actual Student renderer opens in a new authenticated tab with learning writes
disabled. Private MP4/WebM/PDF uploads support files up to 50 MiB and authenticated
streaming. Existing Notion rendering, explicit provider failures and original-source
fallback remain available. Hosting and launch procedures are documented in
[the Phase 5 design](../../docs/v2/phase-5/README.md).

The [tested Preview](https://ace-club-oyzycu0ld-theadmitco-techs-projects.vercel.app)
is READY at implementation commit `a999e2a1a642edbe5e31e256bd2920ea34a0f1e6`.
Its environment check confirms staging project `eyphkkginlgoaxflauog`.
[GitHub Verify](https://github.com/theadmitco-tech/ace-club-lms/actions/runs/41634923633)
passed. The branch-only staging service key and feature flags remain scoped to
Preview; existing environment-variable metadata was preserved. The latest Production
deployment remains `dpl_8axtycbJUpFX8cPWhVtkhGf6p9Kj`.

## Acceptance evidence

Seven Phase 5 local suites / 12 tests passed, alongside the earlier Phase 1, 2 and 4
regressions, six Phase 5 browser journeys and 13 Phase 4 browser regressions.
TypeScript, lint and webpack build passed.

Hosted evidence records 49 main assertions, eight Admin preview-matrix assertions,
five reordering/new-tab assertions and an independent authenticated direct-Storage
denial check. The initial 32 main assertions and Storage check retain `b181d91`
attribution; the continuation and supplemental reports identify `a999e2a`.
The intervening application changes add the typed stale-conflict response and HTTP
409 handling. Reports do not attribute earlier observations to a later deployment.

The hosted checks cover draft isolation, universal scope, all five placements,
Notion rendering or explicit provider failure, visual reading reminders, private
uploads and byte ranges, role/access restrictions, stale confirmation rejection,
replacement/unpublish/delete revocation, worksheet delivery, subject feedback gates,
independent subject access, reordering and actual new-tab preview navigation.
Both synthetic uploaded objects were removed after testing and independently
verified absent. Private screenshots were inspected for placement
and ordering and remain outside Git.

The detailed [exit-gate checklist](../phase5-hosted-acceptance/EXIT-GATES.md) links
individual reports and distinguishes functional acceptance from cleanup.

## Recovery and additive migrations

The exact recovery envelope restored 85 existing application tables / 3,919 rows,
including the existing walkthrough. A checksummed PostgreSQL text payload preserves
numeric precision and scale that an ordinary dashboard JSON round trip can normalize.
The first stale-baseline activation attempt aborted safely. The regenerated packet
passed the exact recovery rehearsal and was applied in staging. Storage platform
recovery is not claimed; local tests use a synthetic Storage catalogue.

The applied Phase 5 migrations are:

- `20261103090000`: three private content tables and publishing functions.
- `20261103091000`: private content Storage bucket and access restrictions.
- `20261103100000`: read-only Admin workspace/preview compatibility repair.
- `20261103110000`: deterministic conflict responses using `PT409`.

The read-only repair preserves the locking authorization guard on write operations.
The conflict repair avoids the documented [PostgREST retry-loop behavior](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions)
for custom `40001` errors. The metadata diagnostic found no lingering requests; no
sessions were stopped. Hosted stale confirmation now returns HTTP 409.

Activation and repair receipts verify preserved rows, prior migration ledger and
function security metadata. Original Phase 1, 2 and 4 migrations were not reapplied
or edited. Existing course revisions and the walkthrough remain outside QA scope.

## Cleanup and handoff

The finalized `../phase5-hosted-acceptance/02-CLEANUP-FIXTURES.sql` packet removed
only the recorded two synthetic batches, seven purchases, eleven independent content
items, generated learning records and temporary QA enrollment. The operator receipt
confirms exact restoration of the 88-table baseline
`ac53ab317feeb1386221ee45fd623932`. All nine generated Auth identities were then
removed. Fourteen independent checks confirm Auth/profile/purchase/Storage absence
and the matching cleanup baseline. Existing libraries and the walkthrough remain
preserved.

Evidence commit `65220a7` contains identical application source to the tested
implementation. [GitHub Verify](https://github.com/theadmitco-tech/ace-club-lms/actions/runs/41637938828)
passed for that evidence commit. The final cleanup record changes documentation and
evidence only.

A separate Draft PR targets `intern/v2-phase-4-review`. A renewed creation attempt
returned GitHub integration 403; no Phase 5 PR exists. The prepared description is
`pr-description.md`, with title **Phase 5: independent content publishing and private
resources**. The [comparison page](https://github.com/theadmitco-tech/ace-club-lms/compare/intern/v2-phase-4-review...intern/v2-phase-5-review?expand=1)
supports manual Draft PR creation. Production release, PR readiness and merging
remain separate decisions.
