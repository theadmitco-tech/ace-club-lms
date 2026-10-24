# Phase 1 staging application — 24 October 2026

Status: Migration applied; database verification passed; browser acceptance pending.

## 1. Migration result

The approved PR #23 migration applied successfully to staging project
`eyphkkginlgoaxflauog` at **14:23:22 UTC on 24 October 2026**.

- File: `supabase/migrations/20261018090000_add_v2_product_entitlements.sql`
- SHA-256: `ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7`
- Source: PR #23 head `d3020c1c9916c17f6ced27f83ff9ee1be05479f2`.
- Result: four tables, four product seeds, four price seeds, seven functions,
  policies and the price-history trigger installed. Migration version
  `20261018090000` is recorded. The 46 preceding migration records are unchanged.
- The CLI dry-run listed only this migration. No Phase 2 migration, role file,
  or optional seed script was applied.

A full logical database archive and role definitions without passwords were saved
privately under `~/Downloads/ace-club-staging-recovery/20261024T141331Z`.
The archive checksum is
`bbc1a812e311828c323100b0f35b490a84e4b257ee566060719796407d191349`.
Archive decompression and a local application-data restore rehearsal passed:
105 tables, including all 56 public application tables, and two sequences matched.
The exact migration also passed against that restored copy before staging application.

Recovery limits: the rehearsal used PostgreSQL 18.6 for a 17.6 source, excluded
Vault entries, and normalized managed-role membership grantors. Original backup
files were not changed. This is application-data recovery evidence, not a full
Supabase platform restore. Storage object bytes, platform settings, role passwords
and Vault root keys require separate recovery arrangements. The backup is one
private local copy, not an off-site copy. No restore into shared staging is authorized.

## 2. Verification result

Passed directly against staging PostgreSQL 17.6:

- Installed table columns, nullability, constraints, indexes, policies, triggers,
  and all seven function definitions match the reviewed migration rehearsal.
- All eight valid product combinations quote the expected INR amounts; seven
  invalid selections are rejected.
- All 72 direct-write privilege checks deny writes to browser/service roles.
  Anonymous private reads and anonymous/authenticated grant calls are denied.
  Missing identity fails closed.
- Synthetic purchases verify trusted grants, identical replay, six conflicting
  replay rejections, failed-grant atomicity and future-payment rejection.
- SQL sessions with synthetic identity claims verify student row isolation,
  Admin history access without grant permission, single-product scope, three
  Crash Courses without Full Batch access, and Full Batch section access.
- Inactive, expired and revoked access is denied. An independent valid purchase
  survives another purchase's revocation; denied access retains purchase history.
- Six-calendar-month stored expiry and month-end clamping pass. The access-window
  predicate includes the start and excludes expiry. Closing sales preserves paid
  access, and historical prices cannot be rewritten.

Synthetic account/purchase checks ran inside one transaction ending in `ROLLBACK`.
Before/after checks confirm unchanged Auth user state, purchase/grant counts,
catalogue state and all 56 existing public application tables. No fixtures remain.

Follow-up on 24 October at 14:57:57 UTC: **eight additional staging pricing
checks passed** in a separate rollback-only transaction. Current revisions are
quoted; future revisions are neither quoted nor visible to anonymous/Student
roles; Admin can inspect future prices. A price change leaves a prior synthetic
purchase's paid amount, identity, expiry and grants unchanged, preserves its
access and allows an identical payment-reference replay. Fulfillment against a
not-yet-effective price is rejected. Before/after comparisons again confirm no
persisted fixture, Auth-user, pricing or legacy application-data change.

The exact PR #23 source was also extracted into an isolated local directory.
Its database suite passed **21 tests**, including simultaneous duplicate payment
delivery and conflicting buyers; its server-reader suite passed **10 tests**,
including failed authentication/transport and subsequent-request access checks.
Commands, run separately with inherited `NODE_TEST_CONTEXT` removed:

```sh
node --experimental-strip-types scripts/v2-product-entitlements.test.mjs
node --experimental-strip-types scripts/v2-product-readers.test.mjs
```

These 31 checks used disposable local database state or mocked transport. They
did not send simultaneous requests to hosted staging or exercise a real browser.

These SQL role checks do not substitute for Google sign-in, real JWT/REST requests,
browser navigation, or payment-provider verification. Remaining acceptance work:
the current Preview catalogue probe; authenticated and cross-role HTTP/browser
checks; legacy content, worksheet-editor and applicable existing checkout checks;
and staging concurrent-delivery coverage or explicit acceptance of existing local
concurrency evidence. Product acceptance remains pending. Phase 2 application
still requires separate approval after Phase 1 verification is accepted.

## 3. Failures or schema drift

No migration execution failure or unresolved Phase 1 definition drift was found.
The initial dry-run stopped because staging contained older migration versions
absent from PR #23's local history. `supabase migration fetch --linked` exported
those records into the isolated temporary workspace. Only the exact reviewed
Phase 1 file was then added. No history repair or historical migration replay ran.

The initial schema comparison detected PostgreSQL 18's separate NOT NULL
constraint entries, which PostgreSQL 17 does not expose in that form. Comparing
every column's nullability and the remaining definitions produced an exact match.

GitHub still reports a failing `ace-club-flexible-mocks` deployment status on
PR #23's head; `ace-club-lms` reports success. The failed deployment has not been
diagnosed or waived by this operation. Do not describe all checks as passing.
Read-only Vercel inspection of deployment
`dpl_CYds5yq1LVf8hEsSF8Ar6SGLmkXM` returned HTTP 403 using the existing CLI
authorization. No build logs were obtained and no deployment settings changed.

## 4. Exact commit and Preview tested

Database artifact tested: PR #23 commit
`d3020c1c9916c17f6ced27f83ff9ee1be05479f2` and the checksum above.

The candidate Preview recorded in the
[deployment evidence](../../review/staging-database-inspection-2026-10-21.md) is
<https://ace-club-a8go51h46-theadmitco-techs-projects.vercel.app>.
**No browser test of that Preview was completed in this run.** Verification ran
directly against staging; the Preview URL identifies the next browser-test target.
The [catalogue probe](../../../../scripts/v2-staging-catalogue-probe.browser.js)
is now pinned to this candidate and still requires observed traffic to the
staging project before making anonymous GET requests.
Its local safety suite passed with
`node --test scripts/v2-staging-catalogue-probe.test.mjs`; `git diff --check`
also passed. The JSON evidence lists the initial application-report changes and
the later verification follow-up separately. No application
runtime code or migration SQL was edited.

Both PR #23 and PR #24 were rechecked as Draft and unmerged. No PR head changed.
This local evidence and probe update have not been pushed.

## 5. Production and existing-data confirmation

Production was not accessed or modified. Existing student/course records were not
modified: aggregate fingerprints of all 56 existing public application tables
match before migration and after verification. The prior migration ledger and
DDL event-trigger definitions also match. Synthetic verification left Auth users
and V2 purchase/grant state unchanged after rollback.

The intended persistent changes are the approved additive Phase 1 schema,
catalogue/price seeds and its migration record. The CLI also initialized its
temporary login role; this was not a shared database-password reset.

Machine-readable sanitized results: [staging-application-2026-10-24.json](staging-application-2026-10-24.json).
Private backups, connection credentials and row data are excluded from repository evidence.

## Preview access follow-up — 24 October

The deployment-specific URL prompted another access request. PR #23 still has
head `d3020c1`, and its current Vercel bot comment links to the branch Preview:
<https://ace-club-lms-git-intern-v2-onboarding-theadmitco-techs-projects.vercel.app>.
The probe now accepts that exact branch origin as well as the recorded deployment
origin, fetching assets only from the current allowed origin and retaining the
staging backend guard. Branch aliases can move after a push; recheck the source
commit before recording later acceptance evidence. Access to the branch URL has
not been re-confirmed by the manual tester yet. No Vercel permissions were changed.

## Prepared browser checks and local changes

The [current checklist](../manual-verification-checklist.md) now separates verified
database behavior from pending browser and legacy regressions. The new
[role probe](../../../../scripts/v2-phase1-role-probe.browser.js) reports Admin,
Student and signed-out authorization outcomes for two existing Admin API routes.
It submits only empty objects, rejected before any writes in the reviewed PR #23
handlers. Both handlers and their shared authorization helper match the exact
PR #23 source. The script has not been run against a real Preview session.

Local safety tests: 7 role-probe tests and 11 catalogue-probe tests pass. They
verify the permitted origins, fixed requests, expected statuses, failure handling
and exclusion of private response/session data from output. The role suite is
included in the Phase 1 local verification runner. No application rebuild is
needed for these standalone browser helpers and documentation changes.

Follow-up validation commands:

```sh
env -u NODE_TEST_CONTEXT node scripts/v2-phase1-role-probe.test.mjs
env -u NODE_TEST_CONTEXT node scripts/v2-staging-catalogue-probe.test.mjs
./node_modules/.bin/eslint scripts/v2-phase1-role-probe.browser.js scripts/v2-phase1-role-probe.test.mjs scripts/verify-v2-phase1.mjs --max-warnings=0
git diff --check
```

All passed; updated documentation links and evidence JSON also validated.
Verification SQL, exact-source test logs and before/after aggregate evidence are
retained privately in the recovery directory's
`phase1-verification/followup-20261024` folder (directory 0700, files 0600).
They are excluded from Git. The report contains only sanitized results.

Follow-up files changed:

- `scripts/v2-phase1-role-probe.browser.js`
- `scripts/v2-phase1-role-probe.test.mjs`
- `scripts/verify-v2-phase1.mjs`
- `docs/v2/phase-1/manual-verification-checklist.md`
- `docs/v2/phase-1/review-and-release.md`
- `docs/v2/phase-1/completion-report.md`
- `docs/v2/phase-1/evidence/staging-application-2026-10-24.md`
- `docs/v2/phase-1/evidence/staging-application-2026-10-24.json`

Next decision: Phase 1 acceptance after browser evidence and remaining exceptions
are reviewed; Phase 2 staging application remains a separate decision. Access to
the protected Preview and the unassessed deployment failure remain dependencies.
