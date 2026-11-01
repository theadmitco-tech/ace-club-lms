# Phase 2 implementation and activation

Status: implementation and local verification prepared; staging activation,
actual material import and hosted acceptance remain pending. Phase 1 is complete.
PR #24 remains Draft and Production remains excluded from this work.

## Website changes

The existing LMS includes course configuration for Full Course, Quant, Verbal and
DI, an IST batch calendar, and the shared four-stage session display: pre-class
read, recording, post-class read and worksheet. Full Course retains a separate
Programme section for starter resources, breaks and non-subject outline items.

Admin publication supports a single batch or a server-derived multi-offering
scope. Confirmation pins draft, publication and private meeting revisions;
stale reviews fail without partial publication. Retries recover the original
submission. Draft changes remain separate from published content.

Students receive only published, pinned course content with current entitlement
and enrollment checks. Private meetings additionally require explicit live
registration. Private PDF delivery derives the storage path from an authorized
published item. Class completion is separately audited and does not record
attendance, submit feedback, publish recordings or charge a payment. Manual live
registration is identified as manual; payment fulfillment remains a later phase.

Admin material management supports reviewed additive import, immutable shared
assets, scoped replacement and guarded recovery. Approved content mapping covers
19 source assets and 33 placements across the four offerings. Import itself does
not publish anything. The exact private source packet remains outside Git.

## Exit-gate evidence map

All hosted results remain pending. The following table records implementation and
local evidence without treating either as hosted product acceptance.

| Gate | Implementation and local evidence |
|---|---|
| P2-01 | Four-offering template/batch authoring; existing authoring and database suites |
| P2-02 | Approved source mapping; additive importer; actual-source local rehearsal |
| P2-03 | Independent headings and four content collections; shared ordered renderer |
| P2-04 | Shared immutable assets, scoped replacement, collision/replay tests |
| P2-05 | IST calendar and live-only schedule validation; browser keyboard/date checks |
| P2-06 | Undated academic/Programme content; no synthetic live dates during import |
| P2-07 | Outline and session projection within the same publication revision |
| P2-08 | Revision guards, immutable history, unpublish/republish, recovery/replay tests |
| P2-09 | Atomic multi-offering scope with exact server review and rollback tests |
| P2-10 | Independent exact reading titles in the shared preview/delivery renderer |
| P2-11 | Shared full-session preview, deferred reading/video, protected PDF endpoints |
| P2-12 | Reviewed source hashes, additive import, exact replay and guarded recovery |
| P2-13 | Published meeting snapshots; explicit registration and current access checks |
| P2-14 | Authorized one-way class completion with immutable actor/time evidence |
| P2-15 | Separate publication, registration, completion and content transitions |
| P2-16 | Phase 1/legacy regression suites; all pre-existing rows protected by migration packet |
| P2-17 | RLS, direct-write denial, role checks and course-bound reading/file delivery |

## Verification

- All 18 Phase 1 regression suites passed: 173 checks.
- All 25 Phase 2 suites passed: 268 checks, including hosted-fixture setup/cleanup.
- ESLint with zero warnings, TypeScript and the local webpack build passed.
- [UI evidence](ui-verification/README.md): 42 integrated browser cases and a
  focused visual-polish check. Browser authentication and data are synthetic.
- [SQL packet verification](sql-editor/local-verification.json): ten isolated
  transaction, preservation and privilege checks.
- The approved 19-asset import passed a private local source-snapshot rehearsal
  and retry check. That rehearsal is not a staging backup or a hosted import.

## Required activation work

The [SQL Editor runbook](STAGING-SQL-EDITOR.md) contains the ten-migration packet.
The original Phase 1 migration is excluded and retains its recorded SHA256.
A fresh [application recovery export](00-EXPORT-APPLICATION-RECOVERY.sql) is
prepared for a private local restore rehearsal. It excludes Auth credentials,
Storage object bytes and platform configuration; no full-platform recovery claim
is made. The existing older archive is not treated as a fresh backup.

After metadata and recovery verification, staging application and postflight
precede the three review-branch-only Preview flags. Dedicated QA fixtures then
exercise authenticated website/API flows and exact cleanup. The real import
requires an explicitly selected active Admin identity and a separate publication
review. The supplied source content includes ten Notion references pointing to
two distinct pages; exact live rendering and source completeness remain separate
acceptance checks.

No payment is taken, no Production variable is changed, and no PR merge/readiness
change is included. All completion claims require recorded hosted evidence.
