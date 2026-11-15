# Phase 3 exit-gate checklist

Status: all eleven gates have implementation and local verification coverage; final hosted acceptance remains open. No gate requiring actual Google or Razorpay delivery is represented as complete by synthetic tests. Phase 0 is excluded.

## Gate-by-gate result

| Required exit gate | Local implementation and verification | Final acceptance still required |
| --- | --- | --- |
| Published eligible offerings/batches are browsable before payment | [x] Explicit public catalogue projection excludes private references, drafts and Student data; publication is rechecked during checkout. | [ ] Current deployed catalogue and eligible selection reviewed. |
| Full Course and individual Quant/Verbal/DI remain distinct | [x] Product-selection and server-quote contracts enforce the approved separate offerings. | [ ] Current hosted selection and checkout reviewed. |
| Outline, headings, live availability, price and six-month terms are visible | [x] Public projection and actual-component synthetic browser coverage exist; pricing is server-controlled. | [ ] Final Preview visual and accessibility review with configured offerings. |
| Registration grants access without manual Admin enrollment | [x] SQL fulfillment activates eligible inactive signup candidates and creates enrollment atomically; disabled existing accounts remain denied. | [ ] Genuine fresh Google sign-in and captured Test Mode payment-to-access journey. |
| Full Course payment grants all three sections | [x] Fulfillment and combined paid integration verify all three sections. | [ ] Actual Full Course Test Mode payment and protected learning walkthrough. |
| Individual payment grants only selected subjects | [x] Exact product grants and cross-subject denial are verified locally. | [ ] Actual individual-package payment and subject-isolation walkthrough. |
| Eight-student live capacity is atomic | [x] Parallel local database requests and Admin allocation use the same batch bound. | [ ] Hosted final-place contention and delayed-capture result. |
| No per-session reservation or waitlist | [x] Checkout and capacity contracts operate on batches only. | [ ] Hosted workflow confirmation. |
| Payment verification is server-controlled and idempotent | [x] Exact HMAC, provider-state refetch, amount/receipt checks, order-creation claim and event replay are covered. | [ ] Actual capture, callback and independently delivered signed webhook. |
| Failure/delay/duplicate/replay cannot grant incorrect access | [x] Failed/authorized/ambiguous/refunded snapshots, delayed conflict review, partial-grant rollback and replay rejection are covered. | [ ] Actual provider failure/retry/delay and callback-independent delivery evidence. |
| Upgrades charge current-tier difference and preserve original expiry | [x] Eligibility exclusions, additive purchase-upgrade ledger, tier difference and exact expiry are verified locally. | [ ] Actual Test Mode upgrades with original-expiry evidence. |

Historical staging reconciliation confirms three exact Phase 3 migrations, twenty-one functions, three triggers, four new private tables and preservation of the original eighty-eight application tables. That operator-supplied result establishes schema preservation, not hosted provider acceptance. Applied migrations are not rerun or edited.

## Developer preparation completed in this audit

- [x] Existing payment suites rerun: 25 tests passed across public catalogue, checkout database and server contracts.
- [x] Existing acceptance preparation rerun: 26 tests passed across exact SQL fixture cleanup, offline receipt tracking and read-only provider verification.
- [x] Missing account lifecycle implemented and locally verified: 11 tests passed covering pending-before-create state, exact ownership, normalized-provider refusal, interrupted creation recovery, SQL-cleanup binding, purchase/checkout denial, interrupted deletion recovery and independent absence checks.
- [x] New account tooling passes focused ESLint. No application source, applied migration or deployment configuration is changed by this tooling.
- [x] Supabase Admin creation ordering is reconciled in generated fixture SQL, with strict synthetic ownership and no applied-migration change.
- [x] Partial account preparation has a documented exact-identity abort path; its guarded SQL and independent absence query passed disposable PostgreSQL checks.
- [x] Private manifests and synthetic authentication remain explicitly separated from genuine Google OAuth evidence.
- [x] Production, real payments and existing Student accounts remain outside mutation scope.
- [ ] Generated hosted account creation and exact account cleanup executed after Preview readiness.
- [ ] Provider-backed final-candidate acceptance, combined hosted regression and Product Owner review recorded.

The distinct local test total for this audit is 62: 25 payment/catalogue cases, six disposable PostgreSQL fixture cases, six offline lifecycle cases, fourteen synthetic payment-verifier cases and eleven account-lifecycle cases. The [verification record](phase3-local-verification.json) identifies the executed groups and exact current source hashes. Coverage includes actual Auth insert-then-metadata ordering, explicitly labeled synthetic candidate seeding, the exact documented partial-preparation abort SQL and private-output exclusion from Git. The ten actual-component synthetic browser journeys are coordinated by the combined verification owner and remain separate from real provider evidence.

## Immediate dependency

The Phase 3 candidate has not yet been confirmed deployed. The next external dependency is an owner-managed Preview with the branch-scoped staging/Test Mode configuration, Google callback and reachable signed webhook. The [deployment handoff](../phase3-preview-activation/DEPLOYMENT-HANDOFF.md) remains authoritative; its existing operator edits are preserved.

Once that Preview exists, Engineering can use the [generated account lifecycle](../phase3-preview-activation/HOSTED-ACCOUNT-LIFECYCLE.md), [fixture setup/cleanup workflow](../phase3-preview-activation/HOSTED-QA-PREPARATION.md), [hosted acceptance matrix](../phase3-preview-activation/HOSTED-ACCEPTANCE.md) and [read-only payment verifier](../phase3-preview-activation/READONLY-PAYMENT-VERIFICATION.md). Final Phase 3 acceptance cannot be closed by a local build or a Git push alone.

## Fresh browser regression

- [x] 10 synthetic browser cases passed on the current application source, with no page runtime errors. [Report](phase3-browser-results.json).

The [combined verification record](final-local-verification.json) attributes the tested harness and distinguishes local adapters from real hosted authentication and payment delivery.
