# Phase 2 — Full Course and individual offering publishing

Updated 28 October 2026. Local implementation and verification are tracked in
[the current completion report](evidence/completion-2026-10-28.md).
PR #24 remains Draft; shared migrations and hosted acceptance remain pending.

## Scope

Admins can author complete Full Course, Quant, Verbal and DI offerings, preserve
ordered sessions and their materials/recordings/pre-reads/post-reads, and create
independent batch drafts. Only actual live classes require exact scheduling.
Whole-course publication has explicit review, immutable revisions, stale-edit
protection, unpublish and republish. Private Meet details remain Admin-only.
Students see published schedules only for their eligible enrolled batches.

The eight-student live registration limit is published metadata here. Paid seat
allocation/enforcement belongs to Phase 3; the schedule-membership editor is not
that allocator. Protected Student content delivery belongs to Phase 4; shared
asset management and independent/universal item publication belong to Phase 5.
These features are not silently counted as complete Phase 2 behavior.

## Current review state

GitHub was checked on 28 October: PR #24 is open and Draft at
`334ea029f9094093929610429e06a4c07259f942`, based on `codex/v2-integration` at
`6447f5b5cae0b868de5f98d123c5af5b1c414bd6`. The local follow-ups are on
`work/phase2-delivery-2026-10-28`, starting from `19d20a7`.
The hosted Preview for the older PR head does not verify these local changes.

Current local additions include the separate Phase 1 canonical-contract proposal,
offline content-transfer dry run, and draft reading previews using the Student
renderer. The applied Phase 1 migration remains unchanged. There are six proposed
Phase 2 migrations; none has been applied to a shared environment.

## Review package

Wireframes are a separate design deliverable and are excluded from PR #24.
They are not Phase 2 application functionality or part of its acceptance evidence.

- [Completion and gate evidence](evidence/completion-2026-10-28.md)
- [Independent code review](evidence/review-2026-10-28.md)
- [Current release and staging handoff](review-and-release.md)
- [Phase 1 stored-contract proposal and rollback](../phase-1/proposals/README.md)
- [Content-transfer plan](content-transfer-plan.md) and [offline dry run](content-transfer-dry-run.md)
- [Draft reading preview and limitations](reading-preview.md)

Earlier dated evidence remains a historical record. Use the current completion
report for this candidate's checks rather than combining test counts from older
commits. Full Phase 2 acceptance requires the separately authorized staging review.
