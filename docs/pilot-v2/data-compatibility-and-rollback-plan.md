# Pilot V2 — Data, Compatibility and Rollback Plan

Status: Phase 2 technical Staging matrix passed; Product Owner acceptance pending; Production unauthorized
Owner: Engineering and QA/Security
Last updated: 17 August 2026

## Decision

Use an additive, versioned template model and preserve every existing batch as an immutable structural snapshot. Do not retrofit a template identity into a running Production batch automatically. Do not reuse or repair the excluded weekly migration.

## Proposed additive model

Final names remain subject to migration review, but the approved concepts require:

| Concept | Proposed responsibility |
|---|---|
| `course_templates` | Four stable template identities, course mode and current revision |
| `course_template_revisions` | Immutable saved revision used for previews and later batch provenance |
| `course_template_sections` | Ordered Section definitions within one revision |
| `course_template_events` | Title, event type, Section, relative day/order, time, duration, instructor, venue, reporting/instructions and publication default |
| `course_template_resources` | Reusable starter/pre-read/worksheet associations at template, Section or event scope; never recordings or Session materials |
| Compatibility columns on `courses` | Optional source template/revision, creation idempotency key, schedule revision and course mode |
| Compatibility columns on `sessions` | Separate event type and Section, stable display order, venue/reporting/instructions, cancellation state and optional source template event |
| Compatibility columns on `materials` | Batch identity, controlled category, scope, optional Section/event and optional source template resource |

All new exposed tables require RLS before application use. Foreign keys and authorization-filter columns require indexes. Controlled values use text checks so additions remain reviewable. Timestamps remain `timestamptz`; template start times are local `time` values interpreted only with canonical `Asia/Kolkata` generation.

## Compatibility rules

1. Existing `master_sessions`/`master_materials` remain readable and unchanged during transition.
2. Existing `courses`, `sessions`, `materials`, enrollments and tracker rows retain their IDs and relationships.
3. Existing batches receive no automatic template revision or structural sync.
4. Existing session-linked materials continue to work while new projections understand wider resource scopes.
5. `session_number` remains populated for legacy consumers until every dependent RPC/page is migrated and verified.
6. `class_type` remains readable during transition; new code uses separate event type and academic Section rather than overloading it.
7. Reusable template edits never update a created batch.
8. Explicit reusable-resource sync may update only approved starter/pre-read/worksheet snapshots.
9. Recordings and Session materials require one batch event, have no reusable origin and never copy/sync.
10. Released material is never made unavailable by rescheduling.
11. Tracker rows stay attached to the same Student, batch, event, worksheet and Master question.

## Generation and mutation transactions

- Preview performs no write and is tied to an immutable template revision.
- Confirmation uses one Admin-authorized transaction with a unique idempotency key.
- The database rejects retry duplication and partial schedule/material creation.
- Schedule updates carry an expected schedule revision to reject stale confirmations.
- Affected events are locked in stable ID/order before mutation.
- Eligibility, current/completed protection and already-released preservation are recalculated inside the transaction.
- Before/after consequences returned to the UI contain only the approved event/resource fields.

## Proposed migration sequence

The Product Owner approved this sequence for local Phase 1 implementation on 17 August 2026, then separately authorized exact Staging-only application of `20260817090845_add_versioned_course_templates.sql`. That application passed. Production application remains unauthorized.

Phase 2 subsequently applied `20260817143000_add_batch_schedule_builder.sql`, `20260817170000_fix_batch_event_reorder.sql` and `20260817233540_fix_phase2_conflicts_and_shift_materials.sql` to Staging only. The final authenticated probe and UI-state retest pass, including non-retryable stale conflicts and post-shift unreleased-material synchronization. Production remains unchanged and unauthorized.

1. Add template/revision/Section/event/resource tables, constraints, indexes and RLS.
2. Add nullable compatibility columns and indexes to existing batch tables.
3. Add Admin-only preview/read and atomic confirm/mutation functions with least-privilege grants.
4. Seed stable identities for the four approved templates after exact rows are approved.
5. Backfill only safe derived compatibility fields needed by current staging fixtures; do not assign existing batches to a template.
6. Verify constraints and functions on staging, then run security/performance advisors.
7. Switch application reads/writes in focused phases; no destructive cleanup.

## Ledger reconciliation constraint

Staging and Production have identical recorded ledgers but different generator definitions and schedule data. The excluded tracker/Admin migrations also have live schema objects without ledger entries. Therefore:

- never run `supabase db push --include-all`;
- never repair an excluded version;
- isolate any later V2 migration so the dry run lists only exact newly approved versions;
- compare live object definitions before and after staging application; and
- require a separate Production plan naming every version.

## Rollback

### Before application cutover

New tables/columns remain unused by the current application. Roll back the application with no data operation. Do not drop the additive schema merely to roll back code.

### After template/Admin cutover

Revert to the prior application commit. Preserve template rows for diagnosis. Disable new mutation entry points through application routing/grants only through an approved rollback action.

### After new-batch creation

Do not delete a created batch automatically. Mark the failed staging fixture inactive only through an approved cleanup procedure after reference counts. Production fixtures are forbidden without explicit authorization.

### Existing batches

No rollback data action is expected because they are not structurally migrated. Compare their session/material/tracker aggregates before and after every staging phase.

### Released resources

Never roll back by withdrawing already-released material. Revert presentation/mutation code while retaining access under existing authorization and release rules.

## Required staging evidence

- exact migration ledger before/after;
- schema, constraints, indexes, functions, triggers, grants and RLS;
- four template seed counts and stable keys;
- idempotent creation retry;
- two batches with different schedules and isolated batch-owned resources;
- existing-batch aggregate comparison;
- tracker relationship and ownership comparison;
- zero unauthorized or cross-batch access; and
- zero fixture residue after any approved rollback-only probe.
