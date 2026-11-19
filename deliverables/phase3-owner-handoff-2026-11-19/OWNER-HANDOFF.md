# Phase 3 owner execution record

**Preparation status: incomplete for dispatch.** Publication details below must be resolved before deployment is requested. No Preview, migration, provider or Production action is authorized by this document alone.

## Candidate and target

| Field | Recorded value |
| --- | --- |
| Phase | 3 — registration, payments, upgrades and live capacity |
| Branch | `intern/v2-phase-3-integration-review` |
| Initial reviewed local SHA | `12fc8d17690d46145573c3ffb79c06a2e48f7527`; subsequent review fixes require the final publication receipt |
| Application SHA to deploy | `0841e70b848cae43a75b4f28f83808c6587790ef`, locally verified including checkout sign-in recovery and session deletion; remote publication of this new candidate remains required. Later documentation-only commits are not silently substituted for this application candidate |
| PR URL/status | No matching Phase 3 integration PR found; Draft creation retried and denied with GitHub integration HTTP 403. A Draft PR remains required |
| Proposed PR base | `intern/v2-admin-workflow-review`, the inherited Admin implementation branch |
| Vercel project | `ace-club-lms` (`prj_2lW0zANcAnI81eURRZrJTMSCxuLr`) |
| Environment | Preview, scoped only to the named integration branch |
| Automatic deployment | Disabled for this branch; a push does not deploy it |
| Preview origin | Not assigned or verified; the owner records the actual HTTPS origin from the exact deployment |
| Supabase | Recorded project name `ace-club-lms-staging`; ref `eyphkkginlgoaxflauog` is the authoritative target |
| Provider | Razorpay Test Mode only; no Live Mode or real payment instruments |
| Merge/readiness | Draft and unmerged until exact-candidate Preview verification; no readiness change requested |

The recorded Supabase display name comes from the existing Phase 1 verification record, not a fresh dashboard lookup. The owner confirms the ref regardless of later display-name changes. No Preview hostname is guessed from the branch name.

## Schema: no new application migration required

The operator-supplied [reconciliation](../phase3-preview-activation/hosted-reconciliation.json) confirms the following three source-matched migrations are already installed in staging. All were also exercised in disposable local rehearsal databases. Production installation was not inspected or performed.

| Original order | File under `supabase/migrations/` | SHA-256 | Staging state |
| --- | --- | --- | --- |
| 1 | `20261113090000_add_v2_sales_catalogue.sql` | `21b5d7ba9c0b0697a4acef72e533bb3947791f1b098a35e55366927252f4f54f` | Applied, source matched |
| 2 | `20261113100000_add_v2_checkout_ledger.sql` | `555b7e49be59842a425b40188ebb1b9b457c6ba4df93f0ce208ecf19233f6b4b` | Applied, source matched |
| 3 | `20261113110000_add_v2_payment_fulfillment.sql` | `da996f6d8f059a2a1677bb0b573bff3d9322bc3505282bd0fa20af204735ee58` | Applied, source matched |

Recorded scope: 21 routines, three triggers, four private payment tables, 88 original application tables preserved and 92 tables after activation. No applied migration is edited. A changed or uncertain hosted state requires read-only reconciliation; neither the old activation packet nor a database reset is a recovery step. Synthetic fixture setup is a separate owner-operated write with its own fresh baseline.

## Private configuration

Every listed value is scoped to **Preview / `intern/v2-phase-3-integration-review` only**. Effective deployment configuration must be checked for broader inherited values; an existing override on another branch does not configure this branch.

| Variable | Classification | Required source or purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Verified staging project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client key | Same staging project |
| `NEXT_PUBLIC_SITE_URL` | Public | Exact owner-recorded HTTPS Preview origin |
| `SUPABASE_SERVICE_ROLE_KEY` | Server secret | Same staging project; no public prefix |
| `V2_RAZORPAY_TEST_KEY_ID` | Server configuration; provider public identifier | Dedicated Test Mode key ID, with the test prefix |
| `V2_RAZORPAY_TEST_KEY_SECRET` | Server secret | Matching dedicated Test Mode API secret |
| `V2_RAZORPAY_TEST_WEBHOOK_SECRET` | Server secret | Distinct secret configured on the dedicated Test Mode webhook |
| `V2_CHECKOUT_TEST_ENABLED` | Server feature flag | `true`, only on this Preview branch |
| `V2_TEMPLATE_AUTHORING_ENABLED` | Server feature flag | `true`, only on this Preview branch |
| `V2_BATCH_AUTHORING_ENABLED` | Server feature flag | `true`, only on this Preview branch |
| `V2_STUDENT_SCHEDULE_ENABLED` | Server feature flag | `true`, only on this Preview branch |
| `V2_LEARNING_DELIVERY_ENABLED` | Server feature flag | `true`, only on this Preview branch |
| `V2_CONTENT_PUBLISHING_ENABLED` | Server feature flag | `true`, only on this Preview branch |
| `VERCEL_ENV` | Platform-provided | Must resolve to Preview; not manually overridden |

Existing approved reading-provider configuration is retained by the owner. Generic shared payment credentials are not copied into these dedicated V2 fields.

The restricted, Git-ignored private payment file and deployment bundle were inspected locally without printing values. The Test Mode ID, API secret and distinct webhook secret are present; bundle payment/staging values match their private source files. The bundle still has an unresolved site-origin placeholder. This establishes private preparation only: current provider authentication, webhook registration, secret transfer and deployment configuration are not verified. Secrets are transferred only through the owner's approved private channel, never chat or Git.

## Callback and webhook setup

After the owner records the exact origin as `PREVIEW`:

- Application callbacks: `PREVIEW/auth/v2/callback` for checkout signup and `PREVIEW/auth/callback` for ordinary login. The owner adds these to the staging Supabase redirect allowlist without replacing existing entries. The Google provider's Supabase callback remains separate from the application callbacks.
- Webhook: `PREVIEW/api/v2/checkout/webhook`, with events `payment.captured`, `order.paid` and `payment.failed`, on the dedicated Razorpay **Test Mode** webhook.
- LMS checkout: `PREVIEW/courses/v2/checkout`; Admin login: `PREVIEW/login`; payment review: `PREVIEW/admin/v2/payments`.

The webhook must accept the provider's signed POST without a Vercel login challenge. A browser share link or a GET returning 405 does not prove delivery. The owner resolves protection for the intended endpoint without broadly disabling application or project security. A changed Preview origin requires matching callback, webhook and site-origin configuration before retesting.

## Local evidence and limits

The current review reruns these synthetic checks from the integration worktree:

```sh
node --test --test-reporter=tap scripts/v2-checkout-server.test.mjs scripts/deployment-environment.test.mjs scripts/phase3/hosted-accounts.test.mjs scripts/phase3/hosted-qa.test.mjs scripts/phase3/verify-hosted-payments.test.mjs
node --test --test-reporter=tap scripts/v2-sales-catalogue-database.test.mjs scripts/v2-checkout-database.test.mjs
```

Results: 58 and seven passing cases respectively, zero failures after local subprocess permissions were available. Initial sandbox attempts blocked temporary Git subprocesses; those attempts are not passes. Coverage includes signatures, exact captured payment matching, failure/retry/replay, guarded account cleanup, staging/Test Mode isolation, atomic fulfillment, upgrades, eight-place contention and paid access through earlier phase controls. Provider responses and identities are synthetic.

The [earlier review record](local-verification.json) records 33 content browser cases, 21 Admin browser cases, lint, TypeScript and an application build passing. The [exploratory review](exploratory-review.md) retains its initial resource-validation and mobile-button findings. The later [Admin repair record](../admin-integrated-review-2026-11-19/REPAIRS.md) covers session resources prepared before publication, batch draft recovery, mapping guidance and final static validation. The local build retained a non-blocking multiple-workspace-lockfile warning. A [fresh verification record](current-verification.json) reports 65 passing local payment/environment/fixture/database cases and 10 synthetic payment browser journeys at the application candidate above. No fresh full build was required for the subsequent documentation-only update.

The [manual Student and Admin checklist](SELF-VERIFICATION.md) gives exact pages and expected outcomes. The current local review runs on port 3000 with checkout disabled; localhost access does not establish external webhook readiness. The owner's Phase 3 Preview remains unconfirmed, and the latest combined-status response contained no statuses rather than a passing CI receipt.

The [15 November full local record](../all-phases-exit-gates-2026-11-15/final-local-verification.json) retains the earlier 141 synthetic browser cases for its attributed sources. Historical counts do not prove an untested revision. Automated visual exploration does not establish usability approval by a human Admin.

Required static commands for the final source:

```sh
npm run lint -- --max-warnings=0
npx tsc --noEmit --incremental false
npm run build
```

## Owner acceptance and cleanup

The [hosted acceptance matrix](../phase3-preview-activation/HOSTED-ACCEPTANCE.md) specifies 15 operator actions and expected outcomes, including actual Google signup, Full Course and individual purchases, cancellation/retry, callback-independent webhook fulfillment, duplicate/reordered/delayed delivery, authorized-only denial, upgrades/exclusions, eighth-place contention, Admin recovery and integrated learning.

Execution proceeds in this order:

1. The owner verifies the final remote SHA, Draft PR and checks, then effective Preview configuration and recovery readiness.
2. The owner deploys that SHA and records origin, READY state, staging ref and callback/webhook configuration.
3. The owner prepares twenty exact generated test identities and isolated course/capacity fixtures using [account lifecycle](../phase3-preview-activation/HOSTED-ACCOUNT-LIFECYCLE.md) and [fixture preparation](../phase3-preview-activation/HOSTED-QA-PREPARATION.md). A fresh baseline and privately tracked IDs precede mutation.
4. The owner/operator executes the applicable payment, denial, retry and contention cases with those generated identities. Each case records candidate, origin, expected/observed result, timestamp and actual-provider versus synthetic provenance. Generated Auth metadata and non-deliverable fixture URLs cannot establish genuine Google signup or resource delivery.
5. Every tracked Test Mode order in that run is reconciled before its exact reviewed cleanup. Application baseline restoration and generated Auth/profile absence are verified independently. The twenty-account run is fully closed before a new Google/resource baseline is captured.
6. Genuine Google signup and real resource delivery then follow the separate [owner preservation plan](../phase3-preview-activation/OWNER-GOOGLE-RESOURCE-ACCEPTANCE.md). The dedicated Google identity, disposable resources, fresh baseline and separate exact cleanup packet remain owner prerequisites. The owner records the genuine signup, captured Test Mode payment and integrated resource results, then completes that run's own application, Storage and Auth cleanup. Existing accounts, libraries and walkthrough are preserved throughout both runs.
7. A failure remains visible and stops affected acceptance. The Product Owner records acceptance or rejection only after both runs' required evidence and cleanup are complete. Phase 6 combined acceptance follows; no Production release is implied.

## Containment and recovery

Before execution, the owner records the current Preview artifact, effective branch configuration, ledger/source reconciliation and fixture baseline. Recovery readiness is confirmed before any fixture write.

A build failure stops deployment. Uncertain project identity stops SQL. Migration uncertainty triggers reconciliation rather than repetition. Wrong access or payment behavior stops acceptance and preserves exact private evidence. No broad deletion, schema reset, guessed inverse migration or historical ledger rewrite is used.

Disabling `V2_CHECKOUT_TEST_ENABLED` disables **both checkout and its webhook**, not only new orders. If containment requires disabling the feature, the owner retains provider receipts/delivery history and reconciles in-flight captured Test payments after restoring a verified candidate. No automatic refund or deletion of provider history is implied. Any rollback artifact must first be checked against the installed additive schema; an arbitrary older Preview is not assumed compatible. Database restoration is separately approved and rehearsed in isolation.

No Production credential, data, migration, deployment, domain or real payment is used by this review. The current V2 runtime rejects Production. The branch and PR stay in review until Preview verification and the required owner decision.

## Latest application continuation

Candidate `0841e70b848cae43a75b4f28f83808c6587790ef` includes the tested checkout callback recovery (`a151b59`) and reviewed session deletion. The [signup recovery record](signup-recovery-verification.json) reports 23 local checks and 11 synthetic browser journeys. The [session deletion record](../admin-integrated-review-2026-11-19/SESSION-DELETION.md) reports 12 focused local checks, 39 content browser journeys, lint, standalone TypeScript and the final webpack build. These are separate reports with their own scope; totals are not combined into a unique-test claim. The earlier 65-case report remains attributed to its earlier candidate. Local review defaults to the already allowed port 3000. Genuine provider-backed acceptance, owner fixture execution and cleanup remain outstanding.
