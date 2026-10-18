# V2 Phase 1 — Review and release gates

Status: Draft — rewritten head awaiting publication/checks; staging and acceptance pending
Owner: Engineering and product owner
Last updated: 18 October 2026

[PR #23](https://github.com/theadmitco-tech/ace-club-lms/pull/23) is a draft from
`intern/v2-onboarding` into `codex/v2-integration`, based on
`940ea7835734a8fb22a6451a30b31084b11d5c97`. The five task commits are consolidated
into one replacement commit with neutral documentation. All recorded implementation,
test, and workflow hashes remain unchanged. The previously published and tested head
was `f97d5939c728dc467668b557650bd9eb77abc93d`; its results do not establish checks
for the rewritten head. Publication and fresh hosted checks remain pending here.
No shared migration or Production change has been performed as part of this work.

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

Designated test Admin and Student accounts have not been provided. The PR-specific
Preview's staging target and deployed schema remain unverified. The proposed
migration has not been applied to a shared database.

Phase 0 remains deferred for the current work. Neither Phase 0 nor Phase 1 is
accepted, and the deferral does not authorize a release.

The local workspace and complete main/integration Git trees at `940ea783` did not
contain `intern-onboarding.md` or the separately referenced SOP v1.0. The root
`intern-collaboration-sop.md` is a pre-existing untracked file; its contents do not
establish the missing documents' versions. Exact paths/versions remain pending.

## GitHub verification

[Verify run 39116800666](https://github.com/theadmitco-tech/ace-club-lms/actions/runs/39116800666)
passed for `f97d593`: `Lint` and `Tests and build` completed successfully. Job
steps include the disposable PostgreSQL suite, reader tests, cleanup tests,
existing Pilot V2 tests, TypeScript, build, and unchanged manifest verification.
The workflow does not deploy or apply shared migrations.

[Deployment results](https://github.com/theadmitco-tech/ace-club-lms/pull/23#issuecomment-6248418639)
record an LMS Preview success and a flexible-mocks deployment failure for the same
commit. The [PR Preview](https://ace-club-lms-git-intern-v2-onboarding-theadmitco-techs-projects.vercel.app)
requires staging-target confirmation before authenticated tests or data writes.
The failed deployment requires sanitized build logs and an explicit scope decision;
its cause has not been established. Copilot did not review the PR because its
review quota was exhausted. Vercel Preview Comments success is not a code review.

The earlier public inspection found no active protection rules on main/integration.
Required PR review, `Lint`, `Tests and build`, branch freshness, and restrictions on
force pushes, deletion, and routine bypasses require administrator configuration
and verification. Workflow YAML alone does not enforce merge protection.

## Publishing handoff

PR #23 already exists. The authorized history replacement updates only
`intern/v2-onboarding`, with a lease pinned to the last verified remote head:

```bash
git push --force-with-lease=refs/heads/intern/v2-onboarding:f97d5939c728dc467668b557650bd9eb77abc93d origin intern/v2-onboarding:refs/heads/intern/v2-onboarding
```

The lease rejects publication if that remote branch has changed. Such a rejection
requires inspecting the new remote work; the lease must not be bypassed with an
unconditional force push. Main and integration are excluded from this update.

The previous agent-session dry-run push failed because GitHub authentication was
unavailable. Public GitHub reads do not establish authenticated write access.
Credentials belong in the authentication flow, never in chat or repository files.
After any push, the actual PR head and its checks require verification. A new draft
PR is unnecessary. The pre-existing untracked root SOP is excluded from this change.

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
- [x] Hosted `Lint` and `Tests and build` pass at `f97d593`.
- [x] LMS Preview deployment succeeds for that commit.
- [ ] Rewritten PR head published and its hosted checks and Preview verified.
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
TypeScript, and build. The previous PR head passed hosted `Lint` and `Tests and build`,
and its LMS Preview deployed successfully. The replacement commit preserves the
tested code and requires fresh hosted checks. The flexible-mocks deployment failure
remains under investigation.

The PR remains a draft pending confirmation of the intended existing code version,
staging verification, and product acceptance. The database migration is included
for review and has not been applied to staging or Production.
