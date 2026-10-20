# Independent batch draft scheduling

Status: Implemented and tested locally; unpublished; staging verification pending
Owner: Engineering
Last updated: 19 October 2026

This is the second local implementation part of [Phase 2](README.md). It provides
the draft scheduling foundation for PRODUCT-04 and LIVE-05 in the
[acceptance criteria](../review/acceptance-criteria.md). It does not satisfy their
published, entitled-student outcomes. Publication, content association and
reservation decisions remain open in the [preparation checklist](preparation-checklist.md#decisions-and-inputs-register).

## Admin workflow

1. Open `/admin/v2/batches` with active Admin access after separately approved
   staging setup. Both authoring flags must be enabled in a non-Production environment.
2. Choose a saved template containing planned events, enter a batch title and
   start date, then select **Review schedule**. Review performs no database writes.
3. Check the proposed event dates, start/end times, instructor and capacity.
   **Confirm and save draft** revalidates the reviewed version before saving.
4. Select a saved batch to change its title or individual event dates, times,
   durations, instructors and capacities. Review compares saved and proposed
   event details before a new revision is appended.

The editor provides loading, empty, validation, conflict, retry and saved states.
Changing a field invalidates its prior review. Switching drafts asks before
discarding unsaved edits; browser unload also warns. Client-side navigation
outside the editor is not comprehensively guarded and remains a browser-review
item. No browser session or app server was started for this implementation.

## Contract and boundaries

- New batches derive events from the selected template's latest revision at
  confirmation time. If that template changes after review, confirmation fails
  and the Admin must reload and review again.
- Each saved batch pins its template identity, product and source revision.
  Later template edits do not change existing batches. Batch edits do not change
  another batch, the template or any purchase grant.
- An event is identified by **batch ID plus event key**. Copying a template
  preserves its keys within each distinct batch. Event title and section remain
  tied to the saved snapshot. This part does not add, remove, reorder or rebind
  events during batch editing, or associate them with real class content.
- The original template start date is a fixed anchor. Rescheduling edits each
  event's date; it does not silently shift the whole batch. Edited dates may extend
  outside the initial template duration.
- `Asia/Kolkata` is the only supported zone in this part. Local input dates cover
  2000–2099; the database converts each local date/time to a UTC instant using its
  zone data. Review shows both start and end in IST, including overnight events.
  This engineering choice follows the existing scheduler; it does not resolve
  approval of actual schedules or future timezone scope under D2.
- A live batch requires 1–100 events. Empty templates remain valid drafts but
  cannot create a live schedule. Recording-only delivery will use its own
  publication/content associations without a fabricated live batch.
- Durations remain 15–720 minutes and planned capacity 1–1,000, defaulting to the
  template's value (normally eight). These validation bounds do not approve new
  business limits. No capacity is reserved, and no attendance or Meet access is added.
- Only `draft` state is supported, enforced by a database constraint. No publish,
  unpublish, republish, delete or student read action is introduced.

## Authorization and save integrity

`V2_BATCH_AUTHORING_ENABLED=true` and `V2_TEMPLATE_AUTHORING_ENABLED=true` are
both required by the application. `VERCEL_ENV=production` disables both routes.
No environment values or hosted configuration were changed. Flags control the
application surface; database Admin checks still apply to direct RPC calls.

The page and each server data operation verify the current Admin identity.
The database independently requires an active Admin, including on an identical
retry. Students cannot read either new table through RLS. Anonymous,
authenticated and service-role clients have no direct table mutation privileges;
private validation/projection helpers are not executable by them. Only the
authenticated role can invoke the guarded list, review and save RPCs.

Review returns a projection plus a checksum of that projection. The checksum
detects drift between review and confirmation; it is not an authorization secret.
Confirmation locks the request, batch and (for initial creation) source template,
recomputes the projection and compares it before writing. Stale revisions and
changed reviewed fields fail without a partial batch or version update.

Saves append immutable history with the authenticated actor and a request token.
The same actor/token/input/checksum recovers the original result, even after a
later edit. Reusing the token for different input fails. Recovering an earlier
save does not overwrite a newer revision; reload the latest draft before editing
again. The deferred current-revision foreign key prevents a committed empty head.
Server errors expose controlled messages, not raw database diagnostics.

## Implementation and verification

| Concern | Repository file |
|---|---|
| Types, exact input validation and instant checks | [v2Batches.ts](../../../src/lib/v2Batches.ts) |
| Disabled-by-default availability | [v2BatchFeature.ts](../../../src/lib/server/v2BatchFeature.ts) |
| Caller-session data access | [server/v2Batches.ts](../../../src/lib/server/v2Batches.ts) |
| Admin page, review and confirmation | [page.tsx](../../../src/app/admin/v2/batches/page.tsx), [BatchDraftEditor.tsx](../../../src/app/admin/v2/batches/BatchDraftEditor.tsx), [actions.ts](../../../src/app/admin/v2/batches/actions.ts) |
| Additive migration | [20261019100000_add_v2_batch_drafts.sql](../../../supabase/migrations/20261019100000_add_v2_batch_drafts.sql) |
| Application tests | [v2-batch-authoring.test.mjs](../../../scripts/v2-batch-authoring.test.mjs) |
| Executed PostgreSQL tests | [v2-batch-database.test.mjs](../../../scripts/v2-batch-database.test.mjs) |

`npm run test:v2-batches` covers 15 application tests and 18 database scenarios,
plus the database parent test. Coverage includes leap-day/year-end/midnight and
overnight conversion, server timezone independence, malformed fields, all four
product scopes, two independent batches of one product, rejected role access,
changed confirmations, concurrent edits and retries, reused tokens, deactivated
Admins, template changes, empty templates, late-write rollback and migration
reapplication. Application tests execute the actual domain/server/action/page
modules with external I/O replaced; they do not exercise a browser or Supabase's
hosted authentication layer.

The disposable database fixture applies these prerequisites in order:

1. `20260731051000_production_baseline.sql`
2. `20260731062700_enforce_material_release.sql`
3. `20260731110000_require_provisioned_portal_access.sql`
4. `20261018090000_add_v2_product_entitlements.sql`
5. `20261019090000_add_v2_template_drafts.sql`

It then applies the new batch migration and checks preservation of all earlier
fixture rows and schema, including templates, an inactive enrolled legacy batch
and a purchase with existing expiry. Template-source changes are exercised
explicitly after the preservation comparison. This is a synthetic migration
subset, not a reconstruction of the deployed ledger. The fixture creates its own
temporary PostgreSQL cluster with TCP disabled and accepts no remote target.

The combined local run passed **147 tests**, lint with zero warnings allowed,
TypeScript and an optimized build with 42 generated entries. See the
[verification record](README.md#local-verification) for commands and limitations.
CI has not run these unpublished changes; local Node is 26 and configured CI is 24.

## Remaining review

- [ ] Review the local diff and resolve the accepted integration baseline.
- [ ] Reconcile staging's actual migration ledger and separately approve migration
  application and feature flags. No shared migration has been applied.
- [ ] Verify the intended Admin/Student Google accounts and matching Preview.
- [ ] Exercise keyboard/mobile use, navigation with unsaved edits, failed request
  recovery and two-Admin conflicts in staging using synthetic data.
- [ ] Confirm representative schedules and content mappings, then implement the
  remaining publication, content and entitled-student paths in separate parts.
- [ ] Meet Phase 2 acceptance criteria before any release decision.

Disabling the batch flag removes this authoring surface without deleting drafts.
Template authoring can remain independently enabled outside Production. No rollback
should drop saved history or restore a whole shared database snapshot. All changes
are tracked in local commits; no PR, branch on GitHub or live service was changed.
