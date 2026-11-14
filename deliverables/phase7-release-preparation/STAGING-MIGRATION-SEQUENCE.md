# Recorded staging migration sequence

The following ordered source sequence includes the migrations recorded in the staging evidence through Phase 3 reconciliation. It is an inventory, not an execution packet. Existing staging versions must not be replayed. Production installation status is unknown and requires the read-only preflight and exact definition reconciliation.

| Order | Version | Source file |
| --- | --- | --- |
| 1 | `20261018090000` | `20261018090000_add_v2_product_entitlements.sql` |
| 2 | `20261019090000` | `20261019090000_add_v2_template_drafts.sql` |
| 3 | `20261019100000` | `20261019100000_add_v2_batch_drafts.sql` |
| 4 | `20261019110000` | `20261019110000_add_v2_private_meeting_drafts.sql` |
| 5 | `20261020090000` | `20261020090000_add_v2_outline_schedules.sql` |
| 6 | `20261020100000` | `20261020100000_add_v2_batch_publication.sql` |
| 7 | `20261025100000` | `20261025100000_add_v2_enrolled_schedules.sql` |
| 8 | `20261102100000` | `20261102100000_add_v2_programme_content.sql` |
| 9 | `20261102110000` | `20261102110000_add_v2_student_delivery.sql` |
| 10 | `20261102120000` | `20261102120000_add_v2_content_imports.sql` |
| 11 | `20261102130000` | `20261102130000_add_v2_publication_scopes.sql` |
| 12 | `20261102170000` | `20261102170000_add_v2_learning_feedback.sql` |
| 13 | `20261103090000` | `20261103090000_add_v2_content_publishing.sql` |
| 14 | `20261103091000` | `20261103091000_add_v2_private_content_storage.sql` |
| 15 | `20261103100000` | `20261103100000_fix_v2_content_readonly_previews.sql` |
| 16 | `20261103110000` | `20261103110000_fix_v2_content_conflict_responses.sql` |
| 17 | `20261103120000` | `20261103120000_fix_v2_integration_conflicts.sql` |
| 18 | `20261113090000` | `20261113090000_add_v2_sales_catalogue.sql` |
| 19 | `20261113100000` | `20261113100000_add_v2_checkout_ledger.sql` |
| 20 | `20261113110000` | `20261113110000_add_v2_payment_fulfillment.sql` |

Exact source hashes are in `migration-inventory.json`. Prior staging evidence is retained in the Phase 1, 2, 4, 5 and 6 deliverables; the current payment reconciliation is `../phase3-preview-activation/hosted-reconciliation.json`. That operator-supplied report confirms all three payment sources and preservation of the prior ledger. These records do not independently inspect Production.

The original Phase 1 migration remains first. Phase 6 conflict repairs remain before Phase 3, whose three sources add sales projection, private checkout/sign-up state, and verified fulfillment/upgrade-aware access respectively. No historical migration or ledger record is renamed, edited or marked equivalent by this inventory.
