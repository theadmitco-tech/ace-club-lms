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
also passed. The JSON evidence lists the seven local files changed. No application
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
