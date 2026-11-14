# Phase 3 hosted acceptance working session

Status: prepared procedure; execution and acceptance remain pending. Local tests cover the transitions below, but do not establish Google OAuth, Razorpay delivery or hosted payment success. Production is excluded.

## Prerequisites and exact pages

The deployment owner completes `DEPLOYMENT-HANDOFF.md` and supplies the exact HTTPS **Preview origin**, deployed commit and staging project confirmation (`eyphkkginlgoaxflauog`). The origin below is called `PREVIEW`; it is not the Vercel dashboard URL. The final reviewed commit, rather than an earlier successful deployment, is required.

| Page or endpoint | Purpose |
| --- | --- |
| `PREVIEW/courses/v2` | Public offerings, tier prices and published outlines |
| `PREVIEW/courses/v2/checkout` | Google sign-in, course/batch selection and Test Mode checkout |
| `PREVIEW/courses/v2/checkout#history` | Registration reference, payment status, resume and reconciliation |
| `PREVIEW/courses/v2/checkout?upgrade=1` | Existing individual-package upgrade |
| `PREVIEW/account/access` | Effective subjects, original purchase history and expiry |
| `PREVIEW/schedule/v2` | Purchased learning libraries and selected live registrations |
| `PREVIEW/login` | Existing staging Admin sign-in |
| `PREVIEW/admin/v2/payments` | Active Admin payment exceptions and recovery |
| `PREVIEW/auth/v2/callback` | Application redirect allowed in staging Supabase Auth |
| `PREVIEW/api/v2/checkout/webhook` | Dedicated signed Razorpay Test Mode POST destination |

The optional readiness command makes unauthenticated GET requests only, follows no redirects, takes no credentials and prints no response bodies:

```sh
node scripts/phase3/check-hosted-readiness.mjs --preview-origin https://OWNER-VERIFIED-PREVIEW.vercel.app
```

The uppercase placeholder is replaced by the actual lowercase Preview hostname. A protected page or redirect remains blocked. A webhook GET response of 405 establishes only a POST-only route; it does not verify signing, POST access or actual provider delivery. The command cannot verify the deployed commit, platform environment or private database configuration independently.

## Fixture preparation before payments

Engineering and the staging operator record a unique run ID and an owner-only, Git-ignored manifest. No ready-to-run hosted fixture or cleanup SQL packet is claimed by this document. Those packets must be generated and rehearsed against the fresh staging baseline and exact designated identities before hosted mutation. Earlier Phase 1/2/4/5 cleanup packets must not be reused for payment records.

The manifest records:

- The exact deployed commit, Preview origin, run ID, fixture creation time and baseline hashes/counts for the current 92 application tables and migration ledger. Any changed table inventory requires reconciliation.
- Exact Auth/profile IDs and prior states for designated test identities. Newly generated identities are distinguished from pre-existing accounts; pre-existing accounts are never deleted as cleanup.
- Separate synthetic published Full Course, Quant, Verbal and DI batches, session/resource keys, template/publication revisions, and upcoming live events. The Full Course fixture contains all three subject sections. No existing library or walkthrough is edited.
- A dedicated capacity-test batch with seven tracked synthetic registrations and two distinct contender identities, plus a separate empty live batch for the normal success case.
- Exact checkout IDs, Razorpay Test Mode order/payment IDs, event IDs, purchase/grant/upgrade IDs, enrollment/live-audit IDs and any learning records created during the walkthrough. Private identifiers and provider payloads stay outside Git.

The browser checkout requires a verified Google account. A password-only synthetic Auth identity does not pass that requirement. At least one previously unused, designated Google identity must complete the actual Google flow after the installed signup trigger; an already active account cannot prove automatic new-account activation. The account owner performs Google sign-in and any MFA. Synthetic server-created identities or modified Auth metadata may support isolated negative/concurrency tests only and must be labeled fixture authentication, never successful Google OAuth.

Separate designated identities support Full Course success, individual-package upgrades, failure/retry, delayed confirmation, unpaid denial and disabled-account denial. Capacity contenders require separate authenticated caller sessions. Fresh fixture setup must verify their exact roles and states; normal Admin activation must not be used to make the new-signup case pass.

## Browser and provider sequence

All payment instruments are Razorpay's documented **Test Mode** instruments. Real cards, real UPI payments and Live Mode are excluded. Provider mock-bank Success/Failure choices are used where available. [Provider testing reference](https://github.com/razorpay/markdown-docs/blob/master/payments/payments/test-card-details.md).

| Case | Operator action | Required evidence |
| --- | --- | --- |
| Public catalogue | An unsigned browser opens `/courses/v2`, expands the fixture outlines, and opens checkout. | Full Course remains separate from Quant/Verbal/DI packages; headings, price, six-month terms and upcoming live availability appear; private resource/meeting URLs and student data do not appear in the public response. |
| Google signup | The fresh designated identity uses **Continue with Google** and returns to this Preview. Before payment, the identity attempts protected learning. | Actual OAuth return succeeds; the matching new profile remains unpaid/inactive and protected learning is denied. No manual activation or grant occurs. |
| Full Course success | The fresh identity selects the Full Course fixture, selects its live option, fills registration details, accepts the terms and chooses **Continue to test payment**, then the provider's success path. | Provider order receipt equals the private checkout reference; payment is captured, order is paid, amount/currency match the server quote; history becomes **Confirmed**. The profile activates, exactly one purchase is created, all three subjects work, and one Full Course live place is consumed. No subject-by-subject booking is introduced. |
| Individual success | A separate identity purchases the Quant fixture without selecting live. | Quant learning works, Verbal/DI remain denied, no live registration is created, and the server amount equals the current one-subject quote. The browser price alone is not payment evidence. |
| Failure and cancellation | A separate identity chooses the provider failure path, then closes checkout. | Failure/closed messaging appears; no purchase, activation, enrollment or live registration is granted. A temporary 15-minute live hold may remain until expiry; it is not a confirmed registration. |
| Retry | The same identity uses history **Resume checkout** before the hold expires and completes a successful Test Mode attempt. | The same checkout reference and provider order are reused; only the captured payment grants one purchase. Failed attempts and repeated clicks do not duplicate access. After expiry, Resume is unavailable and any new attempt gets a new reference. |
| Callback-independent success | During an isolated success case, QA prevents the browser verification request from completing without blocking the provider webhook. | Actual signed provider delivery reaches the deployed endpoint and independently confirms the same order. Page refresh/history reflects one fulfilled purchase. Network interruption is recorded as deliberate test injection. |
| Duplicate and reordered delivery | The provider operator redelivers the recorded test event where the provider supports it; Engineering may replay a privately retained signed payload with its exact original event ID. A previously failed event for the same order is replayed after success. | One event receipt per ID/payload and one purchase remain; no access or enrollment regression occurs. Provider redelivery and operator-signed replay are labeled separately. No unsigned browser completion message is treated as evidence. |
| Delay and expired hold | Only the dedicated test webhook delivery is paused or fault-injected for the designated case; browser verification is also held. After the 15-minute hold expires, delivery is restored and history **Check payment** reconciles the captured provider order. | With eligibility/publication/capacity unchanged, fulfillment succeeds once. If the capacity fixture has since filled or its publication changed, history becomes **Programme-team review required**, no partial grants occur, and the captured payment remains traceable. The existing unrelated webhooks and account-wide capture settings remain unchanged. |
| Authorized-only state | Where the existing Test Mode capture arrangement supports it, a designated order is observed as authorized but not captured before reconciliation. | History remains pending and no entitlement is granted until captured/paid provider states are independently fetched. If the provider cannot produce this state, the result remains a local-test-only gap rather than a fabricated hosted pass. |
| Upgrade | The Quant purchaser opens `?upgrade=1`, selects Quant and Verbal, reviews the upgrade and pays; the two-subject package is then upgraded to all three subjects. | Current configured tier differences are charged (₹8,000 then ₹7,000 only while tiers remain ₹10,000/₹18,000/₹25,000). The original purchase row, paid amount and expiry remain unchanged; the additive upgrade ledger extends access. A separate designated one-to-three case verifies the ₹15,000 difference at those same configured prices. |
| Upgrade exclusions | Exact expired, revoked, Full Course and multiple-active-purchase fixtures attempt an upgrade. | Each is denied without an order/grant; no existing real purchase is changed to create the test condition. Revoked base access also removes upgraded effective access. |
| Eighth-place contention | With seven fixture registrations active, two independent contender sessions submit a live checkout for the remaining place concurrently. An Admin allocation is also raced against a held checkout in a separate tracked run. | Only one valid hold/registration claims the eighth place; the other caller is denied or sees full availability. Active registrations plus eligible distinct holds never exceed eight. A failed loser creates no paid access. Browser stale counts are not capacity evidence; database state and both responses are recorded. |
| Admin recovery | The designated active Admin opens `/admin/v2/payments`. For a deliberately interrupted order-creation case, the operator finds the existing Test Mode order by its checkout-reference receipt, enters its ID and selects **Verify and reconcile**. | The existing provider order is validated; no second order is blindly created. Wrong receipt/amount/order is denied. Student, inactive Admin and foreign-checkout callers cannot use Admin recovery. A capture awaiting fulfillment remains under review until the actual conflict is resolved. |
| Integrated learning | A fulfilled fixture purchaser opens **My access** and **Open learning schedule**, reads each allowed resource, uses recording feedback and a synthetic mapped live completion, and tests independent published resource replacement/unpublishing. | Phase 1 expiry/subject restrictions, Phase 2 publication/registration, Phase 4 gating and Phase 5 stale-resource denial continue to hold after actual Test Mode fulfillment. Protected resources remain denied to unpaid/wrong-subject/disabled callers. Only fixture learning records are changed. |

The delay, duplicate and capacity cases require a coordinated Engineering/operator session; ordinary screen clicks alone cannot establish their database invariants. Refund execution and Live Mode activation are separate work. Captured payments requiring review are not automatically refunded by this implementation.

## Evidence and cleanup

Each result records case ID, exact commit/origin, timestamp, expected result, observed result and provenance (actual OAuth/provider/browser/database, fixture-authenticated request, or deliberate fault injection). Sanitized reports contain no names, email addresses, credentials, private resource URLs, session cookies or provider payloads. Actual receipt/order/payment identifiers remain in the private manifest for reconciliation.

Before deletion, the provider operator restores the dedicated webhook to its intended configuration and Engineering reconciles every tracked checkout, including interrupted and review cases. The private evidence records unresolved states explicitly. Test Mode provider orders and payments may remain in Razorpay history; application cleanup does not claim to erase provider records or perform refunds.

The exact reviewed cleanup packet removes only manifest-owned payment events, upgrades, checkout intents, purchase/grant records, registrations/audits, enrollments, learning/feedback records, content fixtures and generated profiles in foreign-key-safe order. The packet asserts every target's run ownership and expected relations, rolls back on mismatch, and restores the original application-row/ledger baseline. No wildcard account/email deletion is permitted. Existing libraries and the walkthrough remain unchanged. Unrelated activity detected by a baseline comparison requires inspection; it is not overwritten to force a match.

Only after application cleanup succeeds are newly generated Auth identities removed by exact ID and independently checked absent. Pre-existing Google/Admin identities retain their original profile/role/active state. Storage cleanup applies only to exact newly uploaded fixture object paths, with independent absence checks. Final verification records the restored baseline, zero remaining manifest-owned data, original migration hashes, unchanged Production deployment and no unintended retained access.

Acceptance requires the final candidate's provider-backed cases, cleanup evidence and Product Owner sign-off. Deployment readiness, local tests or an earlier phase's pass do not complete this checklist.
