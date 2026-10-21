# V2 Phases 1 and 2 — Coordinated staging handoff

Status: Active — separate review candidates; hosted setup and acceptance pending
Owner: Engineering and product owner
Last updated: 21 October 2026

The [read-only staging review](../review/staging-database-inspection-2026-10-21.md)
records checksums from both submitted PR heads, exact deployment URLs, CI evidence,
migration order and the proposed recovery plan. Actual staging ledger and schema
inspection remain blocked by unavailable database access. Both PRs were confirmed
Draft and unmerged on 21 October. Phase 1 application needs separate approval;
Phase 2 needs separate approval after Phase 1 staging verification passes.

## Separate review candidates

| Phase | Branch and base | Review scope |
|---|---|---|
| 1 | `intern/v2-onboarding` at `d3020c1`; base `codex/v2-integration` | Catalogue, prices, grants, six-month expiry; draft [PR #23](https://github.com/theadmitco-tech/ace-club-lms/pull/23) |
| 2 | `intern/v2-phase-2-review`; base `intern/v2-onboarding` at `d3020c1` | Admin templates, independent schedules, private Meet drafts and reviewed batch publication; draft [PR #24](https://github.com/theadmitco-tech/ace-club-lms/pull/24) |

Phase 2 application commit: `26ec141561a0749dba371409273c1f1ee9906049`.
Submitted review head: `c8978a107dc209de4eff6e03b1a2773442b44d49`, confirmed
through GitHub metadata on 21 October 2026. Use the exact candidate head for CI and Preview
evidence; an older deployment does not verify a newer diff.
The preserved combined source branch is not a publication target.

Local follow-up `intern/v2-phase-2-browser-qa` at `171efd2` fixes draft-navigation
warnings, long-title mobile overflow and mobile-menu keyboard behavior. It passes
13 synthetic browser scenarios and all 229 regression tests. The
[browser report](evidence/browser-qa-2026-10-20.md) includes screenshots and limits.
These fixes are not yet in PR #24. Review them before publishing a new candidate,
then update the exact commit used for hosted checks. No staging gate is satisfied
by the synthetic browser fixture alone.

The [Phase 1 completion report](../phase-1/completion-report.md) and
[Phase 2 delivery report](approved-delivery-report.md) define separate acceptance
boundaries. Six-month access denial is confirmed. Student batch eligibility,
registration allocation, content associations and hosted release decisions
remain unresolved. This handoff does not mark either phase accepted.

## Review and staging sequence

1. Review the Phase 1 PR, then the Phase 2-only diff against it. Confirm the
   accepted application lineage before any integration merge or shared migration.
2. Verify passing CI and an LMS Preview built from each exact candidate.
   Resolve the separate flexible-mocks deployment failure or document its
   assessed impact; do not treat an unrelated failed deployment as green.
3. Confirm the Preview backend is the separate staging project. Keep authoring
   flags off initially. Preview access and website Admin access do not grant
   database-administration privileges.
4. Run the read-only inspection below and reconcile actual definitions and ledger.
   Prepare a recoverable staging backup and reviewed recovery procedure.
5. Obtain explicit approval for the specific staging setup. Apply only reviewed
   missing Phase 1 SQL, then run the Phase 1 checks. Stop on failures or drift.
6. After Phase 1 staging verification, apply only the approved missing Phase 2
   migrations in the order below. Reinspect definitions, RLS and privileges.
7. With separate setup approval, enable the two authoring flags on the Phase 2
   Preview only. Run the Admin and negative-access checks below using synthetic
   records. Keep Production and existing student/course records unchanged.
8. Record sanitized results and obtain acceptance separately for each phase.
   After Phase 1 integration, reconcile/retarget the Phase 2 PR to
   `codex/v2-integration` and rerun checks. No auto-merge or push to main.

Applying the SQL does not complete Phase 2: the Student schedule reader and
protected recording/material delivery remain absent. No public registration
catalogue, new checkout or course-capacity allocator is enabled by these PRs.

## Staging inspection before any write

The earlier catalogue check returned HTTP 404 / `PGRST205`. Its cause remains
unverified. The supplied decision source reports ledger version `20260925100000`;
that statement is not a fresh database inspection.

For Phase 1, run [the Phase 1 preflight](../../../scripts/v2-phase-1-schema-preflight.sql).
For the combined schema, run [the Phase 1/2 preflight](../../../scripts/v2-schema-preflight.sql).
Both scripts use read-only transactions, short timeouts and rollback. The combined
script reports ten tables and fourteen public RPCs without reading student,
purchase, meeting or draft rows. Missing objects are reported without repair.

Verify the project identity outside SQL. Inspect actual schema/function/policy
definitions separately; object presence does not prove migration equivalence or
API schema-cache health. If the ledger exists and access permits, inspect only
relevant version identifiers:

```sql
begin read only;
set local statement_timeout = '5s';
select version
from supabase_migrations.schema_migrations
where version in (
  '20261018090000', '20261019090000', '20261019100000', '20261019110000',
  '20261020090000', '20261020100000'
)
order by version;
rollback;
```

Do not export stored migration statements or private rows. Objects without
matching ledger entries require reconciliation, not blind replay or ledger repair.

## Proposed migration order

| Phase/order | File | Dependency |
|---|---|---|
| 1/1 | [20261018090000_add_v2_product_entitlements.sql](../../../supabase/migrations/20261018090000_add_v2_product_entitlements.sql) | Verified legacy profiles/auth/Admin contracts |
| 2/1 | [20261019090000_add_v2_template_drafts.sql](../../../supabase/migrations/20261019090000_add_v2_template_drafts.sql) | Phase 1 products |
| 2/2 | [20261019100000_add_v2_batch_drafts.sql](../../../supabase/migrations/20261019100000_add_v2_batch_drafts.sql) | Template drafts |
| 2/3 | [20261019110000_add_v2_private_meeting_drafts.sql](../../../supabase/migrations/20261019110000_add_v2_private_meeting_drafts.sql) | Batch drafts |
| 2/4 | [20261020090000_add_v2_outline_schedules.sql](../../../supabase/migrations/20261020090000_add_v2_outline_schedules.sql) | Template, batch and meeting contracts |
| 2/5 | [20261020100000_add_v2_batch_publication.sql](../../../supabase/migrations/20261020100000_add_v2_batch_publication.sql) | Outline/live schedule contracts |

Use the [candidate checksums](evidence/isolated-review-2026-10-20.md#migration-checksums).
Do not replay the historical migration directory. A Git push or Vercel deployment
does not apply these SQL files. No hosted migration has been performed by this task.

## Preview verification

Flags: `V2_TEMPLATE_AUTHORING_ENABLED=true` and `V2_BATCH_AUTHORING_ENABLED=true`.
Both default off and are disabled on Vercel Production. Enable only after the
approved staging setup. Flags do not revoke allowed database RPC privileges.

- Phase 1: follow the [manual checklist](../phase-1/manual-verification-checklist.md)
  for product/price checks, grants, ownership, section isolation, expiry and legacy
  access. Confirm the new Preview identity before adapting the old browser probe.
- Phase 2 Admin: visit `/admin/v2/templates`; prepare one synthetic template for
  each product, including live, undated and empty outlines. Save, reload and edit.
- At `/admin/v2/batches`, create independent batches. Verify exact IST dates and
  template revision binding. Preview the scope before confirming publication.
- Verify edits leave the published snapshot unchanged; exercise unpublish,
  republish, stale confirmations, interrupted retries and concurrent editors.
- At `/admin/v2/batches/[batchId]/meeting`, check private live-only Meet drafts;
  verify no links appear in publication projections or Student responses.
- With signed-out, inactive and two distinct Student identities, verify denial
  of Admin routes/RPCs/private rows. Existing designated test enrollments retain
  their legacy journeys with authoring flags off and on.
- Check keyboard/mobile/desktop forms, loading/errors, unsaved navigation and
  sign-out. Browser Back/Forward remains outside the custom navigation guard.
- Capture sanitized screenshots or recordings for the new Admin UI. Record exact
  candidate, schema versions, synthetic fixture IDs, expected/actual outcomes
  and unresolved failures. Exclude credentials and private student data.

The [Phase 2 checklist](preparation-checklist.md#acceptance-and-test-checklist)
contains the wider exit criteria; unimplemented Student delivery stays unchecked.

## Recovery and next decisions

On setup failure, keep authoring flags off and inspect the exact failed step.
Preserve additive draft/publication history; do not drop tables or restore an
entire shared database as a routine application rollback. Use the reviewed
recovery plan if database restoration is required. No existing course-content
migration is part of this setup.

Next product decision: all eligible published batches versus one assigned batch
per purchased product. Also review content mappings and Full Course registration
allocation. Shared migration approval and the accepted release baseline remain
separate operational decisions. Keep draft status until the applicable gates pass.
