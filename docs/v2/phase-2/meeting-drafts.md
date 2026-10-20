# Private meeting drafts

Status: Superseded — historical draft design; use the current delivery report
Owner: Engineering
Last updated: 19 October 2026


Current scope: [isolated delivery report](approved-delivery-report.md).
The 20 October approved decisions supersede the original publication hold,
mandatory dates for non-live items and per-session reservation plans below.
Batch publication is implemented; Student batch eligibility remains undecided.
Preserve the following text as historical design and verification context.


This third Phase 2 part implements the private Admin preparation of Google Meet
details required by [LIVE-02](../review/acceptance-criteria.md#ac-v2-live-02--publish-live-batches).
It supports the isolation required by SEC-01/02; it does not complete live
publication or LIVE-04 reservations. Publishing stays blocked until D5 is confirmed,
and the student batch visibility rule D3 remains undecided.

## Admin workflow and limits

1. Open a saved batch's **Private meeting drafts** link from `/admin/v2/batches`.
2. Enter a Google Meet link for each event, or leave slots empty while preparing
   the draft. Each event is identified within its batch, independently of titles.
3. Review the proposed links, then confirm the private save. Changing an input
   invalidates the review. The save rechecks current Admin access and versions.
4. Clear a field and save to remove its current link; earlier revisions remain in
   the Admin-only history. No Google meeting is created, contacted or cancelled.

The separate route is `/admin/v2/batches/[batchId]/meeting`. It loads only the
selected batch's private details, after authorization. Links are not added to the
normal schedule DTO, schedule revision documents, navigation URL, save receipts or
error messages. No browser storage, external link preview or Google API is used.

Supported input is a canonical 36-character HTTPS Google Meet meeting-code URL:
`https://meet.google.com/abc-defg-hij`. Query strings, fragments, credentials, ports,
alternate hosts, lookup/nickname URLs, encoded paths and surrounding whitespace
are rejected. This is a bounded input contract, not a claim to support all Google
Meet URL forms. Syntax validation cannot establish meeting existence, ownership
or availability. Synthetic fixture URLs were never visited.

All event keys must match the saved batch exactly, with one slot per event and
no duplicate, omitted or foreign key. Blank slots are stored as `null`. The current
batch limit of 100 events applies. No live publication completeness rule is inferred
from a successful draft save.

The editor supports review, saving, success, failed-save recovery and reloading.
Returning to batches through its button warns about unsaved edits; browser unload
also warns. Navigation through unrelated shared controls is not comprehensively
guarded. Keyboard, mobile and real browser behavior remain staging checks.

## Authorization and persistence

The route and data layer require both existing authoring flags and remain disabled
when `VERCEL_ENV=production`. Disabled entry points perform no meeting RPC calls;
the inherited Admin layout still performs its normal authentication. No feature
flag or hosted configuration was changed.

Every data operation checks the active Admin in the server layer and database.
RLS denies Students access to private revisions even when they own the matching
product entitlement. Anonymous and service-role clients have no table read grants.
No client role can directly insert, update or delete revisions or execute the
private validation helper. Only the guarded read/save RPCs are granted to the
authenticated role. Feature flags do not replace database authorization.

The additive migration creates `v2_batch_meeting_revisions`. Its primary key is
batch plus meeting revision; it references the saved batch revision and records
the authenticated actor, request token and timestamp. The latest meeting revision
is selected independently of the latest schedule revision. No old table, existing
RPC, product grant, price, expiry, enrollment or student record is changed.

Saves lock the actor/request token and batch row, then recheck both the schedule
revision and meeting revision. This serializes meeting edits with each other and
with existing schedule saves. Conflicting edits fail atomically. Identical retries
return a minimal receipt for the original save without restoring old links over
newer ones. Reusing a token with different input fails. Deactivated Admins cannot
recover even an earlier successful request.

Schedule changes preserve existing meeting associations because event identities
remain fixed; they invalidate pending meeting saves based on the old schedule.
That draft behavior does not decide future handling of reservations or published
schedule changes. A student join path must remain absent until its reservation,
publication and entitlement checks are implemented and tested together.

## Implementation and evidence

| Concern | Repository file |
|---|---|
| Input and minimal response contracts | [v2Meetings.ts](../../../src/lib/v2Meetings.ts) |
| Caller-session authorization and safe errors | [server/v2Meetings.ts](../../../src/lib/server/v2Meetings.ts) |
| Admin route and editor | [page.tsx](../../../src/app/admin/v2/batches/[batchId]/meeting/page.tsx), [MeetingDraftEditor.tsx](../../../src/app/admin/v2/batches/[batchId]/meeting/MeetingDraftEditor.tsx) |
| Server save action | [actions.ts](../../../src/app/admin/v2/batches/[batchId]/meeting/actions.ts) |
| Proposed additive migration | [20261019110000_add_v2_private_meeting_drafts.sql](../../../supabase/migrations/20261019110000_add_v2_private_meeting_drafts.sql) |
| Application tests | [v2-meeting-authoring.test.mjs](../../../scripts/v2-meeting-authoring.test.mjs) |
| Executed database tests | [v2-meeting-database.test.mjs](../../../scripts/v2-meeting-database.test.mjs) |

`npm run test:v2-meetings` passed 11 application tests and 16 database scenarios,
plus the database parent test: 28 total. Coverage includes malicious URL forms,
exact fields and response identity, feature and role gates, private DTOs, an
entitled Student's denied direct access, independent batches, clearing/history,
concurrent Admin edits, repeated saves, token conflicts, deactivation, late-write
rollback, schedule-edit races and migration reapplication.

The database fixture applies the same prerequisites as the
[batch draft fixture](batch-drafts.md#implementation-and-verification), followed
by `20261019100000_add_v2_batch_drafts.sql` and this meeting migration. It snapshots
earlier rows, columns, constraints, indexes, policies, privileges, functions and
triggers to prove preservation of that fixture. It uses a private disposable
PostgreSQL cluster with TCP disabled and accepts no remote target. The intentional
schedule-edit race runs after the preservation comparison. This is not verification
of the deployed migration ledger or hosted Supabase authentication.

The combined results are recorded in the [Phase 2 checkpoint](README.md#local-verification).
No dependency was added. The existing CI workflow includes the new suite for a
future authorized push; CI and staging have not run this unpublished change.

Remaining acceptance work includes migration-ledger reconciliation, reviewed
staging setup, designated Google test accounts, direct access denial in staging,
browser/mobile journeys and product decisions D1–D7. No application server was
started, no shared migration was applied and no Production service was accessed.
