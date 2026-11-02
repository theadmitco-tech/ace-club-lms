# Hosted Phase 2 acceptance runner

The passwordless runner uses dedicated staging identities and exact synthetic
fixtures. It requires the existing private staging API credential file and an
explicit Preview URL and commit. Production is excluded by the project guard,
the Preview origin check and the application feature gates.

The generated fixtures contain nine accounts, five batches and seven synthetic
purchases. They never take payments. Existing source material, purchases,
accounts, legacy mocks and recorded progress are not fixture mutation targets.

1. `node scripts/phase2-hosted-qa.mjs prepare <preview-url> <commit>` creates the
   dedicated accounts and writes SQL Editor setup/cleanup files under
   `deliverables/phase2-hosted-acceptance`. Passwords remain in a chmod-600 file
   under `/tmp`; the reviewable manifest contains no credentials.
2. An optional `attach-real-course <batch-uuid> <private-publication-report>
   <private-approved-plan>` step attaches an already published Full Course
   before fixture setup. The exact staging publication, revisions, headings and
   nineteen approved resource placements must match. The command performs no
   network requests; the original private plan remains outside version control.
   Setup then adds one enrollment for the dedicated Full Course QA account,
   using its existing synthetic purchase. The baseline precedes that enrollment.
3. The staging operator executes the generated setup SQL and saves its JSON
   result outside version control. `accept-baseline <result-path>` records the
   exact public-data fingerprint and finalizes the cleanup guard.
4. A private protected-Preview share URL is stored in
   `/tmp/ace-phase2-preview-access` with mode 600. `verify` checks the deployed
   commit and staging project before hosted application tests.
5. The operator executes the finalized cleanup SQL. The transaction removes only
   exact fixture IDs and checks that every other public row matches the setup
   fingerprint. Generated profiles are excluded from that fingerprint because
   the inactive-account fixture deliberately changes their state.
   The optional existing-course enrollment is removed only when its batch,
   Student and Admin actor match the generated run. The real course, publication
   and resources remain unchanged.
6. `accept-cleanup <result-path>` records the matching cleanup result.
   `cleanup-accounts` then verifies account ownership and removes those exact
   generated Auth accounts. The private password is removed afterward.

Universal publication confirmation runs only when every server-selected batch
belongs to this fixture run. If another batch enters the scope, the runner
records that confirmation as not run. Existing batches are never published by
this test as a fallback.

The runner validates protected delivery, explicit live registration, expiry,
revocation, inactivity, wrong subjects, unpublished denial, private table access,
reading and file API denials, shared Student rendering and the Admin completion
confirmation. With the optional real-course attachment, it additionally compares
every published session and all nineteen resource references with the private
approved plan, checks exact mobile headings, downloads five protected PDFs and
checks two unique Notion readings. Wrong-Student and anonymous resource requests
must fail. Actual PDF bytes must have a valid PDF header; signed storage URLs
must remain server-side.

Legacy Notion embed references remain unchanged. A recognized reference supplies
only a candidate page identifier until the provider returns a validated page.
An authorized provider failure can display the exact original embed with a
visible availability notice; application authorization denial never enables that
fallback. Provider API unavailability remains inconclusive in the acceptance
report, and original embed content receives a separate rendering check. Legacy
authenticated journeys and actual universal publication remain separate evidence.
A passing synthetic run does not by itself close every Phase 2 gate.

Concurrent unrelated staging writes can invalidate the cleanup fingerprint. That
condition stops and rolls back cleanup; it never permits a baseline bypass.

## Hosted authoring supplement

`node scripts/phase2-hosted-authoring.mjs` uses only the exact generated Verbal
template and batch after fixture setup. The browser changes and reopens the
session heading and all four resource collections through the deployed Admin
form. The initial published revision remains pinned until a separate reviewed
batch publication. The supplement then verifies undated batch content edits,
publish/unpublish/republish, request replay, stale review rejection and immutable
original template history. All mutations remain inside the existing cleanup scope.

A batch retains its original template identity and revision anchor; later content
edits are supplied explicitly in its session document. The supplemental runner
records its earlier interrupted attempt separately. The explicit
`--resume-lifecycle` option requires the matching completed UI evidence and the
expected synthetic template revision before continuing the publication checks.

The main runner waits for the streamed Admin heading before checking its presence.
The initial premature-heading assertion remains recorded as a failed first attempt;
it is not presented as a product regression or omitted from the audit trail.
