# Isolated Phase 1 candidate verification

Date: 20 October 2026
Branch: `intern/v2-phase-1-completion`
Application commit: `529391fd5bc402831914a60418c0cfef4cec66da`
Starting Phase 1 checkpoint: `ed4c317`
Comparison base (proposed integration): `940ea7835734a8fb22a6451a30b31084b11d5c97`
Preserved Phase 2 branch: `intern/v2-approved-phase-1-2` at `208ceaa`

## Results

| Check | Result |
|---|---|
| `env -i PATH="$PATH" NEXT_TELEMETRY_DISABLED=1 npm run test:v2:phase1` | 102 tests across 11 files passed; zero failures, skips or cancellations; includes one database parent test |
| `npm run lint -- --max-warnings=0` | Passed |
| `./node_modules/.bin/tsc --noEmit --incremental false` | Passed |
| `env -i PATH="$PATH" NEXT_TELEMETRY_DISABLED=1 npm run build` | Passed; 40 generated entries |
| `git diff --cached --check` before application commit | Passed |
| Phase separation | Exactly one new migration against comparison base; no V2 Admin authoring routes or Phase 2 migrations |

The database suite initially could not start its disposable process inside the
sandbox (`pg_ctl EPERM`). The same command passed with execution permission for
that local process. This was an environment restriction, not a bypass of a failed
assertion. All database execution used fresh synthetic PostgreSQL clusters,
private Unix sockets and TCP disabled. No Supabase project was contacted.
No runtime `.env` files were present. Hosted build validation was skipped outside
Vercel. Local Node 26 differs from configured CI Node 24, which remains unverified
for this unpushed candidate.

## Coverage and limits

- Four product scopes, all eight valid price selections, invalid combinations,
  atomic grants, duplicate/concurrent deliveries and conflicting references.
- Six calendar months in UTC, leap years, month-end clamping and microsecond
  boundaries. Before payment is denied; the start is included and expiry excluded.
- New executed database scenario denies all four expired products and all three
  expired Full Batch sections, returns no active access, preserves purchase/grant
  history and proves duplicate replay cannot restart expired access.
- Anonymous, Student and cross-Student boundaries; inactive/revoked identity;
  overlapping valid purchases; caller-session reads recheck access on later calls.
- Ported response validation rejects wrong product sections, mismatched quotes,
  unexpected private fields and provider/configuration failures.
- Phase 1 metadata inspection is tested before/after migration, with a role unable
  to read private rows, and with deliberately changed RLS/write privileges.
- Legacy fixture schema/data preservation and relevant regression suites pass.

These results do not prove hosted RLS/schema, OAuth, browser/mobile/keyboard
behavior or payment-provider behavior. Existing material routes retain legacy
access; connecting V2 protected content is later-phase work. No app server,
shared migration, Production request or existing-data mutation was performed.

## Migration artifact

`supabase/migrations/20261018090000_add_v2_product_entitlements.sql`
SHA-256: `ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7`

The proposed Phase 1 migration is unchanged from the prior candidate. Review its
actual staging compatibility and ledger before any separately authorized action.
Do not apply the full historical directory or any Phase 2 migration for this PR.

## Complete application/configuration/test diff from comparison base

- [.github/workflows/verify.yml](../../../../.github/workflows/verify.yml)
- [package.json](../../../../package.json)
- [scripts/release-safety.test.mjs](../../../../scripts/release-safety.test.mjs)
- [scripts/v2-phase-1-schema-preflight.sql](../../../../scripts/v2-phase-1-schema-preflight.sql)
- [scripts/v2-product-entitlements.test.mjs](../../../../scripts/v2-product-entitlements.test.mjs)
- [scripts/v2-product-readers.test.mjs](../../../../scripts/v2-product-readers.test.mjs)
- [scripts/v2-staging-catalogue-probe.browser.js](../../../../scripts/v2-staging-catalogue-probe.browser.js)
- [scripts/v2-staging-catalogue-probe.test.mjs](../../../../scripts/v2-staging-catalogue-probe.test.mjs)
- [scripts/verify-v2-phase1.mjs](../../../../scripts/verify-v2-phase1.mjs)
- [src/app/admin/curriculum/worksheets/[id]/page.tsx](../../../../src/app/admin/curriculum/worksheets/[id]/page.tsx)
- [src/app/api/create-order/route.ts](../../../../src/app/api/create-order/route.ts)
- [src/app/api/register/batches/route.ts](../../../../src/app/api/register/batches/route.ts)
- [src/app/api/register/create-order/route.ts](../../../../src/app/api/register/create-order/route.ts)
- [src/app/api/register/verify-payment/route.ts](../../../../src/app/api/register/verify-payment/route.ts)
- [src/app/api/register/webhook/route.ts](../../../../src/app/api/register/webhook/route.ts)
- [src/app/api/verify-payment/route.ts](../../../../src/app/api/verify-payment/route.ts)
- [src/app/register/page.tsx](../../../../src/app/register/page.tsx)
- [src/lib/errorMessage.ts](../../../../src/lib/errorMessage.ts)
- [src/lib/masterWorksheet.ts](../../../../src/lib/masterWorksheet.ts)
- [src/lib/razorpayCheckout.ts](../../../../src/lib/razorpayCheckout.ts)
- [src/lib/registration.ts](../../../../src/lib/registration.ts)
- [src/lib/server/v2Products.ts](../../../../src/lib/server/v2Products.ts)
- [src/lib/v2Products.ts](../../../../src/lib/v2Products.ts)
- [src/utils/supabase/storage.ts](../../../../src/utils/supabase/storage.ts)
- [supabase/migrations/20261018090000_add_v2_product_entitlements.sql](../../../../supabase/migrations/20261018090000_add_v2_product_entitlements.sql)

Documentation and the prepared review sequence are indexed by the
[completion report](../completion-report.md). Historical evidence is retained.
