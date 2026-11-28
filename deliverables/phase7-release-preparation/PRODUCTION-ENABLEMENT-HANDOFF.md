# Production enablement — implementation handoff

Updated: 2026-11-25 (Asia/Kolkata). Branch: `intern/v2-phase-3-integration-review`.

**Status: the engineering items in the [Production enablement specification](RELEASE-ENABLEMENT-SPEC.md) are implemented and locally verified. Production remains unchanged and V2 stays off there by default.** Nothing in this handoff authorizes a merge, migration, configuration change, deployment, domain assignment or real charge. Those remain owner-controlled steps in the [release plan](RELEASE-PLAN.md).

## What the source now does

| Area | Behaviour | Commit |
| --- | --- | --- |
| Environment policy | `src/lib/v2Environment.ts` is the single server-side answer to "which deployment is this and which Supabase project may V2 use". Every V2 feature gate uses it. Production is off unless `V2_PRODUCTION_RELEASE_ENABLED=true` **and** `NEXT_PUBLIC_SUPABASE_URL` is `https://owmlxsnzogfapotmjrqk.supabase.co` **and** `NEXT_PUBLIC_SITE_URL` is `https://aceclub.theadmitco.com`. Preview and local development keep their staging-only behaviour. Unknown contexts and malformed origins fail closed. | `a8d9ac9` |
| Supabase keys | Builds refuse keys that provably belong to another project or slot, and any server key placed in the public slot. Privileged V2 server access goes through one client (`src/lib/server/v2ServiceClient.ts`) that uses only the deployment's approved project and never reaches Production from another deployment. | `279f4d4` |
| Private course files | Upload preparation, reference parsing, signed URLs and streaming follow the deployment's own project. A reference from another project is never served, so Production does not sign or fetch a staging object because its path matches. Bucket, 50 MiB limit, MIME rules and entitlement checks are unchanged. | `58ac649` |
| Payments | `src/lib/v2PaymentMode.ts` selects one validated mode on the server. Test Mode: Preview/staging with `V2_RAZORPAY_TEST_*`. Live Mode: approved Production only, with `V2_CHECKOUT_LIVE_ENABLED=true` and `V2_RAZORPAY_LIVE_*`. Mixed, opposite-mode, partial or legacy-only configuration turns checkout off. The webhook accepts only the mode-matched secret. Checkout wording follows the validated mode. Capture verification is unchanged. | `8d33bc5` |
| Checkout pause | `V2_CHECKOUT_NEW_ORDERS_PAUSED=true` refuses new registrations and payment attempts. Webhooks, "Check payment" and Admin reconciliation continue to confirm orders already paid. | `8d33bc5` |
| Checkout wording | The contact field is "Phone number" in line with the no-WhatsApp decision (stored field unchanged); plainer headings, prices and consent text. | `d8158a1` |

## Production configuration reference

Values are set privately by the release operator. The build validator (`scripts/validate-deployment-env.mjs`) refuses inconsistent combinations without printing any value.

| Variable | Production value | Notes |
| --- | --- | --- |
| `V2_PRODUCTION_RELEASE_ENABLED` | `true` only at authorized release | Master switch. Exactly `true` or `false`. Refused in Preview and development. |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://owmlxsnzogfapotmjrqk.supabase.co` | Must be the approved project; verified again at runtime. |
| `NEXT_PUBLIC_SITE_URL` | `https://aceclub.theadmitco.com` | Must match exactly. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production public key | Must not be a secret or service key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Production service key | Must not equal the public key; JWT keys must name the Production project and `service_role`. |
| `V2_TEMPLATE_AUTHORING_ENABLED`, `V2_BATCH_AUTHORING_ENABLED`, `V2_STUDENT_SCHEDULE_ENABLED`, `V2_LEARNING_DELIVERY_ENABLED`, `V2_CONTENT_PUBLISHING_ENABLED` | `true` for each approved surface | Take effect only with the master switch; refused without it. |
| `V2_INDIVIDUAL_UPGRADE_POLICY` | Approved policy identifier | Unchanged from staging. |
| `V2_CHECKOUT_LIVE_ENABLED` | `true` only when Live checkout is authorized | Requires the master switch and all three Live variables below. |
| `V2_RAZORPAY_LIVE_KEY_ID` | `rzp_live_…` | Dedicated V2 Live key. No fallback to legacy `RAZORPAY_*`. |
| `V2_RAZORPAY_LIVE_KEY_SECRET` | Live API secret | At least 16 characters at build time. |
| `V2_RAZORPAY_LIVE_WEBHOOK_SECRET` | Live webhook signing secret | At least 32 characters at build time; distinct from the Test secret. |
| `V2_CHECKOUT_NEW_ORDERS_PAUSED` | `false` normally; `true` to pause | Pausing keeps paid-order reconciliation running. |
| `V2_CHECKOUT_TEST_ENABLED`, `V2_RAZORPAY_TEST_*` | Must be unset | A Production build refuses any of them. |
| `V2_TALLY_FEEDBACK_FORM_ID`, `V2_TALLY_SIGNING_SECRET`, `V2_FEEDBACK_LINK_SECRET` | Production Tally form and secrets | Optional. With all three set, session feedback uses Tally; otherwise the in-app form is used. See the [Tally setup](../tally-feedback-2026-11-25/TALLY-SETUP.md). |
| `V2_SUPPORT_EMAIL`, `V2_SUPPORT_PHONE` | Programme support contact | Optional. Shown on the student Help page; without either, Help links to the public WhatsApp contact already on the homepage. |

## Owner and operator steps that remain

These follow the [release plan](RELEASE-PLAN.md) order and are not performed by engineering.

1. **Hosted acceptance (Phase 3 and Phase 6).** Deploy this branch as Preview against staging and complete real Google sign-in, captured Test Mode payments, webhook delivery, the eight-seat limit and the combined Admin/Student walkthrough, then restore the fixture baseline.
2. **Product Owner decision** on that exact tested candidate.
3. **Production database.** Run `READ-ONLY-PREFLIGHT.sql` on the verified Production project, reconcile the installed schema, and prepare only the exact missing migration set. No migration is replayed or edited.
4. **Recovery rehearsal.** Fresh backup, isolated restore, and compatibility of the previous application with the resulting schema.
5. **Production configuration.** Set the variables above, configure the Google callback for `https://aceclub.theadmitco.com`, and register the Razorpay Live webhook at `https://aceclub.theadmitco.com/api/v2/checkout/webhook` with the Live signing secret. Webhook reachability is tested directly, not through a Preview share link.
6. **Content transfer.** Course resources that reference staging storage are not served in Production by design. Files are re-uploaded or copied into the Production `v2-course-content` bucket and references updated under a reviewed Production manifest. Staging walkthrough grants, QA accounts and test payments are excluded.
7. **Authorization** naming the exact artifact, migrations, configuration, content operations, smoke writes and rollback limits; then a fresh Production-target build, pre-assignment smoke and domain assignment.
8. **Live payment smoke**, only if separately approved, naming the account, amount and refund/reconciliation procedure.

## Migrations added after this handoff

These are additive and leave existing rows, functions and history unchanged. They must be applied to staging (through the reviewed process) before the features appear on a Preview, and to Production only as part of an authorized release. Until they are applied, the pages fall back gracefully: no mocks from batches, no practice log for V2 worksheets, and no class dates for students without a live seat.

| Migration | Adds |
| --- | --- |
| `20261125100000_add_v2_tally_feedback.sql` | Tally as a feedback provider and the service-only `record_v2_tally_feedback` |
| `20261125110000_add_v2_batch_mocks.sql` | `v2_batch_mocks`, Admin mock management and `get_my_v2_mocks` |
| `20261128100000_add_v2_worksheet_logs.sql` | `v2_worksheet_logs` and practice-log reads and saves for V2 worksheets |
| `20261128110000_add_v2_live_schedule.sql` | `get_my_v2_live_schedule`: class dates for every enrolled student, without join details |

## Known limits and follow-ups

- Newer `sb_publishable_` / `sb_secret_` Supabase keys carry no project identifier, so only their slot can be checked locally; Supabase still rejects them against another project. Legacy JWT keys are checked for project and role.
- The Admin payment review pages under `src/app/admin/v2/payments/` are being changed in a separate, uncommitted workstream and still describe Test Mode. Their wording needs the same mode-driven treatment before Live use.
- The existing MVP registration page and homepage still mention WhatsApp. They are outside V2 and already in Production; any change is a separate product decision.
- `vercel dev` (Vercel's local "development" context) no longer shows the V2 catalogue; `next dev` and Preview are unaffected.
- A merge into `main` may trigger a Production deployment and is therefore itself a release action.

## Local verification

Run on 2026-11-25 against commit `d8158a1` with synthetic fixtures only. No hosted service, credential or payment provider was contacted.

| Check | Result |
| --- | --- |
| Unit suites (`scripts/**/*.test.mjs`) | 96 of 96 suites, 665 tests passed |
| Phase 1 browser (catalogue, My access) | 20 passed |
| Phase 2 browser (authoring, publishing) | 42 passed, 1 failed: *Empty screens and recoverable list errors*, a known fixture defect (the stub returns an error without a `drafts` array), present before this work |
| Phase 3 browser (checkout) | 11 passed |
| Phase 4 browser (student learning) | 17 passed |
| Phase 5 browser (content publishing) | 51 passed |
| Admin workflow browser | 40 passed, 1 failed: *Three primary destinations…* expects three Admin menu items; the separate uncommitted payments workstream adds a fourth |
| TypeScript, ESLint | Clean |
| `next build` | Succeeded |

New tests cover the environment matrix (`scripts/v2-environment.test.mjs`), payment mode (`scripts/v2-payment-mode.test.mjs`), Supabase key and Live/Test build rules (`scripts/deployment-environment.test.mjs`), cross-project content references (`scripts/phase5/assets.test.mjs`) and checkout pause (`scripts/v2-checkout-server.test.mjs`). Hosted acceptance remains outstanding as listed above.
