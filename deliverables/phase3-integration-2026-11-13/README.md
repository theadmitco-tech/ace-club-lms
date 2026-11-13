# Phase 3 Razorpay integration checkpoint

Status: local integration in progress; staging payment acceptance remains incomplete.

The integration branch is `intern/v2-phase-3-integration-review`, based on the reviewed Admin calendar commit `fafe8ec`. The earlier unapplied Phase 3 draft has been integrated without replacing the later learning, content publishing or conflict-response implementations. Unrelated Student login and landing edits remain outside this branch.

## Implemented flow

The public catalogue exposes explicit published outline metadata. Google sign-in precedes server-priced checkout, with explicit consent, recorded course selection and a WhatsApp number. Razorpay Test Mode orders use a server-held secret. Callback signatures and raw webhook signatures are checked; captured payment and order details are fetched from Razorpay before fulfillment. Browser success messages alone never grant access.

Fulfillment atomically creates product access, batch enrollment and requested live registration. Each live batch has eight places, including active checkout holds. Individual upgrades append effective subjects while preserving the original purchase and expiry. Publication changes, disabled accounts, full batches and ambiguous provider responses retain a recoverable review state. Admin payment review appears under More tools when checkout is enabled.

The existing Production rejection remains in place. Checkout is disabled unless the dedicated feature switch is enabled for Preview or local development with the staging project URL. Legacy shared payment keys are not used. Automatic deployment is disabled for this integration branch; the current deployment arrangement leaves staging deployment with the project owner.

## Migration boundary

The three unapplied drafts are now sequenced after the installed Phase 6 repair:

- `20261113090000_add_v2_sales_catalogue.sql`
- `20261113100000_add_v2_checkout_ledger.sql`
- `20261113110000_add_v2_payment_fulfillment.sql`

These files are not a ready-to-run hosted activation packet. Fresh staging metadata, a recovery export and a preservation rehearsal are required before SQL Editor activation. No hosted migration, purchase, payment, enrollment or configuration was changed in this checkpoint.

## Verification scope

The local payment database fixture installs Phases 1, 2, 4, 5 and the Phase 6 conflict repair before the new payment migrations. The browser harness uses actual React components with synthetic provider and API responses; external network requests are blocked. Neither category establishes Razorpay or hosted acceptance.

Verification passed 17 payment/server/database tests, 10 browser journeys, 18 Phase 1 suites, 28 Phase 2 suites, five Phase 4 suites and seven Phase 5 suites. Focused ESLint and the webpack build including TypeScript passed. Local results and source hashes are recorded beside this file. The React review covered authenticated boundaries, independent server reads, stable retry identity, labeled form controls and explicit server confirmation. The mobile screenshot uses synthetic account data.

## Remaining work

1. Test Mode key authentication passed a read-only Razorpay API request. No provider order or payment was created by that check. The webhook secret and hosted configuration remain pending; credentials remain outside Git.
2. Staging schema and recovery evidence are refreshed; the reconciled migration set is rehearsed and applied through the SQL Editor.
3. The project owner configures the dedicated staging environment, deploys the reviewed candidate and enables the Google callback URL. The signed webhook endpoint must be reachable by Razorpay without an LMS session or a Vercel login challenge. Any deployment-protection change requires its own review; protection is not disabled by this implementation.
4. A dedicated Test Mode webhook secret is configured for `payment.captured`, `order.paid` and `payment.failed` at `/api/v2/checkout/webhook` on the reviewed staging origin.
5. Actual provider-backed purchase, retry, callback/webhook, upgrade and capacity acceptance runs against designated fixtures, followed by exact cleanup and combined Phase 6 acceptance.

The current confirmation surface is the registration/payment history with access dates and learning links. No automatic email or WhatsApp message is sent by this checkpoint. External messaging requirements require a separately agreed template and delivery setup.

## Provider references

[Razorpay API keys](https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/) documents separate Test Mode credentials. [Standard Checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/) covers server-created orders and payment verification. [Webhook validation](https://razorpay.com/docs/webhooks/validate-test/) covers signature validation, duplicate events and event ordering. These sources were consulted for this review.
