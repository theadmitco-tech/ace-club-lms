# Phase 2 implementation and activation

Status: staging schema activation and the approved material import are confirmed
by operator-provided SQL Editor results. Publication, authenticated hosted
acceptance and exact QA cleanup remain pending. Phase 1 is complete.
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

The [staging reconciliation](staging-reconciliation-result.json) confirms all ten
migration bodies, final routine guards, eighteen private tables and preservation
of all sixty original application tables. The
[material import result](staging-material-import.json) confirms 19 assets and 33
placements across four unpublished templates. Both files are labeled summaries
of operator-provided results. Hosted website acceptance remains separate.

The following table maps implementation and local evidence to each exit gate;
these entries do not alone close a hosted product gate.

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
- [SQL packet verification](sql-editor/local-verification.json) records isolated
  transaction, preservation, privilege and reconciliation checks. The report
  identifies the execution time and synthetic local scope.
- The approved 19-asset import passed a private local source-snapshot rehearsal
  and retry check. The later operator-provided import result confirms the staging
  import separately; neither result proves browser rendering.

## Completed staging work and remaining acceptance

The [SQL Editor runbook](STAGING-SQL-EDITOR.md) records the completed activation
and read-only reconciliation. The ten migrations are applied and must not be
replayed. The original Phase 1 migration remains excluded and retains its
recorded SHA256.

The preserved [application recovery report](application-recovery-report.json)
records the earlier private local restore rehearsal: 60 tables, 3,781 rows and the
original ledger matched. Auth credentials, Storage object bytes, Vault secrets
and platform configuration were excluded; no fresh full-platform recovery claim
is made. That preserved report is not a newly repeated rehearsal.

The approved source content is imported into four unpublished templates. The
next steps are exact four-offering publication review, an updated branch-only
Preview deployment, authenticated Student/Admin acceptance, protected PDF and
Notion rendering checks, and exact fixture cleanup. The ten Notion references
point to two distinct original pages; live source accessibility and content
completeness remain explicit acceptance checks.

The temporary checkout and private QA files were unavailable when work resumed.
The pushed source and saved handoff files were restored into an isolated
persistent worktree. Existing staging QA identities and publication state require
reconciliation before any fixture or account creation is repeated. Credentials
and private source references remain outside version control.

No payment is taken, no Production variable is changed, and no PR merge/readiness
change is included. All completion claims require recorded hosted evidence.
