# V2 Phase 1 — GitHub deployment follow-up, 18 October 2026

This supplements the [earlier GitHub review](github-review-2026-10-18.md), preserving
that inspection as recorded. Only public GitHub deployment metadata was read; no
Vercel URL, live application, database, or deployment control was accessed.

Editorial update: personal references use role names; recorded observations and
review conclusions are unchanged.

## Observed records

GitHub's latest returned deployments include these two records for commit
`940ea7835734a8fb22a6451a30b31084b11d5c97`, the current main/integration baseline:

| GitHub deployment | Environment label | Latest recorded status | Recorded at |
|---|---|---|---|
| `6996101635` | `Production – ace-club-lms` | `success` | 11 October 2026, 13:18:06 UTC |
| `6996103854` | `Production – ace-club-flexible-mocks` | `failure` | 11 October 2026, 13:18:18 UTC |

Sources: [deployment list](https://api.github.com/repos/theadmitco-tech/ace-club-lms/deployments?per_page=30),
[LMS status](https://api.github.com/repos/theadmitco-tech/ace-club-lms/deployments/6996101635/statuses),
and [flexible-mocks status](https://api.github.com/repos/theadmitco-tech/ace-club-lms/deployments/6996103854/statuses).
The LMS record points to `https://ace-club-mviut5a6z-theadmitco-techs-projects.vercel.app`.
Both records have `production_environment: false` despite their Production labels.

## Interpretation and boundary

These records are newer than PR #20's September deployment account. Therefore do
not assert that its Release 1.2 source is still live, or that main is definitely
not live. Equally, a GitHub deployment label/success does not independently prove
the current canonical-domain assignment, actual Vercel environment variables,
Supabase target, application journeys, or whether a later manual promotion occurred.

The intended V2 baseline remains a product/engineering clarification. The project
owner should confirm the source commit currently assigned to the Production domain and whether
V2 is to extend current main/integration or the Release 1.2 lineage in PR #20.
No rebase, merge, remote publication, or deployment was performed to resolve it.

The local review implementation is identified by the 21 implementation/test/workflow
hashes in the local test evidence. Those hashes remain unchanged; subsequent
changes only update review documentation, including the branch-history consolidation.
