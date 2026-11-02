# Phase 4 exit-gate evidence

Status: all twelve Phase 4 staging exit gates passed. The exact 85-table baseline
was restored and all nine generated QA accounts were removed and verified absent.
The [evidence record](README.md) defines counts, retained attempts and limitations.

| Gate | Required behavior | Evidence | Current assessment |
| --- | --- | --- | --- |
| P4-01 | Separate recordings and live classes | Thirteen-case local browser suite; hosted unregistered-live and Admin completion journeys; responsive real-course visual review | Passed |
| P4-02 | Recording, live and mixed learning | Hosted Full Course subject coverage, recording self-report, mapped live completion and missed-class recording access; local supported-player journey and 11 passing real-provider checks | Workflow and real playback checks passed |
| P4-03 | Private meeting delivery requires eligible live registration | Hosted `meeting-access:*`, `unregistered-live-details-hidden`, `anonymous-meeting-route-denied` and `completed-live-meeting-closed`; local direct-route tests | Behavior checks passed |
| P4-04 | Applicable offerings reuse the shared recording | Provider report compares actual published Quant/DI recordings with real Full Course; hosted existing-library fingerprint remains unchanged | Actual shared-reference checks passed; short real playback is evidenced separately |
| P4-05 | Resources enforce entitlement and expiry | Hosted `course-access:*`, individual scope and five real PDF authorized/denied pairs; both reading denied-access checks; local database and route eligibility tests | Behavior checks passed; existing external URLs are not provider-level DRM |
| P4-06 | Arbitrary session order and visible outline | Hosted `arbitrary-session-order` and `session-open-not-feedback`; 31-item hosted outline review; local long-outline keyboard case | Behavior checks passed |
| P4-07 | Feedback gates remain subject-specific | Hosted `recording-self-report-created-obligation`, `subject-only-lock-with-current-session-open` and locked progress denial; local multiple-obligation tests | Behavior checks passed |
| P4-08 | Current obligated sessions retain materials and feedback | Hosted current-session access and locked-session reference omission; local browser and route tests | Behavior checks passed; synthetic unavailable-resource 404s are only smoke evidence |
| P4-09 | Confirmed feedback resolves applicable obligations | Hosted `browser-feedback-confirmed-unlock` and missed-live unlock; local duplicate, interrupted and concurrent-obligation checks | Behavior checks passed |
| P4-10 | Missed classes are reportable without invented attendance | Hosted Admin mapped completion, no-ratings missed-class form, recording-preserving unlock; local missing-recording case | Behavior checks passed; attendance remains a self-report |
| P4-11 | Unpublished, unpaid, expired and unauthorized content remains inaccessible | Hosted access matrix, seven private-table denials, cross-Student feedback denial, locked reference omission and unpublication denial; local security tests | Behavior checks passed |
| P4-12 | Existing mocks and application data remain preserved | Phase 1 and Phase 2 local regressions; activation preservation receipt; hosted real-library fingerprint; unchanged original Phase 1 migration hash | Passed; exact 85-table cleanup baseline restored and generated accounts removed |

## Closeout and review handoff

- The [operator-supplied cleanup receipt](cleanup-result.json) confirms fingerprint
  `27145d216badf73e85ee4a42930499a2` across 85 tables.
- The [account-cleanup verification](account-cleanup.json) independently confirms
  that all nine generated Auth identities are absent, with no generated profiles or purchases.
- The reviewed application passed six final Preview smoke checks. Final records
  preserve neutral project attribution; application source and applied migrations remain unchanged.
- Draft PR creation remains blocked by GitHub integration 403. Prepared PR text does
  not establish an existing PR, readiness approval, merge or Production release.

The temporary in-page feedback form is the approved replacement while the Tally form
is unavailable. Tally integration and Phase 3 payment fulfillment are separate work.
