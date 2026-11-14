# Phase 3 staging activation

Status: staging schema activation is confirmed by the operator-supplied read-only reconciliation. All three migration sources, 21 routines, three triggers and four private-table guards match. Original application data and migration records are preserved. Hosted payment acceptance remains incomplete.

The checksummed export captured 88 application tables and 3,939 rows. The local restore reproduced every exported row and the migration ledger. The snapshot contains the Phase 6 conflict repair and no recorded Phase 3 migration. Private source records remain outside version control; the report contains sanitized counts, fingerprints and schema metadata.

`RUN-ACTIVATION.sql` installs the three reviewed payment migrations atomically. Its rehearsal added four private tables and verified 21 function definitions and client execution grants. Existing application rows, original migration records and original security metadata were preserved. The three entitlement function bodies gain upgrade-aware access, and the live-registration provenance constraint gains verified-payment provenance. These intended changes are explicit; applied migration files remain unchanged.

The packet rejects changed application rows, changed ledger contents, unexpected function permissions and repeated activation. Local guard tests exercised those rejections and verified that failed activation left no checkout table behind. A separate recovery test preserved large numeric values and numeric scale. A modified snapshot checksum was rejected.

## Operator sequence

1. The accepted `hosted-reconciliation.json` establishes that the three Phase 3 migrations are already installed. Activation is not repeated.
2. The deployment owner publishes the reviewed integration candidate to its dedicated Preview with the branch-scoped configuration in `DEPLOYMENT-HANDOFF.md`.
3. Dedicated QA fixtures and provider-backed acceptance follow deployment verification and Test Mode webhook setup.
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

The reconciliation query passed local cases for absent and fully installed migrations, altered rows, unexpected execution permissions, changed ledger source and an old draft version. Its transaction is read-only. No hosted repair or additional activation has been performed. The operator subsequently supplied the complete passing result, preserved in `hosted-reconciliation.json` with the attachment source hash and explicit operator provenance.

The integration branch is added to GitHub Verify with payment and activation tests. The public outline now uses the server-render timestamp, matching checkout, so completed live schedules do not advertise available places. Three synthetic React rendering cases, TypeScript and lint validate that display change; provider-backed evidence remains pending.

## Confirmed hosted schema

The 2026-11-14 operator result confirms 92 current application tables, including four new private payment tables. All 88 original tables and 3,939 original rows match the recovery baseline. The original ledger is preserved, no old Phase 3 draft version is recorded, and the reviewed verified-payment provenance constraint is installed. This closes schema reconciliation only.

The connected Vercel deployment lookup returned HTTP 403. The local shell has no installed `vercel` executable. The existing arrangement therefore continues: the project owner handles Preview deployment and supplies its URL. No Phase 3 Preview deployment, environment upload or provider webhook configuration is claimed by this result.
