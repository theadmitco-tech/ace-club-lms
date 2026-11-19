# Phase 3 Student and Admin walkthrough

Status: application implementation is locally verified. Actual provider-backed acceptance remains open. This walkthrough records actions and expected results, not completed manual tests.

## Available now: local review

The local application runs at **http://localhost:3000/login**. The reviewed application commit is `cada411efd0f12fd99eb555e8beda05bc776bcda`; its remote branch was independently matched during this review.

The local server uses staging project `eyphkkginlgoaxflauog`, so saved actions affect staging. Checkout is disabled in this running configuration. The checkout and payment-exceptions pages intentionally return 404 while disabled; that is not a missing deployment or a successful payment test. The existing walkthrough accounts already have grants and cannot prove that a new payment created access.

Two separate browser profiles keep Admin and Student sessions independent. The same account does not acquire a different role by opening a different page. Existing identities, libraries and purchases remain unchanged during the initial inspection.

| Reviewer | Page | Read-only check and expected result |
| --- | --- | --- |
| Signed-out visitor | http://localhost:3000/courses/v2 | Published offerings and price reviews appear; selecting an offering does not grant access. Private resource and meeting links are not public. |
| Student | http://localhost:3000/login | Google sign-in returns to localhost and opens the Student dashboard for an active Student account. |
| Student | http://localhost:3000/account/access | Existing subjects, purchase history and expiry are visible. Existing walkthrough grants are distinguished from payment results. |
| Student | http://localhost:3000/schedule/v2 | Existing permitted learning is accessible according to publication, subject and feedback rules. |
| Student | http://localhost:3000/admin/v2/students | Admin data is denied. Changing the URL does not change the account role. |
| Admin | http://localhost:3000/login | An authorized Admin account opens the Admin dashboard. |
| Admin | http://localhost:3000/admin/v2/students | The designated walkthrough Student can be located and its existing access inspected without changing enrollment. |
| Admin | http://localhost:3000/admin/v2/access | Purchase history is visible. Manual grants are not evidence of payment fulfillment. |

## Required before payment verification

The owner supplies the deployed Phase 3 website origin, called `PREVIEW` below, and confirms the exact commit and staging-only configuration. Localhost is not a publicly reachable Razorpay webhook destination.

- [ ] The exact application candidate is deployed to an accessible Preview.
- [ ] Dedicated Razorpay Test Mode credentials and the checkout flag are configured privately.
- [ ] Supabase permits `PREVIEW/auth/v2/callback` for checkout signup and `PREVIEW/auth/callback` for ordinary login. The existing localhost port-3000 callback only covers ordinary local login; it does not establish checkout signup readiness.
- [ ] The Test Mode webhook reaches `PREVIEW/api/v2/checkout/webhook` without a hosting login challenge. Its events are `payment.captured`, `order.paid` and `payment.failed`.
- [ ] The owner prepares isolated test identities, offerings and exact cleanup records using [the acceptance procedure](../phase3-preview-activation/HOSTED-ACCEPTANCE.md). Existing walkthrough grants are not reused to prove new paid access.

## Student payment checklist

Every case records an observed result before its checkbox is marked. Payment instruments are the provider's documented Test Mode instruments only. A success animation alone is not proof of paid access.

- [ ] **New signup:** the designated fresh Google identity starts at `PREVIEW/courses/v2/checkout`, chooses **Continue with Google**, and returns to the same Preview. Before payment, protected learning remains unavailable; no Admin activation is used.
- [ ] **Single-subject purchase:** the isolated Quant purchaser selects the Quant test offering without live registration, checks the displayed price, fills registration details and selects **Continue to test payment**. A successful Test Mode attempt results in **Confirmed** history, one purchase and Quant access. Verbal/DI and live registration remain unavailable.
- [ ] **Full Course purchase:** a separate isolated purchaser selects the Full Course test offering and its live option. Confirmed payment grants all three subjects and one live-batch registration without manual enrollment.
- [ ] **Failure or cancellation:** an isolated purchaser uses the provider failure option or closes checkout. No paid access appears. A temporary live-place hold is distinguished from confirmed registration.
- [ ] **Retry:** before hold expiry, **Resume checkout** resumes the same checkout/order. Successful payment grants access once. Refreshing history and selecting **Check payment** must not create a second purchase.
- [ ] **Upgrade:** the individual-package purchaser opens `PREVIEW/courses/v2/checkout?upgrade=1`, retains existing subjects and adds another. The charge equals the current configured tier difference, and the original expiry remains exactly unchanged. Full Course is not an individual-package upgrade.
- [ ] **Learning after purchase:** **My access** and **Open learning schedule** show the confirmed entitlement. The permitted recording, reading and worksheet work; an unpurchased subject remains denied. Only designated fixture resources are used.

## Admin payment checklist

- [ ] **Access after payment:** at `PREVIEW/admin/v2/students`, the Admin locates each designated purchaser. Subject access, expiry, enrollment and selected live registration match the Student result without a manual grant.
- [ ] **Purchase history:** `PREVIEW/admin/v2/access` shows one purchase for each successful original checkout. Retries do not create duplicates; an upgrade preserves the original purchase and expiry.
- [ ] **Payment exceptions:** `PREVIEW/admin/v2/payments` shows either **No payment exceptions require review** or the deliberately prepared exception. This page is an exceptions queue, not the complete payment history.
- [ ] **Recovery:** for an owner-prepared interrupted order, the Admin supplies the existing Test Mode order ID and selects **Verify and reconcile**. Only a matching captured payment can fulfill access. An invalid order is rejected, and unresolved cases remain under review without requesting another payment.
- [ ] **Role protection:** the same payment-exceptions URL is denied in the isolated Student browser. Student callers cannot perform Admin reconciliation.

## Checks requiring the coordinated owner session

Ordinary page inspection cannot prove these server-side outcomes:

- [ ] Actual signed webhook delivery fulfills a payment even when browser verification is deliberately interrupted.
- [ ] Duplicate/reordered delivery produces one fulfillment; delayed capture is reconciled without partial access.
- [ ] With seven isolated live registrations, two concurrent contenders cannot both obtain the eighth place. Admin allocation respects the same limit.
- [ ] Authorized-but-not-captured payments grant no access; unsupported provider test states remain explicitly unverified.
- [ ] All tracked orders are reconciled, exact fixture cleanup passes, and original staging rows and existing accounts are preserved.
- [ ] Product Owner acceptance is recorded against the tested candidate.

For each case, the reviewer records the case label, commit, origin, expected result, actual result and pass/fail/blocker. Account identifiers, payment receipts and screenshots containing private data stay in the private review record. Public evidence is sanitized. Phase 3 closes only after the required hosted outcomes and cleanup are evidenced; a local test pass or Git push alone does not close it.

## Fresh local evidence

The current application passed 65 local payment/environment/fixture/database checks and 10 actual-component browser journeys. Database checks use disposable PostgreSQL; browser authentication, payment scripts and responses are synthetic. No hosted mutation, real payment or provider delivery is represented by these results. Details are in [current-verification.json](current-verification.json).
