# Phase 1 — Isolated implementation and acceptance handoff

Status: Active — local candidate verified; staging and product acceptance pending
Owner: Engineering and product owner
Last updated: 20 October 2026

## Candidate and scope

Branch: `intern/v2-phase-1-completion`
Application commit: `529391fd5bc402831914a60418c0cfef4cec66da`
Starting checkpoint: `ed4c317`, on the earlier Phase 1 lineage
Proposed PR target: `codex/v2-integration`; accepted deployment baseline still pending

This candidate contains Phase 1 only: four products, configured prices,
payment-linked access grants, six-month expiry, ownership/section isolation and
server readers. The [new expiry confirmation](../decisions/phase-1-expiry-confirmation-2026-10-20.md)
resolves the previous access-removal hold. The original decision record and its
checksums are preserved in the [decision register](../decisions/README.md).

Phase 2 remains committed on `intern/v2-approved-phase-1-2` at `208ceaa`.
That branch was not rewritten. This candidate has no Phase 2 authoring routes,
draft/publication tables or migrations. Later checkout, hosting and protected-content
changes were not imported. The original Phase 1 lint/worksheet/checkout cleanup
remains part of its earlier PR scope and must receive its regression checks.

The experimental upgrade helper on the separate branch is also excluded.
Static review identified a contract issue for later payment work: configured
prices use distinct `price_version_id` values for each package size, so requiring
the current and target quote IDs to be equal is not a valid way to compare those
packages. Phase 3 must review that helper and pricing/credit contract before use.
The Phase 1 catalogue and initial-purchase quotes do not call it.

## Implemented behavior

- Full Batch grants Quant, Verbal and DI together. Standalone courses grant only
  their section; buying all three does not grant Full Batch.
- Commercial configuration supplies ₹10,000 / ₹18,000 / ₹25,000 standalone
  package prices and ₹25,000 Full Batch. Invalid/mixed selections are rejected.
- Restricted grant operations create a complete purchase and its entitlements
  atomically; repeated payment references do not create duplicate access or
  restart the clock.
- Access ends after six calendar months from verified payment, using the
  database's UTC/month-end convention. Every authorization call checks current
  database time. There is no scheduled deletion job and no history is erased.
- Inactive, revoked, expired, signed-out and wrong-product access is denied.
  A separate still-valid purchase retains its own access.
- Ported server-response validation rejects overbroad/malformed catalogue,
  quote and access payloads. Errors do not return private provider diagnostics.
- Existing MVP enrollment, material rules, course data and Student access remain
  unchanged. V2 content-reader integration belongs to later phases.

## Verification and changed files

The [dated local evidence](evidence/isolated-candidate-2026-10-20.md) lists all
25 application/configuration/test files against the proposed integration base,
the migration checksum, exact commands, coverage and limitations.

| Check | Result |
|---|---|
| `npm run test:v2:phase1` | 102 tests across 11 files passed; zero failures or skips |
| `npm run lint -- --max-warnings=0` | Passed |
| `./node_modules/.bin/tsc --noEmit --incremental false` | Passed |
| `npm run build` | Passed; 40 generated entries |
| Phase separation | Only the Phase 1 migration differs from the proposed base |

The runner is also wired into GitHub's verification workflow. Its checks use
synthetic data, disposable local PostgreSQL and mocked transport dependencies.
They are not actual Supabase/browser/provider acceptance.

Documentation changes comprise the [V2 index](../README.md), this report,
[Phase 1 index](README.md), [manual checklist](manual-verification-checklist.md),
[review/release handoff](review-and-release.md), the two dated evidence records,
the decision register/source/expiry confirmation, and authority pointers in the
[product decisions](../review/product-and-business-decisions.md),
[criteria](../review/acceptance-criteria.md) and [roadmap](../review/product-roadmap.md).
No credentials, account addresses or private Student data belong in these reports.

## Remaining acceptance sequence

1. **Resolve the review baseline and publish the candidate through a draft PR.**
   [Fresh metadata](evidence/remote-candidate-review-2026-10-20.md) confirms PR #23
   remains open/draft at `3207cba`, and main/integration remain at `940ea78`.
   The local candidate is a descendant of the PR head, so a reviewed update need
   not rewrite published history. Phase 2 must not be included. Confirm the
   Production-source discrepancy before merge; inspect required checks/protection.
2. **Verify a Preview and CI for the exact candidate.** Earlier green checks and
   login screenshots do not cover this local commit. The existing browser probe
   is pinned to its earlier Preview; validate and update that allowlist only
   after the new Preview identity and staging target are known.
3. **Authorized operator inspects staging.** Use the read-only
   [Phase 1 metadata report](../../../scripts/v2-phase-1-schema-preflight.sql).
   It checks four tables and four public RPC signatures without reading Student
   rows or repairing anything. Independently compare the actual definitions and
   migration ledger; object presence alone is insufficient.
4. **Obtain separate staging migration/setup approval.** Review only
   [20261018090000_add_v2_product_entitlements.sql](../../../supabase/migrations/20261018090000_add_v2_product_entitlements.sql),
   its checksum and recovery plan. The prior catalogue probe's 404 is unresolved.
   Do not replay the historical migration directory or apply Phase 2 SQL.
5. **Execute and record the staging checklist.** Use an Admin and two distinct
   test Students, plus separately approved synthetic purchase fixtures. Check
   prices, direct permissions, isolation, expiry, duplicate/concurrent grants and
   existing MVP journeys. Fix failures and rerun affected checks.
6. **Product review records Phase 1 acceptance.** Phase acceptance does not
   authorize a main merge or Production release.

The current instruction explicitly prohibits shared migration and existing
student/course-data changes. Those steps were not executed. No push, PR update,
deployment or Production operation was performed by this checkpoint.

## Risks and next action

The core six-month denial decision is resolved. Notifications, upgrade credit/
expiry and Student batch selection belong to later phases and do not hold up
review of this initial-purchase foundation.

Remaining risks are the unresolved deployment lineage, actual staging schema,
exact-candidate hosted checks and browser/legacy compatibility. Public GitHub
branch metadata reports `protected: false` on main and integration; enforcement
must be configured/verified before merge.

**Next required action:** approve the exact Phase 1 review/staging path and have
the authorized operator supply the metadata/ledger result. The candidate is
locally ready for that review; Phase 1 cannot be recorded as accepted until the
staging evidence and product sign-off exist.
