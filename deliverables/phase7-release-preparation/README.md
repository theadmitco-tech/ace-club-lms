# Phase 7 — Production release preparation

Updated: 2026-11-14 (Asia/Kolkata).

**Status: combined-candidate preparation updated; Production release remains unapproved and unexecuted.** Razorpay Test Mode is selected, Phase 3 implementation is integrated with the current Admin/Student workflows, and staging reconciliation confirms its three migrations. Provider-backed checkout, Google sign-in, webhook delivery and exact hosted cleanup remain separate acceptance requirements. Phase 6 final acceptance and Product Owner sign-off remain pending those results.

The source inventory is pinned to `c593d2de13c563b72adbaf216cf37ed30a038cc7` on `intern/v2-phase-3-integration-review`. It includes the Admin workflow baseline and the installed Phase 6 conflict repair. Later application fixes require their own final acceptance attribution; this source baseline is not an approved Production release candidate.

## Prepared work

- [Release plan](RELEASE-PLAN.md) covers the remaining environment, database, content and release decisions.
- [Production enablement specification](RELEASE-ENABLEMENT-SPEC.md) identifies the remaining source modules, proposed flags, Live Mode adapter, environment matrix and rollback compatibility work. It is not implemented by this preparation update.
- [Ordered source inventory](migration-inventory.json) records 20 exact migration hashes against the previously observed `main` commit. [The staging sequence](STAGING-MIGRATION-SEQUENCE.md) includes Phase 3 after the Phase 6 repair. Neither file authorizes replay or establishes the current Production missing set.
- [Metadata preflight](READ-ONLY-PREFLIGHT.sql) includes payment tables, callable permissions, PUBLIC execution and payment/sign-up triggers. [Local evidence](local-preflight-results.json) records disposable PostgreSQL checks for absent and combined installed schemas, preserving ledger/product/bucket metadata.
- [Recovery and rollback](RECOVERY-AND-ROLLBACK.md) distinguishes application rollback, database/Storage recovery and payment reconciliation. Production restore and old-application compatibility still require rehearsal.
- [Smoke checklist](SMOKE-AND-HANDOFF.md) and [unapproved authorization template](authorization.json) remain ready for a separately reviewed release.
- [Owner staging handoff](../phase3-preview-activation/DEPLOYMENT-HANDOFF.md) consolidates the next deployment, Auth and webhook actions. No repeated staging activation is required.

The 2026-11-03 `platform-inventory.json` and `publication-review.json` remain historical observations. They do not attest current hosting access, Production state or the final publication review. Current connected Vercel access is blocked; owner-managed staging deployment is required unless access is restored.

## Exit gates

| Required gate | Evidence / status |
| --- | --- |
| Exact release commit and migrations named | Combined source inventory covers 20 files; final approved SHA and Production missing set remain pending. |
| Product Owner authorizes merge, migrations, deployment and data operations | Not authorized; authorization fields remain empty. |
| Production/staging separation verified | Staging payment schema matches. Effective Production configuration/provider mode is not verified. |
| Read-only Production preflight passes | Updated SQL is prepared and locally exercised; no Production query has run. |
| Recovery and rollback usable | Procedure prepared; Production restore and rollback compatibility not demonstrated. |
| Post-release smoke prepared | Checklist prepared; no Production smoke executed. |
| Release approved and executed | Not approved and not executed. |
| Post-release evidence recorded | No post-release evidence exists. |

## Remaining sequence

The deployment owner configures and deploys the dedicated Phase 3 Preview; the Auth/payment operators complete the callback and signed Test Mode webhook setup. Engineering and QA then execute provider-backed and combined-candidate acceptance with isolated fixtures and exact cleanup. The Product Owner reviews that evidence. Only afterward can a separately approved Production enablement change, fresh Production preflight, missing-set reconciliation, recovery rehearsal and final release decision be completed.

The current checkout is deliberately Test Mode only, and V2 runtime guards reject Production. Production launch cannot be achieved by setting the current Preview flags. This is an explicit remaining implementation/release boundary, not a hidden completed gate.

Local reproduction: `node scripts/phase7/prepare-release.mjs`, then `npm run test:v2:phase7`. The generator refuses migration source drift. Local tests accept no hosted connection string. Applied migrations and historical evidence are not rewritten.
