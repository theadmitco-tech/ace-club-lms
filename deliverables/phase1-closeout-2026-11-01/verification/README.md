# Phase 1 hosted verification handoff

Prepared on 1 November 2026. This file does not mark Phase 1 complete.

## Available evidence and access limits

The connected document-control tool reports no active sessions, and no authenticated
LMS session or working Supabase OAuth connection is available. Browser automation
verified the public/anonymous Preview using connected Vercel deployment access. Vercel deployment access does not supply
an authenticated LMS account. No browser credential store, session token, user
impersonation or service-role login was used.

Read-only hosted check against the existing immutable Preview at commit
`07154f02c466cd17a940257f4c2b0f56096c453f`:

- `/api/register/batches` returned HTTP 200 and an empty `batches` array at
  17:30 UTC / 23:00 IST on 1 November. This establishes public endpoint availability,
  not registered-course content or payment functionality.
- Vercel runtime-log search for `bulk-enroll`, scoped to deployment
  `dpl_Eh3mkarH2b5WkHfzybBNCF2fdpQA`, returned no matching logs in the latest
  50-minute window. A separate 24-hour scoped query timed out. Neither establishes
  the cause or resolution of the historical `account_creation` enrollment failure.

## Authenticated report receipt

The user supplied both current-candidate reports on 1 November:
[Student](hosted-user-sessions/student.json), [Admin](hosted-user-sessions/admin.json),
and [provenance](hosted-user-sessions/provenance.json). Identity, active state,
access-RPC response validation and grant-execution denial pass for both. Student
access is empty; cross-Student fixture acceptance remains inconclusive. Do not ask
for these same reports again unless changed code or fixture states require retesting.
The operator procedure below remains available for subsequent fixture-state checks.

## New diagnostic in the review candidate

Open `/qa/phase1` on the **current LMS Preview recorded in the deployment handoff**.
The final anonymous report is in [hosted-final/results.json](hosted-final/results.json):
all individual checks pass; full acceptance remains inconclusive. This route is not placed in product navigation.

1. Use only the designated staging QA account/session. Run once signed out, once
   as Student, and once as Admin.
2. Click **Run read-only staging checks**. The page forwards the existing caller
   session through the normal server Supabase client. No identity can be supplied
   in the request; it accepts only an empty JSON object.
3. Copy the sanitized report. Check the exact deployment commit and staging project,
   role, UTC timestamp, each result and the stated limits. No credentials or private
   rows are included.
4. A `fail` requires investigation. An `inconclusive` is not a passing gate. There is
   deliberately no aggregate “Phase 1 passed” result.

The page and endpoint require `VERCEL_ENV=preview`, exact staging URL
`https://eyphkkginlgoaxflauog.supabase.co` and a public-client key. Production,
other projects, unknown environments and service-role keys are rejected before
client creation. Reports are private/no-store and requests require the same origin.

### What the diagnostic checks

- Verified current user/profile role and active state, without returning identity.
- Actual `get_my_v2_access` response through the caller's Supabase role; anonymous
  denial and empty non-Student/inactive results have distinct interpretations.
- Anonymous purchase-table permission checking uses a zero-row GET so the SQL
  error body survives HTTP transport. Student foreign-purchase visibility uses HEAD/count only. A Student's non-own count
  of zero remains **inconclusive** until another designated Student's purchase
  fixture is independently confirmed. No payment or purchase rows are fetched.
- Grant execution permission using seven **null** arguments. Expected `42501`
  means execution is denied. `22023` means validation was reached and is reported
  as **permission drift/failure**, never a pass. Unknown responses fail the check.

The deliberately invalid grant probe cannot be turned into a purchase request by
the operator. In the unchanged applied migration it invokes `v2_purchase_shape(NULL)`
and raises before any insert. A disposable PostgreSQL test also temporarily grants
execution to a synthetic browser role and verifies the error with zero purchase/
grant rows. This test never changes shared database privileges. The RPC is invoked
by POST, but its reviewed invalid input is non-mutating; no transaction-read-only
setting or HTTP rollback is claimed.

## Still required beyond this diagnostic

- Independently confirmed synthetic Student A/B fixtures and denied cross-user
  reads with real sessions; zero rows alone cannot prove fixture-based isolation.
- Expired/revoked/inactive/wrong-section fixture-state acceptance, direct table-write
  denial evidence, and legacy worksheet/material/progress/editor journeys.
- Triage/retest the historical enrollment failure. Do not change environment keys
  or real accounts without evidence merely to force a successful test.
- Product acceptance after the remaining upgrade and hosted gates close.

See the [full existing hosted checklist](../../phase1-exit-gate-audit-2026-11-01/HOSTED-CLOSEOUT.md).
Do not rerun the original Phase 1 migration, mutate real student/course data or
activate Phase 2 as part of collecting this report.

## Local checks

`node scripts/phase1closing-verification.test.mjs` runs ten checks, including the
disposable PostgreSQL permission-drift safety case. The new diagnostic files pass
targeted ESLint. `node scripts/phase1closing-browser.mjs` exercises the actual QA
page/route with synthetic local session/database adapters; its evidence is local,
not hosted JWT acceptance. Final browser results are attached separately.
