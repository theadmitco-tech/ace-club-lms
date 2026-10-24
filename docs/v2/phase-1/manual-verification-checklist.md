# V2 Phase 1 — Staging verification checklist

Status: Active — Phase 1 applied; staging SQL verification passed; current Preview browser checks pending
Owner: Engineering and product owner
Last updated: 24 October 2026

## Current staging result — 24 October

The approved migration from PR #23 at `d3020c1` was applied to staging after a
private backup and isolated recovery rehearsal. Pricing, grants, role isolation,
expiry and revocation passed SQL verification; synthetic fixtures were rolled
back and existing application data stayed unchanged. See the
[application report](evidence/staging-application-2026-10-24.md) for exact source,
checksum, results and limitations. The earlier 404 is historical; the current
Preview REST/browser result is still pending.

Next browser target:
<https://ace-club-a8go51h46-theadmitco-techs-projects.vercel.app>.
The probe has been repinned to this candidate, retaining the staging-origin
guard. Run it from the signed-in Preview after a reload and record only its
sanitized JSON result. Continue the browser-specific checks below; SQL identity
simulation does not establish browser/API authentication or legacy UI behavior.
Do not request the already granted Phase 1 application approval again.

The remaining sections preserve the earlier checklist and observations. Unchecked
mixed SQL/browser items are not automatically completed by the SQL result above.

## Current candidate

Use `intern/v2-phase-1-completion` and application commit
`529391fd5bc402831914a60418c0cfef4cec66da`, described in the
[completion report](completion-report.md). Six-month access denial is now
[confirmed](../decisions/phase-1-expiry-confirmation-2026-10-20.md).
All earlier browser observations below are historical and must be repeated where
relevant for the exact candidate. No new staging checklist item is marked passed.

This checklist is not permission to apply a migration or change shared data.
Use designated synthetic staging identities only. Do not copy production data,
record secrets, or run the complete historical migration directory.

The 18 October access decision permits Preview review while keeping Vercel
team/project access restricted. Use the [Preview-only collaboration workflow](review-and-release.md#preview-only-collaboration-decision--18-october-2026).
Deployment/configuration evidence is supplied by the project owner. Dashboard
membership is not a checklist requirement; a Preview invitation does not establish LMS roles.
The product owner confirmed that an earlier shared Preview connects to staging
Supabase. The [19 October evidence](evidence/preview-and-access-2026-10-19.md)
identifies the current PR Preview at `3207cba` and records basic Admin/Student
navigation using designated Google test accounts. The current Preview's database
target and migration state still require confirmation. Entitlement, API, RLS and
content-access testing remains pending.

**19 October browser-connection update:** The manual tester confirmed that the
Preview's browser request hostname is `eyphkkginlgoaxflauog.supabase.co`, matching
the repository's staging mapping. This verifies the reported browser target only;
server runtime configuration, deployed migration definitions and the migration
ledger remain unverified. No keys, headers or session tokens were supplied.

## Public catalogue browser check

The probe was run manually on the exact PR Preview identified in the evidence:
`https://ace-club-1vr3qxhtk-theadmitco-techs-projects.vercel.app`.

**20 October result:** `CATALOGUE_UNAVAILABLE`, HTTP 404, `PGRST205`; the quote
check did not run. See the [sanitized result and next action](evidence/catalogue-probe-2026-10-20.md).
Inspect the actual staging schema/ledger before selecting a fix or rerunning the
probe. The procedure below is retained for verification after the cause is resolved.

The historical probe was pinned to that earlier Preview. The current script is
pinned to the candidate named in the 24 October update above. Do not weaken the
origin check or treat the historical result as evidence for the current candidate.

1. Reload the Preview's Admin dashboard so its browser requests are recorded.
2. Open [the browser probe](../../../scripts/v2-staging-catalogue-probe.browser.js)
   in the editor and copy the complete file.
3. Open Developer Tools → Console on that Preview, paste the file and run it.
4. Record only the resulting JSON object headed `phase1_public_catalogue`. Do not
   export a HAR, copy request headers or provide credentials.

The probe reads already-loaded first-party JavaScript to find the app's public
anonymous API key. It accepts only the fixed Preview origin and observed staging
traffic. It never reads session cookies/storage or executes downloaded scripts.
It makes GET requests for the four product scopes and one Full Batch price quote;
no grant, purchase, profile or migration writes are attempted. Public keys remain
in memory and are omitted from output. See the [Supabase API-key reference](https://supabase.com/docs/guides/getting-started/api-keys)
for the distinction between public keys and user authentication.

| Result | Interpretation |
|---|---|
| `PUBLIC_CHECKS_PASSED` | Four expected product scopes and the INR 25,000 Full Batch quote are exposed correctly through the public API. |
| `CATALOGUE_UNAVAILABLE` with `PGRST205` or `42P01` | The table is unavailable through REST; a missing migration, schema-cache state or exposure issue needs investigation. |
| `QUOTE_UNAVAILABLE` with `PGRST202` | The expected function signature is unavailable through REST; migration/cache state needs investigation. |
| `REVIEW_CATALOGUE_CONFIGURATION` or `REVIEW_PRICE_CONFIGURATION` | Public data differs from the expected launch configuration. |
| HTTP 401/403, `42501`, `READ_FAILED` or other configuration result | The check is inconclusive; inspect the sanitized result before retrying. |

A pass does not establish the complete migration checksum/ledger, other bundle
prices, authenticated access, isolation, expiry, or legacy compatibility. The
current browser result is a failed catalogue check. Local safety tests use synthetic responses only:
`node scripts/v2-staging-catalogue-probe.test.mjs`.

Local verification on 19 October: all ten probe safety tests passed, repository
lint passed with zero warnings, and the production build passed including
TypeScript. Deployment-environment validation was skipped outside Vercel, so the
build adds no hosted configuration evidence. No app server was started and no
database request was made during these local checks.

## Observed role navigation

- [x] Dedicated Student sign-in opens the Student interface (manual report).
- [x] Student navigation to `/admin` ends at `/dashboard` (manual report).
- [x] Dedicated Admin sign-in opens the Admin dashboard (screenshot evidence).
- [ ] Signed-out and cross-role privileged API access denied.
- [ ] Synthetic legacy enrollment permits the affected content journeys; the
  observed Student dashboard currently reports no course assigned.

These observations establish basic navigation only. They do not satisfy the V2
catalogue, grant, expiry or isolation checks below.

## Before execution

- [x] Record the local candidate source and unchanged Phase 1 migration checksum
  in the [isolated evidence](evidence/isolated-candidate-2026-10-20.md).
- [ ] Obtain a Preview for that commit and project-owner confirmation of the
  staging Supabase target. Confirm the designated test Admin and Student identities; do
  not use real student accounts for probes. Request sanitized build logs if needed.
- [ ] Obtain successful `Lint` and `Tests and build` checks on that commit. Resolve
  existing lint errors; verify that branch protection actually requires checks and
  PR review before merging. The workflow file alone does not enforce protection.
- [ ] Confirm the target is Staging and reconcile the deployed schema/migration ledger.
  The [Phase 1 metadata inspection](../../../scripts/v2-phase-1-schema-preflight.sql)
  checks only four Phase 1 tables/RPCs in a read-only transaction; presence and
  privileges do not prove equivalent definitions or migration approval.
- [ ] Review `20261018090000_add_v2_product_entitlements.sql`, backup and recovery
  arrangements; obtain separate approval before the authorized operator applies it.
- [x] Record confirmation that access is denied after six months.
- [ ] Verify six-calendar-month UTC expiry and destination-month clamping on
  staging using examples: 31 August 2026 at 10:00 UTC expires
  28 February 2027 at 10:00 UTC. Existing MVP students are not assigned this expiry automatically.
- [ ] Confirm the price-table correction reflects the already approved three–Crash
  Course bundle, which never grants Full Batch access.

## Catalogue and grants

- [ ] Quote all four products and all two/three-section Crash Course combinations.
  Confirm INR 10,000 / 18,000 / 25,000 bundle pricing and INR 25,000 Full Batch.
- [ ] Reject unknown/duplicate/null products and Full Batch mixed with Crash Courses.
- [ ] Confirm anonymous callers and students cannot write product, price, purchase,
  or grant tables or call `grant_v2_purchase`.
- [ ] Have the authorized staging operator create synthetic verified-purchase
  fixtures through the restricted grant function. This does not test a payment provider.
- [ ] Replay identical references, including concurrent deliveries, and confirm a
  single purchase with unchanged expiry. Mismatched buyer, products, timestamp,
  amount, currency, or price revision must fail without extra access.
- [ ] Confirm a failed bundle grant leaves no partial purchase or access; two
  simultaneous conflicting buyers cannot claim the same payment reference.

## Identity, access, and history

- [ ] Student A cannot read Student B's purchases or grants through Supabase REST/RPC.
- [ ] A Quant Crash Course grants Quant only; three Crash Courses still deny Full
  Batch. A separate Full Batch purchase grants Quant, Verbal, and DI together.
- [ ] Signed-out, inactive, expired, and revoked identities/purchases are denied.
  Confirm the exact start-inclusive, expiry-exclusive boundary.
- [ ] Expired access is denied on a later request without a cleanup job or
  browser logout. Purchase/grant history remains; duplicate fulfillment does not
  restart expiry, and another independently valid purchase retains its access.
- [ ] With synthetic failures, verify loss of session or RPC connectivity cannot
  grant access. Revoking one of two valid purchases must preserve the other.
- [ ] Active Admins can inspect history but cannot issue grants through their browser session.
- [ ] Closing product sales preserves existing access; future price versions do
  not alter paid prices, product identity, or expiry.
- [ ] Existing MVP students retain their current dashboard, recordings, worksheets,
  tracker, and direct material URL behavior, including enrolled inactive batches.
- [ ] Verify the Admin worksheet editor: initial/empty load, navigation to a different
  worksheet while loading, add/edit/delete/import refresh, and recovery after a
  network failure. Confirm drafts and results do not carry into another worksheet.
- [ ] Verify the existing public batch list and any enabled registration checkout
  in provider test mode: successful response, cancellation, invalid signature, and
  failed-network responses. The lint cleanup does not implement V2 fulfillment.
- [ ] Confirm no claim that existing content routes already use V2 entitlements:
  product-to-batch/content bindings are later-phase work.

## Evidence and acceptance

- [ ] Record exact source, migration checksum, sanitized identity roles, expected
  and actual outcomes, and restored synthetic-fixture state.
- [ ] Attach the clean local lint result and the hosted run for the same source;
  local lint is resolved, but a build alone is not staging acceptance.
- [ ] Record Product Owner acceptance or remaining exceptions. Do not infer merge
  or Production-release approval from phase acceptance.
