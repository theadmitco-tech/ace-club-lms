# Published course delivery and live operations

Status: implemented and verified locally; hosted acceptance remains separate.

The additive migration `20261102110000_add_v2_student_delivery.sql` exposes a
published course through a caller-scoped RPC. The current publication must be
published, the Student profile and product access must be active, and the exact
batch enrollment must be active. Content comes from the batch revision pinned by
that publication. Later draft changes remain hidden. Subject authorization is
rechecked for each delivered session. The shared Student renderer preserves
session titles, resource titles, links and the four-stage content order.

Stored worksheets and session PDFs use a dedicated file endpoint. The Student
request supplies only batch, session and item identifiers; the server derives the
private storage path from the authorized published content. The server signs and
streams the PDF without exposing a storage token. Admin file previews require a
saved template or batch reference. An arbitrary file path is never accepted by
the Student endpoint.

The protected reading endpoint accepts only a reading present in that authorized,
pinned course. It fetches no arbitrary URL, supplies no provider credential and
returns private, non-cacheable responses. Meeting delivery also rechecks the
caller at the final redirect. The provider's sharing rules still govern external
resource URLs; this change does not convert externally public files into private
storage.

## Live registration and meeting publication

Schedule enrollment and live registration are separate. An active Admin can
register an enrolled Student with active product access against a published live
batch. Registration records `admin_manual` provenance and an immutable audit
entry. The action neither takes a payment nor claims a live-fee payment. Phase 3
payment confirmation remains a separate integration boundary.

Publication pins the latest meeting revision matching the reviewed batch
revision. Draft meeting changes require another publication before Student
access changes. Existing historical publications are not backfilled with links.
A published meeting requires all of the following at the time of access:

- Active Student profile and matching, unexpired, non-revoked product access.
- Active enrollment and explicit live registration in the exact batch.
- Latest publication in the published state and a live event in an authorized subject.
- A canonical Google Meet link pinned by the publication.
- No class completion record for the event.

Removal, account deactivation, purchase expiry or revocation, unpublishing and
class completion suppress the join immediately on subsequent requests.

## Class completion

An active Admin reviews a published live event before recording completion.
The operation checks the publication revision, serializes against batch changes
and records the actor and timestamp. A retry of the same completion returns the
original result; concurrent confirmations produce one completion record.
Completion is one-way in this interface. Reversal effects on feedback remain
outside this change.

Completion does not mark any Student present, submit feedback, publish a
recording, change a purchase or alter a legacy mock. Recording publication,
feedback and individual attendance remain independent states.

## Verification

`node --experimental-strip-types scripts/v2-student-delivery.test.mjs` covers
response validation, role and feature gates, caller-session adapters, protected
reading selection and the final join redirect.

`node --experimental-strip-types scripts/v2-student-delivery-database.test.mjs`
uses a disposable local PostgreSQL cluster. Coverage includes unpublished and
wrong-batch denial, pinned content and meeting revisions, unpaid/unregistered
accounts, future/expired/revoked access, inactive accounts, wrong subjects,
concurrent registration and completion, stale revisions, direct table/RPC denials
and preservation of legacy rows and Phase 1 purchases.

Hosted evidence must separately cover these flows with designated staging
identities before the exit gates can be signed off. Cleanup must remove exact QA
registration audit rows before registration rows, and exact completion and pinned
meeting rows before publication revisions. Existing application records are not
cleanup targets.
