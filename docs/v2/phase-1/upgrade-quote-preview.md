# Individual upgrade quote candidate — 1 November 2026

Status: implemented as a read-only Preview candidate. The user explicitly confirmed
the rule on 1 November 2026: “Use this upgrade rule.” The policy variable is scoped
to Vercel Preview branch `intern/v2-phase-2-review` only. This is not payment
fulfillment or full Phase 1 exit-gate sign-off.

The accepted policy `current-tier-preserve-expiry-v1` accepts exactly one active,
unrevoked individual-package purchase. The target must strictly contain its current
subjects. Both package prices come from current configured quote RPCs; their
difference is the indicative upgrade amount. Original expiry is retained.
Full Course, already-three-subject packages, multiple active purchases and invalid
or inactive access are excluded. Refunds are not independently represented in the
applied Phase 1 ledger; a refunded purchase must be revoked to be excluded reliably.

The `/account/access/upgrade` route uses authenticated Student identity, caller
Supabase session/RLS and an explicit owner filter. Active purchase reads are bounded
to two records, enough to detect ambiguity. The access RPC checks the same grant
scope and expiry using database time. No payment references, student IDs or raw
private purchase records are returned to the page. Missing/malformed data, denied
access and quote failures return controlled states without substitute prices.

The policy is enabled only when all of these are true:

- The existing Phase 1 Preview/development guard passes; Production always fails.
- The Supabase URL is exactly the staging origin `https://eyphkkginlgoaxflauog.supabase.co`.
- `V2_INDIVIDUAL_UPGRADE_POLICY=current-tier-preserve-expiry-v1` is configured.

The variable was configured on the named review branch after that explicit user
confirmation; Production and other branches are excluded. No migration is needed
for this read-only calculation; the original Phase 1 migration remains unchanged.

Quotes are re-read to detect price revisions during the request. These reads do
not form a database transaction or reserve a price. The UI therefore calls the
result an **estimate** and provides no payment/grant button. Phase 3 must recheck
identity, active purchases, prices, payment and expiry atomically before fulfilling
an upgrade. Existing `grant_v2_purchase` requires a whole-package payment amount;
do not pass an upgrade difference into that RPC or rewrite existing purchase rows.

Verification: `node --experimental-strip-types scripts/v2-upgrade-quotes.test.mjs`
passes 12 tests, including all 12 valid subject-superset transitions, invalid
selections, missing policy/wrong environment, role and owner denial, expired/revoked
rows, multiple-purchase ambiguity, current price credit, changing revisions and
provider failures. These are local tests with synthetic transport, not hosted
purchase or authenticated acceptance evidence.
