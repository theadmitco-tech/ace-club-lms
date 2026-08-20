# Pilot V2 Phase 1 Local Verification — 17 August 2026

Status: Passed locally; staging migration and account-dependent acceptance pending
Source: Uncommitted `codex/pilot-v2` working tree based on `c3bc1851553d44aaa48c88f542e64bf9ae68da1d`

## Scope verified

- additive versioned template, revision, Section, event and reusable-resource schema;
- exactly four stable template identities;
- current 31-event `mvp-2026` Master Course snapshot behavior;
- 6-event CR, 6-event RC and 5-event DI crash-course seeds;
- consecutive 8:00–9:00 PM IST crash-course timing and confirmed instructors;
- Admin-only RLS/grants and server-authorized mutation boundary;
- immutable revision creation with expected-revision protection;
- structured Admin editor, complete preview and actionable validation;
- no template recording or private Session-material category; and
- no change to existing batch tables or rows in the Phase 1 migration.

## Results

| Check | Result |
|---|---|
| Focused template tests | Pass — 4/4 |
| Existing recommendation tests | Pass — 7/7 |
| Existing Session-material tests | Pass — 4/4 |
| TypeScript `npx tsc --noEmit` | Pass |
| Targeted touched-file ESLint | Pass — zero findings |
| Next.js 16.2.4 Production build | Pass; `/admin/templates` is a dynamic server-rendered route |
| `git diff --check` | Pass |
| Isolated PostgreSQL-compatible migration execution | Pass |
| Seed counts in isolated execution | 4 templates, 4 initial revisions, 48 events and the expected synthetic Master-resource association |
| Revision mutation probe | Pass — second CR revision created while Revision 1 remained present |
| Full repository ESLint | Known baseline remains: 22 errors and 2 warnings, all outside Phase 1-touched files |

The Node test runner reports the repository's existing module-type performance warning for TypeScript imports. It does not fail the tests and is not a Phase 1 behavior finding.

## Migration verification method

Docker/Postgres is not installed in this worktree environment, so the Supabase local stack could not be started. The migration was instead executed from start to finish against an isolated in-memory PostgreSQL-compatible PGlite database with:

- `auth.users`, `auth.uid()`, `is_portal_admin()`, `master_sessions` and `master_materials` compatibility fixtures;
- exactly 31 active synthetic `mvp-2026` Master events;
- one reusable Master pre-read; and
- `anon` and `authenticated` roles.

The probe then called `create_course_template_revision` and verified the immutable history count. This proves SQL parsing, constraints, seeds and revision transaction behavior locally; it does not replace Supabase staging RLS, advisor or authenticated browser evidence.

## Authorization and environment state

- No staging or Production database, migration ledger, storage object, environment variable, Preview or deployment was changed.
- `20260817090845_add_versioned_course_templates.sql` exists only in the local working tree and is not applied or ledgered anywhere.
- `20260804120000_realign_weekly_course_schedule.sql` was not applied, repaired, marked as applied or reused.
- No fixture identity, credential, private Student data, signed URL or private object path is recorded here.

## Remaining staging gate

Before Phase 1 product acceptance, separately authorize and perform:

1. exact staging migration dry run and application;
2. schema, grant, RLS and advisor checks;
3. authenticated Admin list/editor/preview/save and stale-revision journeys;
4. invalid-structure denial and signed-out/Student denial;
5. existing-batch aggregate comparison before and after an edit; and
6. supported desktop, keyboard and 200% zoom review.
