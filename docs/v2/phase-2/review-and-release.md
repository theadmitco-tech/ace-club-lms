# Phase 2 review and staging handoff — 28 October 2026

**Keep PR #24 Draft. Do not apply shared migrations, merge or change Production.**
This replaces the older operational sequence; dated evidence remains preserved.

## Candidate

GitHub metadata checked 28 October confirms PR #24 is open/Draft, head
`334ea029f9094093929610429e06a4c07259f942`, base `codex/v2-integration` at
`6447f5b5cae0b868de5f98d123c5af5b1c414bd6` (merged Phase 1).
Local completion work is on `work/phase2-delivery-2026-10-28`, starting at
`19d20a7`. See [the completion report](evidence/completion-2026-10-28.md) for the
reviewable local result and verification; the older Preview is not current-head
acceptance.

Phase 1 staging application is complete. Its applied migration must not be edited
or rerun. The [canonical-contract proposal](../phase-1/proposals/README.md) is
separate, outside the deployment queue and unapplied. It preserves historical
ledger identifiers through a compatibility layer. Review that proposal before
resuming the paused Phase 2 shared setup.

## Proposed Phase 2 migration sequence

These files are for review only, in dependency order. Do not execute the entire
migration directory or automatically include the Phase 1 proposal.

1. `20261019090000_add_v2_template_drafts.sql`
2. `20261019100000_add_v2_batch_drafts.sql`
3. `20261019110000_add_v2_private_meeting_drafts.sql`
4. `20261020090000_add_v2_outline_schedules.sql`
5. `20261020100000_add_v2_batch_publication.sql`
6. `20261025100000_add_v2_enrolled_schedules.sql`

Before any separately authorized application, verify the staging project identity,
exact candidate/checksums, private backup and restore/recovery plan, migration
ledger and actual definitions/privileges. The read-only
[schema preflight](../../../scripts/v2-schema-preflight.sql) reports missing
objects; it does not repair them or prove definition equivalence. Stop on drift.
No existing content import or legacy Student migration is part of this sequence.

## Hosted checks after setup is separately authorized

Flags default off and are disabled on Vercel Production:

- `V2_TEMPLATE_AUTHORING_ENABLED`
- `V2_BATCH_AUTHORING_ENABLED`
- `V2_STUDENT_SCHEDULE_ENABLED`

Application flags do not revoke database RPC permissions. Verify both layers.

1. Verify CI and LMS Preview against the exact uploaded head, and verify that
   Preview uses staging. Keep the unrelated Flexible Mocks failure documented
   separately; do not relabel that check as passed.
2. Create synthetic examples for Full Course and each individual offering.
   Save/reopen ordered course sessions and all four content types without live
   dates, then add optional live events with independent schedules/instructors.
3. Preview and publish. Edit a draft and confirm that the published revision stays
   unchanged until a new review is confirmed. Exercise stale edits, interrupted
   retries, concurrent editors, unpublish and republish.
4. Verify private Meet details stay out of schedule projections and Student reads.
   Check signed-out/inactive/Student denial of Admin routes, RPCs and private rows.
5. Use two synthetic Students to verify that schedules require both entitlement
   and enrollment. Unpublishing, removing enrollment, revocation, expiry or account
   deactivation must remove access on the next read.
6. Test reading preview with representative real public Notion pages, keyboard and
   mobile layouts. Preview must not save progress, submit feedback or publish.
7. Record exact head, schema versions, outcomes and sanitized evidence. Obtain
   staging acceptance separately; no merge or Production release is implied.

The schedule-membership editor does not enforce the eight paid live seats. That
allocator remains Phase 3 work. Private Meet authoring does not implement the
future eligible-live-student join flow. Protected content delivery, real content
imports, shared recording lifecycle and universal item publication remain tracked
in their respective later-phase plans.

## Recovery

Keep feature flags off if setup or verification fails. Preserve additive history;
do not drop tables, erase purchases, rewrite enrollments or restore the entire
shared database as a routine UI rollback. Use the exact reviewed recovery plan.
Synthetic local tests and wireframes do not establish hosted acceptance.
