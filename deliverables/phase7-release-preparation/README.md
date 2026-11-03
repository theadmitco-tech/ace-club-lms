# Phase 7 — Production release preparation

Date: 2026-11-03 (Asia/Kolkata).

**Status: preparation recorded; Production release blocked and not executed.** Phase 7 is the V2 launch phase, not another Student feature phase. Phase 3 provider selection/test access and implementation remain pending; Phase 6 has scoped passing checks but no full integrated acceptance or Product Owner sign-off. Those gates cannot be skipped by starting Phase 7.

The preparation branch is `intern/v2-phase-7-review`, based on `298000058e862bb3b0a11525c40cd45cc0e0a039`. The tested application remains `bcc0231e51ae93e266a3232aa316ef934b0e825b` on the [Phase 6 Preview](https://ace-club-dmc32ekp8-theadmitco-techs-projects.vercel.app). The evidence-only baseline has identical application source. The platform inventory observed the remote Phase 6 branch still at `bcc0231`; the evidence commit therefore still requires publication. No commit is designated as a Production release candidate.

## Prepared work

- [Release plan and prerequisites](RELEASE-PLAN.md), including the existing Production-disabled V2 guards and the order of migration, content, deployment and domain assignment.
- [Source migration inventory](migration-inventory.json): 17 added files, exact SHA-256 hashes and version order against the observed `main` commit. This is not a Production ledger diff; Phase 3 is absent.
- [Metadata-only SQL preflight](READ-ONLY-PREFLIGHT.sql), rehearsed against both absent and installed V2 schemas in disposable local PostgreSQL. [Eight checks passed](local-preflight-results.json). No hosted database was contacted.
- [Recovery and rollback procedure](RECOVERY-AND-ROLLBACK.md), with separate application, database, Storage and payment boundaries. A usable Production restore and old-application compatibility rehearsal remain required.
- [Post-release smoke and monitoring checklist](SMOKE-AND-HANDOFF.md), with role ownership and explicit payment/data-operation limits.
- [Unapproved authorization record](authorization.json), with no release SHA or permitted actions filled in.
- [Read-only platform inventory](platform-inventory.json): current Production deployment metadata and environment-variable names/scopes, without values. Metadata alone does not prove secret/project separation.

No application behavior, applied migration, Production variable, domain, deployment or hosted data changed. Phase 7 automatic branch deployment is disabled in `vercel.json`; Phase 6's existing branch rule is preserved. The preparation branch needs no deployment and no staging service-key copy.

## Exit gates

| Required gate | Evidence / status |
| --- | --- |
| Exact release commit and migrations named | Baseline and 17 current source files inventoried. Final integrated candidate and Production missing set **not available**. |
| Product Owner authorizes merge, migrations, deployment and data operations | **Not authorized**; authorization record remains empty. |
| Production/staging separation verified without exposing values | Metadata inspected. Actual Production key/project matching, provider mode and webhook isolation **not verified**. |
| Read-only Production database preflight passes | SQL prepared and locally tested; **not run on Production**. |
| Recovery/rollback documented and usable | Procedure prepared; Production backup/restore and application compatibility rehearsal **not completed**. |
| Post-release smoke prepared | Checklist prepared; no execution or passing release claim. |
| Release separately approved and executed | **Blocked / not executed**. |
| Post-release evidence and limitations documented | Recording template prepared; **no post-release evidence exists**. |

The authoritative requirements are [the V2 roadmap](../../docs/v2/review/product-roadmap.md) and [the supplied exit gates](../phase1-exit-gate-audit-2026-11-01/source-exit-gates.txt). Historical MVP and pilot phases with the same numbers are separate releases.

## Next action

The payment account owner selects the provider and arranges test access. Engineering then integrates Phase 3 with the current learning/content functions and conflict repairs. QA completes the Phase 6 paid journeys; the Product Owner records an explicit decision for that exact candidate. Engineering can then refresh this plan, run the Production metadata preflight through an authorized operator, reconcile the exact missing migrations, rehearse recovery and present one concrete release for separate authorization. No Production action is requested by this preparation packet.

Local reproduction: `node scripts/phase7/prepare-release.mjs`, followed by `npm run test:v2:phase7`. The inventory generator is deliberately pinned to this preparation baseline; a future candidate requires a reviewed update. Test execution uses disposable Unix-socket databases and accepts no hosted connection string.
