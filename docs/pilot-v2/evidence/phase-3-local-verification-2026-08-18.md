# Pilot V2 Phase 3 — Local Verification Evidence

Status: Historical local pass; Staging verification subsequently passed
Owner: Engineering
Last updated: 18 August 2026

## Authorized scope

The Product Owner authorized local Phase 3 implementation of flexible resource management on 18 August 2026. This record covers local files and non-mutating engineering checks only. No migration application, Staging data mutation, push, Preview, merge, deployment or Production action occurred.

## Implemented outcome

- Added whole-batch, Section, event and standalone resource associations without requiring a fake session.
- Added the controlled Starter Pack, Pre-read, Worksheet, Session Material, Recording, Post-class, Reference and Other categories.
- Added approved Notion, protected PDF, YouTube and short-text format validation.
- Added a dedicated Admin Resources destination backed by a server-authorized data-access layer and Server Actions.
- Added reusable-resource authoring to each of the four Course templates, including template/Section/event/standalone association, Notion Starter Packs and pre-reads, protected worksheet PDFs and short Starter Pack instructions.
- Retained Full Course Master Base as the underlying reusable source library for its linked pre-reads and worksheets; template-specific content no longer depends on a fake Master session.
- Added immutable resource content to template revisions, complete batch-creation preview, atomic/idempotent inheritance and reviewed stale-safe explicit sync for existing template batches.
- Added a signed, no-store protected PDF upload authorization route with event/batch ownership validation and failed/replaced-file cleanup.
- Preserved legacy event-linked generation/sync through compatibility classification on insert/update.
- Kept recordings and Session materials event-owned, non-reusable and isolated to one batch.
- Preserved database-owned pre-read, worksheet, recording and Session-material release timing.
- Released starter packs from the batch creation timestamp while retaining active publication, enrollment and RLS checks.
- Prevented update or withdrawal of released recordings and Session materials, including through the inherited Session resources RPCs.
- Preserved the inherited detailed Recommended Reading implementation and unchanged Recommended Practice logic.

## Additive migration

| Item | Value |
|---|---|
| File | `supabase/migrations/20260818113000_add_flexible_batch_resources.sql` |
| SHA-256 | `976e93fbd551ded352824915bfa2dc5e135b0846472c544e3b327f366e57f5b8` |
| Local state | Created and reviewed; later applied exactly to Staging |
| Staging ledger | Later applied; see Phase 3 Staging evidence |
| Production ledger | Unchanged |

The migration is additive: it retains existing material IDs and session relationships, backfills batch/category/scope/format compatibility fields, allows non-event resources through nullable `session_id`, adds indexes/constraints/RLS, and adds least-privilege Admin-only save/remove RPCs. It does not reuse, repair or apply any excluded migration.

## Automated and quality results

| Check | Result |
|---|---|
| `npm run test:templates` | Pass — 7/7 |
| `npm run test:batch-schedule` | Pass — 6/6 |
| `npm run test:flexible-resources` | Pass — 4/4 |
| `npm run test:recommendations` | Pass — 7/7 |
| `npm run test:session-materials` | Pass — 4/4 |
| Phase 3 touched-file ESLint | Pass — zero findings |
| `npx tsc --noEmit --incremental false` | Pass |
| `npm run build` | Pass — Next.js 16.2.4 Production build, `/admin/resources` and `/api/admin/resource-upload` included |
| `git diff --check` | Pass |
| Full `npm run lint` | Legacy baseline remains: 14 errors and 2 warnings, all outside Phase 3 touched files |

The five focused suites pass 28/28 checks. They emit the repository's existing Node typeless-package warning; this is not a test failure. No credential, private Student data, signed URL or private object path was added to evidence.

## Staging proof required at the time of this record

- exact isolated dry run and application of `20260818113000` only;
- schema, constraint, index, trigger, grant, function and RLS inspection;
- save and reload reusable resources on Full Course plus CR, RC and DI template revisions, including one protected worksheet upload;
- create a batch from the reviewed revision and prove every scoped resource is inherited once;
- review and apply explicit template-resource sync twice, proving no duplicates, stale-review denial, released-resource preservation and unmatched structural changes skipped;
- multiple starter packs without fake sessions;
- Section, event and standalone associations;
- Notion, protected PDF, YouTube and short-text lifecycles;
- published/enrolled and signed-out/unpublished/unenrolled/pre-release denial;
- released-resource preservation after rescheduling;
- two batches with different schedules proving recording and Session-material isolation;
- reusable pre-read/worksheet generation and explicit sync non-regression; and
- private-file cleanup and no-store delivery.

These checks required separate exact Product Owner authorization. They were subsequently completed and accepted; see the [Phase 3 Staging verification evidence](phase-3-staging-verification-2026-08-18.md). This local record alone does not claim acceptance.
