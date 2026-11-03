# Phase 6 acceptance matrix

Status: **not signed off**. The approved roadmap and supplied exit-gate checklist define the scope. All rows below are mapped; mapping does not mean all rows pass. Baseline candidate: `879be1fcf2b32f6a4ef42ae431ca3ac6521fa06d`. Fresh Phase 6 local results include additive repair `20261103120000`. Hosted repair acceptance is separate.

The [evidence index](evidence-index.json) records file hashes, exact reported commits and available execution timestamps. Missing execution timestamps remain explicitly missing; Git provenance dates are not substituted for run dates. Per-check commits take precedence over report-level commits. Duplicate check identifiers are not counted as distinct coverage.

## Twelve integrated journeys

| Journey | Evidence | Outcome / remaining work |
| --- | --- | --- |
| Full Course purchase and access | Phase 1 `access-list:full`, section boundaries; Phase 4 `full-course-three-subjects`; Phase 6 `full_course:*` local assertions | Access passes with synthetic grants. Provider purchase and fulfillment **blocked**. |
| Quant purchase and access | Phase 1 `access-list:q`, section boundaries; Phase 5 `eligible-quant-private-file-available`; Phase 6 `quant:*` | Access passes with synthetic grants. Provider purchase **blocked**. |
| Verbal purchase and access | Phase 1 `access-list:v`, section boundaries; Phase 6 `verbal:*` | Access passes with synthetic grants. Provider purchase **blocked**; complete hosted integrated journey remains open. |
| DI purchase and access | Phase 1 `access-list:d`, section boundaries; Phase 6 `di:*` | Access passes with synthetic grants. Provider purchase **blocked**; complete hosted integrated journey remains open. |
| Recording-only, no live batch | Phase 2 `undated-batch-revision-retains-independent-content`; Phase 4 `unregistered-live-details-hidden`; Phase 6 all four `recording-only-authorized` | Scoped inherited hosted evidence and fresh local integration pass. No live purchase claim. |
| Live schedule publication/update | Phase 2 authoring lifecycle and `ist-schedule.json`; Phase 4 mapped live completion | Prior hosted behavior passes. Applied conflict repair requires hosted response verification. |
| Eight-student registration limit | Approved Phase 3 design: eight places per batch, live registration included in configured price | **Blocked**: paid atomic allocation is not deployed. Schedule capacity metadata and Admin registration are not acceptance evidence. |
| Recording upload/replace/delete | Phase 5 browser upload, range stream, replacement, unpublish/deletion denial; direct Storage check | Prior hosted lifecycle passes. Private storage retention and external sharing are separate. |
| Pre-read and visual progress | Phase 5 five placements, `reading-reminder-never-creates-feedback`; Phase 6 four-offering publication/feedback tests | Prior hosted and fresh local checks pass. Visual state is not verified attendance or hard completion. |
| Admin preview/immediate publication | Phase 5 preview matrix, new-tab/reordering report; Phase 6 read-only preview and stale publication denial | Prior hosted and fresh local checks pass. Phase 6 repaired adapters require exact Preview verification. |
| Expired/direct URL protection | Phase 1 expired/revoked/inactive matrix; Phase 4 private PDFs and locked URL omission; Phase 5 expired/revoked/wrong-subject direct files; Phase 6 revocation | Prior hosted security and fresh local revocation checks pass. Payment-issued entitlement expiry remains untested. |
| Existing MVP compatibility | Phase 1 Student legacy worksheet/read/write/material and Admin editor reports; prior-phase local regressions | Historical hosted checks and fresh local regression coverage pass. Final post-Phase-3 integrated candidate still requires compatibility smoke. |

## Phase 6 exit gates

| Gate | Current status |
| --- | --- |
| All approved criteria map to dated evidence | Mapped. Some inherited reports lack execution timestamps; outstanding payment journeys have no passing evidence. Full gate remains open. |
| Exact branch/commit/Preview/staging recorded | Baseline recorded; Phase 6 deployment verification pending. |
| Local tests/lint/TypeScript/build pass | Passed locally; exact Phase 6 CI pending. |
| Synthetic Admin/Student journeys pass | Prior hosted plus new local checks pass within scope; complete paid journey blocked. |
| Authorization/privacy/entitlement/payment/expiry pass | Access checks pass within recorded scope; payments and payment-issued expiry blocked. |
| No unresolved critical defect | Not signed off. Conflict repair applied; hosted verification pending. Payment safety is unverified. |
| Follow-ups have role owners and next actions | Recorded below. |
| Migrations ordered and recorded | Phase 1/2/4/5 preserved; Phase 6 additive repair receipt recorded. Phase 3 remains deliberately absent. |
| No Production mutation | No Production writes authorized or performed. Baseline deployment metadata recorded. |
| Explicit Product Owner decision | **Pending**; no acceptance or rejection has been supplied for an integrated Phase 6 candidate. |

## Open items and next actions

| Priority | Owner role | Next action |
| --- | --- | --- |
| Acceptance blocker | Payment account owner | Select the provider and arrange authorized test-mode access, without posting credentials in chat. |
| Acceptance blocker | Engineering | Integrate Phase 3; verify prices server-side, fulfillment, upgrade expiry, cancellation/failure, signed callbacks, duplicate/out-of-order webhooks, retry idempotency and eight-place concurrency. |
| Acceptance blocker | Engineering / QA | Verify the applied Phase 6 repair through bounded hosted requests and the exact Preview; rerun affected journeys after Phase 3 integration. |
| Acceptance blocker | Product Owner | Accept or reject the final candidate explicitly after all required journey evidence exists. |
| Follow-up | Content operations | Supply the final Tally form and verified response integration when replacing the approved temporary LMS form. |
| Follow-up | Content operations | Resolve intermittent Notion API availability; original embed rendering/fallback evidence remains scoped and does not imply universal provider success. |

## Payment test completion record

The future test record must identify the provider's test environment, exact application commit, staging project, synthetic account cohort and cleanup baseline. Full Course and the three subject offerings must each pass checkout-to-entitlement delivery. Invalid amount/currency, spoofed success, invalid signatures, duplicate events and interrupted requests must not grant extra access. The ninth concurrent live registration must fail without overselling; failure/cancellation and reservation release must preserve the eight-place invariant. Upgrades must obey the approved price-difference rule and original expiry. No live charge or Production key is permitted in these tests.
