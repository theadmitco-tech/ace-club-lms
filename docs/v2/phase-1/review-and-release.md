# V2 Phase 1 — Review and release gates

Status: Active — staging migration and SQL verification passed; browser acceptance pending
Owner: Engineering and product owner
Last updated: 24 October 2026

## Current result — 24 October

The approved exact PR #23 migration at `d3020c1` has been applied to staging.
Backup/recovery rehearsal, schema comparison, pricing, synthetic grants, role
isolation, expiry and revocation checks passed. Existing application data and
earlier migration records stayed unchanged; synthetic verification rolled back.
See the [application report](evidence/staging-application-2026-10-24.md).

Next: complete the current Preview's browser/REST and legacy regression checks,
resolve or assess the failing flexible-mocks deployment status, and obtain Phase 1
acceptance. Phase 2 application remains separately gated. Both PRs remain Draft;
no merge or Production operation is authorized.

## Historical planning — 20 October

The sections below preserve the earlier planning record. The application report
above supersedes its pending access, recovery and Phase 1 application statements.

Start with the [Phase 1 completion report](completion-report.md). Current branch:
`intern/v2-phase-1-completion`; verified application commit:
`529391fd5bc402831914a60418c0cfef4cec66da`.
The [expiry confirmation](../decisions/phase-1-expiry-confirmation-2026-10-20.md)
approves denial after six months. Notifications and later upgrade expiry are not
part of this phase. Phase 2 remains separately committed at `208ceaa` and has not
been added to this candidate.

## Baseline decision before merge and release

[Read-only GitHub metadata](evidence/remote-candidate-review-2026-10-20.md) confirms
main and integration at `940ea78`, and PR #23 open/draft at `3207cba` targeting
integration. The local candidate descends from that existing PR head. It can be
reviewed as a fast-forward update without rewriting published history, after
publication authorization. No push or PR update has been performed here.

PR #20 remains a separate open draft with another release lineage. Earlier
[deployment evidence](evidence/github-deployment-followup-2026-10-18.md) does not
establish today's canonical-domain source. The authorized owner must confirm the
intended application baseline before merge or any shared migration. Main and
integration report `protected: false`; required review/check enforcement must be
configured and verified. Do not treat repository workflow YAML as protection.

## Preview-only collaboration decision — 18 October 2026

Preview access remains the collaboration model. Vercel dashboard membership is
not required. Engineering prepares the candidate and browser checks; the project
owner supplies deployment/configuration evidence and sanitized logs. The
separately authorized operator handles staging schema inspection and any approved
migration. Production and real Student data remain outside this task.

Earlier [role navigation](evidence/preview-and-access-2026-10-19.md) and
[browser staging-target observations](manual-verification-checklist.md) establish
only the recorded Preview behavior. The public catalogue probe returned 404 /
`PGRST205`; its quote check did not run. The cause has not been verified.
The supplied decision record reports a ledger ending at `20260925100000`; this
is supplied evidence, not an independently inspected database.

## Publishing handoff

1. Confirm the exact Phase 1 branch/PR scope and review baseline. Do not push the
   combined Phase 2 branch into PR #23. Existing Phase 1 history is preserved.
2. Publish the reviewed Phase 1 candidate through a draft PR update when
   authorized. Verify the remote head, CI and Preview for that exact commit.
3. Keep the PR in draft until staging verification and product acceptance are
   recorded. No auto-merge, integration merge or main push is authorized.

The root untracked collaboration SOP remains unchanged and excluded. Phase 0 is
still deferred. The previously referenced `intern-onboarding.md` and separate
SOP v1.0 remain unavailable in this checkout; their versions are unconfirmed.
The earlier handoff is retained in Git at `ed4c317`.

## Staging and acceptance

The [manual checklist](manual-verification-checklist.md) is the execution record.
The operator first verifies staging identity, reads
[`v2-phase-1-schema-preflight.sql`](../../../scripts/v2-phase-1-schema-preflight.sql),
and reconciles actual definitions and the migration ledger. The script is
read-only and reports four tables/four RPCs; it does not inspect private rows or
repair drift. Missing objects are reported without claiming permission to migrate.

Only [20261018090000_add_v2_product_entitlements.sql](../../../supabase/migrations/20261018090000_add_v2_product_entitlements.sql)
is proposed for this phase. Its checksum is in the
[local evidence](evidence/isolated-candidate-2026-10-20.md#migration-artifact).
After baseline review, backup/recovery preparation and separate staging approval,
the authorized operator can apply that reviewed artifact. Do not replay the
historical directory or apply later-phase migrations.

Then use designated Admin/Student A/Student B identities and separately approved
synthetic purchase fixtures to verify prices, grants, isolation, expiry, retries,
legacy content/worksheet journeys and relevant existing checkout regressions.
The existing catalogue probe is pinned to the old deployment: review its origin
allowlist only after the candidate Preview identity is known.

Record exact source, schema/migration result, expected/actual outcomes and
sanitized evidence. No passwords, tokens, database exports or student rows belong
in reports. Product acceptance is separate from Production release approval.

## Recovery plan to confirm before release

- Record the currently deployed application SHA and authorized rollback operator.
- Confirm recoverable staging backup and an isolated restoration procedure before
  any migration approval. Inspect schema/ledger after a failed migration.
- Keep the additive V2 foundation unused if checks fail; the current candidate
  does not connect legacy routes or payment fulfillment to V2 grants.
- Preserve purchase/grant history. Do not drop tables or restore a whole database
  over subsequent writes as a routine rollback.
- Sign-in, privacy, payment, data integrity or legacy-access regressions stop
  acceptance until resolved and retested.

## Current gates

- [x] Phase 1 separated from Phase 2 without rewriting either saved branch.
- [x] Six-month access denial decision recorded; history-preserving expiry tested.
- [x] 102 local tests, lint, TypeScript and production build pass.
- [x] Exact application commit, changed files and migration checksum recorded.
- [x] Public branch/PR metadata inspected without remote mutation.
- [ ] Intended application baseline and exact candidate PR scope accepted.
- [ ] Candidate published as a draft update; matching CI and staging Preview verified.
- [ ] Required checks, review and branch protection enforced.
- [ ] Actual staging schema/ledger inspected; exact migration/setup separately approved.
- [ ] Authenticated staging access, direct permissions, expiry and legacy journeys pass.
- [ ] Product owner records Phase 1 acceptance.
- [ ] Separate release/recovery decision before any main merge or Production operation.

## Prepared draft PR summary

Title: **Add isolated V2 products and six-month access enforcement**

Existing enrollment does not represent independently purchased V2 products. This
Phase 1 candidate adds four product scopes, configured INR pricing, atomic
payment-linked grants and six-month expiry checked using database time. Expiry
preserves purchase history; duplicate delivery cannot restart access. Hardened
caller-session readers reject malformed/overbroad responses. Existing MVP
permissions remain unchanged. The earlier Phase 1 lint/worksheet/checkout cleanup
and its regression tests remain included.

Phase 2 authoring/publication, live registration allocation, V2 checkout and
content-reader integration are excluded. The only proposed migration is
`20261018090000_add_v2_product_entitlements.sql`.

Local verification: 102 tests across 11 files, lint with zero warnings, TypeScript
and production build passed at `529391f`. The complete file list, risks and staged
verification plan are in `docs/v2/phase-1/completion-report.md`. Earlier hosted
checks apply to `3207cba`, not this candidate. Keep the PR in draft while the
baseline, exact-candidate Preview/CI, staging setup and acceptance remain pending.
No shared migration, Production operation or existing student/course-data change
was performed by the development task.
