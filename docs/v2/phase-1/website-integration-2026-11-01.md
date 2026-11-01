# Phase 1 website integration — 1 November 2026

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

Hosted authenticated acceptance needs designated staging Admin/Student sessions.
Verify Admin records and a Student's own records; compare empty states with actual
staging data. Check another Student cannot read those purchases. Do not treat a
fixture screenshot as hosted data evidence or alter real students to manufacture
an acceptance result. The canonical database expansion remains a separate proposal.
