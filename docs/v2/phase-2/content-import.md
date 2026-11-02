# Additive content import

The import lifecycle adds reviewed legacy material to existing, unpublished V2
course revisions. It preserves source rows and existing destination content.
Activation and actual material transfer require separate hosted evidence.

The offline mapping and transfer tools produce a private
`v2-content-transfer-plan-1` document. Notion links use `notion_url`; recording,
PDF and other HTTPS references retain their original source fields. Imported
placements preserve exact titles, explicit placement and reviewed ordering.
Source identifiers, schema fingerprints and row hashes bind each material.

The database repeats authorization and validation for every preview and apply:

- Only an active authenticated Admin can inspect or mutate import state.
- Source rows are re-read and locked; stale hashes and schema changes fail.
- Destination revisions are locked and checked before the transaction writes.
- Existing metadata, session ordering and material content remain unchanged.
- Unreviewed placements, collisions, duplicate scope and unrelated assets fail.
- Every destination receives an immutable draft revision in one transaction.
- A stable registry identity connects the same source asset across destinations.
- The import identifier makes concurrent retries return the existing result.
- Batch publication, enrollment, feedback, attendance and legacy rows remain untouched.

`preview_v2_content_import(plan)` returns the server fingerprint and scope counts.
`apply_v2_content_import(id, plan, fingerprint)` applies that exact reviewed plan.
The authenticated caller supplies neither another actor nor an access grant.
Raw source documents, URLs and import audit rows remain Admin-only under RLS.

For SQL Editor operation, an authorized operator can generate a private packet:

```sh
node scripts/v2-content-import.mjs sql \
  /private/plan.json EXACT_ADMIN_UUID /private/import.sql
```

The packet remains outside version control. Its generated import identifier must
be retained for retry and recovery. The exact destination scope, source mapping
and staging dashboard project require operator review before execution. The
packet uses the selected existing active Admin identity inside its transaction;
it cannot create a role or bypass the importer authorization checks.

`recover_v2_content_import(id)` appends a restoring draft revision from the saved
previous document. Recovery refuses intervening edits or a batch pinning the
imported revision. It removes only that import's placement pointers and retains
shared assets and immutable audit history. A repeated recovery is idempotent.
Published batch recovery requires a separate scoped publication review.

Local verification is provided by `scripts/v2-content-import-database.test.mjs`.
Its synthetic fixtures do not establish real-source rendering, curriculum mapping,
hosted migration application or product acceptance.

## Approved material scope

The current Full Course source revision is
`f81e1d5b-ef6c-4d9c-bcab-b65d569f5ebe`. The approved mapping retains its complete
30-item outline, with a separate undated starter collection, and shares the
academic sections into Quant (6 sessions), Verbal (6 sessions) and DI (5 sessions).
Programme content and the two starter resources remain Full Course only.

The approved recording scope includes the later DI 1 recording from 21 August,
DI 2 from 7 August, DI 3 from 21 August and Quant 3 from 9 August. The older DI 1
recording remains in its existing batch. Original batches and assets are retained.

The prepared transfer contains 19 source assets and 33 placements: 19 in Full
Course, 3 in Quant, 4 in Verbal and 7 in DI. Five worksheet references use the
existing protected file route. The V2 delivery boundary rechecks the pinned
published item and caller access before signing the underlying storage object.
Ten Notion references point to two distinct source pages; their original mapping
is preserved, and exact renderer acceptance remains a separate check.

`scripts/v2-approved-material-import.mjs` prepares a private SQL Editor packet
from a private source inventory and an explicitly selected active Admin UUID.
The packet compares every approved source row against the captured snapshot,
computes PostgreSQL row/schema fingerprints, imports all destinations atomically,
and compares existing legacy and Phase 1 table fingerprints afterward. The
operator identity is never selected by an arbitrary first-Admin query.

## Scoped replacement

Shared assets retain immutable revisions. Replacement preview derives the exact
selected course revisions and registered placements on the server. Confirmation
checks that fingerprint again and appends a new shared asset version plus new
course draft revisions. Unselected drafts and existing published batches retain
the previous reference. An intervening local item edit, changed destination or
changed asset scope rejects confirmation. Replacement request identifiers make
transport retries and concurrent duplicate submissions idempotent.

Admin → Existing material & shared recordings exposes reviewed import, scoped
replacement, immutable transfer history and guarded recovery. Existing published
batches require their own publication review before changed content is visible.

The approved-source generator’s `plan-scaffold.private.json` is an intermediate
record, with hash placeholders resolved by the guarded SQL packet. It is not a
ready-to-upload file for the Admin import interface. Ordinary reviewed transfer
plans from the fingerprint-based mapping workflow contain their final source
hashes and can use the Admin interface.

## Durable staging operator and hosted verification

`scripts/phase2-content-operator.mjs prepare` creates one neutral staging-only
content operator. The state file remains outside version control with mode 0600.
Ownership is bound to a generated email and administrator-owned run metadata;
existing unrelated identities are never selected. No email delivery is requested.

The same identity remains active through import, publication and hosted acceptance.
After dedicated QA cleanup and its baseline comparison,
`phase2-content-operator.mjs deactivate` deactivates only that owned profile,
blocks subsequent sign-in, rotates the password and removes its private password
from the state file. The inactive Auth/profile rows remain as immutable audit
references; those rows are not disposable QA accounts.

`scripts/phase2-material-acceptance.mjs` provides separate staged modes:

1. `verify-import` compares all 19 assets, 33 placements, four destination documents
   and every approved legacy source snapshot.
2. `prepare-batches` creates four deterministic, unpublished learning-library
   batches from the exact imported revisions. Existing matching batches are reused.
3. `review-publication` derives the current publication scope from the server and
   accepts exactly the four approved batches. Extra or altered batches reject review.
4. `publish-reviewed EXACT_SCOPE_HASH` requires the inspected private review hash,
   repeats the scope checks and atomically confirms the saved scope. A retry
   recovers the same publication receipt without adding another revision.
5. `verify-publication` records the actual published heads for subsequent
   authenticated Student acceptance.

The final private publication handoff contains only the staging project identifier
and the four actual publication documents. QA enrollment attaches to those exact
batches. The acceptance runner does not grant purchases or register live classes.
API record comparisons remain distinct from browser rendering and protected file
access evidence.
