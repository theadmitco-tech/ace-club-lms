# Pilot V1 Phase 4 — Staging Migration and Authorization Evidence

Date: 11 August 2026
Environment: Staging Supabase project only
Migration: `20260811170000_add_batch_session_materials.sql`
Application commit: `1a746ae`

## Result

The ordered Phase 4 migration applied successfully to staging through the signed-in Supabase SQL Editor. The SQL Editor returned `Success. No rows returned`. Production was not opened, queried or changed.

The migration was then recorded in `supabase_migrations.schema_migrations` with:

- version `20260811170000`;
- name `add_batch_session_materials`; and
- the applied migration text retained as one ledger statement.

## Rollback-only authorization probe

`docs/pilot-v1/phase-4-staging-authorization-probe.sql` ran successfully as one transaction and ended with `ROLLBACK`.

The probe exercised:

- active Admin create and remove operations;
- authoritative release from `session_end_at`;
- reusable Master-content rejection;
- cross-session file-reference rejection;
- Student management denial;
- active enrolled Student read after release;
- pre-release, unpublished, inactive, signed-out and cross-batch read denial; and
- signed-out management denial.

The SQL Editor returned the final probe statement without an exception. Raw identity-bearing output was not copied into evidence.

## Sanitized post-check

The post-check returned:

| Check | Result |
|---|---|
| Session-material shape constraint present | `true` |
| Unique private-file-reference index present | `true` |
| Admin save function present | `true` |
| Admin remove function present | `true` |
| Published-session material policy present | `true` |
| Persisted `session_material` rows | `0` |
| Persisted rollback-only probe courses | `0` |

The migration-ledger post-check returned version `20260811170000`, name `add_batch_session_materials`, and statement count `1`.

## Remaining Phase 4 exit item

The application commit had not yet been pushed or deployed when these database checks ran. Verify the Admin-authorized signed-upload endpoint and protected Student file delivery through the staging-backed Preview before marking Phase 4 complete.

No secret, authentication artifact, unrestricted private URL or Student data is recorded here.
