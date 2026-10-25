# V2 Phase 1 — GitHub and baseline review, 18 October 2026

Status: Review evidence only — baseline decision and hosted/staging verification pending
Owner: Engineering and product owner
Checked: 18 October 2026, 09:19 UTC

Editorial update: personal references use role names; recorded observations and
review conclusions are unchanged.

## Method and limits

Read the public GitHub REST API and remote branch heads, then compare the matching
local Git objects. No remote branch, PR, protection setting, deployment, or database
was changed. GitHub reads succeeded without account authentication; they do not
prove that the ChatGPT GitHub connection can publish a branch or PR.

The earlier local test evidence remains [a separate snapshot](local-verification-2026-10-18.md).
All 21 recorded implementation/test/workflow file hashes still match. No application
code changed during this review, so those checks were not rerun. A targeted scan of
the 29 proposed changed/new files found no credential-pattern matches. This is a
limited diff review, not a full repository or historical secret audit. The user's
pre-existing root `intern-collaboration-sop.md` is excluded from the proposed commit.

## Verified GitHub state

| Item | Observed result |
|---|---|
| Repository | Public: `theadmitco-tech/ace-club-lms` |
| Remote branches | 31 at the initial inspection |
| `main` | `940ea7835734a8fb22a6451a30b31084b11d5c97` |
| `codex/v2-integration` | Same commit as `main` |
| `intern/v2-onboarding` | Local task branch; absent from remote heads at inspection |
| `codex/template-worksheet-tracker` | `096f5b392876635498da2da2a3cd988982aa09df` |
| Branch protection | Both `main` and integration report `protected: false`; active-rules endpoints return empty arrays |
| GitHub Actions | Workflows: 0; workflow runs: 0 |

Sources: [branches](https://api.github.com/repos/theadmitco-tech/ace-club-lms/branches?per_page=100),
[main rules](https://api.github.com/repos/theadmitco-tech/ace-club-lms/rules/branches/main),
[integration rules](https://api.github.com/repos/theadmitco-tech/ace-club-lms/rules/branches/codex%2Fv2-integration),
[workflows](https://api.github.com/repos/theadmitco-tech/ace-club-lms/actions/workflows),
and [runs](https://api.github.com/repos/theadmitco-tech/ace-club-lms/actions/runs?per_page=1).
These endpoints are mutable; the table records this inspection, not a permanent guarantee.

Four open PRs were observed:

| PR | Target | State and head-commit results |
|---|---|---|
| [#22](https://github.com/theadmitco-tech/ace-club-lms/pull/22) | `main` | Draft; LMS deployment success, flexible-mocks deployment failure; 91 commits ahead and one behind `main` |
| [#21](https://github.com/theadmitco-tech/ace-club-lms/pull/21) | `codex/template-worksheet-tracker` | Not draft; deployment success; no merge conflicts reported |
| [#20](https://github.com/theadmitco-tech/ace-club-lms/pull/20) | `main` | Draft; deployment success; 65 commits ahead and one behind `main`; 162 changed files |
| [#15](https://github.com/theadmitco-tech/ace-club-lms/pull/15) | `main` | Draft; deployment success; merge conflicts reported |

These heads have successful `Vercel Preview Comments` checks. That check does not
represent application tests. The shared main/integration commit has a successful
`Vercel – ace-club-lms` deployment status and a failed
`Vercel – ace-club-flexible-mocks` status, both dated 11 October. Commit statuses
do not establish which branch/environment an application is currently serving.
The flexible-mocks failure needs its build logs and an owner decision on whether
that project is in scope; it must not be silently waived.

## Baseline discrepancy

The task's documented target is integration, which currently equals `main`.
However, PR #20 says it reconciles main with the Release 1.2 Production lineage.
Its branch contains a newer operational handoff and engineering rules absent
from the task baseline:

- [Current State at `096f5b3`](https://github.com/theadmitco-tech/ace-club-lms/blob/096f5b392876635498da2da2a3cd988982aa09df/docs/CURRENT_STATE.md)
  identifies `8e6052336f9274922ecad63c8d9772e644473c01` as the Production source and
  explicitly says `main` is not the authoritative Production baseline.
- [Release 1.2 evidence at the same commit](https://github.com/theadmitco-tech/ace-club-lms/blob/096f5b392876635498da2da2a3cd988982aa09df/docs/releases/2026-09-07-release-1-2-template-worksheet-tracker-production.md)
  records a 7 September rollout, tracker compatibility changes, and distinct
  Staging/Production migration ledger versions.
- [The branch's AGENTS.md](https://github.com/theadmitco-tech/ace-club-lms/blob/096f5b392876635498da2da2a3cd988982aa09df/AGENTS.md)
  introduces Project Manual, Current State, Engineering Handbook, and documentation
  validation as its continuation workflow.

Those are verified documentation claims, not a fresh observation of Vercel or
Supabase. Do not import that history, merge PR #20, rebase the task, or declare the
live baseline reconciled without product-owner and engineering confirmation of
the intended source.
PR #20's older statement that main is an ancestor is no longer accurate for the
inspected tips: main has the later V2 planning commit absent from that branch.

The payment and worksheet files touched by the Phase 1 cleanup have no branch
differences against the Release 1.2 candidate, but its package scripts, dependencies, other
application paths, migrations, and documentation differ. This limited comparison
does not prove compatibility with that candidate or the deployed database. If the
base changes, review the combined diff and rerun its applicable checks.

## Review disposition and exact next action

The Phase 1 implementation is ready to preserve as a local review commit on its
existing branch. It is not accepted, merged, deployed, or tested on the documented
Release 1.2 deployment. Baseline confirmation is still pending; hold publication
until the starting branch is resolved. Preserve existing work without resetting,
rebasing, or silently incorporating another release.

First obtain confirmation of whether V2 should extend the current integration
baseline or the Release 1.2 lineage. Then publish the reviewed task branch as a
draft PR into the agreed integration branch, run its hosted checks, and complete
the [review/staging gates](../review-and-release.md). Separate authenticated
GitHub access is required for publication and administration; public reads alone
do not establish that capability.
