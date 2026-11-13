# Phase 3 staging activation

Status: the fresh recovery and activation rehearsals passed. A subsequent SQL Editor activation attempt stopped because a Phase 3 migration was already recorded. Read-only reconciliation is pending; hosted payment acceptance remains incomplete.

The checksummed export captured 88 application tables and 3,939 rows. The local restore reproduced every exported row and the migration ledger. The snapshot contains the Phase 6 conflict repair and no recorded Phase 3 migration. Private source records remain outside version control; the report contains sanitized counts, fingerprints and schema metadata.

`RUN-ACTIVATION.sql` installs the three reviewed payment migrations atomically. Its rehearsal added four private tables and verified 21 function definitions and client execution grants. Existing application rows, original migration records and original security metadata were preserved. The three entitlement function bodies gain upgrade-aware access, and the live-registration provenance constraint gains verified-payment provenance. These intended changes are explicit; applied migration files remain unchanged.

The packet rejects changed application rows, changed ledger contents, unexpected function permissions and repeated activation. Local guard tests exercised those rejections and verified that failed activation left no checkout table behind. A separate recovery test preserved large numeric values and numeric scale. A modified snapshot checksum was rejected.

## Operator sequence

1. The staging operator verifies project `eyphkkginlgoaxflauog`, keeps staging playback paused, and executes `RECONCILE-ACTIVATION.sql` in a new SQL Editor query. Activation is not repeated.
2. The read-only result identifies installed migration versions, exact source matches, routine and trigger guards, private-table permissions, and preservation of the original 88 tables. Any discrepancy requires a specifically reconciled plan.
3. Hosted schema checks precede dedicated QA fixtures. Provider-backed acceptance uses the reviewed Preview and the Test Mode webhook described in `DEPLOYMENT-HANDOFF.md`.
4. Exact fixture cleanup and independent absence checks precede acceptance sign-off.

An error aborts the atomic packet. An already-recorded migration requires reconciliation rather than another activation attempt. A changed snapshot baseline requires a fresh export and rehearsal rather than bypassing preservation checks.

## Evidence and limits

- `application-recovery-report.json` records the fresh application-row restore and activation rehearsal.
- `migration-manifest.json` records source hashes and expected PostgreSQL function metadata derived from a disposable current-phase fixture.
- `scripts/phase3/recovery.test.mjs` and `scripts/phase3/activation.test.mjs` cover exact serialization and activation guards.
- `DEPLOYMENT-HANDOFF.md` records branch-scoped environment and provider setup.

The restore is an application-data rehearsal, not a complete Supabase platform restore. Auth identities are placeholders, Storage objects and platform configuration are excluded, and full relation grants and policies are not reconstructed. The three replaced entitlement routines have their exported execution grants restored for the rehearsal. The hosted packet independently captures and preserves the original security metadata in its own transaction.

The packet does not enable checkout, take payments or publish courses. Test Mode key authentication passed a read-only provider API request; actual payment, capture, webhook and OAuth acceptance remain separate. Production is unchanged.

## Reconciliation checkpoint

The remote integration branch was verified at `317791456c682dac5cbcb093301fd4617219c5a0`. Read-only staging HTTP checks returned the public catalogue and live availability successfully; anonymous checkout-history access returned permission denial. These checks establish API availability, not complete migration or payment acceptance.

The reconciliation query passed local cases for absent and fully installed migrations, altered rows, unexpected execution permissions, changed ledger source and an old draft version. Its transaction is read-only. No hosted repair or additional activation has been performed.

The integration branch is added to GitHub Verify with payment and activation tests. The public outline now uses the server-render timestamp, matching checkout, so completed live schedules do not advertise available places. Three synthetic React rendering cases, TypeScript and lint validate that display change; provider-backed evidence remains pending.
