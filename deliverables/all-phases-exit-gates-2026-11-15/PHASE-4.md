# Phase 4 — Website learning delivery

**Status: original staging phase gates supported; current combined local regression recorded separately.**

Review date: 15 November 2026 (Asia/Kolkata).

Checked items retain their original phase scope and evidence attribution. Historical hosted results are not relabeled as tests of the current combined candidate. Fresh local results are recorded in [local-regressions.json](local-regressions.json); the [inherited evidence index](inherited-evidence-index.json) preserves source hashes. No hosted or Production mutation is part of this review.

[Original phase evidence](../phase4-hosted-acceptance/EXIT-GATES.md) remains the authority for historical hosted outcomes. Product Owner acceptance of the final combined candidate and Production release are separate.

| Check | Exit gate | Evidence boundary |
| --- | --- | --- |
| [x] P4-01 | Recordings and live classes have separate Student journeys. | Historical responsive/browser review and current learning regressions. |
| [x] P4-02 | Recording-only, live and mixed learning remain supported. | Historical actual playback observation and separate self-report evidence; current workflow tests. |
| [x] P4-03 | Private meetings require eligible live registration. | Historical hosted role matrix and current direct-route guards. |
| [x] P4-04 | Applicable sessions reuse shared recordings. | Historical exact published Full Course/subject references retained. |
| [x] P4-05 | All four resource collections enforce entitlement and expiry. | Current database/security tests and historical protected PDF/reading checks. |
| [x] P4-06 | Sessions can be opened in arbitrary order with an outline. | Historical 31-session review and current learning-state contracts. |
| [x] P4-07 | Feedback locks only the applicable subject. | Multiple-pending-obligation and cross-subject isolation tests. |
| [x] P4-08 | Obligated session materials and feedback remain available. | Current-session access and sibling-session private-reference omission. |
| [x] P4-09 | Confirmed feedback resolves only applicable obligations. | Idempotent submission, interrupted/concurrent obligations and current integration. |
| [x] P4-10 | Missed live classes can be reported without invented attendance. | Approved no-rating missed-class form; recording-preserving unlock. |
| [x] P4-11 | Unpublished, unpaid, expired and unauthorized content stays inaccessible. | Current paid/unpaid/expired integration plus security matrix. |
| [x] P4-12 | Existing mocks and original data remain preserved. | Historical exact 85-table cleanup and nine-account absence; fresh legacy regression. |

**Fresh local result:** 5 suite runs / 20 passing tests; zero failures. Execution details and source hashes appear in the regression report.

## Current combined-candidate closure

- [ ] Hosted regression on the final deployed combined candidate, recorded under Phase 6.
- [ ] Final combined-candidate Product Owner decision.

The temporary in-page feedback form remains the approved substitute. A future Tally replacement is separate work, not an unreported passed integration. Playback observations and self-reported attendance retain their stated limits.

## Fresh browser regression

- [x] 16 synthetic browser cases passed on the current application source, with no page runtime errors. [Report](phase4-browser-results.json).

The [combined verification record](final-local-verification.json) attributes the tested harness and distinguishes local adapters from real hosted authentication and payment delivery.
