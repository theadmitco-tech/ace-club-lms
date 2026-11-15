# Phase 3 private fixture preparation

Status: offline preparation only. Preview deployment, actual identity preparation, hosted SQL execution, provider-backed acceptance and Auth cleanup remain pending. No account, order or payment is created by these commands.

## Scope and identity boundary

`scripts/phase3/hosted-fixtures.mjs` generates setup and cleanup SQL for twenty exact generated identities and five isolated courses: Full Course, Quant, Verbal, DI and a separate Quant capacity fixture. Seven seeded registrations occupy the capacity fixture; two contender identities exercise the remaining place. Seeded expired, revoked, inactive, wrong-subject and multiple-purchase cases support access-denial checks.

The generator accepts a manifest built by `createManifest({runId, createdAt, users, preview, commit, startDate})`. `fixtureLabels` supplies the required labels; `fixtureEmail(runId, label)` supplies their exact synthetic addresses. Each `users[label]` contains the independently verified Auth `id` and `email`. The exact owner-confirmed Preview origin and forty-character commit identify the intended candidate. The default application inventory is 92 tables.

Account preparation remains a separate Engineering action, now supported by the [generated account lifecycle](HOSTED-ACCOUNT-LIFECYCLE.md). Its local verification does not claim hosted execution. Each generated Auth account must carry `raw_user_meta_data.phase3_qa_run` equal to the run ID, have a creation timestamp no earlier than the recorded run start, and match its profile. Before setup, all twenty profiles must be inactive Students with the explicit synthetic-auth marker. Setup seeds missing signup-candidate rows only for those exact generated identities; this fixture preparation is not Google OAuth evidence. Setup rejects mismatches or a past class start date and activates only the generated Admin and seeded-access cases. Purchase-only candidates remain inactive until verified fulfillment. Existing Student/Admin accounts cannot be substituted. Account creation must retain exact identities in private state as each account is created, including partially completed attempts.

Fixture authentication does not prove Google OAuth. Synthetic provider metadata, if used for isolated requests, must be identified as synthetic. A fresh designated real Google sign-in remains a separate acceptance case and requires a separately reviewed preservation/cleanup plan. Its account must never be included in the generated-account deletion list.

Fixture resources use non-deliverable `example.invalid` references. They support payment, enrollment and access-state assertions; they do not prove playback, PDF delivery or provider rendering. Integrated resource checks require separately tracked, reviewed fixture resources and exact object cleanup.

## Offline packet lifecycle

All commands run from the integration worktree. The example private directory is inside that worktree, has mode `700` and is Git-ignored. An existing private directory in the primary checkout is also supported through its explicit path. JSON inputs require mode `600`; secret values and private SQL never enter Git.

```sh
node scripts/phase3/hosted-qa.mjs --help
```

| Command | Required inputs | Result |
| --- | --- | --- |
| `prepare` | `--directory`, `--manifest`, `--owner-verified-preview`, `--commit` | Validated private state; no identity creation |
| `setup` | `--directory` | Private `01-SETUP-FIXTURES.sql` |
| `accept-setup` | `--directory`, `--receipt` | Exact run and setup baseline recorded once |
| `record-checkout` | `--directory`, `--record` | Explicit checkout/provider/event tracking |
| `record-content` | `--directory`, `--record` | Exact added content-item ID tracked |
| `cleanup` | `--directory` | Private `02-CLEANUP-FIXTURES.sql` using the accepted baseline |
| `accept-cleanup` | `--directory`, `--receipt` | Exact application-cleanup result recorded |
| `status` | `--directory` | Sanitized lifecycle state only |

A checkout record contains `id`, fixture `label`, observed `state`, `orderId`, `paymentId` and `eventIds`. Unattached provider IDs are explicit `null`; an observed empty event list is `[]`. Optional `studentId` must match the fixture label. Attached provider references cannot change or be reassigned; tracked event IDs cannot disappear. New tracking invalidates a previously prepared cleanup stage so cleanup must be regenerated. A content record contains its exact `id`.

The setup baseline covers application rows and migration-ledger rows. Only the twenty verified generated profiles and their signup-candidate rows are excluded; existing accounts and the walkthrough remain covered. Setup verifies preservation of original row multiplicities. The SQL Editor operator first confirms project `eyphkkginlgoaxflauog`; the packet cannot independently identify a hosted database from SQL alone.

## Cleanup and acceptance boundary

Cleanup rejects untracked checkouts, changed provider references, foreign course activity and baseline mismatches. Its deletions are transactional and limited to recorded fixture relations. The exact fingerprint includes the application hash, 92-table count, ledger hash and both generated-identity exclusion counts. Unrelated staging activity requires reconciliation, rather than deletion or baseline replacement.

The offline tracker records an operator-supplied receipt; it does not independently inspect staging. Application cleanup deactivates generated profiles but does not delete Auth identities. Exact account removal and independently verified Auth/profile/candidate absence remain separate required actions after application cleanup. No command in this workflow claims account removal, genuine OAuth, provider acceptance or Phase 3 completion.

The [hosted acceptance procedure](HOSTED-ACCEPTANCE.md) defines the complete test session. The [payment snapshot verifier](READONLY-PAYMENT-VERIFICATION.md) checks actual recorded provider results separately. Production, existing libraries, the walkthrough and applied migrations remain excluded from fixture mutation.

## Local verification

The historical [verification record](hosted-preparation-verification.json), retained in the pre-audit `17945d4` tree with application baseline `de2b11a`, contains its then-current tool-source hashes and 24 passing tests: four disposable PostgreSQL cases, six offline lifecycle cases and fourteen synthetic payment-verifier cases. PostgreSQL coverage includes actual local fulfillment/upgrade, inactive-candidate activation, event tracking, foreign-actor rejection, repeated-setup denial, expiry and rollback on changed application/ledger state. Targeted ESLint and whitespace checks passed. These results validate the preparation tools; they are not hosted payment evidence.

The three suites run independently:

```sh
node scripts/phase3/hosted-fixtures.test.mjs
node scripts/phase3/hosted-qa.test.mjs
node scripts/phase3/verify-hosted-payments.test.mjs
```

The PostgreSQL suite requires the local PostgreSQL tools and subprocess permissions. The offline lifecycle suite creates only a temporary Git repository. The payment verifier suite substitutes synthetic responses and does not access Razorpay.

The refreshed [local verification record](../all-phases-exit-gates-2026-11-15/phase3-local-verification.json) identifies the current tool hashes and 62 passing local cases, including account preparation, exact candidate seeding, partial-preparation abort and private-output guards. Historical hashes do not attest the updated sources.
