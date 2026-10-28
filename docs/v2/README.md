# Ace Club LMS V2 — Delivery index

Status: Active
Owner: Product owner and Engineering
Last updated: 25 October 2026

V2 is separate from the older MVP/Pilot V2 initiative. Preserve signed historical
evidence and existing Student access while developing the new product model.

## Current work

This branch contains the **Phase 2 Admin foundation**, reconciled with the
squash-merged Phase 1 baseline on `codex/v2-integration` at
`6447f5b5cae0b868de5f98d123c5af5b1c414bd6` (PR #23).

Review branch: `intern/v2-phase-2-review`, Draft PR #24. Review is paused for the
[25 October course-model correction](decisions/course-model-correction-2026-10-25.md).
Start with the [correction evidence](phase-2/evidence/course-model-correction-2026-10-25.md)
and [Phase 2 implementation status](phase-2/README.md).

The corrected local candidate contains complete Quant, Verbal and DI offering
structures plus Full Course, optional live scheduling, private session content,
Admin recovery, enrolled-batch schedules and offline content-preservation/mapping
tools. Protected Student content publishing remains incomplete. The previous
reconciliation at `c67cfe7` is historical evidence; its green Preview does not
validate the correction. The earlier correction at `0f71843` is on PR #24. The supplemental
[Admin checklist alignment](phase-2/evidence/owner-checklist-alignment-2026-10-25.md)
requires its own updated Preview verification. Use the final handoff for the exact candidate and
its own CI/Preview status.

Phase 1 staging migration is complete and must not be rerun. Phase 2 migrations,
hosted acceptance and Production changes are not authorized by reconciliation.
The [Phase 1 report](phase-1/completion-report.md) retains the dependency's history.

## Requirements and decisions

The [decision register](decisions/README.md) preserves the supplied approval
record, source checksums and delivery/reporting requirements. Approved rows
supersede conflicting older plans; Pending and Deferred items remain gated.
The subsequent [expiry confirmation](decisions/phase-1-expiry-confirmation-2026-10-20.md)
confirms that access is denied after six months while purchase history remains.

The [original product decisions](review/product-and-business-decisions.md),
[acceptance criteria](review/acceptance-criteria.md) and
[roadmap](review/product-roadmap.md) remain references for non-conflicting scope.
Phase 2 batch selection and Phase 3 upgrade/payment decisions are separate from
Phase 1 acceptance. No database migration, Production operation or modification
of existing student/course records is authorized by this index.
