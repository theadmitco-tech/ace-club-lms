# Phase 2 isolated delivery report

Status: Active — local candidate verified; draft review and staging acceptance pending
Owner: Engineering and product owner
Last updated: 20 October 2026

## Candidate and authority

Branch: `intern/v2-phase-2-review`.
Application commit: `26ec141561a0749dba371409273c1f1ee9906049`.
Base: Phase 1 commit `d3020c1c9916c17f6ced27f83ff9ee1be05479f2` on
`intern/v2-onboarding`, draft [PR #23](https://github.com/theadmitco-tech/ace-club-lms/pull/23).
Draft [PR #24](https://github.com/theadmitco-tech/ace-club-lms/pull/24) targets that
task branch at submitted head `c8978a1`. Retarget to the integration
branch only after the dependency is integrated and the resulting diff is reviewed.

Authority: [approved decision source](../decisions/owner-decisions-2026-10-20.md)
A1/A2, B1 and C1/C2; [decision register](../decisions/README.md).
The later [expiry confirmation](../decisions/phase-1-expiry-confirmation-2026-10-20.md)
resolves six-month denial for Phase 1; notification and upgrade decisions remain separate.

## Product behavior

| Area | Included in this PR | Remaining before full phase acceptance |
|---|---|---|
| Templates | Four fixed product scopes, configurable durations, immutable drafts | Canonical curriculum mapping and representative schedule review |
| Batch schedules | Independent template snapshots, live dates/times, undated outlines and empty schedules | Staging Admin browser review; explicit content associations |
| Publication | Scope preview; confirmed publish, unpublish, republish; preserved revisions | Student batch-access decision and authorized schedule reader |
| Meet details | Private Admin-only drafts for live events, separate from publication | Authorized Student join-link delivery |
| Capacity | Fixed eight-registration metadata; no per-session reservations | Full Course registration-unit decision and transactional allocation in Phase 3 |
| Recordings/materials | Existing content preserved; no automatic migration | Reviewed mappings, protected recording-only delivery and preservation-first content tooling |

New UI is confined to the three Admin authoring routes. Unsaved-change warnings
also wrap Admin sidebar navigation and sign-out; clean existing pages retain
normal navigation. Browser Back/Forward is not intercepted. Product-facing
publication remains unavailable to Students until the eligibility contract exists.

Both authoring flags default off; Vercel Production always disables the routes.
Active Admin checks occur on every server operation and again in PostgreSQL.
RLS and revoked direct-write privileges protect new tables. Publications omit
private meeting URLs and historical per-event capacity fields. Stale previews
cannot overwrite newer drafts; matching retries recover the original result.

## Scope isolation

The source work remains preserved on `intern/v2-approved-phase-1-2` at `208ceaa`.
This candidate excludes its later checkout changes, upgrade arithmetic helper,
protected-content route changes and deployment-environment hardening.
The Phase 1 foundation remains identical to the base. Five Phase 2 migrations
are proposed after its one migration; none has been applied to a hosted database.

The upgrade helper's package-price-version incompatibility remains recorded in
[Phase 1 limitations](../phase-1/completion-report.md). It is not a dependency of
Admin authoring and is not presented as ready for checkout integration.

## Verification of the original isolated candidate

| Check | Result |
|---|---|
| `npm run test:v2:phase1` | 102 tests, 11 suite files; passed |
| `npm run test:v2:phase2` | 127 tests, 10 suite files; passed |
| `npm run lint -- --max-warnings=0` | Passed |
| `./node_modules/.bin/tsc --noEmit --incremental false` | Passed |
| Clean-environment `npm run build` | Passed; 42 generated entries |
| Secret/name scan and diff review | No findings in the selected changes |

No failed, skipped or cancelled tests. Database tests use disposable local
PostgreSQL with TCP disabled and synthetic records. No app server or hosted
service is used. Tests include denied roles/direct writes, scope isolation,
immutable history, concurrent edits, retry recovery, stale previews, transaction
rollback, repeated migrations and retained legacy fixtures. Component-handler
tests are not interactive browser evidence.

The [verification record](evidence/isolated-review-2026-10-20.md) lists all 43
application/configuration/test/migration files and migration checksums. Hosted
CI/Preview results require the final published commit; staging remains unverified.

## Local browser QA follow-up

`intern/v2-phase-2-browser-qa` at `171efd2` adds a disposable browser harness and
fixes three issues: meeting links ignoring a pending publication review,
long-title overflow on narrow screens, and mobile-menu keyboard accessibility.
The four changed application files are limited to the Admin shell, its CSS, the
batch editor link and authoring-form CSS. No server authorization or SQL changed.

The follow-up passes 13 Chromium scenarios, all 229 regression tests, lint,
TypeScript and the production build. The
[browser evidence](evidence/browser-qa-2026-10-20.md) lists every changed file,
reproduction steps, synthetic screenshots and remaining staging limits.
It is committed locally and has not been pushed into the submitted review.

Supplied PR #24 screenshots show six successful checks and the failed
`ace-club-flexible-mocks` deployment. Do not describe all hosted checks as passing.
Hosted checks for the local QA fixes remain pending.

## Risks and next decisions

- Confirm the accepted application baseline and actual staging migration ledger.
- Approve exact staging setup only after review and recoverable backup preparation.
- Decide whether entitlement exposes all eligible batches or one assigned batch.
- Review canonical content mappings and representative IST schedules.
- Define Full Course registration allocation across Quant, Verbal and DI.
- Verify mobile/desktop, keyboard, login, failure/retry and existing Student journeys.
- Investigate the separately linked flexible-mocks deployment failure before release.

**Next decision:** confirm Student batch eligibility for the remaining reader work.
For staging setup, use the [single operator handoff](review-and-release.md), apply
approved Phase 1 changes first and verify them before approved Phase 2 changes.
Keep each phase's acceptance separate. No merge, hosted migration, Production
change or existing student/course-data modification is authorized by this report.
