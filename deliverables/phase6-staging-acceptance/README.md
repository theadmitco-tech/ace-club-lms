# Phase 6 — integrated staging acceptance

Status: **current combined-candidate local verification passed; hosted payment acceptance and Product Owner sign-off remain pending**. Razorpay Test Mode is selected, provider authentication passed, and Phase 3 staging schema reconciliation is confirmed. The current [acceptance matrix](ACCEPTANCE-MATRIX.md) and [developer closeout](../all-phases-developer-closeout-2026-11-14/integration-results.json) supersede the earlier provider-selection and absent-schema blockers.

## Current combined-candidate checkpoint

The current integration branch is `intern/v2-phase-3-integration-review`, based on `c593d2de13c563b72adbaf216cf37ed30a038cc7`. The migrated 56-assertion four-offering regression now runs after all three Phase 3 migrations. A separate paid integration suite exercises synthetic trusted-service fulfillment for Full Course, Quant, Verbal and DI, automatic activation/enrollment, replay idempotency, subject boundaries, independent readings, feedback gates, expiry, retained history and read-only Admin preview. The result directory keeps these current runs separate from historical hosted evidence.

The provider-backed transaction flow, Google callback, staging resource smoke and exact QA cleanup still require the dedicated Preview and owner configuration. The implementation of those flows is distinct from evidence that they have run successfully on the final hosted candidate. No Production action or sign-off is implied.

## Historical Phase 6 implementation checkpoint

The branch is `intern/v2-phase-6-review`, based on Phase 5 candidate `879be1fcf2b32f6a4ef42ae431ca3ac6521fa06d`. PR #26 remains Draft and unmerged against `intern/v2-phase-4-review`. The reviewed baseline Preview is https://ace-club-k3rulap2r-theadmitco-techs-projects.vercel.app and uses staging project `eyphkkginlgoaxflauog`. The implementation candidate is `bcc0231e51ae93e266a3232aa316ef934b0e825b`; its [Phase 6 Preview](https://ace-club-dmc32ekp8-theadmitco-techs-projects.vercel.app) is READY and [GitHub Verify](https://github.com/theadmitco-tech/ace-club-lms/actions/runs/41642502494) passed. Hosted repair checks are recorded separately below. Production remains excluded.

## Completed independent work

- The acceptance matrix maps all 12 integrated journeys and every Phase 6 exit gate. Inherited reports retain their original commit, date and limitations.
- A disposable PostgreSQL journey covers Full Course, Quant, Verbal and DI, recording-only access, shared independent readings, cross-offering denial, subject feedback gates, foreign-response denial, restored access and revocation.
- Review identified 18 older V2 functions raising deterministic conflicts as SQLSTATE `40001`. The additive migration changes only these explicit conflict codes to `PT409`. Genuine engine serialization failures remain unchanged. Six server adapters retain specific reload/review guidance for both codes.
- The complete SQL Editor packet passed source-drift rejection, repeat rejection, exact function-body verification, row preservation, original-ledger preservation and security metadata checks. The operator-supplied staging receipt confirms the repair across 88 application tables. No Phase 3 migration was activated.
- Local integration records contain 56 passing assertions; repair rehearsal records contain nine checks; nine adapter tests cover both conflict codes, single-call behavior, sanitized messages and Student denial. Prior-phase suites, lint, TypeScript and webpack build passed locally.

Hosted verification passed 14 RPC assertions and 11 distinct browser assertions at `bcc0231`. Stale template, enrollment, live-registration and publication requests returned HTTP 409 / `PT409` within the request bounds. Student attempts were denied and authoring/publication snapshots remained unchanged. The actual template Server Action displayed the specific reload guidance. Admin editors, Student empty-access/upgrade states and direct-resource denial passed. The browser report preserves the four previously completed assertions when continuing after a screenshot locator interruption.

Both dedicated QA accounts were removed. Four independent cleanup checks confirmed that both Auth identities and both profiles were absent; the private QA password was discarded. The rejected test requests created no purchases, enrollments, registrations or course content. The existing libraries and walkthrough remain preserved.

Supabase documents why custom `40001` errors can trigger transaction retries: [official troubleshooting discussion](https://github.com/orgs/supabase/discussions/50151). The earlier Phase 5 hosted timeout and repair supplied the project-specific precedent. Older paths were inspected locally before repair; no pre-repair infinite retry was deliberately triggered on staging.

## Remaining acceptance

1. Owner deployment and configuration of the combined Phase 3 candidate. Provider selection, local test credentials, source integration and operator-supplied schema reconciliation are complete; the three installed Phase 3 migrations must not be reapplied.
2. Provider-backed Full Course/Quant/Verbal/DI purchase, retry/webhook, upgrade and eight-place concurrency checks, followed by affected integrated regressions.
3. Explicit Product Owner acceptance or rejection of that exact candidate. No acceptance is inferred from a successful walkthrough, PR creation or CI.

The temporary LMS feedback form remains the approved Phase 4 substitute. Tally replacement, provider-controlled external sharing, Production launch and PR readiness remain separately controlled.

## Reproduction and evidence

`npm run test:v2:phase6` uses disposable Unix-socket PostgreSQL and synthetic Auth/Storage catalogues. It accepts no hosted database connection. Setting `PHASE6_REPORT_DIRECTORY` to an existing result directory keeps current local runs separate from historical reports; the current closeout uses `deliverables/all-phases-developer-closeout-2026-11-14`. `node scripts/phase6/index-evidence.mjs` refreshes the inherited report index.

- [Acceptance matrix](ACCEPTANCE-MATRIX.md)
- [Inherited report index](evidence-index.json)
- [Local integrated results](local-integrated-results.json)
- [Repair rehearsal](local-conflict-repair-results.json)
- [Applied repair receipt](repair-receipt.json)
- [Hosted RPC results](hosted-rpc-results.json)
- [Hosted browser results](hosted-browser-results.json)
- [Hosted cleanup results](hosted-cleanup-results.json)
- [Reviewed Student screenshot](student-empty-access.png)
- [Exact Preview environment](preview-environment.json)
- [Implementation CI](implementation-ci.json)
- [Release boundaries](release-boundaries.json)
- [Exact routine inventory](conflict-routines.json)
- [Baseline remote verification](baseline-remote-verification.json)

The applied repair packet must not be rerun. Existing source migrations remain unchanged. Future deployment or database changes invalidate affected evidence and require a new exact-candidate check.

## Draft PR handoff

Creation through the connected GitHub integration returned `403: Resource not accessible by integration`; no Phase 6 PR was created. The [prepared description](pr-description.md) targets `intern/v2-phase-5-review` from `intern/v2-phase-6-review`. The PR must remain Draft and unmerged. Branch-specific automatic deployment is disabled in `vercel.json`; the reviewed Preview was created explicitly after the staging configuration was verified. Other branch deployment rules remain at their existing defaults.

## Evidence limitations

The first RPC attempt stopped when the local curl adapter omitted response count headers; the corrected adapter retained those headers and the complete 14-assertion run passed. The first browser attempt stopped before the diagnostic report rendered. The next attempt passed the first four assertions, then stopped at an ambiguous screenshot locator. The final continuation retained those attributed results and completed the remaining read-only assertions. Attempt reports remain available and are not represented as complete passing runs. No payment provider was called.
