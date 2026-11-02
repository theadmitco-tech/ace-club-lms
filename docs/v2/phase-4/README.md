# Phase 4 — Website learning delivery

Status: Phase 4 implementation and staging acceptance are complete. Student/Admin
workflows, real playback, responsive layout and exact cleanup have passed. The nine
generated QA accounts were removed and independently verified absent. The
[evidence checklist](../../../deliverables/phase4-hosted-acceptance/EXIT-GATES.md)
records all twelve gates. Draft review handoff, merge and Production release remain separate.

The review branch is `intern/v2-phase-4-review`, based on merged Phase 2 commit
`56cabd9722c8aa5dd1f09e0e8d4c644c34058649`. Phase 3 checkout work remains on its
separate review branch. Phase 4 can exercise purchased-access fixtures without
Razorpay credentials; the complete payment-to-learning journey remains a separate
Phase 3 and integrated-acceptance dependency.

## Required outcomes

The supplied Phase Exit Gates checklist defines twelve Phase 4 requirements.

| Gate | Required result | Required evidence | Status |
| --- | --- | --- | --- |
| P4-01 | Recording and live-class experiences are clearly separated | Browser journeys show distinct destinations and states | Passed |
| P4-02 | Recording, live and mixed learning remain available | Recording-only and registered-live fixtures, including missed live classes | Passed |
| P4-03 | Only eligible live registrants receive private meeting details | Registered/unregistered/expired/revoked/inactive/wrong-subject matrix and direct requests | Passed |
| P4-04 | Applicable sessions reuse the shared recording | Source/asset comparison and rendered resource comparison | Passed |
| P4-05 | Every resource checks entitlement and expiry | Direct reading/PDF/course/meeting requests after entitlement changes | Passed |
| P4-06 | Sessions support arbitrary order and an outline view | Quant 4 opened first without prior-session completion | Passed |
| P4-07 | Feedback locks remain section-specific | Pending Quant feedback denies other Quant resources while eligible Verbal/DI remain accessible | Passed |
| P4-08 | Current obligated session resources and feedback remain available | Current pre-read, recording, post-read and worksheet checks while the section is gated | Passed |
| P4-09 | Confirmed feedback releases only applicable same-session obligations | Successful, duplicate, delayed and interrupted submissions; multiple outstanding obligations | Passed |
| P4-10 | Non-attendance is reportable without inventing attendance | Completed live-class feedback accepts non-attendance without requiring recording availability | Passed |
| P4-11 | Unpublished, unpaid, expired and unauthorized content remains inaccessible | Database, server route and hosted caller-session tests | Passed |
| P4-12 | Existing mocks remain unchanged | Source diff, regression checks and staging preservation evidence | Passed |

## Source precedence and decisions

The supplied Phase 4 exit gates define acceptance. The revised November wireframe
provides the visual direction. Its review-only controls do not authorize manual
recording-completion shortcuts or unverified feedback callbacks.

Confirmed during Phase 4 implementation on 2 November 2026:

- Recording feedback becomes due after 80% unique played coverage. Seeking and
  replaying already counted segments must not inflate watched coverage. Unsupported
  players require a clearly labeled self-report path, not a false verified-playback
  claim.
- All pending obligations are retained. Every current obligated session remains
  accessible; other sessions in that section stay gated until all applicable
  obligations are resolved. Recording and live triggers for the same batch/session
  share one feedback response; their trigger records remain retained.
- The supplied Tally form remains unavailable. A temporary in-page replacement
  was explicitly authorized: usefulness and clarity ratings, an optional comment,
  and a live attendance self-report. Non-attendance requires no ratings. The server
  must confirm the submission before unlocking content. Tally integration remains
  a later replacement rather than a Phase 4 activation dependency.

The temporary form must be labeled accurately in the handoff; no Tally integration
is claimed. Completion reversal remains a separate unresolved contract;
existing obligations, submissions and audit history must not be erased or silently
unlocked by a correction.

## Access and progress boundaries

Course outlines and eligible resource delivery are separate projections. A locked
session may remain listed in an outline, but its private resource references must
not be serialized into the Student response. Hiding controls in the browser is not
an authorization boundary.

Each direct material, reading, recording or meeting request must recheck the caller,
active entitlement, expiry, enrollment, current publication and applicable feedback
gates. The current obligated session remains available. Other entitled sections
remain independent. An expired entitlement cannot be revived by a feedback answer,
progress event, stale browser state or Admin feedback override.

Visual opened/read progress and the resume indicator are learning aids. They must
not be presented as verified attendance, assessment completion or hard engagement
analytics. Playback positions and duration are browser observations, not independent
provider attestations or proof of human attention. The server bounds elapsed time
and counts distinct intervals; forged observations may create the caller's own
feedback obligation but must never grant paid access or resolve existing feedback.
Unsupported-player completion is explicitly a self-report. An Admin preview must not mutate Student progress or create feedback
obligations. Existing public third-party resource URLs cannot be made secret again
after delivery; application authorization protects current application delivery and
must not be described as provider-level DRM.

## Acceptance packet

The [Preview activation record](../../../deliverables/phase4-preview-activation/README.md)
tracks environment isolation, fresh staging recovery evidence, migration rehearsal,
hosted fixtures and final delivery. The [test matrix](acceptance-matrix.md) defines
normal, negative, concurrency and interrupted-response checks.
