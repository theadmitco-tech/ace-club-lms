# Phase 6 — Integrated QA and staging acceptance

**Status: local integrated verification is recorded below; final hosted acceptance and Product Owner decision remain open.**

Review date: 15 November 2026 (Asia/Kolkata). The combined branch is `intern/v2-phase-3-integration-review`; the starting candidate is `17945d4bafa9af92e9635ac16b0f99da0ed6e2ca`. The [fresh regression report](local-regressions.json) attributes execution to that candidate. Subsequent tool/document changes retain their own source hashes and review evidence.

## Required exit gates

| Check | Gate | Current evidence and remaining requirement |
| --- | --- | --- |
| [ ] P6-01 | All approved acceptance criteria map to dated evidence. | The original [acceptance matrix](../phase6-staging-acceptance/ACCEPTANCE-MATRIX.md) and this seven-phase checklist map requirements. Actual provider-backed payment/combined-hosted observations remain missing. |
| [ ] P6-02 | Exact branch, commit, Preview URL and staging project are recorded. | Branch, source and staging project `eyphkkginlgoaxflauog` are known. The final combined-candidate Preview and deployment identity still require verification. |
| [x] P6-03 | Local tests, lint, TypeScript and build pass. | Fresh database/unit regressions, all 141 synthetic browser cases, full lint, TypeScript and the local application build pass. [Final local verification](final-local-verification.json) records source hashes and attempt boundaries. |
| [ ] P6-04 | Admin and Student journeys pass with synthetic records. | Local four-offering and payment-to-learning journeys are covered; current hosted browser journeys and exact fixture cleanup remain open. |
| [ ] P6-05 | Authorization, privacy, entitlement, payment and expiry checks pass. | Local isolation, server contracts, idempotency, expiry and integrated learning are covered. Actual Google/Razorpay/webhook and hosted resource observations remain open. |
| [ ] P6-06 | No unresolved critical defect remains. | No pass is inferred from local tests alone. Required hosted payment/concurrency checks and final review remain outstanding. |
| [x] P6-07 | Non-critical follow-ups have role owners and next actions. | Role-based follow-up table appears below. No personal attribution is introduced. |
| [x] P6-08 | Staging migrations are ordered and recorded. | Historical Phase 1/2/4/5/6 activation evidence and the [operator-supplied Phase 3 reconciliation](../phase3-preview-activation/hosted-reconciliation.json) retain exact migration/body/permission preservation evidence. No migration was rerun in this audit. |
| [x] P6-09 | No Production migration, deployment or data change occurred in this work. | Verification uses disposable local PostgreSQL and synthetic fixtures. No Production operation is performed or implied. This is scoped operational evidence, not a new Production database comparison. |
| [ ] P6-10 | Product Owner explicitly accepts or rejects the staging result. | An explicit decision on the final tested candidate has not been recorded. A push, PR, local pass or earlier walkthrough is not that decision. |

**Fresh local result:** 4 suite runs / 12 passing tests; zero failures. Execution details and source hashes appear in the regression report.

## Local integrated coverage

The current integrated suites apply the Phase 3 migrations after the earlier learning, content and conflict-repair migrations. They exercise:

- Full Course, Quant, Verbal and DI access, exact subject isolation and foreign-course denial.
- Trusted-service synthetic payment fulfillment, activation, enrollment and replay without duplicate purchases.
- Recording-only access without invented live registration.
- Independent reading publication, subject-specific feedback gates and confirmed-feedback unlock.
- Purchase expiry, protected placement denial and retained purchase history.
- Actual Admin content preview without learning-progress changes.
- Deterministic stale-revision conflicts, preserved function/security metadata and original migration records.

The [access report](local-integrated-results.json), [paid integration report](local-paid-integration-results.json), and [repair preservation report](local-conflict-repair-results.json) retain individual assertions. Synthetic service fulfillment does not prove a Razorpay charge, signature, actual webhook, Google redirect or payment-provider retry.

## Outstanding role-owned actions

| Owner role | Next action | Phase boundary |
| --- | --- | --- |
| Deployment owner | Deploy the final pushed candidate as Preview with staging-only configuration and supply the exact URL and commit. | Phase 3 / 6 hosted acceptance |
| Identity/payment configuration owner | Configure the Preview Google callback and dedicated signed Razorpay Test Mode webhook; keep credentials private. | Phase 3 hosted acceptance |
| Engineering / QA | Record actual Full Course/subject checkout, failure/retry/delay/duplicate, upgrade, eight-place contention, protected resources and legacy smoke; complete exact cleanup and absence checks. | Phase 3 / 6 closure |
| Product Owner | Review the completed staging evidence and record acceptance or rejection. | Phase 6 exit |
| Content operations | Supply a final Tally form before any replacement of the approved temporary LMS form; retain verified response binding. | Separate approved substitution follow-up |
| Content operations | Review intermittent Notion API behavior while the original embed and explicit fallback remain available. | Provider limitation, not universal availability claim |
| Release owner | Review the final release candidate, reconciliation, recovery and rollback evidence before separately authorizing Production. | Phase 7; no release inferred |

Historical Phase 1/2/4/5 hosted reports remain evidence for their original commits. This checklist does not silently promote those reports to a current combined-candidate hosted pass.

The [inherited evidence index](inherited-evidence-index.json) preserves hashes of the original phase reports and operator-supplied schema reconciliation.
