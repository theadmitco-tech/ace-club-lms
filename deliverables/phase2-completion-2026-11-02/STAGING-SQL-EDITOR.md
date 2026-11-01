# Phase 2 staging SQL Editor packet

Status: local preparation. Hosted application, recovery evidence and acceptance
remain separate checks. The earlier six-migration activation packet is historical;
this packet includes the complete ten-migration implementation snapshot.

The sole target is staging project `eyphkkginlgoaxflauog`. Production configuration
and PR #24 Draft status remain unchanged. Supabase SQL Editor access is sufficient
for the operator steps; no database password is required by this packet.

## Operator sequence

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
   No recovery acknowledgement has been supplied in the generated SQL.
4. After those checks pass, the operator replaces only
   `REPLACE_WITH_VERIFIED_PROJECT_REF` and `REPLACE_WITH_BACKUP_RESTORE_EVIDENCE` in
   [02-apply-all-ten-if-absent.sql](sql-editor/02-apply-all-ten-if-absent.sql).
   The entire file executes as one transaction. Any reported error requires
   `ROLLBACK` before further SQL Editor work.
5. A successful result is followed by [03-postflight.sql](sql-editor/03-postflight.sql)
   and a fresh run of the two metadata queries. Their results support structural
   acceptance; Preview activation and authenticated website acceptance follow.

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

The recorded [local verification](sql-editor/local-verification.json) contains ten
passing packet checks. The [reference catalogue](sql-editor/local-reference-catalogue.json)
describes the disposable database only; it is not evidence of installed staging
objects or a recoverable staging backup.
