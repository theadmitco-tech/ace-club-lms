# Phase 2 Preview activation

The [full Phase 2 completion checklist](EXIT-GATES.md) maps all 17 gates from
Ishan's supplied draft, including requirements missing from the older authoring-only
scope. Activating the six migrations and three flags alone is not phase completion.

## Phase 1 completed — 2 November 2026

Phase 1's catalogue and entitlement foundation has **13 supported exit gates**.
See the [completed audit](../phase1-exit-gate-audit-2026-11-01/README.md) and
[hosted tests/cleanup](../phase1-closeout-2026-11-01/passwordless-qa/README.md).
Current head `155b3fbffc46db94be0fbee70b7b6fd9465a74b4` is READY on Preview
`dpl_EWB7tYjTYzhrndN7WS1waXKKCMaG`. The approved branch-only server-key repair
and additive legacy editor metadata repair both passed hosted retests.

Production and the original Phase 1 migration are preserved; PR #24 is Draft.
**Phase 2 migrations, write flags and publication remain inactive.** The sections
below describe earlier work and must not be treated as the current Phase 1 status.

## Phase 1 website integration — 1 November 2026

The existing LMS Preview now includes the staging-backed Phase 1 course catalogue,
package quotes, Student My access, and Admin Products & access. Current review
head is `07154f02c466cd17a940257f4c2b0f56096c453f`, deployment
`dpl_Eh3mkarH2b5WkHfzybBNCF2fdpQA`. See the
[Phase 1 integration and verification record](../phase1-website-integration/README.md).

Production, the applied Phase 1 migration, and PR #24's Draft status are preserved.
Phase 2 SQL and write-flag activation remain pending. The user confirmed both
authenticated Phase 1 staging pages load correctly on 1 November 2026; this
confirmation does not activate Phase 2 publishing.

## Wireframe UI refinement — 28 October 2026

The same LMS Preview now uses the calm wireframe styling: warm neutral surfaces,
forest-green actions, underlined workspace navigation, offering cards, draft status,
and grouped session resources. The overview separates course content from batch
publication. Existing authentication, draft recovery and confirmation flows remain.

Open [the LMS Preview](https://ace-club-lms-git-intern-v2-pha-9a969c-theadmitco-techs-projects.vercel.app/admin/v2)
and sign in as an Admin. Commit `5398aad5b49b574ef628414127dabbe7fe139614`
is READY in Vercel deployment `dpl_3mFV3sLhPYNu6axippjC6C1XBqFN`.
The deployed browser asset still uses staging `eyphkkginlgoaxflauog.supabase.co`.
PR #24 remains Draft; Production is still `dpl_8axtycbJUpFX8cPWhVtkhGf6p9Kj`.

**Phase 2 course publishing is not enabled yet.** Finish the staging SQL runbook,
Preview flag activation and authenticated acceptance before saving or publishing.
No shared SQL, migration changes or feature flag changes were made for this UI update.

Validation: 39 isolated browser scenarios passed (including 320/390/768px layouts),
50 targeted navigation/template/batch checks, lint, TypeScript and webpack build
passed. GitHub Verify run `40730439156` succeeded. Browser tests use synthetic
local authentication/data; hosted authenticated acceptance still requires an Admin
session. The hosted signed-out route returns the normal LMS login.

See [UI deployment evidence](wireframe-ui-refinement-2026-10-28.json),
[UI patch](wireframe-ui-refinement.patch), and
[browser verification](ui-verification/browser-results.json).
Screenshots in `ui-verification/` contain local test data, not saved LMS records.

## Live LMS Preview — 28 October 2026

The existing LMS Preview now includes **Course publishing** in the Admin sidebar,
the actual Phase 2 template editor, and batch settings. Open
[Course publishing](https://ace-club-lms-git-intern-v2-pha-9a969c-theadmitco-techs-projects.vercel.app/admin/v2)
after normal Admin sign-in. This is the LMS application with its existing
authorization; no sample workspace was deployed.

Published by fast-forward Git SSH push to `intern/v2-phase-2-review` at
`ee79f1174db4e3fd91ae3ea49dcfbb8e2a614845`. Vercel deployment
`dpl_5tkLaxWWa4khR94KEunrA1uJE5ot` is READY and serves the existing branch alias.
PR #24 remains Draft. Production deployment `dpl_8axtycbJUpFX8cPWhVtkhGf6p9Kj`
is unchanged. The source change passes 50 targeted checks, lint, TypeScript and build.

With staging setup pending, Admins can arrange unsaved template content and inspect
batch settings. Save, schedule review and publication stay disabled. Real saved
data is never replaced with fixtures. Feature flags, database records and all
migration files are unchanged. Complete the SQL runbook before enabling writes.
See [the published patch](live-lms-preview.patch) and
[deployment evidence](live-lms-preview-2026-10-28.json).

## Earlier SQL packet preparation — 28 October 2026

**The current PR Preview points to staging `eyphkkginlgoaxflauog`.** The connected
Vercel plugin verified the READY deployment and branch alias at PR #24 head
`18f4bfedb1e4f927e49d8d535e0db2e7e93916ed`; its deployed browser asset contains the
staging Supabase host. Sensitive environment values are omitted by the plugin,
so the service key's association was not independently verified. The three Phase 2
flags are absent and have not been changed. Production remains untouched.

Start with [the staging SQL Editor runbook](STAGING-SQL-EDITOR.md), then run the
two read-only inspection files it links. The packet contains exact, checksum-
verified migration sources and a guarded atomic application for **all six absent**
only. Any partial application or drift requires reconciliation. Preserve the
applied Phase 1 migration; do not run it or the canonical-contract proposal.

PR #24 is confirmed **Draft**. The navigation patch was reapplied to an isolated
copy of the exact head; 12 navigation/access tests, targeted lint, TypeScript and
webpack build pass. GitHub still rejects publication with HTTP 403, so the patch
is not hosted. No shared SQL, environment change, deployment, merge or ready-for-
review action occurred. Supabase OAuth, fresh staging backup/restore evidence,
SQL results and authenticated acceptance remain pending. See the
[verification record](verification-2026-10-28.json).

The workspace is on an older branch, and four local Phase 2 migration files differ
from the approved manifest. Use the packet's pinned sources, never those worktree
copies. Existing local changes were retained.

## Original patch handoff

Prepared against PR #24 head `18f4bfedb1e4f927e49d8d535e0db2e7e93916ed`.
The patch adds an Admin Course publishing navigation entry and `/admin/v2` landing page.
Production hides the entry and denies the page. Disabled features show honest setup status.
Existing protected editors and draft-navigation guards are retained.

12 navigation/access tests, targeted lint, TypeScript and webpack build passed locally.
At original preparation, no database change or deployment occurred. GitHub write
returned 403 and Vercel/Supabase were unavailable. The continuation above supersedes
that connection status.

## Activation once access is available

1. Inspect the latest review branch and CI/Preview. The navigation and setup-state editors are already published at `ee79f11`; do not reapply the original navigation patch.
2. Verify staging project `eyphkkginlgoaxflauog`, inspect existing schema/ledger with the SQL Editor packet's `00` and `01` scripts, and reconcile drift before any migration. Preserve the applied Phase 1 migration.
3. Complete backup/restore rehearsal and the exact authorized missing Phase 2 migration set listed in `activation-manifest.json`. Do not blindly replay the full migration directory. Stop if any listed migration is already applied with incompatible definitions.
4. After schema checks pass, set the three flags in the manifest on Vercel Preview for `intern/v2-phase-2-review` only, and redeploy. Leave Production and other branches unchanged.
5. Sign in as an authorized Admin. Open Course publishing, save/reopen a complete template, create a batch, preview/publish/edit/unpublish/republish using dedicated QA data. Verify Student/signed-out denial and enrolled-only schedules.
6. Existing materials require reviewed source-to-target mappings and the unfinished import/shared-content work; do not mark them transferred or replace existing courses with fixtures.

The Phase 1 canonical-contract proposal is a separate reviewed expansion, not a substitute for these Phase 2 tables or a reason to rerun Phase 1.
PR #24 remains Draft until hosted acceptance is recorded. No merges or Production changes are included.
