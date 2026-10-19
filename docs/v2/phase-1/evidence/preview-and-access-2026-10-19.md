# Phase 1 Preview and access verification — 19 October 2026

Phase 1 remains in progress. The reviewed Preview is identified and basic role
navigation has been observed, but the V2 database rules and legacy compatibility
have not been verified on that deployment's database.

## Source and scope

- Application candidate: `3207cba41b0561ef78c0adf5a44302d753d48bdb`.
- [PR #23](https://github.com/theadmitco-tech/ace-club-lms/pull/23): open, draft,
  not merged; `intern/v2-onboarding` into `codex/v2-integration`.
- Integration base: `940ea7835734a8fb22a6451a30b31084b11d5c97`.
- Evidence branch: `intern/v2-phase-1-verification`, based on the application
  candidate. This follow-up changes documentation only and is not published.
- Phase 2 remains paused and preserved on `intern/v2-phase-2-drafts` at
  `40f93a5b367e8f99caefd026476701cd48460a4f`; its code is excluded from this branch.
- Proposed migration: [20261018090000_add_v2_product_entitlements.sql](../../../../supabase/migrations/20261018090000_add_v2_product_entitlements.sql).
- Migration SHA-256: `ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7`.

## Independently verified GitHub metadata

Public GitHub API reads on 19 October established the following for the application
candidate. No GitHub, deployment, or shared-database changes were performed.

| Check | Result | Evidence |
|---|---|---|
| PR head, base, draft and merge status | Confirmed as recorded above | [PR metadata](https://api.github.com/repos/theadmitco-tech/ace-club-lms/pulls/23) |
| Lint | Passed | [Job](https://github.com/theadmitco-tech/ace-club-lms/actions/runs/39117796992/job/117647016894) |
| Tests and build | Passed | [Job](https://github.com/theadmitco-tech/ace-club-lms/actions/runs/39117796992/job/117647016796) |
| LMS Preview deployment | Successful; exact candidate SHA | [Deployment status](https://api.github.com/repos/theadmitco-tech/ace-club-lms/deployments/7153015149/statuses) |
| Flexible-mocks Preview deployment | Failed; cause and disposition remain unresolved | [Deployment status](https://api.github.com/repos/theadmitco-tech/ace-club-lms/deployments/7153007627/statuses) |
| Combined commit status | Failure due to flexible-mocks deployment | [Commit status](https://api.github.com/repos/theadmitco-tech/ace-club-lms/commits/3207cba41b0561ef78c0adf5a44302d753d48bdb/status) |

The successful LMS deployment is
`https://ace-club-1vr3qxhtk-theadmitco-techs-projects.vercel.app`.
Its differing hostname is resolved: GitHub associates this exact URL with PR #23's
current head and the `Preview – ace-club-lms` environment. This association does
not establish which Supabase project or migration ledger the deployment uses.
The earlier owner confirmation applied to a different shared Preview.

Vercel Preview Comments also passed; that status is not an independent code review.
The successful jobs are from 18 October and were inspected on 19 October; they
were not rerun during this evidence update. Branch protection was not rechecked.

## User-observed browser results

These results come from manual reports and screenshots supplied during testing.
They were not reproduced through an automated browser. Account addresses,
passwords, profile names and screenshots containing personal information are not
stored in this record.

| Journey | Expected | Observed | Conclusion |
|---|---|---|---|
| Dedicated Student sign-in | Student dashboard opens | Student interface opened | Basic sign-in observed |
| Student opens `/admin` | Redirect to `/dashboard`, without rendering Admin controls | Final URL reported as `/dashboard`; screenshot showed Student interface | Manual role-redirect check passed |
| Dedicated Admin sign-in and `/admin` | Admin dashboard opens | Screenshot showed Admin dashboard and navigation at `/admin` | Basic Admin navigation observed |
| Student course content | Requires an assigned synthetic course for the legacy journey | Dashboard reported no course assigned | Empty state observed; content journey not tested |

The expected role redirect is implemented in
[requirePortalRole](../../../../src/lib/server/portalAuthorization.ts), called by
the [Admin layout](../../../../src/app/admin/layout.tsx). The empty state is rendered
by the [Student dashboard](../../../../src/app/dashboard/page.tsx).
These observations do not prove privileged API denial, cross-student database
isolation, product grants, section boundaries, or expiry enforcement.

## Required staging handoff

1. Obtain project-owner confirmation that the exact Preview above uses the separate
   staging Supabase project. Supply only sanitized project/configuration evidence,
   without environment values, credentials or private student data.
2. Have the authorized database operator reconcile the actual schema and migration
   ledger, and report whether the proposed migration with the checksum above is
   applied. If absent, review backup/recovery arrangements and obtain separate
   approval before applying that single migration; do not replay historical SQL.
3. Prepare approved synthetic fixtures for two distinct Students and an Admin.
   Current browser reports cover one Student and one Admin; they do not establish
   availability of the second Student required for isolation checks. Include a
   synthetic legacy enrollment for compatibility tests and the product/grant
   scenarios in the [staging checklist](../manual-verification-checklist.md).
4. Execute catalogue/pricing, restricted grants, retry/concurrency, section access,
   expiry/revocation and cross-student checks against staging. Record expected and
   actual results and restored fixture state. A browser Admin cannot create V2
   purchase grants; the restricted function requires the authorized operator.
5. Complete affected legacy browser journeys, including material access, worksheet
   editing and enabled registration/payment flows in provider test mode. No real
   payment or Production student data is needed. Existing content/payment routes
   are not connected to V2 grants in this phase.
6. Resolve the flexible-mocks failure, source-baseline decision, required branch
   protection and expiry convention; obtain product acceptance with any explicit
   exceptions recorded. Integration merge and Production release remain separate
   approvals.

The next action is confirmation of the Preview's staging target and migration
state. No shared migration, fixture write, merge, push or release is authorized by
this evidence record.

## Documentation verification

This follow-up changes only Phase 1 documentation. The migration checksum matches
the published application candidate. All 38 relative file links in the four changed
documents resolve, and the diff has no whitespace errors. Added text contains no
personal names, first-person conversation or credential assignments. Application
tests were not rerun for this documentation-only update; the hosted results above
apply to the unchanged application candidate.
