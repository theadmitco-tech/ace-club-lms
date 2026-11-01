# Phase 1 website integration — 1 November 2026

> Subsequent exit-gate audit: the new authenticated pages were accepted by the
> user, but the complete Phase 1 gate remains **Pending**. The
> [13-item audit](../phase1-exit-gate-audit-2026-11-01/README.md) identifies the
> missing upgrade contract and remaining hosted evidence. The user has accepted
> the internal compatibility mapping.
> Website integration is not full phase sign-off.

## Live Preview

Deployed commit `07154f02c466cd17a940257f4c2b0f56096c453f` to the existing
LMS Preview; deployment `dpl_Eh3mkarH2b5WkHfzybBNCF2fdpQA` is READY.

- [Courses and package prices](https://ace-club-lms-git-intern-v2-pha-9a969c-theadmitco-techs-projects.vercel.app/courses/v2)
- [Student My access](https://ace-club-lms-git-intern-v2-pha-9a969c-theadmitco-techs-projects.vercel.app/account/access)
- [Admin Products & access](https://ace-club-lms-git-intern-v2-pha-9a969c-theadmitco-techs-projects.vercel.app/admin/v2/access)

Hosted checks verified all eight valid selections against staging: Full Course
₹25,000, each individual ₹10,000, each pair ₹18,000, and all three individuals
₹25,000. Mixed Full Course/individual selections are rejected. Signed-out private
routes resolve to `/login`. The deployed browser asset contains staging host
`eyphkkginlgoaxflauog.supabase.co`. GitHub Verify run `41323784343` passed.

Production remains deployment `dpl_8axtycbJUpFX8cPWhVtkhGf6p9Kj`; PR #24 is
Draft and unmerged. No database or environment changes were performed. Phase 2
write flags remain inactive. On 1 November 2026 the user confirmed **“Both load
correctly”** when asked to check the designated staging Student My access and
Admin Products & access pages for expected records or appropriate empty states.
This is user-reported hosted acceptance, not an independently observed agent session.

See [deployment evidence](deployment-2026-11-01.json),
[implementation patch](integration.patch), and [local checks](verification/local-checks.json).

## Implementation scope

Scope: integrate the applied product catalogue and entitlement foundation into the
existing LMS Preview. Phase 2 activation follows separately. Base is PR #24 at
`5398aad5b49b574ef628414127dabbe7fe139614`; retain that Draft PR and Production.

## Implemented flow

- Preview landing page → Courses → `/courses/v2`: Full Course, Quant, Verbal and
  DI come from the database. Individual and package prices are server-side quotes
  from the applied Phase 1 RPC. Canonical selection identifiers are validated;
  Full Course cannot be mixed with individuals. Unavailable data is an explicit
  error, never a fabricated catalogue, fallback price or saved purchase.
- Student navigation → My access → `/account/access`: the current authenticated
  Student sees only their active product access and paginated purchase history.
  Sections and stored expiry are displayed. Expired/revoked records remain in
  history. Current legacy batch access is preserved.
- Admin → Course publishing → Products & access → `/admin/v2/access`: authorized
  Admins review available offerings/prices and paginated purchase/access records.
  There is no browser grant, revocation or commercial-configuration mutation.
- Existing LMS login, role checks and RLS remain in force. Reads use the caller's
  session, not a service-role key. History is explicitly scoped to the Student ID
  and validates returned ownership; payment references are never selected.
- New routes and navigation are enabled only in Vercel Preview/local development.
  Production always denies the new routes, including when other flags are true.
  The landing component was moved intact into HomePage.tsx so its server wrapper
  can pass the Preview navigation setting without exposing private configuration.

The Phase 1 ledger compatibility keys remain internal. The website exposes the
approved names and canonical URL selections without depending on the unapplied
canonical-contract proposal. No migration, ledger, price, purchase, profile,
enrollment, content or feature-flag change is made by this integration.

The original migration remains unchanged:
`20261018090000_add_v2_product_entitlements.sql`, SHA-256
`ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7`.

## Verification

- `npm run test:v2:phase1`: 151 tests across 16 suites passed. Includes local
  PostgreSQL entitlement/expiry/replay/isolation tests and legacy regressions.
- New workspace tests cover all eight selections, wrong-role and wrong-owner
  denial, Production exclusion, malformed data, error/empty distinction and
  pagination. Price lookup failures never supply a fallback amount.
- `CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:v2:phase1:browser`:
  12 browser scenarios passed, using the actual screens and server readers with
  synthetic session/database adapters in a disposable local application.
- Desktop and 390/768px views have no horizontal overflow. Keyboard package
  submission, signed-out redirects, Student/Admin boundaries, active/expired/
  revoked histories and unavailable data states passed.
- Full lint with zero warnings, TypeScript and webpack build passed.
- All 39 existing Phase 2 browser regression scenarios passed after adding the
  shared navigation dependency. Local browser fixtures are never deployed.
- Hosted deployment and acceptance evidence are recorded after publication.

## Acceptance boundaries

This completes the website surface for the Phase 1 foundation; it does not add
checkout (Phase 3), grant product access from legacy enrollment, enable Phase 2
publishing, import existing content or cut protected content over to a new model.

The user confirmed authenticated staging page loading and expected records/empty
states for both roles. Cross-Student isolation is covered by local automated tests;
a separate hosted cross-Student check was not reported. Fixture screenshots remain
local test evidence. The canonical database expansion remains a separate proposal.
