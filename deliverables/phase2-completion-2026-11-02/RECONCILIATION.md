# Activation reconciliation

An existing-version error from the activation packet is a safety stop. It does
not, by itself, prove either a complete installation or a failed installation.
The operator uses [RECONCILE-ACTIVATION.sql](RECONCILE-ACTIVATION.sql) in the verified
staging SQL Editor to obtain one read-only JSON report. The script first clears
any previous failed transaction with `ROLLBACK` and performs no migration,
application-row or permission changes.

The report compares all ten expected ledger entries with their exact recorded
source bodies, every final Phase 2 routine with its `prosrc` hash and security
settings, and all eighteen private tables with their RLS and role grants. Original
ledger rows, including the Phase 1 entry, are compared with the fresh recovery
snapshot. Missing versions and mismatches are reported rather than repaired.
Archived view hashes and the absence of public sequences are also checked.

All sixty original application tables receive count and content-fingerprint
comparisons. The [baseline fingerprints](reconciliation-baseline-fingerprints.json)
were computed directly in PostgreSQL from the exact recovery snapshot, preserving
numeric values without JavaScript conversion. That file contains counts, hashes,
ledger hashes and the designated synthetic profile identifiers, without original
application rows. The current copy was recovered unchanged from the saved SQL
aggregates after the private temporary files became unavailable; its provenance
records the saved SQL hash.

Only the nine designated QA profiles and the dedicated content-operator profile
are eligible exclusions from the original `profiles` comparison. Those ten IDs
were verified absent from the fresh snapshot. An exclusion additionally requires
the current Auth UUID/email and profile UUID/email to match the designated
identity, with both creation times after snapshot capture. Unverified identities
remain inside the comparison. No purchase, material, course, question or mock row
is excluded.

This report establishes the checks it explicitly returns. It does not independently
compare every table column, index, constraint or policy definition, replace hosted
role/website acceptance, or authorize replaying an applied migration.
