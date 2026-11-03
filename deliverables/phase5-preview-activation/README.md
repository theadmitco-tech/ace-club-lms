# Phase 5 Preview activation

Status: implementation and local validation complete; staging activation and hosted acceptance pending.

The isolated review branch is `intern/v2-phase-5-review`, based on Phase 4 commit
`5b4a2b12ca93c68079e523d1349b94c966893f7a`. Production remains unchanged. No merge
or PR readiness change is included. Phase 3 remains inactive.

## Completed local work

Independent content drafts, scope review, immediate publication, unpublishing,
replacement, deletion and per-placement ordering are implemented. Readings support
all five required locations. Admin preview renders the Student components in a new
tab with learning writes disabled. Private MP4/WebM/PDF uploads use a separate
staging bucket and authenticated streaming. Existing Notion rendering, explicit
failure states and the original embed fallback remain available.

Phase 1 (18 suites), Phase 2 (28 suites), Phase 4 (five suites), Phase 5 database,
storage, resource authorization, recovery and cleanup checks passed. Six Phase 5
browser journeys and 13 Phase 4 browser regressions passed. TypeScript, lint and
webpack build passed. Synthetic tests do not establish hosted acceptance.

The fresh application recovery copy restored 85 tables / 3,919 rows. The activation
packet passed a local rehearsal against that copy without changing existing rows.
The original Phase 1 ledger remains preserved. Storage platform recovery is not
claimed: the rehearsal uses a synthetic Storage catalogue for the new bucket.

## Activation sequence

1. The staging SQL Editor project must be `eyphkkginlgoaxflauog`.
2. The complete `RUN-ACTIVATION.sql` packet installs two new migrations atomically.
   Its final JSON must identify `phase5_activation` and preserved existing rows.
   A stale baseline or prior installation causes rejection; rerunning migrations
   without reconciliation is prohibited.
3. The Phase 5 Preview branch receives the existing Phase 4 feature configuration
   plus `V2_CONTENT_PUBLISHING_ENABLED=true`. A staging service key override requires
   branch-specific authorization; the previous overrides apply to other branches.
4. Dedicated QA accounts and fixture SQL support hosted authorization, publication,
   placement, upload, replacement and preview checks.
5. Exact SQL cleanup restores the recorded baseline, followed by generated Auth
   account removal and independently verified absence. Existing walkthrough
   accounts, grants, libraries and progress remain outside cleanup scope.

## Evidence

- `application-recovery-report.json`: sanitized row-recovery and activation rehearsal.
- `activation-manifest.json`: proposed migration hashes and expected routine guards.
- `local-browser-results.json`: six synthetic UI journeys and source hashes.
- `phase4-browser-regression.json`: 13 synthetic learning journeys and source hashes.
- `../../docs/v2/phase-5/README.md`: design, hosting boundaries and outstanding gates.

No Phase 5 exit gate is represented as fully closed before hosted validation and
cleanup are recorded. Phase 4 remains a separate Draft PR; the Phase 5 review is
stacked on its branch until an authorized integration occurs.

## Activation interruption

The first hosted attempt rejected the baseline at `v2_recording_watch_samples`
before migrations were applied. A repeated export contained the same logical rows.
The old JSON export could normalize numeric scale during dashboard copying; its
local restoration report does not establish byte-exact hosted row preservation.
The corrected `01-EXPORT-EXACT-RECOVERY.sql` wraps the PostgreSQL payload in a
checksummed string. A new exact recovery and regenerated activation packet are
required before another attempt. Numeric precision and scale survive a simulated
dashboard JSON round trip in the corrected local regression test.

The approved Phase 5 service key and feature flags are scoped to its Preview branch.
The existing environment-variable metadata remained unchanged. Preview deployment
`dpl_9JeYtqpyrwMP53fFSbx9DvZRGPbG` passed the public environment check at `66f12f4`.
GitHub Verify run `41475812117` passed for that commit. GitHub integration permissions
returned 403 when Draft PR creation was attempted; no Phase 5 PR exists yet.
