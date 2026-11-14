# Phase 3 payment snapshot verification

The read-only verifier checks actual payment and order snapshots independently of a browser success message. It accepts only the designated staging project and Razorpay Test Mode credentials. All HTTP operations are GET requests to fixed origins and exact read endpoints; redirects are rejected. No checkout, capture, fulfillment, event receipt, enrollment, account update or cleanup is performed.

## Execution

The operator records exact observed checkout/payment identifiers in an owner-only, Git-ignored JSON file. The expected price, selected subjects, batches, live selection and original upgrade expiry come from the reviewed test plan or pre-upgrade observation. Expectations must not be copied blindly from the final response under test. The fixture manifest supplies the synthetic account/course identifiers; credentials and access tokens remain private.

```sh
node scripts/phase3/verify-hosted-payments.mjs \
  --manifest .env.phase3-private/payment-verification.json \
  --staging-env .env.phase3-private/staging.env \
  --razorpay-env .env.phase3-private/razorpay-test.env \
  --output .env.phase3-private/payment-verification-result.json
```

Paths are operator-selected and relative to the current working directory. Input files require current-user ownership and no group/other permissions. The report cannot overwrite an input. A failing or incomplete report produces a nonzero exit code. The public report contains case numbers and named checks, without account identifiers, email addresses, tokens, order/payment identifiers, resource URLs or raw provider errors.

## Private manifest contract

The root object contains:

| Field | Required value |
| --- | --- |
| `schema` | `phase3-payment-verification-v1` |
| `stagingProject` | `eyphkkginlgoaxflauog` |
| `runId` | Recorded fixture-run UUID |
| `candidateCommit` | Forty-character hexadecimal source commit; deployment identity still requires separate verification |
| `cases` | One to forty distinct checkout cases |

Each case contains:

| Field | Purpose |
| --- | --- |
| `studentId`, `checkoutId` | Exact recorded UUIDs |
| `orderId`, `paymentId` | Actual Test Mode provider identifiers |
| `expectedProducts` | Checkout product codes: `full_batch`, or selected `quant_crash` / `verbal_crash` / `di_crash` |
| `expectedAccessProducts` | Entire expected current entitlement set for the isolated account |
| `batchIds`, `liveBatchIds` | Exact checkout courses and live subset |
| `expectedAmountPaise`, `currency` | Reviewed positive integer price and `INR` |
| `expectedState` | `fulfilled`, `review` or `ready` |
| `expectedPaymentStatus` | `captured`, `authorized`, `failed` or `created` |
| `expectedActive` | Expected Student profile activation state |
| `expectedExpiry` | Required for fulfilled cases: `{ "kind": "six_calendar_months" }` for a new purchase, or `{ "kind": "fixed", "expiresAt": "<recorded original timestamp>" }` for an upgrade |
| `accessToken` | Optional private current Student session; absence makes caller-bound acceptance incomplete |

The fixture generator's `checkouts` list remains the cleanup scope. The verification manifest is separate and never replaces that cleanup record. This verifier covers current active fulfilled purchases and unfulfilled provider snapshots. Expired/revoked synthetic fixture cases, abandoned checkouts without a provider payment, concurrent capacity, callback signature rejection and webhook retry behavior require their dedicated tests.

## Independent checks

- The service read RPC must return the exact checkout owner, selected products, course identifiers, live subset, amount, currency, state and provider references.
- Razorpay order and payment responses must independently agree on identifiers, receipt, amount and currency. Captured acceptance requires a captured payment, zero refund amount and a fully paid order with no outstanding balance. Authorized/failed/created expectations must not imply capture or entitlement.
- Auth and profile reads must agree on the recorded Student identity, confirmed email and expected active state. The Google provider marker is inspected as metadata only.
- A supplied caller token is checked against `/auth/v1/user` before caller-bound history and entitlement reads. Known foreign checkout fixtures cannot appear in that caller's history. Exact product/subject scope, automatic course access and live registration are checked.
- New-purchase expiry uses UTC calendar-month arithmetic with end-of-month clamping. Upgrade expiry must match the pinned original timestamp. Comparisons preserve PostgreSQL microsecond precision.
- The manifest commit is operator-supplied attribution. A separate Preview diagnostic or owner deployment record must establish the exact deployed source commit.

The contract follows the provider's documented [payment fields](https://github.com/razorpay/markdown-docs/blob/master/api/payments/fetch-all-payments.md) and [order states and amounts](https://github.com/razorpay/markdown-docs/blob/master/api/orders/create.md). A synthetic unit-test transport does not constitute a provider request.

## Eleven exit-gate audit

| Gate | Current evidence | Remaining acceptance |
| --- | --- | --- |
| Public published offerings and batches | Local catalogue/database tests and the earlier staging public-read probe | Current hosted page and eligible selection |
| Full Course separate from subject packages | Product contracts and synthetic browser/database tests | Current hosted checkout selection |
| Outline, headings, availability, price and six-month terms | Synthetic rendering and server-priced checkout coverage | Current hosted visual review |
| Automatic registration and enrollment | Local fulfillment transaction and four-offering integration | Actual Google callback and Test Mode payment-to-access journey |
| Full Course grants all three subjects | Local fulfillment/access checks; snapshot verifier supports exact sections | Provider-backed Full Course journey |
| Individual payment grants only selected subjects | Local four-offering integration; snapshot verifier supports exact products/sections | Provider-backed Quant, Verbal and DI journeys |
| Eight-place capacity is atomic | Ten concurrent local requests admit eight; Admin allocation uses the same bound | Hosted final-place contention and delayed capture |
| No per-session booking or waitlist | Batch-only checkout contract and local coverage | Hosted workflow confirmation |
| Server-controlled, idempotent payment verification | Signature, provider validation and database replay tests | Actual capture plus repeated callback/webhook observations |
| Failure/delay/duplicate/replay safety | Local failure/review/replay tests | Real Test Mode failures, delivery retries, interrupted requests and exact cleanup |
| Approved upgrade price and original expiry | Local tier-difference/upgrade transaction tests; microsecond-preserving verifier | Actual Test Mode upgrades with pre-upgrade expiry evidence |

The application schema is already reconciled; no activation packet is repeated for these checks. A passing snapshot report closes only its recorded observations. Webhook delivery, OAuth, concurrency, retry behavior, final cleanup and explicit acceptance remain separate evidence.
