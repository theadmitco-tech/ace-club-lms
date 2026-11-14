# Production enablement implementation specification

Status: **planned implementation; not implemented or authorized for activation**. The current source remains staging-only and Razorpay Test Mode only. Completion of the owner-managed Preview handoff does not enable Production. This specification makes the remaining engineering dependency explicit; it changes no runtime guard, credential, migration or deployment.

Provider-backed Phase 3 acceptance and final combined Phase 6 acceptance precede this implementation. Production credentials, content and schema must be independently verified. The final source commit requires fresh tests and separate release authorization.

## Environment policy and feature gates

A server-owned environment policy must map deployment context to an exact approved Supabase origin, site origin and payment mode. Expected Production identifiers currently recorded in the release plan are `owmlxsnzogfapotmjrqk` and `https://aceclub.theadmitco.com`; the release operator must verify them before implementation is accepted. Preview remains restricted to `eyphkkginlgoaxflauog`. Unknown contexts, missing values, malformed origins and mismatched keys must fail closed.

A proposed master flag, `V2_PRODUCTION_RELEASE_ENABLED`, defaults to false and permits only the separately approved Production context. It is a proposed interface, not an existing supported variable. Existing feature flags remain independent and explicit; enabling one must not silently enable unrelated features. The environment policy must not accept a query string, request header, browser storage value or client-supplied origin as authorization.

| Source module | Current restriction | Required reviewed change |
| --- | --- | --- |
| `src/lib/server/v2Phase1Feature.ts` | Production always returns false; Preview/development enables Phase 1. | Route Phase 1 availability through the shared policy and the explicit Production master flag. Preserve caller authorization on account and Admin reads. |
| `src/lib/server/v2TemplateFeature.ts` | `V2_TEMPLATE_AUTHORING_ENABLED` and non-Production. | Require the shared environment policy plus the existing authoring flag. |
| `src/lib/server/v2BatchFeature.ts` | `V2_BATCH_AUTHORING_ENABLED` depends on template authoring. | Preserve the dependency and apply the approved environment policy. |
| `src/lib/server/v2StudentScheduleFeature.ts` | `V2_STUDENT_SCHEDULE_ENABLED` depends on batch authoring. | Preserve or explicitly review the dependency; no accidental public schedule enablement. |
| `src/lib/server/v2LearningFeature.ts` | `V2_LEARNING_DELIVERY_ENABLED`, Preview/development and exact staging URL. | Permit only the verified environment-specific origin under its feature flag and the Production master flag. |
| `src/lib/server/v2ContentPublishing.ts` | `V2_CONTENT_PUBLISHING_ENABLED` depends on learning. | Retain dependency and caller-bound Admin publication checks. |
| `src/lib/server/v2UpgradeQuotes.ts` | `V2_INDIVIDUAL_UPGRADE_POLICY` and exact staging origin. | Preserve the approved policy identifier and financial rules; use verified environment identity and the effective upgrade-aware purchase state. |
| `src/lib/v2Checkout.ts` | `V2_CHECKOUT_TEST_ENABLED`, staging origin, Production denied. | Keep Test Mode enablement separate from a proposed `V2_CHECKOUT_LIVE_ENABLED` flag. Live mode requires the Production master flag and verified Production configuration. |
| `src/lib/server/v2Phase1Verification.ts` and `/qa/phase1` | Staging verification tooling. | Remain staging-only; the release policy must not make QA routes available in Production. |

`V2_CHECKOUT_LIVE_ENABLED` and `V2_PRODUCTION_RELEASE_ENABLED` must not be configured as though they work before their reviewed implementation exists. Preview builds must reject Live Mode credentials; Production checkout must reject Test Mode credentials. Legacy MVP payment variables and behavior remain independent.

## Razorpay adapter, callbacks and safe containment

| Source module | Required implementation and acceptance |
| --- | --- |
| `src/lib/server/v2Razorpay.ts` | Replace the Test-only configuration selector with an explicit server-side mode selector. Proposed Production names are `V2_RAZORPAY_LIVE_KEY_ID`, `V2_RAZORPAY_LIVE_KEY_SECRET` and `V2_RAZORPAY_LIVE_WEBHOOK_SECRET`. Live keys require `rzp_live_`; Test keys require `rzp_test_`. No fallback to shared legacy variables or opposite-mode values is permitted. |
| `src/lib/server/v2Checkout.ts` | Replace the fixed staging service client with the verified environment-specific project. Validate configured URL and key ownership/role using the selected Supabase key format; prefix checks or merely decoding a token must not be treated as provider authentication. Reject an unverified or cross-environment client before any order or fulfillment call. |
| `src/app/api/v2/checkout/route.ts` | Preserve caller ownership, server prices, published revision checks, validated request bodies, order-creation claim and ambiguous-order recovery. Introduce a tested control that stops new checkout/order creation without discarding already-paid reconciliation work. |
| `src/app/api/v2/checkout/webhook/route.ts` | Select only the mode-matched dedicated signing secret. Preserve raw-body HMAC, event receipts, duplicate/replay handling, provider refetch and retriable temporary failures. Production callback handling must remain available during an approved new-checkout pause; the current shared availability gate must be reviewed rather than disabled blindly. |
| `src/app/auth/v2/callback/route.ts` and checkout UI | Preserve Google PKCE and server eligibility. Verify the exact Production callback allowlist and same-origin redirects. Test Mode notices and payment-button/provider descriptions in `src/app/courses/v2/checkout/page.tsx` and `CheckoutForm.tsx` must be driven by the validated server mode; Production must not falsely claim that no money is charged. |

Existing capture checks remain mandatory: the provider API must confirm the matching order ID and receipt, exact server amount and INR currency, `captured` payment state, `captured: true`, zero refunded amount, a paid order with the expected paid amount and zero amount due. Neither a valid browser signature, an `authorized` payment nor a webhook payload alone grants access. Capture policy must be verified with the payment operator; any account-wide change is separately reviewed. An API key prefix alone does not establish the account's live-payment readiness.

Webhook reachability must be tested independently of browser share links. A Vercel login challenge or expired bypass URL cannot serve as the payment callback. Event-secret rotation, provider retries and in-flight captures require a reviewed transition procedure; no old receipt or purchase history is erased to make a test pass. The release must define a bounded operator procedure for paid-but-unfulfilled/review cases. No automatic refund is introduced by this specification.

## Private content and build separation

`src/lib/v2ContentAssets.ts` currently hardcodes the staging Storage origin; `src/lib/server/v2ContentAssets.ts` validates and signs against that origin. Both need an environment-specific, allowlisted origin shared by upload preparation, resource-reference parsing, signed-URL checks and streaming. The Production implementation must never sign or fetch a staging reference simply because the object path matches. The private `v2-course-content` bucket, 50 MiB limit, MIME restrictions, current entitlement/publication checks and denial of stale resource keys remain intact.

`src/utils/supabase/client.ts`, `server.ts`, `storage.ts` and `proxy.ts` require cross-checking against the same build/runtime policy. Public client values and server credentials must belong to the same approved project. `scripts/validate-deployment-env.mjs` must extend its current URL checks to cover the new feature/mode requirements without printing secrets. Runtime checks remain necessary because a successful build alone cannot prove the effective server configuration.

A fresh Production-target build is required after the reviewed enablement change and approved Production configuration. The tested Preview artifact must not be promoted on the assumption that its compiled public environment, payment mode or resource references are appropriate for Production. The release record identifies the actual Production artifact, commit, configuration review and domain assignment separately.

## Required tests before release approval

1. An environment matrix exercises each feature gate with default-off Production, approved Production, Preview, local development, unknown context, missing flags, wrong project, malformed URL, mixed public/server keys and wrong payment mode. Negative cases must demonstrate zero provider calls and zero privileged writes.
2. Adapter and route tests cover Test/Live selection, legacy-variable rejection, raw-body signatures, wrong signing secret, changed body, duplicate/replayed/out-of-order callbacks, amount/currency/order/receipt mismatches, authorized-only and refunded payments, provider timeouts and interrupted order creation. Existing Phase 3 coverage remains required.
3. New-checkout containment tests prove that new orders are refused while valid already-paid reconciliation remains available and idempotent; a full emergency shutdown has an explicit operator recovery path.
4. Private asset tests cover environment-specific upload, signed URLs, byte ranges, cross-project reference denial, expired/revoked/wrong-subject access and stale unpublished/deleted keys. Current Phase 4 feedback and Phase 5 publication regressions remain required.
5. Browser acceptance verifies the actual Admin and Student journeys, Google sign-in, public catalogue, checkout mode wording, payment confirmation/history, original-expiry upgrades and the eight-place invariant on the final combined source. Synthetic provider tests remain labeled synthetic.
6. All Phase 1–6 suites, build, lint and TypeScript pass on the final enablement candidate. A separately approved minimal Live Mode smoke names the account, amount and reconciliation/refund procedure; no real charge is authorized by this document.

Existing suites to extend include `scripts/v2-checkout-server.test.mjs`, `scripts/v2-checkout-database.test.mjs`, `scripts/phase5/assets.test.mjs`, `scripts/release-safety.test.mjs` and `scripts/browser/v2-phase3/verify.mjs`. Changes to several TSX components require the React quality review. Relevant installed Next.js guides must be read before runtime changes.

## Schema reconciliation and rollback prerequisites

The current source inventory contains 20 migration files through the three Phase 3 versions. All three Phase 3 sources match staging; the prior staging ledger remains preserved. Production may have a different installed set. An authorized operator must run the read-only preflight on the verified Production project, reconcile source/definition/security equivalence, and prepare only the exact missing set. The Phase 6 repair precedes Phase 3 in source order. Applied migrations are never edited or replayed as routine release preparation; future required changes use additive migrations with a fresh rehearsal.

A Production-equivalent recovery rehearsal must apply that missing set, preserve existing rows/ledger and verify both the new candidate and the identified previous application against the resulting schema. Production content transfer requires its own reviewed manifest; staging walkthrough grants, simulated classes, QA accounts, private references and payment records are excluded.

The release authorization names the exact new artifact, rollback artifact, environment changes, migration packet, content operations and allowed smoke writes. Application rollback cannot reverse captured payments, new purchase/upgrade records, Auth changes or Storage writes. Payment reconciliation and compatibility evidence must therefore precede any rollback decision. A database restore is separately authorized with explicit handling of post-backup captures and writes. Without this evidence, the documented recovery plan remains preparation rather than a usable release guarantee.

## Owner and engineering responsibilities

The owner-managed Preview session can finish staging configuration and provide access for acceptance. Engineering must then implement and verify this Production enablement specification; the Product Owner must review the exact candidate. Authorized release operators subsequently perform approved Production actions. No phase is marked fully accepted merely because its source was pushed or a Preview was deployed.
