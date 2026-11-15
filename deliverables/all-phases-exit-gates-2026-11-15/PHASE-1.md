# Phase 1 — Product catalogue and entitlement foundation

**Status: original staging phase gates supported; current combined local regression recorded separately.**

Review date: 15 November 2026 (Asia/Kolkata).

Checked items retain their original phase scope and evidence attribution. Historical hosted results are not relabeled as tests of the current combined candidate. Fresh local results are recorded in [local-regressions.json](local-regressions.json); the [inherited evidence index](inherited-evidence-index.json) preserves source hashes. No hosted or Production mutation is part of this review.

[Original phase evidence](../phase1-exit-gate-audit-2026-11-01/README.md) remains the authority for historical hosted outcomes. Product Owner acceptance of the final combined candidate and Production release are separate.

| Check | Exit gate | Evidence boundary |
| --- | --- | --- |
| [x] P1-01 | Four product scopes are represented: Full Course, Quant, Verbal and DI. | Four applied product/grant scopes; current entitlement and catalogue regression. |
| [x] P1-02 | Approved terminology or the accepted compatibility mapping is retained. | Accepted internal full_batch / subject_crash mapping; no historical migration rewrite. |
| [x] P1-03 | Full Course grants all three subjects. | Exact entitlement constraints and current paid integration. |
| [x] P1-04 | Each individual grants only its selected subject. | Quant/Verbal/DI access isolation, including current paid integration. |
| [x] P1-05 | Individual packages do not silently become Full Course. | All-three individual package remains a separate scope. |
| [x] P1-06 | Configured one/two/three-subject and Full Course prices are correct. | ₹10K/₹18K/₹25K tiers; separate ₹25K Full Course; valid combinations covered. |
| [x] P1-07 | Upgrade estimates use the approved current-tier difference. | ₹8K/₹7K/₹15K differences and original-expiry policy; actual payment evidence belongs to Phase 3. |
| [x] P1-08 | Trusted confirmation starts six calendar months of access. | UTC calendar-month arithmetic and boundary checks; provider confirmation belongs to Phase 3. |
| [x] P1-09 | Expired, revoked, inactive, unsigned and wrong-subject access is denied. | Historical authenticated staging matrix plus fresh local denial regressions. |
| [x] P1-10 | Existing MVP behavior and application data are preserved. | Historical 60-table cleanup and legacy routes; fresh legacy suites. |
| [x] P1-11 | Browser roles cannot directly grant purchases or product access. | Historical role/write denial and current permission tests. |
| [x] P1-12 | The original staging migration was applied once with recorded checksum. | Historical ledger/schema evidence; later Phase 3 reconciliation preserves original ledger. |
| [x] P1-13 | No Production migration or data mutation forms part of this work. | Recorded staging-only history; current regression uses disposable databases. |

**Fresh local result:** 18 suite runs / 173 passing tests; zero failures. Execution details and source hashes appear in the regression report.

## Current combined-candidate closure

- [ ] Hosted regression on the final deployed combined candidate, recorded under Phase 6.
- [ ] Final combined-candidate Product Owner decision.

## Fresh browser regression

- [x] 20 synthetic browser cases passed on the current application source, with no page runtime errors. [Report](phase1-browser-results.json).

The [combined verification record](final-local-verification.json) attributes the tested harness and distinguishes local adapters from real hosted authentication and payment delivery.
