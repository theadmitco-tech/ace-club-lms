# V2 Phase 2 — Admin authoring and reviewed batch publication

Status: Active — isolated review candidate; staging and full phase acceptance pending
Owner: Engineering and product owner
Last updated: 20 October 2026

## Scope and sequencing

Branch: `intern/v2-phase-2-review`.
Dependency: Phase 1 draft [PR #23](https://github.com/theadmitco-tech/ace-club-lms/pull/23),
`intern/v2-onboarding` at `d3020c1c9916c17f6ced27f83ff9ee1be05479f2`.
Application commit: `26ec141561a0749dba371409273c1f1ee9906049`.
Target the Phase 1 task branch initially so the Phase 2 PR shows only its own diff.
After Phase 1 acceptance and integration, reconcile the base and rerun checks.
No integration or main merge is authorized.

Start with the [delivery report](approved-delivery-report.md),
[combined staging handoff](review-and-release.md) and
[isolated verification evidence](evidence/isolated-review-2026-10-20.md).
The [decision register](../decisions/README.md) controls approved and pending scope.

Extracted from the preserved local branch `intern/v2-approved-phase-1-2` at
`208ceaa453049463322ff127842eec9814e6ea8a`. Later payment, content-route and deployment
changes remain outside this PR. The Phase 1 migration and entitlement code are
unchanged. Preserve earlier dated evidence as historical results, not current acceptance.

## Implemented behavior

- Private templates for Full Batch and Quant, Verbal and DI standalone products.
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
Students cannot read these private drafts or publication snapshots. Flags govern
application routes, not database RPC privileges after migration.

## Local verification

The isolated candidate passes **229 tests in 21 files**: 102 Phase 1/legacy tests
and 127 Phase 2 tests. Lint, TypeScript and production build also pass. See the
[evidence](evidence/isolated-review-2026-10-20.md) for commands, changed files and limits.

## Remaining work

- [x] Isolate the Phase 2 diff on the latest Phase 1 dependency.
- [x] Verify Admin authoring, privacy, retries, concurrency and legacy regressions locally.
- [ ] Publish a separate draft PR and record exact-candidate hosted checks/Preview.
- [ ] Inspect staging schema and ledger; obtain separate migration/setup approval.
- [ ] Verify Admin workflows, negative access, mobile and keyboard behavior in staging.
- [ ] Resolve Student batch eligibility and implement the authorized schedule reader.
- [ ] Implement reviewed content associations and protected recording-only delivery.
- [ ] Resolve Full Course registration allocation and enforce course capacity with Phase 3.
- [ ] Obtain acceptance against every Phase 2 roadmap exit gate.

This is a reviewable Admin foundation, not complete Phase 2 delivery. Universal
content publishing and preservation-first content migration remain separate work.
Historical design and browser steps remain in the [preparation checklist](preparation-checklist.md).
