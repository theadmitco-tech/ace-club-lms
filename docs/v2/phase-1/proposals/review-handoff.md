# Canonical product contracts — review handoff

Prepared 25 October 2026. Review only; PR #24 remains Draft. No shared SQL,
content import, deployment or merge is authorized by this handoff.

The audit confirms that `quant_crash`, `verbal_crash`, `di_crash` and `full_batch`
are stored ledger identifiers used by grants, pricing, access and payment replay.
They cannot be replaced safely as display strings.

The proposal adds canonical `quant`, `verbal`, `di` and `full_course` identities
and public catalogue/quote/access interfaces while retaining historical ledger
keys behind compatibility translation. Existing purchases, price history and
six-month expiry stay intact. A small application reader fix supplies approved
names before any migration; it does not change stored contracts.

Review these artifacts:

- [Audit, rollout sequence and rollback plan](README.md).
- [Separate forward migration](20261025120000_canonical_product_contracts.sql).
- [Rollback SQL](20261025120000_canonical_product_contracts.rollback.sql).
- [Read-only verification SQL](canonical-contract-inspection.sql).
- [User-journey-aligned content transfer plan](../../phase-2/content-transfer-plan.md).

The SQL is outside the automatic migration directory. The applied Phase 1 migration
has not been edited or rerun. Current application consumers have not been switched
to the new, unapplied interfaces. This proposal does not remove historical keys;
a physical re-key/purge would require a separate consumer and data migration.

Local evidence: all 15 Phase 1 suites passed in the earlier regression run, followed
by the expanded 11-test proposal suite; 14 content-mapping checks, lint, TypeScript
and the application build passed. Integration checks install all six Phase 2
migrations in disposable PostgreSQL only, exercise canonical/legacy grants with
independent enrolled batches, and preserve their data and access through rollback.
No hosted acceptance or real-JWT testing is claimed.

The next decision is acceptance of the compatibility approach. Staging application
requires separate explicit approval after backup and restore rehearsal. Content
transfer additionally needs reviewed source course/template and asset mappings;
no materials, pre-reads, post-reads or recordings have been imported.
