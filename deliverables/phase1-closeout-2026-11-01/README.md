# Phase 1 closeout and student UI — 1 November 2026

**Phase 1 is complete for the approved catalogue and entitlement foundation:**
13 supported exit gates, verified on the existing LMS staging Preview. The final
hosted checks and exact cleanup are recorded in [the 2 November closeout](passwordless-qa/README.md).
Production is unchanged, PR #24 remains Draft, and Phase 2 publishing is inactive.

[Open student learning](https://ace-club-lms-git-intern-v2-pha-9a969c-theadmitco-techs-projects.vercel.app/dashboard),
[course packages](https://ace-club-lms-git-intern-v2-pha-9a969c-theadmitco-techs-projects.vercel.app/courses/v2),
[upgrade options](https://ace-club-lms-git-intern-v2-pha-9a969c-theadmitco-techs-projects.vercel.app/account/access/upgrade),
or [staging verification](https://ace-club-lms-git-intern-v2-pha-9a969c-theadmitco-techs-projects.vercel.app/qa/phase1).
Use normal Vercel access and the designated staging LMS accounts.

## What is implemented

- Three subject-package tiers, current database prices and subject selection;
  Full Course remains a separate offering, as accepted by the user.
- Refreshed student dashboard, sessions and access history; responsive layouts,
  clear expiry states, and a last-opened reminder based on a real authorized visit.
  The reminder is local to the browser and is not completion tracking.
- Four resource groups: pre-class read, recording, session reading/material,
  worksheet. Existing material is not relabeled as post-class reading without a
  reviewed mapping. Scheduled class details remain available.
- Authenticated server-side upgrade estimates under the explicitly accepted
  `current-tier-preserve-expiry-v1` policy. Exactly one active, non-revoked individual
  purchase is eligible; current old/new tier difference is used and expiry is kept.
  Full Course, expired/revoked and ambiguous multiple purchases are rejected.
  Refunds must be represented by revocation to be excluded reliably.
- A staging-only diagnostic that checks the current caller's access and grant
  permissions without supplying an identity, fetching private rows or creating grants.

Upgrade estimates do not charge money or grant access. The current whole-purchase
grant RPC must not receive a difference payment. Checkout and atomic fulfillment
remain payment-phase work. Feedback locks, live eligibility and upsell checkout are
not simulated; later-phase functionality remains gated.

## Deployment and boundaries

Student UI was published at `c277a7f99499660f25674a40612665c1bfc5a2fe` in
`dpl_CCmEa9zXQEBmp1okUsSJw6hiwGPS`. A subsequent diagnostic correction is at
`155b3fbffc46db94be0fbee70b7b6fd9465a74b4`, deployment
`dpl_EWB7tYjTYzhrndN7WS1waXKKCMaG`. See [the deployment receipt](deployment.json)
for final readiness and CI evidence. The complete change from the preceding
`07154f02c466cd17a940257f4c2b0f56096c453f` candidate is in [implementation.patch](implementation.patch).

- Project: `ace-club-lms`; branch `intern/v2-phase-2-review`; PR #24 Draft/unmerged.
- Staging: `eyphkkginlgoaxflauog`, confirmed by the hosted server diagnostic's
  exact environment and public-client configuration guard.
- Production remains `dpl_8axtycbJUpFX8cPWhVtkhGf6p9Kj`. Its environment entries
  were compared before/after and unchanged. No Production deployment or DB action.
- Preview branch changes: `V2_INDIVIDUAL_UPGRADE_POLICY=current-tier-preserve-expiry-v1`
  and the explicitly approved sensitive staging `SUPABASE_SERVICE_ROLE_KEY` override.
- Dedicated staging QA writes were cleaned up; nine missing legacy editor metadata
  columns and two indexes were added without rewriting existing questions. Original Phase 1 migration
  SHA-256 remains `ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7`.
- Phase 2 SQL and its three write/schedule flags remain inactive.

## Verification and limits

The full Phase 1 suite passed 172 tests across 18 suites before publication. The
diagnostic correction then passed all 10 targeted tests, including one new real-SDK
HTTP regression and the disposable local PostgreSQL permission-drift test. Student
UI passed 20 browser scenarios; diagnostic UI/API passed 5; Phase 2 regressions
passed 39. Lint, TypeScript and webpack build passed; lint/types were rerun after
the diagnostic correction. Local browser adapters are synthetic, not hosted JWT
evidence. Logs, JSON and labeled local screenshots are in [verification/](verification/).

Hosted checks at `c277a7f` verified the catalogue, all eight valid prices, mobile
layout, signed-out upgrade redirect and same-origin diagnostic POST. No browser
page errors were recorded. The diagnostic exposed a HEAD-response handling defect:
HEAD discards the SQL error body, so the client could not recognize permission code
42501. The fix uses GET with `limit=0`, preserving errors without fetching purchase
rows. The initial report is retained in `verification/hosted-initial/`; the final
hosted recheck is recorded separately and must not be confused with that first run.
The corrected hosted check passed all five individual checks on 1 November at
17:45 UTC. Anonymous private reads, access RPC and grant execution were denied.
Its overall result remains inconclusive by design because authenticated fixture
acceptance is separate. Final GitHub Verify run `41332944013` succeeded.

## Authenticated reports received — 1 November 2026

The user supplied the [Student report](verification/hosted-user-sessions/student.json)
at **11:28:25 PM IST** and [Admin report](verification/hosted-user-sessions/admin.json)
at **11:29:41 PM IST** (report timestamps). Both identify commit
`155b3fbffc46db94be0fbee70b7b6fd9465a74b4` and staging `eyphkkginlgoaxflauog`.
These are user-supplied hosted diagnostic results, not independently operated
assistant sessions; [provenance](verification/hosted-user-sessions/provenance.json)
is recorded separately.

- [x] Student and Admin identities and active states verified.
- [x] Student access RPC returned a valid empty list (zero active entitlements).
- [x] Admin has no active Student entitlements.
- [x] Student and Admin grant RPC execution denied. Combined with the independently
  observed anonymous result, all three browser-role grant-denial subchecks have evidence.
- [ ] Cross-Student isolation remains inconclusive: zero visible foreign purchases
  does not establish that a designated foreign purchase exists.

Neither report contains a failing check. Both overall results remain inconclusive
as designed. An empty active-access list does not prove that no purchases, expired
records, users or website activity exist, and does not exercise an eligible upgrade.

The subsequent [third-person summary of the supplied Student access page](verification/hosted-user-sessions/student-my-access.txt)
shows “No active course purchase” and “No purchases are recorded here yet.” This
records the visible empty states for that account. It contains an Upgrade options
link; the destination result was subsequently supplied in the screenshot below. The page
text embeds no commit or timestamp, so it is recorded as user-reported UI evidence.

The subsequent user screenshot confirms **Review an upgrade → Upgrade unavailable →
“There is no active individual package to upgrade.”** The no-active-package UI
subcheck is now **passed**. [Recorded screenshot observation](verification/hosted-user-sessions/student-upgrade-no-active-package.json)
is user-supplied visual evidence; the screenshot itself contains no URL, commit or
timestamp. Eligible price differences, expiry preservation and other rejected states
are not established by this empty-account result.

## Final closeout — 2 November 2026

The previous hosted evidence gaps are closed. See [the completed checklist](../phase1-exit-gate-audit-2026-11-01/README.md)
and [the final report](passwordless-qa/README.md). The user-approved branch-only
staging service key repaired actual enrollment; an additive staging repair restored
legacy worksheet question editing. All 15 QA accounts and their synthetic purchases
are removed. The original 60-table data fingerprint matched after purchase cleanup.

Supabase OAuth and the database password were unavailable. The operator ran the
reviewed SQL Editor setup and final guarded cleanup/repair; the agent used provided
staging API credentials for real QA sessions, browser tests and account cleanup.
Credentials and browser sessions are not included in these artifacts. Earlier
empty-account reports remain historical evidence, not substitutes for the final tests.

Payment-provider checkout, atomic upgrade payment/grant fulfillment and Phase 2
publishing are outside this completed Phase 1 foundation. No charges were created.
Separate product-owner review, PR readiness/merge and Production release are not implied.
