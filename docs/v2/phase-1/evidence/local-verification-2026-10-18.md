# V2 Phase 1 — Local verification, 18 October 2026

Status: Local verification only — staging and product acceptance pending
Owner: Engineering
Last updated: 18 October 2026

Editorial update: personal references use role names; recorded observations,
results, and implementation hashes are unchanged.

## Source and environment

Branch: `intern/v2-onboarding`. Working tree based on
`940ea7835734a8fb22a6451a30b31084b11d5c97`; the implementation is not committed,
pushed, or deployed. The following hashes identify the tested implementation.

| File | SHA-256 |
|---|---|
| `supabase/migrations/20261018090000_add_v2_product_entitlements.sql` | `ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7` |
| `src/lib/v2Products.ts` | `ef86e8e4b7e7480b3e5d8935d0d08ef7ffc33926d3b92f80d27ff9735645cfb8` |
| `src/lib/server/v2Products.ts` | `5ccad61bc361b0a2b6ad5fb8d7e6c4a9c58332e905d994f251ad2a3b7bb768cd` |
| `scripts/v2-product-entitlements.test.mjs` | `f52f1c261e822327793f3fd67234a655493b12b0b266d735140e72439535b7d5` |
| `scripts/v2-product-readers.test.mjs` | `c3e69d93310ef61c1f050a2a60ead0546e207c8079292f4110bccbd8de95776c` |
| `scripts/release-safety.test.mjs` | `fa1e9d52c53206dfffd412257ede23f33ce2614adabd72eb00ce1595b0a23cdc` |
| `src/lib/errorMessage.ts` | `64302d296fb2f8f0ea439fe67c5b2ed56065e4ada4ad2688fcf8a8e4c9545b32` |
| `src/lib/razorpayCheckout.ts` | `cb9d1b38424557889ef1fe098576ad9829b58f646becfb8e826b8f334afc62b8` |
| `src/lib/masterWorksheet.ts` | `72e60eb27adfc1cc5ba61a47841332e10f7694144edb36b7472863efa91bf040` |
| `src/app/admin/curriculum/worksheets/[id]/page.tsx` | `642ed0f0c1443cdec9901a7419dd196196eabde3e8ed598b5c50b5b4ce0b8c14` |
| `src/app/register/page.tsx` | `ab5eb91885e49766c630bec4bc9b4c4f36a0d65dbe013fa95b833ac6c807b617` |
| `src/lib/registration.ts` | `0b728219a5bb09d8eeba54885dc009118eb90dba1dc429165063dec213477f63` |
| `src/utils/supabase/storage.ts` | `ff9dfd1c70e601b172d6b582c564e7525a3965c52e2401a6a75ee5b5979f7a6d` |
| `src/app/api/create-order/route.ts` | `486dc204fc44473854e98a3d917a0a531e04999f916a8e9791a5c78b1afe6ee8` |
| `src/app/api/verify-payment/route.ts` | `00013512382e9c12c0bbcebe62fbe032980c8d76aca34e3dd8e4750062f42ca4` |
| `src/app/api/register/batches/route.ts` | `95b647fa06af3f73cc671045b0313d9860242aea0962c514e112a9b341bfcaf4` |
| `src/app/api/register/create-order/route.ts` | `c99f995226ef913314e64530236e34c844aed131ef9970c6cb584dbca60fbf95` |
| `src/app/api/register/verify-payment/route.ts` | `3c82e623c5373c1b2e587146b250cf812f07a66cc6f31009f2dfab700963cc3f` |
| `src/app/api/register/webhook/route.ts` | `71dc38fae0e65586548a15b7825c25d86fa1b72262c33c7fc0540d1d412e13e7` |
| `.github/workflows/verify.yml` | `f1e67411275db919dbd3d4df18223673bd67c0187b2950b31109955115626ef9` |
| `package.json` | `7f2bbf4a16b0e57fd209a369d529d5892e97852d09c90d83ea22952e235544d1` |

Local tools: Node `26.11.1`, npm `12.2.0`, PostgreSQL `18.6`; locked Next.js
`16.2.4`. Dependencies were installed with explicit user authorization. The
sandbox registry lookup initially failed; the authorized network retry succeeded.
The lockfile is unchanged. npm reported blocked install scripts for `canvas`,
`sharp`, and `unrs-resolver`; no install-script allowlist was changed.

## Results

| Check | Result |
|---|---|
| `npm run test:v2-products` | Pass: 17 database scenarios plus the containing test, 18 tests reported, zero skipped |
| `npm run test:v2-readers` | Pass: six server-reader tests, including injected configuration and transport errors |
| `npm run test:pilot-v2` | Pass: all seven existing test files; direct run with `--test-isolation=none` confirms 46 tests |
| `tsc --noEmit --incremental false` | Pass |
| `npm run test:release-safety` | Pass: 15 actual-module tests for payment routes and worksheet reads, with external I/O stubbed |
| `npm run lint -- --max-warnings=0` | Pass: zero errors and zero warnings across the repository |
| `npm run build` | Pass: optimized Next.js build and TypeScript; 40 static-page generation entries completed |
| Workflow validation | YAML parsed, full commit pins and read-only permissions checked, embedded Bash syntax passed; GitHub execution pending |

These results supersede the earlier same-day verification following expanded
testing and completion of the lint cleanup. A combined direct Node run
with `--experimental-strip-types --test --test-isolation=none` confirmed 67
passing cases (46 existing, six readers, 15 cleanup), with no skipped cases.
The local isolated runner otherwise summarizes successful child files. The
existing module-format detection warning still appears during the Node test run;
it is unrelated to ESLint and does not fail the tests.
Existing regression tests include both pure behavior tests and source-contract
assertions; passing them is not browser or live-service verification.

The added network-exception test failed before the fix: `canAccessV2Product`
propagated rejected client/auth/RPC promises. It now returns `false` in those
cases. The six reader tests pass after the fix. They execute the actual
TypeScript module through the installed compiler with the Supabase dependency
stubbed; database behavior is exercised separately below.

The initial baseline had 14 lint errors and two warnings in unchanged files.
As part of the requested cleanup, the affected legacy files were deliberately
updated: typed checkout/session/question shapes, query-inferred course typing,
unknown-error narrowing, removal of unused declarations, and asynchronous
worksheet load/apply separation. No lint rule was disabled. The old hook-dependency
suppression was removed. The CI lint command also fails on warnings.

The new cleanup tests execute actual route handlers using NextResponse and the
actual worksheet loader. They cover Error/plain-object/null/scalar failures across
six routes, existing checkout success and invalid amounts, authentication-error
status, both payment-signature field formats, invalid signatures stopping before
DB/enrollment access, public-batch responses, scoped/empty worksheet reads,
transport failures and retry. They do not verify a real payment provider or browser.
Worksheet loading now finishes on session network failures and ignores cancelled
initial reads; browser lifecycle verification remains in the staging checklist.

Type contracts were checked against the official [Razorpay Checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/).
The effect cleanup follows [React's state-in-effect guidance](https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect).

## Database evidence boundary

The test starts its own temporary PostgreSQL cluster with TCP disabled, a minimal
`auth.users`/`auth.uid()` fixture, and synthetic identities. It executes the
committed `20260731051000_production_baseline.sql`, material-release hardening
`20260731062700_enforce_material_release.sql`, and controlled provisioning
`20260731110000_require_provisioned_portal_access.sql`, then the new migration.
Broad default table/function grants are included to exercise the migration's
explicit revocations. The cluster is stopped and removed afterward.
Sandbox `pg_ctl` execution was denied; the same bounded test passed after an
approved escalation. No existing PostgreSQL or Supabase database was contacted.

Passing scenarios exercise real SQL execution and grants/RLS rather than matching
SQL source strings: four product scopes, eight valid pricing selections, rejected
input, restricted write permissions (including direct service-role table writes),
own-record isolation, exact product/section authorization, idempotent and concurrent
grant retries, month-end and leap-year UTC expiry, microsecond window boundaries,
revocation, inactive identities, price revisions, and migration reapplication.
Additional checks prove:

- Injected migration failure rolls back earlier DDL; failed bundle fulfillment
  rolls back the purchase and any partial grants.
- Concurrent requests assigning the same payment to different buyers yield
  exactly one purchase; the conflicting request fails.
- Revoking one overlapping purchase preserves the other purchase's access and expiry.
- All 19 baseline tables' columns, constraints, indexes, RLS flags/policies,
  privileges, user triggers, existing function definitions/privileges, and synthetic
  rows match snapshots before application, after application, and after reapplication.
- Legacy enrollment in an inactive course still authorizes the enrolled student;
  unreleased material and another student's material access remain denied.

This is a baseline compatibility test, not a replay of every later migration or
a full Supabase replica. Supabase/PostgREST role mapping,
actual deployed migration compatibility, browser sessions, existing student
journeys, and material-route behavior still require the
[staging checklist](../manual-verification-checklist.md). Existing content routes
remain on legacy authorization; V2 content and schedule binding are not enabled.

The build ran without a staging environment file; the deployment preflight
explicitly skipped validation outside Vercel. A successful build does not verify
staging configuration, provider payment handling, or runtime access. No LMS app
server was started, no shared migration was applied, and no phase was signed off.

## Automated checks and remaining release gates

The new [Verify workflow](../../../../.github/workflows/verify.yml) runs on pull
requests targeting `codex/v2-integration` or `main`, and pushes to those branches.
It uses pinned actions, a read-only GitHub token, Node 24, a locked install with
dependency install scripts disabled, and the runner's disposable PostgreSQL tools.
The separate `Lint` and `Tests and build` jobs do not deploy or use application
credentials. The local environment was Node 26/PostgreSQL 18; compatibility with
the hosted runner and its tool versions remains to be verified by the first run.

The workflow has only been prepared locally. It has not run on GitHub, and no
branch-protection settings have been inspected or changed. Local lint now passes,
but that is not a hosted CI result. The workflow includes the 15 cleanup tests.
Staging access was confirmed as pending at this inspection; no local environment
file or connected GitHub administration tool was available, and `gh` is not installed.

Before a Production merge, require a green run for the reviewed commit, configure
required checks and PR review on the protected branches, complete the linked
staging checklist on that version, and record release/rollback approval. The product
owner reviews product behavior; engineering owns technical verification. A workflow
file alone does not enforce a merge block or provide staging acceptance.

The [review and release gates](../review-and-release.md) identify the remaining
GitHub, staging, acceptance, and recovery work. Nothing has been committed, pushed,
merged, deployed, or applied to a shared database.
