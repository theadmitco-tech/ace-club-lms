# Recovery and rollback procedure

Status: **procedure prepared; Production usability not demonstrated**. No Production backup, restore or rollback has been performed for V2.

## Recovery rehearsal before authorization

The database operator captures a current Production backup with schema, data, migration ledger and applicable roles/policies, and records capture time, scope, checksum and retention privately. Auth identities, Storage metadata and Storage object bytes require explicit coverage; a public-schema JSON export is not a complete Supabase platform backup. The operator verifies provider-specific backup scope before relying on it. Existing staging recovery exports are not Production backups.

The operator restores into an isolated environment with outbound email, payment callbacks and scheduled jobs disabled. Engineering applies only the reconciled release migrations and verifies row/ledger preservation and existing MVP behavior. QA checks both the new application and the identified previous Production artifact against the resulting schema. Phase 3 purchase/seat writes and Phase 4/5 learning/content writes require explicit compatibility testing; additive DDL alone does not prove application rollback safety.

The release record must contain a verified restoration procedure, restore duration, recovery point objective, recovery time objective, Storage recovery coverage and role ownership. None of those outcomes is inferred from the local metadata preflight rehearsal. If the old application cannot safely coexist with the migrated database, the release plan must provide a reviewed maintenance/forward-repair strategy before launch.

## Stop and containment conditions

Any cross-account data disclosure, wrong-project configuration, unauthorized protected resource, duplicate entitlement, wrong price/currency, oversold live batch, rejected signed callback or new critical login/legacy regression stops release. Before public assignment, the operator leaves the existing deployment serving traffic. After assignment, the operator follows only the approved containment/rollback authority, preserving logs and the new write history.

The payment operator suspends new V2 checkout through a previously tested control where authorized. Valid in-flight callbacks must remain durable and idempotent; disabling callbacks or restoring old payment state can lose or duplicate fulfillment. Provider events, captured payments, refunds, seat reservations and entitlements must be reconciled before reopening checkout. No automatic refund or replay is authorized by this document.

## Application rollback

The observed previous deployment is `dpl_8axtycbJUpFX8cPWhVtkhGf6p9Kj`. Vercel lists it as a rollback candidate, but its current availability, artifact provenance, domain mapping and compatibility must be refreshed before release. The approved record must name the exact rollback artifact and operator, not merely “previous deployment.”

After approved rollback, QA verifies legacy login, current purchases, private resources, course access, callback processing and domain assignment. Application rollback does not revert database rows, Storage objects, payment-provider events or environment-variable changes. Each separately approved configuration reversal uses the private pre-change record, never copied staging keys.

Vercel rollback can change automatic Production assignment behavior; the operator checks the resulting assignment state before the next release. No rollback command is run by this packet. The official [rollback documentation](https://vercel.com/docs/deployments/rollback-production-deployment) must be checked for the selected deployment method at execution time.

## Database and Storage recovery

Applied migrations and purchase history must not be erased as routine rollback. Transactional migration failure rolls back its own work; committed migration problems require a reviewed forward fix or an explicitly approved recovery operation. Storage uploads and external payments are outside a PostgreSQL transaction.

A Production restore requires separate authorization naming the recovery point, expected data loss, handling of writes after that point, provider reconciliation, Auth/Storage effects and service downtime. The operator preserves an incident snapshot before restoration where feasible. Database and object recovery are verified together so that restored rows do not point at missing or unauthorized files. No down-migration or destructive cleanup script is supplied.

## Required rollback record

The handoff records incident time, trigger, operator role, release and rollback deployment IDs, exact source commits, configuration changes, database action or explicit absence, protected evidence locations, smoke results, payment reconciliation, remaining limitations and the Product Owner's reopening decision. Personal attribution and credentials remain outside repository-authored reports.
