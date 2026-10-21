# V2 staging database review

Date: 21 October 2026

Scope: PR #23 and PR #24; read-only investigation

Status: Source and GitHub evidence verified; staging database inspection blocked by unavailable database access

**The installed/missing migration list and staging schema compatibility remain
unverified.** No staging SQL connection or connected Supabase inspection tool is
available in this workspace. Website Admin access does not provide database
catalogue or migration-ledger access. No migration application is recommended
until the database evidence below is available and reviewed.

Both PRs remain open, Draft and unmerged. Phase 1 requires separate approval
before staging application. Phase 2 requires its own approval after Phase 1
passes staging verification. The [sanitized evidence manifest](staging-database-inspection-2026-10-21.json)
records source hashes, PR metadata, CI jobs and deployment identifiers.

## 1. Installed and missing migrations

Expected staging project reference: `eyphkkginlgoaxflauog`, from the earlier
Preview diagnostic. The current deployments' backend configuration has not been
independently inspected. Project identity must be checked before connecting.

| Version | Phase | Recorded in staging ledger | Expected definitions in staging |
|---|---|---|---|
| `20261018090000` | 1 | Unverified | Unverified |
| `20261019090000` | 2 | Unverified | Unverified |
| `20261019100000` | 2 | Unverified | Unverified |
| `20261019110000` | 2 | Unverified | Unverified |
| `20261020090000` | 2 | Unverified | Unverified |
| `20261020100000` | 2 | Unverified | Unverified |

Confirmed present: none established by this inspection. Confirmed missing: none
established by this inspection. These statements do not mean the migrations are
absent.

The supplied decision document reports an earlier ledger endpoint of
`20260925100000`; that is supplied information, not a fresh ledger read. The
earlier public catalogue probe returned HTTP 404 / `PGRST205`, and the quote check
did not run. That result establishes API catalogue unavailability at that time,
not the cause or the complete migration state.

Supabase tracks applied versions in `supabase_migrations.schema_migrations`.
The ledger and actual objects must be reconciled: an object created manually can
exist without a corresponding ledger entry. No ledger repair is authorized.
See [Supabase migration tracking](https://supabase.com/docs/guides/deployment/database-migrations#how-migration-tracking-works).

## 2. Migration checksums at the submitted commits

PR #23 head: `d3020c1c9916c17f6ced27f83ff9ee1be05479f2`

PR #24 head: `c8978a107dc209de4eff6e03b1a2773442b44d49`

SHA-256 was calculated from the raw Git blob at each verified PR head, without
newline normalization. The Phase 1 file is byte-identical in PR #24. The PR diffs
add exactly one Phase 1 file and five Phase 2 files under `supabase/migrations/`;
no historical migration is modified by those diffs.

| PR | File under `supabase/migrations/` | SHA-256 |
|---|---|---|
| #23 | `20261018090000_add_v2_product_entitlements.sql` | `ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7` |
| #24 | `20261019090000_add_v2_template_drafts.sql` | `ae9729e49c76f25e43320060da2fc35c3ba94e02e48ee782c7a5023a4eac0ec2` |
| #24 | `20261019100000_add_v2_batch_drafts.sql` | `b484762434a2395435a91ab71951ff48a59726d706b1bcb2c79f4ffc2ae31aff` |
| #24 | `20261019110000_add_v2_private_meeting_drafts.sql` | `89cfe129ec70c3e0d6c9664bc1f763a50ff4a08544ecc9121ac35229e25f956d` |
| #24 | `20261020090000_add_v2_outline_schedules.sql` | `a5cc7b5588515a0d13f699031e731e9cf578d18014ca228b120607a0b6c9111b` |
| #24 | `20261020100000_add_v2_batch_publication.sql` | `b4d6ded4e51471da9b4fc64e237d3f0cdcb296fff0c55358b95a6d548dfbd9d6` |

These are source-file checksums, not checksums of SQL proven to have run on
staging. A matching version identifier alone does not establish identical SQL.

## 3. Staging schema compatibility

**Result: unverified.** Source review establishes the following requirements;
it does not establish their presence in staging.

| Area | Required comparison before application |
|---|---|
| Legacy profiles | `public.profiles.id` is a UUID primary/unique key suitable for foreign keys; `role` supports `admin` and `student`; `is_active` is boolean. Existing definitions and policies must support the authorization queries. No profile rows need to be exported. |
| Authorization | `auth.uid()` returns UUID; `public.is_portal_admin()` returns boolean and enforces the intended active Admin rule. Inspect ownership, function definitions and execution permissions. |
| Database facilities | Roles `anon`, `authenticated`, `service_role`; PL/pgSQL; UUID generation; JSONB; stored generated columns; expected PostgreSQL date/time behavior. Confirm the running version and applicable privileges. |
| Phase 1 objects | Four tables: `v2_products`, `v2_price_versions`, `v2_purchases`, `v2_product_grants`. Compare columns, types, defaults, generated expiry expression, nullability, primary/unique/foreign/check constraints, indexes and the immutable-price trigger. |
| Phase 1 configuration | Four product scopes and four initial price revisions. Seed inserts skip conflicting IDs/codes; existing rows therefore require a read-only comparison of public catalogue/pricing fields. Never infer matching values from successful SQL execution. |
| Phase 1 security | RLS policies, effective table/column privileges and function privileges match the source. Purchase grants are restricted to the service integration; browser roles cannot write purchase/grant tables. Verify every helper as well as the four public RPCs. |
| Phase 2 objects | Six additional tables: `v2_course_templates`, `v2_course_template_revisions`, `v2_live_batches`, `v2_live_batch_revisions`, `v2_batch_meeting_revisions`, `v2_batch_publication_revisions`. Compare revision keys, deferred current-revision foreign keys, request uniqueness and private-history constraints. |
| Phase 2 security and definitions | Admin-only policies and checked RPCs; no direct client writes. Compare all helper definitions, overloads, owners, security mode and search paths. The outline migration replaces template, batch and meeting routines without adding a new table. Table presence cannot detect whether this migration is applied. |
| Drift and side effects | Check unexpected policies, grants, column grants, role inheritance, triggers, dependent objects and DDL event triggers. Existing objects or custom triggers may change the effect of otherwise additive SQL. Stop for reconciliation if definitions differ. |

There are ten expected V2 tables after both phases. Existing read-only preflights
cover object presence, RLS enablement and selected privileges, but do not prove
full definition equivalence. `IF NOT EXISTS` is not a schema-drift validator.
The Phase 1 expiry expression uses six UTC calendar months and access is denied
at the expiry instant; confirm this exact definition during review.

### Read-only evidence needed

An authorized operator can provide the following, or a scoped read-only
connection can be configured securely in the workspace. Passwords, service keys,
connection URLs and student/course rows must not be included in the report.

1. Confirm the project reference and current Preview-to-staging mapping through
   the approved dashboard/configuration view. A database name such as `postgres`
   is insufficient evidence of environment identity.
2. Run [the Phase 1 preflight](../../../scripts/v2-phase-1-schema-preflight.sql)
   and [the combined preflight](../../../scripts/v2-schema-preflight.sql).
   Both use read-only transactions, short timeouts and `ROLLBACK`; neither
   invokes application RPCs nor reads student, purchase, meeting or draft rows.
3. If the ledger exists and access permits, execute the query below. If access
   fails, record the error without modifying permissions or creating the ledger.
4. Inspect relevant `pg_catalog` metadata for the comparisons above, including
   `pg_attribute`, `pg_attrdef`, `pg_constraint`, `pg_index`, `pg_policy`,
   `pg_trigger`, `pg_proc`, role memberships and default privileges. Review
   function/policy definitions privately against the pinned source, and return
   a match/difference result with sanitized details. Do not export arbitrary
   function bodies or stored migration statements that might contain secrets.
5. Read only public product/price configuration fields if the Phase 1 tables
   exist. Record unexpected configuration without repairing or reseeding it.

```sql
begin read only;
set local statement_timeout = '5s';
set local lock_timeout = '2s';
select version
from supabase_migrations.schema_migrations
where version in (
  '20261018090000', '20261019090000', '20261019100000',
  '20261019110000', '20261020090000', '20261020100000'
)
order by version;
rollback;
```

The query is prepared, not executed. No business RPC should be called merely to
check whether it exists. PostgreSQL read-only transactions reject ordinary
persistent data and schema writes; use them with the restricted metadata queries
above. See [PostgreSQL transaction access modes](https://www.postgresql.org/docs/current/sql-set-transaction.html).

Classify each migration as verified applied only after ledger and definitions
agree. Classify it as missing when its ledger entry is absent and the database
matches the known state before that migration. For the outline migration, compare
the earlier function bodies with the replacements; table absence is not the test.
Any unexplained mismatch requires review, not automatic replay.

## 4. Proposed migration order

This is a dependency plan, not an execution authorization. Apply only confirmed
missing, reviewed files after the appropriate separate approval.

| Stage | Version | Dependency and purpose |
|---|---|---|
| Phase 1 only | `20261018090000` | Verified profiles/auth contracts; products, prices and entitlements |
| Stop | — | Verify Phase 1 in staging and obtain acceptance plus separate Phase 2 approval |
| Phase 2 step 1 | `20261019090000` | Phase 1 products; template drafts and revisions |
| Phase 2 step 2 | `20261019100000` | Template revisions; independent batch drafts |
| Phase 2 step 3 | `20261019110000` | Batch revisions; private meeting drafts |
| Phase 2 step 4 | `20261020090000` | Template/batch/meeting functions; undated outlines and live schedules |
| Phase 2 step 5 | `20261020100000` | Final schedule format; reviewed publication revisions |

Do not run a blanket migration push/reset against the historical directory.
Reconcile older ledger entries and dependencies first. If any file changes,
refresh the checksum, CI, deployment evidence and approval scope.

## 5. Recovery and rollback plan

No recovery operation is authorized or executed by this report. Before any later
application, record an approved operator, target project, migration checksum,
restore point and recovery procedure.

| Situation | Planned response |
|---|---|
| Before application | Verify an available staging backup and its timestamp/coverage. Arrange a restore rehearsal in an approved isolated target, preserving private backups outside Git. Capture the relevant pre-change schema, ledger and permissions. Backup availability and restoration have not yet been verified. |
| Error before a file commits | Stop immediately. Each of the six source files has explicit `BEGIN`/`COMMIT`. Roll back an open failed transaction; re-read metadata before retrying. A previous successfully committed file is not undone by a later file's failure. |
| Connection lost near commit | Treat the outcome as unknown. Reconcile object definitions and ledger before deciding whether a retry is safe. Do not blindly rerun SQL or mark a version applied. |
| Application issue after commit | Keep/revert the staging Preview to a previously verified compatible build. Keep Phase 2 authoring flags off. Preserve additive V2 tables and audit/revision history while reviewing a corrective migration. This is application containment, not a database rollback. |
| Authorization defect after commit | Stop affected testing and involve the authorized database operator. Feature flags do not revoke RPC permissions. Any temporary restriction or permission correction requires explicit approval and a record of previous privileges. |
| Schema correction required | Prepare a reviewed forward correction against observed state. The outline migration replaces earlier functions; replaying old definitions can reject or misinterpret newer documents. Do not use guessed inverse SQL, `DROP ... CASCADE`, a shared database reset or deletion of grant/history rows. |
| Restoration required | Obtain separate approval, restore into an isolated target first and validate the restored state. Account for all changes since the backup before any shared-target recovery. Do not overwrite newer student/course records as a routine rollback. |

Backup/PITR availability must be checked for the actual staging project. Supabase
database backups do not include Storage API file contents, and restoring a shared
project entails downtime and possible loss of changes after the restore point.
See [Supabase backup and restoration limits](https://supabase.com/docs/guides/platform/backups).

Phase 1 verification after an approved application must cover catalogue/prices,
restricted grants, retry behavior, two-Student isolation, expiry/revocation and
legacy compatibility. Synthetic fixture creation needs its own permitted setup
scope; no fixture or existing record was changed during this inspection.

## 6. Exact Previews, commits and test evidence

GitHub deployment metadata was read on 21 October. These are deployment-specific
URLs, not moving branch aliases.

| PR | Deployed source commit | Exact LMS Preview |
|---|---|---|
| [#23](https://github.com/theadmitco-tech/ace-club-lms/pull/23) | `d3020c1c9916c17f6ced27f83ff9ee1be05479f2` | [Phase 1 Preview](https://ace-club-a8go51h46-theadmitco-techs-projects.vercel.app) |
| [#24](https://github.com/theadmitco-tech/ace-club-lms/pull/24) | `c8978a107dc209de4eff6e03b1a2773442b44d49` | [Phase 2 Preview](https://ace-club-ga4ano6dk-theadmitco-techs-projects.vercel.app) |

Deployment-to-commit evidence:
[Phase 1 deployment](https://api.github.com/repos/theadmitco-tech/ace-club-lms/deployments/7205281286/statuses)
and [Phase 2 deployment](https://api.github.com/repos/theadmitco-tech/ace-club-lms/deployments/7206331884/statuses).
Both report successful LMS deployment. Neither current Preview was authenticated
or functionally tested during this read-only review, and their current Supabase
mapping remains unverified.

| CI evidence | Result and exact tested checkout |
|---|---|
| [PR #23 Verify run](https://github.com/theadmitco-tech/ace-club-lms/actions/runs/39457613372) | Passed on 20 October: lint, Phase 1 tests, TypeScript and build. Checkout log: `7c5212db8b062f1e3e6e49b5a05fa72c3d683d47`, the synthetic PR merge commit for the submitted Phase 1 head/base. |
| [PR #24 Verify run](https://github.com/theadmitco-tech/ace-club-lms/actions/runs/39465739150) | Passed on 20 October: lint, Phase 1 and Phase 2 tests, TypeScript and build. Checkout log: `1a01f4ad0ee360d03ba6e51698f8aa51672dca84`, the synthetic PR merge commit for the submitted Phase 2 head/base. |

Synthetic merge commits used by CI do not mean either PR was merged. No CI job
was rerun for this report. The separate `ace-club-flexible-mocks` Vercel status
is **failed on both source heads**; its cause and release impact remain unresolved.
The PR #24 description's broad claim that GitHub checks passed does not account
for that failure. No PR text was edited during this read-only task.

Earlier user-observed Admin/Student sign-in and role navigation used
`https://ace-club-1vr3qxhtk-theadmitco-techs-projects.vercel.app`, associated with
`3207cba41b0561ef78c0adf5a44302d753d48bdb`. The catalogue probe failed with
`PGRST205`; complete Phase 1 staging verification did not pass. See
[historical browser evidence](../phase-1/evidence/preview-and-access-2026-10-19.md).
Those observations do not verify either current candidate. Local browser QA on
`171efd2` is also separate and is not included in PR #24.

## 7. Change boundary and next action

For this review: no Production service was contacted, no hosted database
connection was opened, no migrations were applied, and no existing student/course
rows were read or changed. No flags, deployment settings, PR descriptions, branch
contents or Draft status were changed on remote services. Neither PR was merged.
This confirms actions performed by this task; it is not an audit of other operators.

Files changed locally:

- `docs/v2/review/staging-database-inspection-2026-10-21.md`
- `docs/v2/review/staging-database-inspection-2026-10-21.json`
- `docs/v2/phase-2/review-and-release.md`

No application or migration source changed.
Verification includes recomputing all six Git-blob hashes, checking the inherited
Phase 1 file, reviewing migration dependencies/transaction boundaries, and reading
exact-head CI and deployment metadata. JSON parsing, 19 relative documentation
links and the added-content name/credential-pattern checks passed. The SQL
inspection remains unexecuted.

**Next required input:** scoped read-only staging access, or sanitized results
from the operator steps in section 3. Complete the installed/missing matrix and
schema comparison before requesting approval to apply the single Phase 1
migration. Keep both PRs Draft. Phase 2 remains on hold until Phase 1 passes staging
verification and separate Phase 2 approval is recorded.
