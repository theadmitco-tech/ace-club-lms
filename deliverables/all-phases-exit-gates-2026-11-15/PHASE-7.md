# Phase 7 — release exit-gate checklist

Status: **local release preparation and synthetic recovery mechanics verified; Production release gates remain open**. This checklist excludes Phase 0. The review branch remains separate from Production; no Production configuration, database, domain, deployment, real payment or release authorization changes occur in this work.

## Locally completed work

- [x] The source inventory identifies twenty added migrations, their exact SHA-256 values and ordering, including Phase 3 after the Phase 6 repair. The source files remain unchanged from the recorded inventory.
- [x] The metadata-only preflight handles both absent and installed V2 objects in disposable local PostgreSQL. Eleven assertions verify source identity, private table permissions, service-only fulfillment, signup/capacity triggers, Storage restrictions and preservation.
- [x] A real `pg_dump` custom-format archive and `pg_restore` into another disposable database preserve all synthetic application/Auth/Storage-metadata rows and the migration ledger.
- [x] Restored effective privileges, RLS policies, function definitions/security settings and triggers match their pre-backup fingerprints.
- [x] A synthetic paid purchase and upgrade retain their payment-event receipts, original expiry, entitled subjects, live registration, submitted feedback and independently published reading after restore.
- [x] Replayed fulfillment remains idempotent after restore; no purchase, grant, event or learning row changes as a result of the replay.
- [x] An unpaid foreign Student remains denied after restore; browser roles cannot execute fulfillment or directly read payment-event records, and the private content bucket remains private.
- [x] A deliberately later source write remains absent from the restored backup point, demonstrating the need to reconcile post-backup writes before any real restore.
- [x] Release, containment, smoke and rollback procedures exist, with an authorization template that remains explicitly unapproved.

The fresh results are [local-preflight-results.json](local-preflight-results.json) and [local-recovery-results.json](local-recovery-results.json): two local suites, twenty-four named assertions in total. The recovery archive contains only synthetic data and is removed with the disposable cluster. The test records its checksum and elapsed local archive/restore time without claiming Production recovery objectives.

## Full exit gates

| Gate | Local evidence | Full acceptance |
| --- | --- | --- |
| Exact release candidate and reconciled migration set | Source inventory and source-hash checks pass. | [ ] Final approved SHA, current Production ledger and exact missing set remain unverified. |
| Production-capable implementation | A documented enablement specification identifies runtime, asset-origin, mode-selection and schema requirements. Existing runtime still rejects Production. | [ ] Safe Production runtime and mode-bound Live payment ledger require separate implementation and complete environment-matrix acceptance. A Live key selector alone is insufficient while fulfillment records use the Test Mode payment-reference contract. |
| Production/staging separation | Current staging source guards and Test Mode restrictions remain intact. | [ ] Effective Production project, public/server keys, site origin, payment mode and artifact configuration require authorized verification. |
| Production metadata preflight | Prepared SQL passes absent/combined synthetic database tests. | [ ] No actual Production query or source/installed-definition reconciliation is claimed. |
| Usable recovery and rollback | Synthetic database dump/restore and restored payment/access invariants pass. | [ ] A current Production-equivalent backup, full Auth/Storage scope, object bytes, restoration timing/objectives and previous deployed application compatibility remain unverified. |
| Final combined acceptance | Local Phase 1–6 evidence is tracked in the companion checklists. | [ ] Actual hosted Google sign-in, Test Mode payment/webhook delivery, contention/retry and final owner acceptance remain required. |
| Authorized release | Exact-action authorization template exists and remains unapproved. | [ ] Explicit authorization for the exact merge, schema/data changes, configuration, deployment, domain and smoke scope is required. |
| Release and post-release smoke | Smoke and incident-record procedures exist. | [ ] No Production deployment, domain assignment, Live Mode smoke, rollback execution or post-release evidence is claimed. |

## Reproduction and limits

From the integration worktree, with the output directory already present:

```sh
PHASE7_REPORT_DIRECTORY=deliverables/all-phases-exit-gates-2026-11-15 node scripts/phase7/preflight.test.mjs
PHASE7_REPORT_DIRECTORY=deliverables/all-phases-exit-gates-2026-11-15 node scripts/phase7/recovery-rehearsal.test.mjs
```

Both suites accept no hosted connection string. The recovery test verifies its private Unix-socket cluster before invoking dump/restore tools. It restores into another database in the same isolated cluster, so existing cluster roles are reused; it does not prove independent cluster-role provisioning. Auth tables and Storage metadata are synthetic fixtures, not running Supabase Auth or physical object recovery. No outbound provider, email or webhook calls occur.

The actual previous Production artifact and current full Production database are unavailable to this rehearsal. Database invariants do not substitute for old-application compatibility. Local completion therefore cannot mark release authorization, hosted acceptance or Production execution as passed.
