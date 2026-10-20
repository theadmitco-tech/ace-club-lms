# Ace Club LMS V2 — Phase 1: Product catalogue and access

Status: Active — isolated Phase 1 candidate verified locally; staging acceptance pending
Owner: Engineering and product owner
Last updated: 20 October 2026

## Current isolated candidate

Branch: `intern/v2-phase-1-completion`.
Application commit: `529391fd5bc402831914a60418c0cfef4cec66da`.
The [completion report](completion-report.md) is the current handoff for scope,
files, tests, risks and remaining operator actions. Phase 2 remains on its
separate saved branch; it is not included in this candidate.

The [expiry confirmation](../decisions/phase-1-expiry-confirmation-2026-10-20.md)
resolves denial after six months. Database checks enforce that rule without a
cleanup job or deletion of purchase history. UTC/calendar-month details below
are the retained implementation convention for staging review.

The [isolated verification](evidence/isolated-candidate-2026-10-20.md) passed
102 tests across 11 files, lint, TypeScript and build. Earlier hosted/Preview
results below apply only to their recorded commits. The new candidate has not
been pushed or tested on staging; no shared migration was applied.

## Scope and authority

Phase 0 remains deferred for the current work. Phase 1 follows the task branch →
draft PR → matching Preview → staging checks → review workflow. Neither phase is
accepted; shared migrations, merge, and release require separate decisions.

Implement the [Phase 1 scope](../review/product-roadmap.md#phase-1--product-catalogue-and-entitlement-foundation)
against [product acceptance criteria](../review/acceptance-criteria.md#1-product-model).
The original baseline was `940ea7835734a8fb22a6451a30b31084b11d5c97` on
`intern/v2-onboarding`; the proposed integration target is `codex/v2-integration`.
Existing signed MVP and Pilot V2 history remains unchanged.

The scope includes pre-merge safety checks and the bounded cleanup of existing
lint failures documented below. Phase 2/3 product and payment functionality remain
outside this change.

## Current code findings

- [Enrollment](../../../src/lib/types.ts) links a student to a course, without an
  expiry field. [Paid registration](../../../src/lib/registration.ts) writes this
  enrollment. Neither constitutes the new V2 product entitlement model.
- The baseline database's `can_access_course` checks active profiles and legacy
  enrollment. The latest [timeline migration](../../../supabase/migrations/20260820114212_restore_enrolled_student_inactive_batch_access.sql)
  selects the latest legacy enrollment, including operationally inactive batches.
- [Protected PDF access](../../../src/app/api/materials/file/route.ts) and
  [Notion access](../../../src/app/api/notion/route.ts) depend on current material
  RLS. Changing legacy enrollment checks would affect existing students.
- These are source findings, not verification of deployed schema or behavior.

## Implementation boundary

1. Introduce separate V2 products: Full Batch, Quant Crash Course, Verbal Crash
   Course, and DI Crash Course. Fix each product's section scope; do not derive
   scope or schedule from its display name.
2. Store versioned INR prices in the database. A Crash Course bundle is a purchase
   of distinct section products, never a Full Batch entitlement.
3. Store verified-payment purchase records and their individual product grants
   separately from legacy enrollments. Granting must be atomic and idempotent;
   browser callers must not be able to grant themselves access.
4. Calculate expiry in the database from payment confirmation. Implemented exact
   boundary: six calendar months in UTC, clamped to the destination month's last
   day when necessary; access is valid at its start and invalid at its expiry.
5. Enforce active student identity, own-record visibility, expiry, revocation,
   and product/section scope in database functions and RLS. Application readers
   must use those boundaries, not browser-only checks.
6. Preserve existing courses, enrollments, payment fulfillment, schedules, materials,
   and legacy authorization. Payment error handling and worksheet loading receive
   the documented lint cleanup below. No existing student receives a new expiry or
   an automatic V2 migration as part of this phase.

Phase 2 will bind published batches to products. Phase 3 will verify provider
payments and invoke the protected grant operation. Phase 4 will bind shared
learning content to the new access boundary. This foundation alone must not be
represented as V2 protection already applied to existing material routes.

## Product alignment and details requiring review

- Decision V2-DEC-03 explicitly approves all three Crash Courses at INR 25,000.
  AC-V2-PRODUCT-05 and the roadmap price summary omitted that bundle. Both summaries
  now include the existing approved decision. It does not grant Full Batch access.
- Denial after six months is confirmed. Six calendar months and the UTC boundary
  above are the retained engineering convention, with explicit month-end and
  timestamp test cases. Notifications remain outside this phase.
- Existing-student mapping and their access start/expiry require a later explicit
  migration decision. Preserve current access in the meantime.
- Confirm the deployed schema and migration ledger when staging access arrives.
  Do not apply the entire historical migration directory without reconciling the
  known excluded weekly-schedule migration and earlier ledger discrepancies.

## Verification plan

- Check four product scopes, configured prices, distinct-section bundle quoting,
  and rejection of duplicate/unknown/mixed Full Batch purchase selections.
- Exercise the new migration against a disposable local PostgreSQL database
  with synthetic identities; this cannot substitute for Supabase staging tests.
- Verify anonymous and student callers cannot grant purchases; students cannot
  read another student's purchases or grants.
- Verify exact payment/expiry boundaries, month-end and leap-year behavior,
  revoked/inactive access, and that three Crash Courses do not grant Full Batch.
- Verify duplicate grant retries preserve the original expiry and mismatched
  retries fail without creating extra access.
- Inject failed migrations and partial bundle writes, race conflicting buyers,
  and compare the complete committed baseline schema/data before and after.
- Inject missing configuration, failed authentication, and network errors into
  the server readers. The boolean authorization guard must deny access on failure.
- Run focused tests, existing Pilot V2 tests, TypeScript, lint, and build. Record
  pre-existing failures separately from regressions and account-dependent checks.
- Stage the reviewed migration later, verify existing-student access and direct
  content URLs, then obtain phase acceptance. No live checks are authorized here.

## Exit state

- [x] Four product definitions and commercial configuration implemented.
- [x] Product grant, expiry, and isolation tests pass locally.
- [x] Pricing summaries aligned with the approved V2-DEC-03 bundle.
- [x] Repository lint passes with zero errors and warnings; cleanup regression tests pass.
- [ ] Intended source baseline confirmed; PR #20 documents a newer deployed lineage than main/integration.
- [x] Historical hosted GitHub checks passed for PR #23 at `3207cba`.
- [x] Historical rewritten PR head and matching LMS Preview verified.
- [ ] Isolated candidate published as a draft update with matching CI and Preview.
- [x] Basic Admin/Student sign-in and Student-to-Admin redirect observed manually.
- [ ] Required checks and branch protection verified.
- [x] Six-month access denial confirmed in the subsequent decision record.
- [ ] Expiry boundaries and calendar convention verified on the accepted staging candidate.
- [ ] Staging schema, RLS, access boundaries, and legacy compatibility verified.
- [ ] Product owner accepts Phase 1 against recorded evidence.

## Files and integration contract

- [Migration](../../../supabase/migrations/20261018090000_add_v2_product_entitlements.sql):
  `v2_products`, `v2_price_versions`, `v2_purchases`, and `v2_product_grants`;
  RLS, versioned launch prices, calendar expiry, and restricted database functions.
- [Domain types](../../../src/lib/v2Products.ts) and
  [server readers](../../../src/lib/server/v2Products.ts): catalogue, quote,
  current-user access summary, and exact product/section authorization.
- [Database tests](../../../scripts/v2-product-entitlements.test.mjs): run with
  `npm run test:v2-products`; requires `initdb`, `pg_ctl`, and `psql` on PATH.
  The test creates and removes its own cluster under the OS temporary directory,
  uses synthetic identities, disables TCP listening, and ignores inherited PG
  connection settings. Never substitute a staging/production connection string.
- [Server-reader tests](../../../scripts/v2-product-readers.test.mjs): run with
  `npm run test:v2-readers`; execute the actual reader module with synthetic
  Supabase responses and transport failures.
- [PR verification workflow](../../../.github/workflows/verify.yml): separate
  lint and test/build jobs, no deployment or application secrets. Both jobs passed
  for the earlier head `3207cba`; new candidate CI and branch protection verification remain pending.
  Lint rejects warnings as well as errors, and the test job includes the cleanup
  regression suite.
- [Cleanup regression tests](../../../scripts/release-safety.test.mjs): run with
  `npm run test:release-safety`; exercise actual payment route handlers and
  worksheet reads with synthetic external dependencies.
- [Local verification evidence](evidence/local-verification-2026-10-18.md) records
  passed checks, the resolved lint baseline, and remaining verification limits.
- [Staging checklist](manual-verification-checklist.md) records basic role navigation;
  database rules and legacy browser journeys remain pending.
- [Preview and access evidence](evidence/preview-and-access-2026-10-19.md) links the
  current PR head, passing jobs, exact Preview, manual observations and remaining gates.
- [Catalogue probe result](evidence/catalogue-probe-2026-10-20.md) records the manual
  staging API response: HTTP 404 / `PGRST205`; price verification did not run.
- [Review and release gates](review-and-release.md) records the proposed GitHub,
  staging, and recovery sequence. It is a checklist, not release approval.

`quote_v2_products` accepts distinct product codes and returns a database price
revision, integer paise, currency, and canonical product selection. It does not
create an order or accept a browser-supplied amount as proof of payment.

Only the `service_role` database role can call `grant_v2_purchase`. It receives a
student profile ID, distinct products, a canonical provider-qualified payment
reference, immutable confirmation timestamp, quoted price revision, verified
amount, and currency. Phase 3 must verify all provider/order/buyer evidence before
calling it. Existing payment routes are not connected to this function yet.
The service role has read-only table privileges on these new tables and writes
through the validated function; it cannot directly edit grants or price history.
No service-role credential is needed or provided for ordinary development.

Grant retries with the same reference and identical details return the original
purchase. Mismatched retries fail atomically; neither retries nor price changes
extend access or undo revocation. An already verified purchase may be fulfilled
after sales for that product close. Closing sales does not revoke existing access.
Inactive students may hold purchase history, but receive no V2 access. Account
activation remains the responsibility of the verified onboarding flow in Phase 3.

Authenticated students may inspect their own purchase/grant history, including
expired history; access summaries and authorization functions exclude expired,
revoked, and inactive access. Active Admins may read history for support, but do
not receive Student entitlements or browser permission to grant purchases.

No new page, route, provider integration, live-seat assignment, or content-binding
consumer is enabled. Later consumers must call the database authorization boundary
at access time, not treat a cached access summary as ongoing authorization.

## Compatibility and rollback

The migration does not rewrite legacy tables, rows, functions, RLS, or storage
policies. Its purchase table references existing profiles. Do not migrate existing
enrollments automatically. Local tests compare all 19 committed baseline tables,
their existing rules and synthetic rows, and preserve legacy access to an inactive
course and released material. Later migration history and real deployed
compatibility still require staging evidence.

Before later application, reconcile the migration ledger, take the approved
staging backup, and review this one migration explicitly. Each application is
transactional. Before consumers are enabled, an application rollback consists of
reverting the new callers and leaving the additive tables unused. Preserve purchase
and grant history; do not drop tables or delete access records as a casual rollback.
If V2 purchases have begun, rollback requires a separate plan preserving paid access.

## Existing lint cleanup

- Existing payment routes and registration UI now narrow unknown failures through
  [a shared message helper](../../../src/lib/errorMessage.ts). Error instances and
  database objects retain their existing string messages; null, scalar, and invalid
  message values use the existing fallback instead of crashing the catch block.
- [Checkout types](../../../src/lib/razorpayCheckout.ts) describe the existing
  Razorpay constructor/events. This introduces no payment-provider behavior change.
- [Worksheet reads](../../../src/lib/masterWorksheet.ts) return typed results.
  The editor applies asynchronous results, discards cancelled initial reads, and
  starts fresh state when the worksheet ID changes. Network failures resolve to
  an error state; they no longer leave the initial spinner waiting indefinitely.
- Unused declarations were removed and the public-batch mapping uses query-inferred
  types. No lint rule was disabled; the old effect-dependency suppression was removed.
- Provider/DB calls are stubbed in cleanup tests. Staging must still verify the
  actual worksheet editor lifecycle and any enabled registration/payment journey.

## Current handoff — 20 October 2026

- Application candidate: `3207cba41b0561ef78c0adf5a44302d753d48bdb` on
  `intern/v2-onboarding`. PR #23 remains a draft into `codex/v2-integration`.
- Documentation follow-up: local `intern/v2-phase-1-verification`, based on that
  candidate. Phase 2 is paused and preserved on its separate local branch.
- Public GitHub metadata inspected on 19 October confirms passing lint/tests/build and identifies the exact
  LMS Preview used for the reported Admin/Student browser checks. The separate
  flexible-mocks Preview still fails. See the [dated evidence](evidence/preview-and-access-2026-10-19.md).
- Designated Google Admin and Student accounts work for basic navigation. A second
  Student fixture, deployed migration state, entitlement checks and legacy
  compatibility remain unverified. The manual tester subsequently confirmed that
  browser requests use the documented staging hostname; server runtime configuration
  and the migration ledger are still unverified.
- The [manual catalogue probe](evidence/catalogue-probe-2026-10-20.md) returned
  `CATALOGUE_UNAVAILABLE` / HTTP 404 / `PGRST205`. The table was not resolved through
  the staging API; the price check was skipped. Missing migration and stale schema
  metadata remain hypotheses until the actual database is inspected.
- Access is confirmed as Preview-only. Next action: obtain authorized staging
  schema/ledger inspection, or staging-only access to perform that inspection.
  The helper's ten synthetic tests, lint and build passed on 19 October; those
  results do not override the hosted failure. Shared writes remain blocked until
  operator-approved staging setup. Acceptance, merge and release remain separate gates.

## Previous handoff — 18 October 2026

The snapshot below is retained for history. Its account, publication and hosted-check
statuses are superseded by the current handoff and 19 October evidence above.

- Branch: `intern/v2-onboarding`; starting commit:
  `940ea7835734a8fb22a6451a30b31084b11d5c97`. The five task commits are consolidated
  into a replacement commit with neutral documentation. Only documentation differs
  from the previously tested tree; all 21 implementation/test/workflow hashes match.
- [PR #23](https://github.com/theadmitco-tech/ace-club-lms/pull/23) is a draft into
  `codex/v2-integration`. Before replacement, hosted results were verified for
  `f97d5939c728dc467668b557650bd9eb77abc93d`. Publication of the replacement head
  and its fresh checks remain pending in this record.
- [Verify run 39116800666](https://github.com/theadmitco-tech/ace-club-lms/actions/runs/39116800666)
  passed both `Lint` and `Tests and build`, including database tests, reader tests,
  cleanup tests, Pilot V2 tests, TypeScript, and the production build.
- Local verification recorded 17 database scenarios and 67 application tests,
  zero lint errors/warnings, and successful TypeScript/build checks. Locked
  dependency installation left the lockfile unchanged.
- [Deployment results](https://github.com/theadmitco-tech/ace-club-lms/pull/23#issuecomment-6248418639)
  show a successful LMS Preview and a failed flexible-mocks deployment for that
  commit. The latter requires sanitized build logs and a scope decision. Copilot
  did not review the PR because its review quota was exhausted.
- Preview-only access remains the collaboration boundary. The earlier shared
  Preview was confirmed by the product owner as staging-backed; the PR-specific
  Preview's database target remains unverified. Designated test Admin/Student
  accounts have not been provided, and staging verification has not run.
- No shared migration or Production change has been performed as part of this
  work. Required branch protections, the deployed baseline, expiry convention,
  staging compatibility, product acceptance, and release approval remain pending.
- The [earlier GitHub review](evidence/github-review-2026-10-18.md) and
  [deployment follow-up](evidence/github-deployment-followup-2026-10-18.md) preserve
  the unresolved Release 1.2/main discrepancy. The [review procedure](review-and-release.md)
  records the remaining gates. Phase 1 is not accepted and no later phase is unlocked.
