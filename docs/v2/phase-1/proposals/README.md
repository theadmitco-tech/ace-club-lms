# Phase 1 canonical contract proposal — 25 October 2026

Status: prepared for review only. PR #24 remains Draft. No shared migration or
content import is authorized. The SQL here is deliberately outside
`supabase/migrations`; do not copy it into a deployment queue without review.

## Finding: these are stored contracts, not just labels

The applied `20261018090000_add_v2_product_entitlements.sql` defines:

- `v2_products.code` as a primary key, with scope constraints fixing the four
  historical codes. `v2_product_grants.product_code` is a restrictive foreign key
  and part of the grant primary key.
- `v2_price_versions.product_kind` and `crash_count` as the immutable pricing
  contract. Price IDs are referenced by purchases; the immutability trigger
  prohibits rewriting price history.
- `v2_purchase_shape`, `quote_v2_products`, `grant_v2_purchase`,
  `can_access_v2_product` and `get_my_v2_access` use those keys. Replay compares
  the exact normalized grant set, not display names.
- TypeScript DTO validation and Phase 1 probes use the old RPC contract.
  Proposed Phase 2 offerings already map canonical IDs to the legacy keys.

| Approved identity | Retained ledger key | Scope |
| --- | --- | --- |
| `full_course` / Full Course | `full_batch` | Quant + Verbal + DI |
| `quant` / Quant | `quant_crash` | Quant |
| `verbal` / Verbal | `verbal_crash` | Verbal |
| `di` / DI | `di_crash` | DI |

A global string replacement would break constraints, grants, access readers and
payment retry identity. The approved scope does not require deleting historical
keys. The proposal adds canonical stored identities and public contracts while
retaining those keys exclusively as ledger compatibility identifiers. This is an
expand-first migration, not a completed physical re-key of historical records.

## Small application change

`listV2Products` now returns approved display names after validating the database
response. It keeps codes, sections, pricing and RPC arguments unchanged, and does
not mutate stored names. This can be deployed before the proposal. Direct legacy
SQL/RPC callers still see the historical contract until they explicitly adopt the
canonical interface. This display fix alone does not resolve stored naming.

## Separate forward migration

`20261025120000_canonical_product_contracts.sql` adds a unique generated
`v2_products.canonical_code` and a security-invoker catalogue view with approved
names and `full_course` / `individual` kinds. New canonical quote, grant, access
and access-list RPCs translate only at the ledger boundary. Legacy RPCs stay intact.

There is no Phase 2 dependency. Nothing rewrites existing product names, price
versions, grant keys, purchases, expiry, profiles, enrollments or content. New
canonical purchases still write the same ledger shape. Canonical and legacy
retries converge on the same payment reference and grant set. The three individual
offerings remain distinct from Full Course; prices and six-month expiry are unchanged.

Only the payment service can grant purchases. Browsers cannot call private
translation helpers or mutate the catalogue view. Access remains bound to the
current authenticated identity and existing expiry/revocation/section checks.

## Rollout and rollback plan

1. Review this proposal separately from Phase 2. Confirm that retained historical
   keys are acceptable compatibility identifiers. A physical purge is additional
   work requiring a full downstream consumer and stored-reference inventory.
2. Before approved staging application, capture a private backup, schema/privilege
   baseline and product/price/purchase/grant fingerprints. Check the exact Phase 1
   checksum below, migration ledger and any additional hosted dependencies. The
   current audit inspected committed source, not the live database. The prepared
   `canonical-contract-inspection.sql` collects ledger hashes and routine
   definitions/privileges before and after an approved operation. It runs in a
   read-only transaction, fails on filtered RLS reads and prints no private row
   values. Save its output privately. Compare during a controlled window: legitimate
   concurrent purchases can also change fingerprints and need reconciliation.
3. Rehearse the forward and rollback SQL on a disposable restore. Apply only this
   approved file in one transaction; lock/statement timeouts fail rather than wait
   indefinitely. Do not run an automatic push of the unapplied Phase 2 queue.
4. Verify catalogue visibility, all eight quote combinations, replay in both
   directions, unchanged price IDs/amounts/expiry, foreign keys and role isolation.
5. Cut over consumers explicitly to the new view/RPCs with canonical DTO validation.
   Current application code has NOT been switched to those unapplied interfaces.
   Observe legacy usage before considering any later contract retirement.
6. If rollback is needed, first restore consumers to legacy interfaces, then run
   the separately reviewed `.rollback.sql`. It drops only the added interfaces and
   generated column, without `CASCADE`. Unexpected dependencies must stop rollback.
   New purchases are retained and remain valid through old RPCs; never delete paid
   records to restore naming. Rollback does not rerun the original migration.

Do not rerun the forward SQL: the migration ledger must track it once approved.
A failed transaction rolls back its DDL. Stop on schema drift; do not use
`IF NOT EXISTS` to mask an incompatible partial installation.

Applied Phase 1 source SHA-256 remains:
`ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7`.

## Local validation

Run `node --experimental-strip-types scripts/v2-canonical-product-contracts.test.mjs`.
The suite creates a private local PostgreSQL cluster with synthetic identities;
it accepts no remote connection string. It checks preservation, canonical names,
all valid quotes, invalid/mixed legacy inputs, replay, scope/expiry/revocation,
role permissions and rollback with purchases created through the new API.

Content migration is a separate workstream: see
[the journey-aligned content transfer plan](../../phase-2/content-transfer-plan.md).

### Recorded verification — 25 October 2026

- All 15 Phase 1 runner suites passed (137 tests at that run).
- The latest proposal suite passed all 11 tests, including read-only inspection
  and Phase 2 coexistence. Rollback refused a synthetic dependent view and restored
  earlier DDL when it failed. With all six proposed Phase 2 migrations installed
  locally, canonical and legacy purchasers retained only their enrolled batches.
  Expansion/rollback preserved course, publication, enrollment and ledger snapshots;
  revocation still removed access. Both installation orders were exercised.
- All 14 content-mapping tests passed, including version-2 session placement.
- Lint, TypeScript and the webpack production build passed with synthetic config.
- The applied Phase 1 migration checksum is unchanged.

Prepared on local branch `work/phase1-contract-audit-2026-10-25`, based on
`334ea029f9094093929610429e06a4c07259f942`. No push or hosted test of this proposal
was performed. PR #24's prior Preview does not validate these new changes.
