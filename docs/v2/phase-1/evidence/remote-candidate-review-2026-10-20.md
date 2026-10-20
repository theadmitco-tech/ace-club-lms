# Phase 1 public branch and PR metadata

Observed: 20 October 2026. Source: unauthenticated, read-only GitHub REST API
requests to the repository's branch and pull-request endpoints. No application,
Preview, Supabase project or Production service was contacted.

| Object | Observed state |
|---|---|
| `main` | `940ea7835734a8fb22a6451a30b31084b11d5c97`; `protected: false` |
| `codex/v2-integration` | Same commit as main; `protected: false` |
| `intern/v2-onboarding` | `3207cba41b0561ef78c0adf5a44302d753d48bdb` |
| PR #23 | Open, draft, unmerged; onboarding head above into integration |
| PR #20 | Open, draft, unmerged; `codex/template-worksheet-tracker` at `096f5b392876635498da2da2a3cd988982aa09df` into main; reported base `be1a6ccba4e1ba896b059051fbf712708c70fafb` |

Sources: [main](https://api.github.com/repos/theadmitco-tech/ace-club-lms/branches/main),
[integration](https://api.github.com/repos/theadmitco-tech/ace-club-lms/branches/codex%2Fv2-integration),
[task branch](https://api.github.com/repos/theadmitco-tech/ace-club-lms/branches/intern%2Fv2-onboarding),
[PR #23](https://api.github.com/repos/theadmitco-tech/ace-club-lms/pulls/23),
[PR #20](https://api.github.com/repos/theadmitco-tech/ace-club-lms/pulls/20).

No check runs or deployments were inspected in this read. Earlier passing jobs
remain evidence for their old commit only. Public metadata cannot prove push
credentials, current canonical-domain deployment or owner approval of the release
baseline. Branch protection configuration/enforcement still requires review.
The local Phase 1 candidate descends from PR #23's existing head; neither remote
branch nor PR was modified.
