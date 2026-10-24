# V2 Phase 1 — Staging verification checklist

Status: Database verification passed; current Preview browser verification and acceptance pending
Owner: Engineering and product owner
Last updated: 25 October 2026

This is the current execution checklist. Historical observations remain in the
[evidence folder](evidence/) and Git history. Earlier login screenshots and the
20 October catalogue 404 do not describe the current candidate's acceptance state.

## Candidate and boundaries

- PR #23 source: `d3020c1c9916c17f6ced27f83ff9ee1be05479f2`.
- Staging project: `eyphkkginlgoaxflauog` (`ace-club-lms-staging`).
- Exact deployment: <https://ace-club-a8go51h46-theadmitco-techs-projects.vercel.app>.
- Branch Preview: <https://ace-club-lms-git-intern-v2-onboarding-theadmitco-techs-projects.vercel.app>.
- Phase 1 migration: `20261018090000_add_v2_product_entitlements.sql`.
- SHA-256: `ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7`.

The deployment-specific URL is fixed. Recheck the branch alias's commit if any
push occurs before testing. A supplied screenshot on 25 October records a passing
catalogue probe on an allowed Preview. A subsequent Admin role-probe screenshot
shows both request URLs on the branch Preview above. Its current deployed commit
still needs to accompany the final browser record.
Do not substitute the older `ace-club-1vr3qxhtk` deployment or remove the probes'
origin guards.

Phase 1 staging application is already approved and complete; do not repeat it.
Use designated synthetic test identities and fixtures only. Existing student/course
records must remain unchanged. Both PRs remain Draft and unmerged. Phase 2 staging
application and any Production release require separate approval.

## Completed — database and local checks

Evidence: [staging application report](evidence/staging-application-2026-10-24.md)
and its [sanitized JSON](evidence/staging-application-2026-10-24.json).

- [x] Exact migration checksum and PR source recorded; private recovery archive
  and isolated application-data restore rehearsal verified before application.
- [x] Only the approved Phase 1 migration applied; its ledger record is present,
  all 46 earlier migration records are unchanged and Phase 2 is absent.
- [x] Four tables and seven function definitions, policies, indexes, triggers,
  constraints and nullability match the reviewed migration rehearsal.
- [x] All eight valid product combinations and seven invalid selections tested
  on staging; four product scopes and approved bundle prices match.
- [x] All 72 direct-write privilege checks pass; anonymous private reads and
  anonymous/authenticated grant calls are denied.
- [x] Rollback-only synthetic grants verify replay, six conflicting replays,
  atomic failure, identity isolation, Admin history without grant permission,
  product scopes, inactive/expired/revoked denial and retained history.
- [x] Stored six-calendar-month UTC expiry, month-end clamping and the
  start-inclusive/expiry-exclusive predicate verified on staging.
- [x] Closing sales preserves existing access; independent valid purchases
  survive revocation of another purchase; historical prices are immutable.
- [x] Eight additional staging price-revision checks pass: effective price
  selection, future-price visibility, unchanged historical payment/access,
  replay after a price change and denial of early future-price fulfillment.
- [x] Existing application data, Auth users and price/purchase/grant state match
  before and after synthetic checks. All synthetic staging changes rolled back.
- [x] Exact PR #23 local database suite: 21 tests pass, including concurrent
  duplicate deliveries and conflicting buyers.
- [x] Exact PR #23 local server-reader suite: 10 tests pass, including transport
  and authentication failure handling and access rechecking on later calls.
- [x] Current local browser helpers: 11 catalogue safety tests and 7 role-probe
  safety tests pass. These use mocked responses, not real browser sessions.

SQL identity simulation does not prove Google sign-in, JWT delivery, browser API
authorization or legacy interface behavior. Local concurrency tests do not prove
simultaneous delivery against hosted staging.

## Browser verification — in progress

Record each result with the candidate commit, URL, role, expected/actual outcome
and time. Share only sanitized results or redacted screenshots; no credentials,
request headers, HAR exports, private student rows or database backups.

### 1. Admin and public API

1. Open the verified Preview and sign in with the designated test Admin.
2. Reload `/admin`; confirm the Admin dashboard opens.
3. Run the complete [catalogue probe](../../../scripts/v2-staging-catalogue-probe.browser.js)
   in Developer Tools → Console. Expected: `PUBLIC_CHECKS_PASSED`, four products,
   and `FULL_BATCH_INR_25000`.
4. Run the complete [role probe](../../../scripts/v2-phase1-role-probe.browser.js).
   Expected: `ADMIN_VALIDATION_REACHED`; both endpoints return HTTP 400 with
   the known missing-input validation result.

- [ ] Admin sign-in and dashboard pass on the current candidate.
- [x] Public catalogue/quote probe reports `PUBLIC_CHECKS_PASSED`: both HTTP 200,
  `FOUR_PRODUCTS_MATCH` and `FULL_BATCH_INR_25000` (supplied screenshot, 25 October).
- [x] Record the Admin probe's exact origin: the branch Preview above, visible in
  both request URLs in the 25 October screenshot.
- [ ] Confirm the branch Preview's deployed candidate commit for final acceptance.
- [x] Admin API role probe reports `ADMIN_VALIDATION_REACHED` for both endpoints,
  each HTTP 400 (supplied screenshot, 25 October).

The catalogue probe uses anonymous GET requests and requires observed staging
traffic. `WRONG_PREVIEW` means the page is outside the verified allowlist;
`STAGING_CONNECTION_NOT_OBSERVED_RELOAD_AND_RETRY` means it could not establish
the expected browser backend. A failed check is not a migration instruction.

The role probe uses two POST requests containing only `{}` to
`/api/admin/set-user-active` and `/api/admin/session-materials`. At the reviewed
commit, both handlers authorize the caller and reject missing fields before any
profile, material or Storage write. Do not add IDs, files or other payload fields.
The browser sends its normal same-origin session; the script never reads cookies,
browser storage or tokens. A 400 here is an expected validation result, not an
application failure or proof that a valid mutation works.

### 2. Student and signed-out boundaries

1. Sign out of the LMS, then sign in with the designated test Student.
2. Visit `/admin`; expect redirection to `/dashboard` and no Admin interface.
3. Run the role probe. Expected: `NON_ADMIN_DENIED`, both HTTP 403.
4. Sign out of the LMS without signing out of Vercel Preview access. On the
   Preview login page, run the role probe. Expected: `SIGNED_OUT_DENIED`, both
   HTTP 401. A login redirect, HTML response, mixed result or request failure
   is inconclusive and must be investigated.

- [ ] Student cannot enter the Admin interface.
- [x] Student requests to both privileged API routes return HTTP 403 and
  `NON_ADMIN_DENIED` (supplied screenshot, 25 October, branch Preview).
- [x] Signed-out requests to both privileged API routes return HTTP 401 and
  `SIGNED_OUT_DENIED` (supplied screenshot, 25 October, branch Preview).
- [ ] Designated Student A cannot read Student B's synthetic purchase/grant
  records through an actual authenticated REST/RPC session; Admin history reads
  work while browser grant calls remain denied. Record fixture setup and cleanup
  separately. The two-route role probe does not cover these V2 data checks.

### 3. Legacy regression checks

Use designated synthetic content/enrollment fixtures. A Student account showing
“no course assigned” can verify empty-state navigation but cannot verify content
access. Record missing fixture setup as a dependency, not a pass. Do not enroll,
deactivate or edit an existing real student to complete a check.

- [ ] Enrolled test Student: dashboard, schedule, recordings, worksheets,
  practice tracker and protected direct material URLs retain expected behavior,
  including access through an enrolled inactive batch.
- [ ] Test Admin worksheet: initial/empty load, changing worksheet while loading,
  add/edit/delete/import refresh and network-failure recovery. Drafts/results
  must not appear in another worksheet. Mutations use disposable fixtures only.
- [ ] Public batch listing works. If existing checkout is enabled, verify its
  success/cancel/signature/failure paths in a confirmed provider test environment.
  If unavailable, record the reason and acceptance exception; never use live
  payment credentials or create a charge for this check.

V2 entitlements are a foundation in this phase. Connecting existing content
routes and payment-provider fulfillment to V2 belongs to later roadmap work.

## Remaining evidence and acceptance

- [ ] Obtain staging concurrent-delivery evidence or explicit acceptance of the
  21-test local database suite's duplicate/conflicting-delivery coverage.
- [ ] Resolve or assess the failing `ace-club-flexible-mocks` deployment status.
  The LMS Preview is successful. Read-only log inspection returned HTTP 403 on
  24 October, so the failure cause remains unknown; do not report all checks green.
- [ ] Record all browser results, fixture cleanup and any agreed exceptions.
- [ ] Record product-owner Phase 1 acceptance, then request the separate Phase 2
  staging decision. Phase 1 acceptance does not authorize a merge or Production release.

Required review/branch protection and the Production release/recovery decision
remain release gates. They do not require redoing the completed Phase 1 migration
or reopening previously approved product decisions.
