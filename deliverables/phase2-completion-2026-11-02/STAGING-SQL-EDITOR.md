# Phase 2 staging SQL Editor packet

Status: all ten migrations are installed, and the approved 19-asset import is
confirmed. Operator-provided reconciliation reports exact ledger/routine matches
and preservation of all sixty original application tables. Hosted website
acceptance, fixture cleanup and account closeout have passed. No further SQL
Editor execution is required for Phase 2. Activation and fixture files are
historical execution records and must not be rerun against this staging installation.

The sole target is staging project `eyphkkginlgoaxflauog`. Production configuration
and PR #24 Draft status remain unchanged. Supabase SQL Editor access is sufficient
for the operator steps; no database password is required by this packet.

The [operator activation copy](RUN-ACTIVATION.sql) now contains the verified staging
identifier and a reference to the [application recovery report](application-recovery-report.json).
The generic SQL packet retains its placeholders. The operator copy preserves every
source body and guard; [copy verification](operator-copy-verification.json) records
both hashes and the limited acknowledgement changes.

The fresh snapshot rehearsal restored 60 public tables and 3,781 rows, verified
all seven reported schema categories and the migration ledger, and validated
foreign keys. It did not recover Auth credentials, platform configuration,
Storage object bytes or Vault secrets. Those limits remain explicit in the report.
The snapshot omitted view SQL and sequence state: the activation transaction
therefore requires exactly the two recovered ordinary public view definitions,
matching their archive-reference hashes, and zero public sequences. The later
operator-provided reconciliation confirms the expected view hashes
and absence of public sequences in staging.

## Current staging status

[Reconciliation summary](staging-reconciliation-result.json) and
[material import summary](staging-material-import.json) record the supplied SQL
Editor results. The original Phase 1 ledger is preserved; the real material
import produced four unpublished templates. The existing-version activation
error was resolved by read-only reconciliation, not migration replay.

The four approved library batches remain published. The dedicated fixture run
completed with the [exact 78-table baseline restored](../phase2-hosted-acceptance/cleanup-result.json).
The [account closeout](../phase2-hosted-acceptance/account-closeout.json) verifies
removal of all nine synthetic QA accounts and their test purchases. The content
operator remains inactive and banned, retaining its audit identity. The
[completed acceptance checklist](../phase2-hosted-acceptance/EXIT-GATES.md)
records the functional and delivery gates.

The setup and cleanup files are retained as evidence of the completed run.
Neither those files nor the approved import are recovery steps for missing local
files. Original source references remain private.

## Historical activation sequence

1. The operator confirms the staging project in the dashboard and executes
   [00-schema-preflight.sql](sql-editor/00-schema-preflight.sql), followed by
   [01-ledger-and-definitions.sql](sql-editor/01-ledger-and-definitions.sql).
   These transactions return metadata and hashes without student or material rows.
2. The catalogue review confirms the existing Phase 1 migration and definitions,
   with all ten Phase 2 migration versions and their new objects absent. Any partial
   installation, orphan object or mismatched definition requires reconciliation;
   this packet does not overwrite it automatically.
3. A fresh recoverable staging backup and successful isolated restore rehearsal
   are recorded before application. A reference to an older backup, a schema-only
   catalogue or the synthetic local packet test does not satisfy that requirement.
   The application-snapshot rehearsal supplies the scoped recovery reference in
   the operator copy. It is not represented as full Supabase recovery.
4. After those checks pass, the operator replaces only
   `REPLACE_WITH_VERIFIED_PROJECT_REF` and `REPLACE_WITH_BACKUP_RESTORE_EVIDENCE` in
   [02-apply-all-ten-if-absent.sql](sql-editor/02-apply-all-ten-if-absent.sql).
   The entire file executes as one transaction. Any reported error requires
   `ROLLBACK` before further SQL Editor work.
5. A successful result is followed by [03-postflight.sql](sql-editor/03-postflight.sql)
   and a fresh run of the two metadata queries. Their results support structural
   acceptance; Preview activation and authenticated website acceptance follow.

A view/sequence guard mismatch stops before migration writes. The read-only
[view and sequence metadata query](sql-editor/04-view-and-sequence-metadata.sql)
then supplies definitions and hashes for review; the guard is not bypassed and
archive hashes are not automatically replaced with unreviewed current values.

## Transaction guarantees

The packet rejects missing Phase 1 ledger state, any recorded Phase 2 version,
existing Phase 2 relations or routines, missing dependencies and unacknowledged
target/recovery checks. The statement and lock timeouts limit execution. Temporary
read locks stabilize existing public tables during the preservation comparison.

All ten source bodies execute in one transaction, with only their individual
transaction boundaries removed. The ledger receives those exact bodies. Existing
Phase 1 definitions, privileges, policies, data and earlier ledger entries are
fingerprinted before and after application. Every pre-existing public table also
receives a row-count and content fingerprint comparison. Any difference aborts
the transaction. No course, purchase, student, question or mock record is imported
or published by schema activation.

The original Phase 1 migration is excluded from application and retains SHA256
`ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7`.
Migration source hashes are pinned in [activation-manifest.json](activation-manifest.json).
The base Git commit is provenance for the worktree snapshot, not a claim that
new migration files existed in that earlier commit. Exact packet and source-file
hashes appear in [checksums.json](sql-editor/checksums.json).

## Local verification

`python3 deliverables/phase2-completion-2026-11-02/prepare-sql-editor.py` regenerates
the packet only while the migration files match the pinned manifest.
`node deliverables/phase2-completion-2026-11-02/verify-sql-editor.mjs` uses an isolated
PostgreSQL instance with synthetic ledger/data and accepts no hosted connection.
Its report distinguishes local rollback/privilege checks from hosted recovery and
end-to-end acceptance. No destructive hosted rollback script is included.

The [local verification](sql-editor/local-verification.json) records the packet
and reconciliation checks, with its execution time and synthetic scope. Its
isolated fixture uses two synthetic views and substitutes
only their hashes in disposable test SQL. The published packet retains the actual
archive-reference hashes. Changed or additional views, materialized views, public
sequences and view-privilege drift all fail closed in those tests.
The [reference catalogue](sql-editor/local-reference-catalogue.json)
describes the disposable database only; it is not evidence of installed staging
objects or a recoverable staging backup.

An existing-version safety stop is reconciled through the single read-only
[activation report](RECONCILE-ACTIVATION.sql), as described in
[the reconciliation notes](RECONCILIATION.md). No migration replay follows from
that error alone.
