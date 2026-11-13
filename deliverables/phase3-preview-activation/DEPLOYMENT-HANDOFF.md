# Phase 3 staging deployment handoff

Status: preparation only. Hosted activation and payment acceptance are tracked separately.

The deployment owner targets Vercel project `ace-club-lms`, environment **Preview**, branch `intern/v2-phase-3-integration-review`. Automatic deployment is disabled for this branch. A Git push alone does not publish checkout. The release remains separate from Production and from changes to shared payment credentials.

## Branch configuration

The owner sets each override for the Phase 3 Preview branch only. Existing values for other branches remain unchanged.

| Variable | Required value or private source |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://eyphkkginlgoaxflauog.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Matching staging public client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Matching staging server key, stored as a secret |
| `V2_RAZORPAY_TEST_KEY_ID` | Verified Test Mode key beginning `rzp_test_` |
| `V2_RAZORPAY_TEST_KEY_SECRET` | Matching Test Mode secret, stored as a secret |
| `V2_RAZORPAY_TEST_WEBHOOK_SECRET` | Dedicated webhook signing secret, stored as a secret |
| `V2_CHECKOUT_TEST_ENABLED` | `true`, only after successful schema activation |
| `V2_TEMPLATE_AUTHORING_ENABLED` | `true` |
| `V2_BATCH_AUTHORING_ENABLED` | `true` |
| `V2_STUDENT_SCHEDULE_ENABLED` | `true` |
| `V2_LEARNING_DELIVERY_ENABLED` | `true` |
| `V2_CONTENT_PUBLISHING_ENABLED` | `true` |

The existing staging Notion configuration remains necessary for the original readings. The owner preserves that configuration. `VERCEL_ENV` is supplied by Vercel rather than manually overridden. Secret values are never added to `NEXT_PUBLIC_` variables or repository files.

Razorpay values are held in the private `.env.phase3-private/razorpay-test.env` file at the primary checkout. The staging Supabase values remain in the existing private staging configuration. No credential values appear in this handoff.

## Deployment and sign-in

After activation and publication of the reviewed commit, the owner creates a **Preview** deployment from this branch and supplies its exact URL and commit identifier. A new deployment is required after environment changes. The owner adds the selected staging origin's `/auth/v2/callback` path to the staging Supabase Auth redirect allowlist. Existing redirect URLs remain intact. Google OAuth still returns through Supabase's provider callback; the new application callback does not replace that provider configuration.

## Test Mode webhook

The webhook URL is the reviewed staging origin plus `/api/v2/checkout/webhook`. Razorpay requires a publicly reachable endpoint; localhost and a Vercel sign-in challenge cannot receive provider delivery. The deployment owner resolves protection for this endpoint before acceptance. Any bypass credential remains private; broad protection removal is not part of this handoff. [Razorpay webhook testing](https://razorpay.com/docs/webhooks/validate-test/).

In Razorpay **Test Mode**, the account operator adds the endpoint, uses the same dedicated webhook secret and selects `payment.captured`, `order.paid` and `payment.failed`. Existing webhooks remain unchanged. The signing secret is separate from the API key secret.

The acceptance run verifies a captured payment and a paid order through the provider API. An authorized-only payment remains pending and grants no access. The account operator confirms the Test Mode capture arrangement before the test; any account-wide setting change requires separate review. [Razorpay integration and capture](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/).

## Acceptance boundary

The acceptance run uses designated synthetic staging accounts and course fixtures. It records real Test Mode order/payment identifiers privately, tests successful and failed checkout, duplicate and delayed delivery, upgrade pricing and capacity contention, and checks exact cleanup. The existing walkthrough is excluded from fixture mutation. No real payment, refund or Production action belongs to this staging run.

Local payment tests and recovery rehearsals do not substitute for this provider-backed acceptance. A successful key-authentication check alone does not establish checkout, capture or webhook delivery.
