# Staging SQL Editor activation — 28 October 2026

Current state: **prepared and locally verified; no staging SQL executed**.
Supabase OAuth remains blocked. Use the authenticated dashboard's
[staging SQL Editor](https://supabase.com/dashboard/project/eyphkkginlgoaxflauog/sql).
Confirm the selected project is `eyphkkginlgoaxflauog` before every run.
SQL cannot independently prove the hosted project identity.

Production is excluded. PR #24 stays Draft. The applied Phase 1 migration
`20261018090000` and its purchases, prices, grants and stored product codes must
remain intact. Do not run Phase 1 again or apply the separate canonical-contract
proposal. Existing course content is not imported by this packet.

## 1. Inspect before deciding what is missing

Run these **whole files separately** with the dashboard's privileged database
role, saving sanitized results with the project, UTC time and operator:

1. [00-schema-preflight.sql](sql-editor/00-schema-preflight.sql): read-only presence,
   RLS and client-role privilege report for Phase 1 and Phase 2.
2. [01-ledger-and-definitions.sql](sql-editor/01-ledger-and-definitions.sql): read-only
   migration ledger fingerprints plus columns, constraints, indexes, policies,
   triggers and full V2 function definitions. It returns no application rows.

Check the Phase 1 ledger entry, four tables and seven functions against the
[applied Phase 1 evidence](../../docs/v2/phase-1/evidence/staging-application-2026-10-24.md).
The immutable Phase 1 source checksum is
`ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7`.
A missing or inconsistent Phase 1 record requires reconciliation, not a replay.

The only Phase 2 versions in scope, in order, are:

| Version | Migration |
| --- | --- |
| `20261019090000` | `add_v2_template_drafts` |
| `20261019100000` | `add_v2_batch_drafts` |
| `20261019110000` | `add_v2_private_meeting_drafts` |
| `20261020090000` | `add_v2_outline_schedules` |
| `20261020100000` | `add_v2_batch_publication` |
| `20261025100000` | `add_v2_enrolled_schedules` |

Use [the exact checksums](activation-manifest.json) and
[pinned source copies](sql-editor/source-migrations), extracted from PR #24 commit
`18f4bfedb1e4f927e49d8d535e0db2e7e93916ed`. **Do not copy the workspace's
`supabase/migrations` files:** four Phase 2 files on its older branch differ.

Choose the path from actual results:

- **All six absent, all Phase 2 tables/routines absent:** the guarded application
  file below is applicable after recovery and dependency checks pass.
- **Any Phase 2 object exists, with or without a ledger entry:** stop. Compare its
  complete definitions and grants with the pinned source at the applicable
  migration stage. Prepare only the reconciled missing set; do not use this
  all-six bundle. `CREATE IF NOT EXISTS` is not drift reconciliation.
- **All six recorded:** skip application. Verify installed definitions and grants,
  then run postflight. Ledger entries alone do not prove equivalent schema.

The [local reference catalogue](sql-editor/local-reference-catalogue.json) shows
the expected final definitions from a disposable synthetic database. Its synthetic
ledger, server version, owners and database metadata are not staging evidence.
The preflight report alone does not establish function equivalence or PostgREST
schema-cache health.

## 2. Complete recovery preparation

Obtain a fresh recoverable staging backup and successfully rehearse its restore
into an isolated disposable database before writes. Preserve application data,
schema, grants and migration history; document any managed-platform exclusions
and separate Storage-object recovery arrangements. Record backup location,
checksum, time, restore result and the exact migration rehearsal result privately.
Never restore over shared staging as part of this procedure.

Use available Dashboard backup facilities or an already authorized private
database connection. SQL Editor result exports are not a complete backup. The
24 October Phase 1 backup and this packet's synthetic local tests do not establish
current Phase 2 recovery. If fresh recovery cannot be verified, stop here.
Supabase documents [backup/restore and migration-history preservation](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

## 3. Apply only the verified all-six-missing case

Open [02-apply-all-six-if-absent.sql](sql-editor/02-apply-all-six-if-absent.sql).
After steps 1–2 pass, change only the two acknowledgement literals:

- `REPLACE_WITH_VERIFIED_PROJECT_REF` → `eyphkkginlgoaxflauog`.
- `REPLACE_WITH_BACKUP_RESTORE_EVIDENCE` → a non-secret identifier for the fresh
  backup, successful restore and migration rehearsal report.

Run the **entire file** once. It holds a migration-ledger lock, checks Phase 1 and
absence of every Phase 2 version/relation/routine, then applies exactly the six
approved source bodies. Their individual transaction boundaries are replaced by
one transaction containing all six ledger inserts and structural checks.
Prior ledger rows and Phase 1 data/schema fingerprints must remain identical or
the transaction fails. No account, purchase, course, batch or enrollment fixture
is created; the four canonical offering mappings are the intended new seed rows.

SQL Editor does not automatically maintain CLI migration history. This bundle
records each version, name and source body in `supabase_migrations.schema_migrations`
within the same transaction; it never updates existing ledger rows. See
[Supabase migration history guidance](https://supabase.com/docs/guides/deployment/database-migrations).
Do not run raw source files first, run `db push` against the whole directory, or
manually mark migrations applied without verifying the installed definitions.

On any error, issue `ROLLBACK;` and rerun the read-only inspection. Do not remove
guards or retry blindly. On a timeout, disconnected tab or uncertain result,
inspect the ledger/schema before attempting another application. If all six were
committed, the application guard will reject a repeat safely.

## 4. Verify before enabling Preview

Run 00 and 01 again, then [03-postflight.sql](sql-editor/03-postflight.sql).
Expect exactly six additional ledger versions, unchanged earlier ledger
fingerprints, eight Phase 2 tables with RLS, no client-role direct writes, no
anonymous/service-role private reads or Phase 2 RPC access, and only the intended
authenticated RPC grants. Confirm all definitions, policies and constraints;
compare the before/after Phase 1 metadata. The four canonical offerings map to
the existing Phase 1 entitlement codes without renaming commercial records.

The application file requests a PostgREST schema-cache reload on commit. Actual
API and authenticated browser checks remain necessary; passing SQL is not hosted
acceptance. Save results before continuing.

## 5. Finish the exact PR Preview activation

The existing LMS Preview was subsequently updated at commit
`ee79f1174db4e3fd91ae3ea49dcfbb8e2a614845`. Deployment
`dpl_5tkLaxWWa4khR94KEunrA1uJE5ot` is READY on the same branch alias. Admins can
now open **Course publishing**, explore the actual template editor and inspect
batch settings using normal LMS login. While setup is pending, saves, schedule
review and publication remain disabled. This change applied no migration and
enabled no write flag. PR #24 remains Draft and Production is unchanged.

The migration sources remain pinned to `18f4bfe`: the new UI commit changes none
of them. After the SQL gates pass, enable the three branch-specific flags below
and redeploy the latest verified review head. Do not reapply the older navigation
patch. See [live deployment evidence](live-lms-preview-2026-10-28.json).

### Earlier connection verification

The connected Vercel plugin verified the current branch alias points to READY
deployment `dpl_7EXSFr9Vqr4ZFUEkHB96jzq64hRZ` at the pinned PR head. Its deployed
browser bundle contains `eyphkkginlgoaxflauog.supabase.co`. Preview Supabase
variables have Preview scope; the plugin omits their sensitive values, so this
does not independently verify the service key's project association or later
encrypted configuration changes. No environment variable was changed.

The original navigation patch passed 12 navigation/access checks but the GitHub
plugin returned HTTP 403. Publication was subsequently completed through the
existing Git SSH identity, together with guarded setup-state editors. The updated
change passes 50 targeted checks (14 navigation/access, 19 template and 17 batch),
targeted lint, TypeScript and the webpack build. The older workspace branch was
not modified; source publication used an isolated checkout of the exact PR head.

After staging checks and patch publication pass, add these values to project
`ace-club-lms` (`prj_2lW0zANcAnI81eURRZrJTMSCxuLr`), **target Preview, Git branch
`intern/v2-phase-2-review` only**, then redeploy that exact commit as Preview:

```text
V2_TEMPLATE_AUTHORING_ENABLED=true
V2_BATCH_AUTHORING_ENABLED=true
V2_STUDENT_SCHEDULE_ENABLED=true
```

All three flags were absent when inspected. Preserve global Preview settings,
other branches, Production variables, Production aliases and Production releases.
Verify the new immutable Preview URL, commit, staging host and enabled behavior.
Never promote it to Production.

Complete authenticated acceptance using dedicated QA identities and data:

- Phase 1: current-candidate Admin/Student/signed-out access, catalogue/quotes,
  cross-student purchase/grant isolation and preserved legacy access. Historical
  screenshots do not establish the new candidate's result. Retain browser-probe
  origin guards; only use a probe whose approved allowlist includes the tested URL.
- Phase 2: save/reopen complete course templates, independent batch creation,
  preview/publish/edit/unpublish/republish, private meeting denial for Students,
  and unsaved-draft navigation guards.
- Student schedules: active entitlement plus explicit enrollment plus latest
  published state; deny other batches, unenrolled users, expired/revoked access
  and signed-out users. Use designated fixtures, not real purchases or records.

Keep PR #24 Draft until the hosted acceptance record is complete. Existing
materials remain untransferred. To disable a problematic rollout, set only these
branch-specific Preview flags to `false` and redeploy Preview; retain additive
schema and history for investigation. No destructive database rollback is included.

## Local packet verification

Rebuild with `python3 deliverables/phase2-preview-activation/prepare-sql-editor.py`;
it verifies pinned source hashes before generating anything. Check packet hashes
against [checksums.json](sql-editor/checksums.json) before editing acknowledgements.
Run `node deliverables/phase2-preview-activation/verify-sql-editor.mjs` for the
disposable Unix-socket-only PostgreSQL tests. See
[nine passing checks](sql-editor/local-verification.json). These tests are neither
a staging backup rehearsal nor hosted acceptance.

## Latest UI refinement

The wireframe styling is live in the same LMS Preview at `5398aad`. See
[deployment evidence](wireframe-ui-refinement-2026-10-28.json). This changes no
staging SQL, feature flags or publication readiness; the setup steps above still apply.
