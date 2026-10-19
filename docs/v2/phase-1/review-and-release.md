# V2 Phase 1 — Review and release gates

Status: Draft — matching Preview and basic role navigation verified; database verification and acceptance pending
Owner: Engineering and product owner
Last updated: 19 October 2026

[PR #23](https://github.com/theadmitco-tech/ace-club-lms/pull/23) is a draft from
`intern/v2-onboarding` into `codex/v2-integration`, based on
`940ea7835734a8fb22a6451a30b31084b11d5c97`. Its current published head is
`3207cba41b0561ef78c0adf5a44302d753d48bdb`. Fresh GitHub metadata confirms passing
lint, tests/build and an LMS Preview for that head. The PR remains unmerged and
the separate flexible-mocks deployment still fails. The
[19 October verification record](evidence/preview-and-access-2026-10-19.md) supersedes
earlier publication/account-status notes. No shared migration or Production change
has been performed by the development agent; the deployed migration state is unknown.

## Baseline decision before merge and release

The [earlier GitHub review](evidence/github-review-2026-10-18.md) found that main
and integration match, while PR #20 contains a different Release 1.2 lineage and
identifies it as the deployed source. A later
[deployment-metadata check](evidence/github-deployment-followup-2026-10-18.md)
found a successful Production-labelled LMS deployment of main on 11 October.
Neither observation independently establishes the current canonical-domain source.

The PR retains the existing integration target. Product-owner and engineering
confirmation of the intended source remains required before merge or release.
The draft does not authorize merging PR #20 or rebasing onto another release.
This draft-review workflow supersedes the publication hold in the earlier snapshot.

## Preview-only collaboration decision — 18 October 2026

Preview deployment access is available; Vercel team/project dashboard access
remains restricted. Review uses the shared Preview and GitHub checks. The project
owner supplies sanitized build logs and deployment/configuration evidence.
Dashboard membership is not a prerequisite for this workflow.

- Engineering prepares code, tests, PR evidence, and staging browser checks.
- The project owner confirms deployment source and the staging Supabase target.
- The authorized database operator supplies schema/ledger evidence and applies
  the reviewed staging migration after separate approval.
- The product owner reviews product behavior and phase acceptance. Product
  acceptance does not constitute independent technical verification.

The earlier shared `git-codex-pilot-v` Preview was confirmed by the product owner
as staging-backed. That confirmation does not establish the database target of
the new PR-specific Preview or successful authenticated staging tests.

## Access and onboarding update — 18 October 2026

GitHub collaborator access and shared Preview access are available. The workflow
is task branch → PR → Preview → staging → review. Direct main pushes, Production
access/data changes, real student test data, and committed credentials are excluded.

**19 October update:** Designated Google test Admin and Student accounts are now
available. Manual reports and screenshots show Student sign-in, Student redirection from `/admin` to
`/dashboard`, and Admin dashboard access. These are basic navigation observations;
the PR-specific Preview's staging target, deployed schema and V2 entitlement rules
remain unverified. A second Student identity is needed for isolation checks.

Phase 0 remains deferred for the current work. Neither Phase 0 nor Phase 1 is
accepted, and the deferral does not authorize a release.

The local workspace and complete main/integration Git trees at `940ea783` did not
contain `intern-onboarding.md` or the separately referenced SOP v1.0. The root
`intern-collaboration-sop.md` is a pre-existing untracked file; its contents do not
establish the missing documents' versions. Exact paths/versions remain pending.

## GitHub verification

[Verify run 39117796992](https://github.com/theadmitco-tech/ace-club-lms/actions/runs/39117796992)
passed for `3207cba`: `Lint` and `Tests and build` completed successfully. Job
steps include the disposable PostgreSQL suite, reader tests, cleanup tests,
existing Pilot V2 tests, TypeScript, build, and unchanged manifest verification.
The workflow does not deploy or apply shared migrations.

[Deployment metadata](evidence/preview-and-access-2026-10-19.md#independently-verified-github-metadata)
records an LMS Preview success and a flexible-mocks deployment failure for the same
commit. The [exact Preview](https://ace-club-1vr3qxhtk-theadmitco-techs-projects.vercel.app)
matches the browser observations. Its staging target still requires confirmation
before further database tests or test-data writes.
The failed deployment requires sanitized build logs and an explicit scope decision;
its cause has not been established. Copilot did not review the PR because its
review quota was exhausted. Vercel Preview Comments success is not a code review.

The earlier public inspection found no active protection rules on main/integration.
Required PR review, `Lint`, `Tests and build`, branch freshness, and restrictions on
force pushes, deletion, and routine bypasses require administrator configuration
and verification. Workflow YAML alone does not enforce merge protection.

## Publishing handoff

The history replacement is complete: public GitHub reads confirm `3207cba` on
PR #23. The former force-push instruction is obsolete and must not be repeated.

The current evidence update is local on `intern/v2-phase-1-verification`, based on
that candidate. No further publication is authorized. The Phase 2 branch is
preserved separately. After any future authorized PR update, verify the resulting
head, checks and Preview again. Public metadata reads do not establish authenticated
write access. The pre-existing untracked root SOP remains excluded.

## Staging and acceptance

The [staging checklist](manual-verification-checklist.md) requires a Preview tied
to the reviewed commit and the separate staging Supabase project. Evidence must
record the application SHA, migration checksum, schema/ledger reconciliation,
synthetic identities, expected/actual outcomes, and restored fixture state.
Existing student journeys and the worksheet/payment surfaces affected by lint
cleanup require browser verification. Stubbed tests do not verify live providers.

The authorized operator reviews and applies only the proposed new migration after
backup and recovery arrangements are confirmed. Historical migrations must not be
replayed indiscriminately. Six-calendar-month UTC expiry and month-end clamping
require product acceptance. Release approval remains separate from phase acceptance.

## Recovery plan to confirm before release

- The current deployed application SHA and authorized rollback operator are recorded;
  the task's base commit is not assumed to be the live Production source.
- A recoverable database backup and isolated restoration evidence precede migration approval.
- Failed migration execution requires schema/ledger inspection before retrying.
- Failed application smoke tests trigger restoration of the recorded prior deployment.
  The additive V2 tables can remain unused while no existing routes consume them.
- Purchase/grant history is preserved. Table deletion or blind backup restoration
  over new writes is not a general rollback procedure.
- Sign-in, authorization, material-access, payment, or data-integrity regressions
  stop rollout until failure and recovery evidence has been reviewed.

## Current gates

- [x] Local lint, TypeScript, tests, and production build pass.
- [x] Reviewed implementation and matching source hashes recorded.
- [x] PR #23 published as a draft against integration.
- [x] Hosted `Lint` and `Tests and build` pass at `3207cba`.
- [x] LMS Preview deployment succeeds for that commit.
- [x] Rewritten PR head published and its hosted checks and Preview verified.
- [x] Basic Admin/Student sign-in and Student-to-Admin redirect observed manually.
- [ ] Flexible-mocks deployment failure investigated and disposition recorded.
- [ ] Intended V2 source baseline confirmed.
- [ ] Required checks and branch protection verified.
- [ ] PR Preview staging target, schema, test identities, and browser journeys verified.
- [ ] Expiry convention and Phase 1 acceptance recorded.
- [ ] Release target, recovery baseline, and release approval recorded.

## Prepared draft PR summary

Title: **Add V2 product entitlements and pre-merge verification**

Existing course enrollment does not represent separately purchased V2 products or
six-month expiry. This change adds an isolated product catalogue, versioned INR
prices, payment-linked grants, database-enforced product/section access and expiry,
and server-only readers. Full Batch remains distinct from the three Crash Courses.
Legacy enrollment and material authorization remain in use; existing pages and
payment routes are not connected to V2 grants by this change.

The change also resolves existing lint failures through typed checkout/error
handling and worksheet loading, adds regression tests, and introduces PR checks.
Payment fulfillment and material-route enforcement remain later-phase work.

Local verification passed 17 PostgreSQL scenarios, 67 application tests, lint,
TypeScript, and build. The current PR head `3207cba` passed hosted `Lint` and
`Tests and build`, and its LMS Preview deployed successfully. Basic role navigation
was observed manually. The flexible-mocks deployment failure remains unresolved.

The PR remains a draft pending confirmation of the intended existing code version,
staging verification, and product acceptance. The database migration is included
for review; its application to the Preview's database has not been verified.
