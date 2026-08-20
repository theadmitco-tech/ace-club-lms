# Pilot V2 Phase 7 — Read-only Production Preflight

Status: Complete; snapshot recovery verified
Date: 20 August 2026
Production project: `owmlxsnzogfapotmjrqk`

## Authority and result

The Product Owner authorized the read-only preflight in the [conditional release plan](../production-release-plan-2026-08-20.md). No merge, migration application, deployment, environment change, fixture or Production data change occurred.

The source, verification, Vercel, ledger, schema, authorization, aggregate, exact migration dry-run and manual snapshot recovery checks pass. Production release authorization remains blocked until:

1. the Phase 7 documentation-only working tree is reviewed, committed and frozen as an exact clean tip;
2. a fresh encrypted snapshot is taken immediately before any authorized migration; and
3. the Product Owner gives exact authorization for the separately controlled Production release.

## Source and local verification

| Check | Result |
|---|---|
| `origin/main` | `c3bc1851553d44aaa48c88f542e64bf9ae68da1d` |
| Accepted application | `547581efccf74300f3902df024db8bf47a27fa25` |
| Remote branch tip | `874235fc8ee0750e25762ffb2087f96efb7ddb7d` |
| Post-accepted committed changes | Documentation only |
| Working tree | Not clean: Phase 7 plan/status/evidence documentation only |
| Seven migration checksums | Match the release plan and Staging |
| Pilot V2 suite | Pass — 46/46 |
| Touched-file ESLint | Pass — zero findings |
| TypeScript | Pass |
| Guarded Next.js 16.2.4 Production build | Pass — exact Production host/origin guard |
| `git diff --check` | Pass |

No application, migration, dependency or configuration change exists after the accepted application commit.

## Vercel and environment separation

| Check | Result |
|---|---|
| Accepted Preview | `dpl_5rfTN5pyze99mCPzHnuhNyHymsDU`, `READY`, Preview target, source `547581e` |
| Preview environment guard | Pass — Staging variables present and correctly separated |
| Current Production deployment | `dpl_8E58rULukrL5p4rpuR6VzsqXWXhf`, `READY`, source `c3bc185` |
| Production aliases | Production origin and expected Vercel/main aliases attached |
| Production environment guard | Pass — Production variables present and correctly separated |
| Required Production variable names/scopes | All four present in Production scope; values not read |
| Anonymous `/` and `/login` | `200 / 200` |
| Anonymous `/dashboard` and `/admin` | `307` to Login for both |

The current Production deployment remains the exact application rollback target.

## Supabase ledger and sanitized baseline

Production is `ACTIVE_HEALTHY` on Postgres 17.6.1. The ledger contains exactly the 16 expected baseline versions through the two Pilot V1 migrations. The three excluded versions and all seven Pilot V2 versions remain absent.

| Check | Result |
|---|---:|
| Courses / sessions / materials | `1 / 30 / 51` |
| Enrollments / tracker rows | `11 / 4,378` |
| Admin-owned tracker rows | `0` |
| Private course-material objects | `26` |
| V2 template tables present | `0` |
| Orphan sessions/materials/enrollments/tracker rows | `0 / 0 / 0 / 0` |
| Cross-course tracker relationships / schedule inversions | `0 / 0` |
| Public tables without RLS | `0` |

The `course-materials` bucket remains private with a 50 MB limit and PDF-only MIME allow-list. Sanitized current digests were captured for courses, schedule, materials, enrollment membership, tracker identity, constraints, indexes and policies for later exact comparison; no identities, rows or private paths were recorded.

The security advisor reports warnings only and no error/high/critical result. Its inherited warnings include anonymous-executable `SECURITY DEFINER` functions that retain internal authorization checks. The Pilot V1 trigger helper remains non-executable by `anon`/`authenticated`; Session-material save/remove remain denied to `anon` and granted only to `authenticated` with internal Admin authorization.

## Auth and recovery configuration

- Google is enabled; all other social/custom providers are disabled.
- Email Auth remains enabled as an inherited Supabase setting, but the portal exposes only Google sign-in.
- Public signups and anonymous sign-ins are disabled.
- Site URL is `https://aceclub.theadmitco.com`.
- The Production origin and callback are allow-listed.
- Production is on Supabase Free: scheduled backups are unavailable.
- Point-in-time recovery is unavailable and requires a paid add-on.
- The Product Owner selected an encrypted manual snapshot as the approved
  recovery method for this release.
- The snapshot includes roles, schema, data, Auth data, migration history and
  all 26 private Storage objects.
- Its private Google Drive copy matched the local archive SHA-256 exactly.
- An isolated Postgres 17.6.1 Supabase restore reproduced the 16-migration
  ledger and all sanitized baseline counts, with zero V2 tables, zero orphan
  rows and zero public tables without RLS.
- All 26 restored PDFs matched their source SHA-256 byte-for-byte; the bucket
  remained private and anonymous object access was denied.

This verifies snapshot recovery but does not provide continuous recovery. Any
writes after the snapshot remain outside it, so a fresh snapshot is mandatory
immediately before migration authorization.

## Exact non-applying migration dry run

Pinned Supabase CLI `2.114.0` ran from an isolated archive of source `874235f` with the three excluded migration files moved outside the migration directory.

`migration list` showed the 16 baseline versions matched locally/remotely and exactly seven local-only V2 versions. `db push --dry-run --skip-vault` reported no seeds or roles and exactly:

1. `20260817090845_add_versioned_course_templates.sql`
2. `20260817143000_add_batch_schedule_builder.sql`
3. `20260817170000_fix_batch_event_reorder.sql`
4. `20260817233540_fix_phase2_conflicts_and_shift_materials.sql`
5. `20260818113000_add_flexible_batch_resources.sql`
6. `20260818170000_add_student_portal_projection.sql`
7. `20260818173000_fix_student_portal_projection_compatibility.sql`

A post-dry-run ledger and aggregate query matched the preflight counts exactly; V2 tables remain absent. The temporary archive was deleted and cannot be recovered; it contained only tracked repository source.

## Decision

The technical dry-run and tested snapshot-recovery candidate pass, but the
release is not yet authorized. Review and commit the documentation-only Phase 7
tip, refresh the volatile subset—Git tip/status, Production deployment, ledger
and aggregates—take a fresh encrypted snapshot, then request exact Production
authorization. No merge, migration, deployment or Production mutation is
authorized by this evidence.
