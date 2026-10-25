# V2 Phase 2 — Admin authoring and reviewed batch publication

Status: Active — isolated review candidate; staging and full phase acceptance pending
Owner: Engineering and product owner
Last updated: 25 October 2026

## Current correction

Phase 2 review is paused under the [course-model correction](../decisions/course-model-correction-2026-10-25.md). PR #24 remains Draft. The corrected candidate replaces compressed-course assumptions with complete Quant, Verbal, DI and Full Course offerings, private per-session content collections and optional live scheduling. The earlier candidate/check results below are historical until the corrected head is verified and published.

[Correction evidence](evidence/course-model-correction-2026-10-25.md) records the implementation and local checks.

## Current local follow-up

The [earlier source investigation](content-source-candidates.md) is superseded.
Complete current course content is the source required by the approved correction.
Exact source records and associations still require read-only inspection before
a separately authorized import; legacy short-format seeds are not substitutes.

The [content-mapping review](content-mapping.md) validates explicit source/target
proposals and prepares a fingerprinted scope report. It supports undated outline
targets with synthetic fixtures; it does not import or publish protected content.
The [mapping evidence](evidence/content-mapping-2026-10-25.md) records 176 passing
Phase 2 tests across 15 suite files for this local checkpoint.

The [content-preservation tooling](content-preservation.md) prepares a read-only
inventory of legacy content and an offline drift comparison. It is a local
prerequisite for reviewed mappings, not a content migration or hosted verification.
Its [verification record](evidence/content-preservation-2026-10-25.md) records
165 passing Phase 2 tests across 14 suite files on the local follow-up branch.

The [25 October implementation report](evidence/admin-completion-2026-10-25.md)
records recovered Admin drafts, protected publication retries, template event
reordering and shared worksheet recovery. That checkpoint passed 262 tests and 28 synthetic browser scenarios. The
enrolled-schedule follow-up passes 282 tests, 32 browser scenarios, lint,
TypeScript and the production build.
The corrected local candidate is integrated on `work/pr24-reconcile-2026-10-25`.
Its application/test tree matches the locally verified correction. The push was
blocked by missing Git credentials; no shared PR branch or hosted database was changed. The [enrolled-schedule follow-up](evidence/enrolled-schedules-2026-10-25.md)
implements the newly confirmed enrolled-batch-only rule. Full Phase 2 acceptance
still needs reviewed content mapping/delivery and separately approved staging QA.
The dated candidate information below describes the earlier submitted PR.

## Scope and sequencing

Branch: `intern/v2-phase-2-review`.
Dependency: Phase 1 [PR #23](https://github.com/theadmitco-tech/ace-club-lms/pull/23)
was squash-merged into `codex/v2-integration` at
`6447f5b5cae0b868de5f98d123c5af5b1c414bd6`.
PR #24 now targets that baseline at exact head
`c67cfe75e215913b20f663e0920c50897d2e1fe4`, remains Draft and has passing Verify
and LMS Preview checks. Four reconciliation conflicts were resolved without
changing Phase 2 application code or its five proposed migrations. The PR
description records 247 tests for that candidate; newer local work and its test
results remain separate. No Phase 2 merge or shared migration is authorized.

Start with the [delivery report](approved-delivery-report.md),
[combined staging handoff](review-and-release.md) and
[isolated verification evidence](evidence/isolated-review-2026-10-20.md).
The [decision register](../decisions/README.md) controls approved and pending scope.
Draft [PR #24](https://github.com/theadmitco-tech/ace-club-lms/pull/24) is recorded
in the [browser QA checkpoint](evidence/browser-qa-2026-10-20.md#submitted-review-status-and-next-action)
from supplied screenshots. The earlier
[branch publication record](evidence/branch-publication-2026-10-20.md) predates
PR creation. The separate flexible-mocks deployment remains failed.

Extracted from the preserved local branch `intern/v2-approved-phase-1-2` at
`208ceaa453049463322ff127842eec9814e6ea8a`. Later payment, content-route and deployment
changes remain outside this PR. The Phase 1 migration and entitlement code are
unchanged. Preserve earlier dated evidence as historical results, not current acceptance.

## Implemented behavior

- Private templates for Full Course and Quant, Verbal and DI standalone products.
- Independent batch drafts pinned to a template revision; undated outlines and
  blank non-live placeholders; exact live dates/times in `Asia/Kolkata`.
- Immutable revisions, stale-edit rejection, idempotent retry recovery and
  navigation warnings for unsaved work.
- Explicit scope preview and confirmation for batch publish, unpublish and
  republish. Editing a draft leaves the published snapshot unchanged.
- Private Google Meet drafts for live items; publication excludes meeting links.
- Eight-registration metadata for live offerings. No capacity allocator or
  per-session reservation workflow.

Routes: `/admin/v2/templates`, `/admin/v2/batches` and
`/admin/v2/batches/[batchId]/meeting`.
Both server-only authoring flags remain off by default and disabled on Vercel
Production. The server and database independently require an active Admin.
Students cannot read private drafts or publication history. The new guarded
schedule reader exposes only eligible enrolled batches’ latest published snapshots. Flags govern
application routes, not database RPC privileges after migration.

## Local verification

The isolated candidate passes **229 tests in 21 files**: 102 Phase 1/legacy tests
and 127 Phase 2 tests. Lint, TypeScript and production build also pass. See the
[evidence](evidence/isolated-review-2026-10-20.md) for commands, changed files and limits.

Local follow-up branch `intern/v2-phase-2-browser-qa` contains navigation,
responsive-layout and mobile-menu fixes at `171efd2`. All 229 regression tests
and 13 isolated browser scenarios pass. See the
[browser evidence and screenshots](evidence/browser-qa-2026-10-20.md).
These fixes are committed locally and have not been added to PR #24.
Synthetic browser results do not replace staging acceptance.

## Remaining work

- [x] Isolate the Phase 2 diff on the latest Phase 1 dependency.
- [x] Verify Admin authoring, privacy, retries, concurrency and legacy regressions locally.
- [x] Publish separate draft PR #24; record the supplied check/deployment evidence.
- [x] Exercise the Admin UI locally with synthetic browser fixtures and record fixes.
- [ ] Review/publish the local QA fixes and verify the resulting exact-candidate CI/Preview.
- [ ] Inspect staging schema and ledger; obtain separate migration/setup approval.
- [ ] Verify Admin workflows, negative access, mobile and keyboard behavior in staging.
- [x] Resolve Student batch eligibility and implement the authorized schedule reader locally.
- [x] Prepare local content-preservation inventory and comparison tooling.
- [x] Validate explicit mapping proposals and prepare exact revision/scope reviews locally.
- [ ] Implement reviewed content associations and protected recording-only delivery.
- [ ] Resolve Full Course registration allocation and enforce course capacity with Phase 3.
- [ ] Obtain acceptance against every Phase 2 roadmap exit gate.

This is a reviewable Admin foundation, not complete Phase 2 delivery. Universal
content publishing and preservation-first content migration remain separate work.
Historical design and browser steps remain in the [preparation checklist](preparation-checklist.md).
