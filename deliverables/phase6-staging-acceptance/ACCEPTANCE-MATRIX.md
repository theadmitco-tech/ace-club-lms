# Phase 6 acceptance matrix

Status: **local combined-candidate verification passed; hosted acceptance and Product Owner sign-off remain open**. The current source baseline is `c593d2de13c563b72adbaf216cf37ed30a038cc7`, with the exact changed test sources identified in the [developer closeout report](../all-phases-developer-closeout-2026-11-14/integration-results.json). No fresh hosted result is implied by a passing local suite.

Razorpay Test Mode is selected and read-only provider authentication passed. Phase 3 is integrated with the later learning, publishing and conflict-response changes. The operator-supplied [schema reconciliation](../phase3-preview-activation/hosted-reconciliation.json) confirms all three Phase 3 migrations, 21 routine guards, three triggers and preservation of the original 88 application tables. Provider selection and schema installation are no longer blockers. Deployment access, hosted OAuth/payment/webhook acceptance and final review remain outstanding.

The [inherited evidence index](evidence-index.json) retains original file hashes, commits, execution timestamps and limitations. Missing execution timestamps remain explicitly missing; Git provenance dates are not substituted for run dates. Prior evidence is supporting regression history rather than proof that the current candidate passed hosted acceptance.

## Twelve integrated journeys

| Journey | Current local evidence | Hosted outcome / remaining work |
| --- | --- | --- |
| Full Course purchase and access | Trusted-service synthetic fulfillment automatically activates the new Student and enrolls the published course. All three subjects, replay idempotency, feedback isolation and expiry pass. | Actual Google sign-in, Razorpay payment and hosted delivery remain open. |
| Quant purchase and access | Synthetic fulfillment, exact Quant entitlement, independent reading delivery and expiry pass. | Actual provider purchase and hosted delivery remain open. |
| Verbal purchase and access | Synthetic fulfillment, exact Verbal entitlement, independent reading delivery and expiry pass. | Actual provider purchase and hosted delivery remain open. |
| DI purchase and access | Synthetic fulfillment, exact DI entitlement, independent reading delivery and expiry pass. | Actual provider purchase and hosted delivery remain open. |
| Recording-only, no live batch | Four paid synthetic journeys create no live registration; the migrated four-offering regression remains recording-only. | Prior Phase 2/4 hosted evidence remains valid within its recorded scope; current candidate needs smoke verification. |
| Live schedule publication/update | Authoring suites and bounded conflict adapters pass; Phase 3 checkout tests exercise paid live allocation. | The historical Phase 6 Preview passed bounded PostgREST conflicts and Server Action guidance. Current candidate requires affected-journey checks. |
| Eight-student registration limit | Phase 3 disposable database tests race ten requests, admit eight and reject the excess, then enforce the same limit against Admin registration. | Hosted provider-backed allocation, payment delays and final-place contention remain open. |
| Recording upload/replace/delete | Phase 5 publishing, storage and route regressions pass. | Prior hosted lifecycle and direct Storage denial are preserved; current candidate requires protected-resource smoke. |
| Pre-read and visual progress | Migrated four-offering regression and paid synthetic journeys preserve independent readings, same-subject feedback gates and other-subject access. | Prior Phase 4/5 hosted evidence is inherited. Visual state is not verified attendance. |
| Admin preview/immediate publication | Four paid-course Admin previews leave learning progress unchanged; publication and stale-revision suites pass. | Prior new-tab, placement and publication evidence is inherited. Latest Admin UI needs owner review on the deployed candidate. |
| Expired/direct URL protection | Expired synthetic paid purchases deny course and placement delivery while purchase history remains visible. Migrated revocation tests pass. | Current payment-issued entitlement expiry and protected-route checks remain open on staging. |
| Existing MVP compatibility | Phase 1/2/4/5 regressions pass together; original hosted schema reconciliation preserves the application rows and ledger. | Final combined-candidate legacy worksheet/editor/resource smoke remains open. |

## Phase 6 exit gates

| Gate | Current status |
| --- | --- |
| All approved criteria map to dated evidence | Mapped. Required hosted payment journeys still lack passing evidence. |
| Exact branch/commit/Preview/staging recorded | Source baseline and staging project are recorded. A Phase 3 combined-candidate Preview URL is still required. |
| Local tests/lint/TypeScript/build pass | Fresh local test results are recorded separately in the developer closeout. Final build and static checks require their own current source evidence. |
| Synthetic Admin/Student journeys pass | Four-offering and paid synthetic integration pass within their explicit database scope. Browser and provider results remain distinct. |
| Authorization/privacy/entitlement/payment/expiry pass | Local access, fulfillment, isolation, idempotency and expiry checks pass. Hosted provider verification remains open. |
| No unresolved critical defect | Local results do not establish this release gate; complete hosted acceptance and review remain required. |
| Follow-ups have role owners and next actions | Recorded below. |
| Migrations ordered and recorded | Phase 1/2/4/5/6 records are preserved. All three Phase 3 migration sources are confirmed installed by the operator-supplied reconciliation. |
| No Production mutation | No Production mutation forms part of the developer closeout. |
| Explicit Product Owner decision | **Pending** for the final combined candidate. PR creation, walkthrough approval and local tests do not constitute release acceptance. |

## Remaining owner and engineering actions

| Priority | Owner role | Next action |
| --- | --- | --- |
| Hosted acceptance | Deployment owner | Deploy the reviewed combined branch as Preview, apply only its staging-scoped configuration and supply the exact URL and commit. |
| Hosted acceptance | Payment / identity configuration owner | Confirm Test Mode webhook delivery and the staging Google redirect allowlist. Secret values remain outside chat and Git. |
| Hosted acceptance | Engineering / QA | Execute provider-backed Full Course/Quant/Verbal/DI checkout, callback/webhook retries, invalid signatures, failed and delayed payments, upgrades, eight-place concurrency and affected legacy/resource checks. |
| Hosted cleanup | Engineering / database operator | Restore the exact QA baseline and independently verify synthetic identities, purchases, registrations and objects are removed. Existing walkthrough records remain outside QA scope. |
| Acceptance | Product Owner | Accept or reject the exact combined candidate after required evidence exists. |
| Separate follow-up | Content operations | Supply the final Tally form and verified-response integration when replacing the approved temporary LMS form. |
| Separate follow-up | Content operations | Investigate intermittent Notion API responses; original embed/fallback evidence does not imply universal provider availability. |

## Payment evidence boundary

The local paid integration directly invokes the trusted-service fulfillment function with synthetic payment identifiers. It proves the transaction and downstream learning contracts, not a real Razorpay order, capture, signature, webhook or OAuth flow. The hosted record must identify the provider Test Mode environment, exact application commit, staging project, synthetic account cohort and cleanup baseline. No real charge or Production key is permitted. Existing shared legacy payment variables and endpoints remain outside the V2 test path.
