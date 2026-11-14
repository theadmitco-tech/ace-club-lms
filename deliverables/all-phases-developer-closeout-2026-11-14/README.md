# Combined implementation and developer verification

Status: the combined staging implementation and local verification are prepared for owner-managed deployment. This checkpoint does not declare every phase accepted or authorize a Production release.

The candidate branch is `intern/v2-phase-3-integration-review`, based on `c593d2de13c563b72adbaf216cf37ed30a038cc7`. It includes the Admin calendar/session workflow, Student learning workflow, installed Phase 3 payment schema and earlier phase implementations. No applied migration is edited or reapplied.

## Work completed at this checkpoint

- Payment requests have bounded streaming body reads. Malformed requests return HTTP 400 and oversized requests return HTTP 413 instead of an incorrect retryable payment response. Admin recovery authorization precedes privileged intent lookup.
- The Phase 6 suite now runs after the current payment migrations. Additional paid integration journeys cover Full Course, Quant, Verbal and DI, automatic activation/enrollment, subject isolation, feedback, content delivery, expiry and replay behavior.
- Phase 7 preparation includes 20 exact source migrations, payment permissions/triggers in the read-only preflight, and an ordered staging inventory. The inventory does not authorize Production replay.
- A loopback-only local review launcher uses verified staging credentials without copying secrets into source or inheriting unrelated payment configuration. The real local login, public catalogue, checkout sign-in requirement and unsigned request denials were checked.

## Phase status

| Phase | Completed evidence | Remaining acceptance |
| --- | --- | --- |
| 1 | Earlier hosted exit evidence retained; fresh 18-suite / 173-test regression passed. | Current combined hosted regression accompanies Phase 6. |
| 2 | Earlier hosted publishing evidence retained; fresh 28-suite / 278-test regression passed. | Current combined hosted regression accompanies Phase 6. |
| 3 | Implementation, schema reconciliation, 25 payment tests, ten synthetic browser journeys and preservation guards passed. | Actual Google sign-in, Razorpay Test Mode payment/capture/webhook/retry, hosted upgrade/capacity checks and exact fixture cleanup. |
| 4 | Earlier hosted learning/feedback evidence retained; fresh five-suite / 20-test regression passed. | Temporary LMS feedback remains the approved substitute; Tally replacement is separate. |
| 5 | Earlier hosted content evidence retained; fresh seven-suite / 12-test regression passed. | Current combined hosted regression accompanies Phase 6. |
| 6 | Four current suites passed: migrated access, paid integration, conflict repair and adapters. Database evidence includes 56 access assertions, 57 paid assertions and nine preservation checks. | Provider-backed combined-candidate acceptance and explicit Product Owner sign-off. |
| 7 | Updated release inventory, preflight, recovery procedure and release-enablement specification. Eleven preflight checks passed locally. | Production-capable runtime implementation after staging acceptance, fresh Production reconciliation/restore rehearsal, authorization and release smoke. |

Phase 1/2/4/5 historical acceptance retains its original candidate attribution. Fresh local results do not turn those reports into hosted evidence for the new candidate. The current runtime remains staging/Test Mode only, so an owner deployment alone cannot finish Phase 7.

## Evidence

- `integration-results.json` and `local-*.json`: fresh prior-phase and combined database verification, including unchanged inherited evidence hashes.
- `payment-browser-results.json`: ten actual-component browser journeys with synthetic provider/OAuth responses; no real provider payment.
- `local-live-smoke.json` and `local-login.png`: actual local application using staging, unsigned browser checks only; no authenticated user session or persistent mutation.
- `final-verification.json`: final build/lint and guard results, with exact source fingerprints.
- [Phase 3 staging reconciliation](../phase3-preview-activation/hosted-reconciliation.json): operator-supplied schema/data preservation evidence.
- [Owner deployment handoff](../phase3-preview-activation/DEPLOYMENT-HANDOFF.md): branch configuration and one coordinated staging session.
- [Hosted acceptance procedure](../phase3-preview-activation/HOSTED-ACCEPTANCE.md): remaining provider and hosted evidence requirements.
- [Production enablement specification](../phase7-release-preparation/RELEASE-ENABLEMENT-SPEC.md): remaining source and release requirements.

## Local website review

From the primary repository checkout, the following command starts the actual website on loopback. Private configuration files must already exist with owner-only permissions; no values belong in the command or Git.

```sh
npm --prefix .worktrees/phase3-integration run review:local -- --staging-env ../../.env.phase5-private/staging.env --razorpay-env ../../.env.phase3-private/razorpay-test.env --port 3030
```

The browser opens `http://localhost:3030/login`; the Admin route is `/admin`, Student learning is `/dashboard`, and test checkout is `/courses/v2/checkout`. Omitting `--razorpay-env` disables checkout. Adding `--check` validates configuration without starting a server. The launcher never accepts a live Razorpay key or a deployed/Production process, and never binds to the public network.

Staging Auth must allow `http://localhost:3030/auth/callback` for existing-account sign-in and `http://localhost:3030/auth/v2/callback` for checkout sign-in. Successful Google callback acceptance is not claimed by the unsigned smoke. Existing Admin authorization remains required; no local role bypass is introduced. Authenticated edits and payments use actual staging records. Localhost cannot receive Razorpay provider webhooks without separately arranged external delivery.

## Publication and ownership

The implementation remains on the integration review branch. Production configuration, deployments, data and payment mode are unchanged. No PR merge or readiness change is included. New commits use neutral project attribution. Private credentials, recovery data and provider identifiers remain outside version control.

The owner supplies the dedicated Preview and callback/webhook setup. Engineering and QA then record actual provider-backed acceptance and exact cleanup before requesting Product Owner acceptance. Remaining release implementation and Production operations are explicitly separate; no blank approval is inferred from the completed local tests.
