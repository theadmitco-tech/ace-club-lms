# Phase 1 — Recovery and Audit

Status: **Production inventory and staging baseline reconciled; live authentication verification pending**

Audit baseline:

- Repository: `theadmitco-tech/ace-club-lms`
- Audited commit: `1e7d77d7e323db8175a446cc3935130fc3ab5479`
- `HEAD`, local `main`, and `origin/main` matched at audit time.
- The only untracked path was `instruction/`, containing the supplied roadmap and acceptance criteria.
- Stack: Next.js 16.2.4, React 19.2.4, Supabase SSR 0.10.2, Supabase JS 2.104.1.
- Local dependencies install and development startup passed on 31 July 2026.
- Staging Supabase project created: `ace-club-lms-staging` (`eyphkkginlgoaxflauog`).
- Production Supabase project identified: `owmlxsnzogfapotmjrqk`; it remains separate.
- Production build passed on 31 July 2026; lint reported 47 errors and 10 warnings.
- Staging inventory captured on 31 July 2026. It contains only Supabase-managed storage tables; the public LMS schema, policies, functions, triggers, and buckets are empty.
- Production inventory captured on 31 July 2026. It contains 19 public LMS tables, 43 policies, 15 public functions, 5 application triggers, no storage buckets, and no cron table.
- Obsolete credential-bearing scratch scripts were removed. Lint is now 41 errors and 10 warnings; the product owner approved the scoped legacy deferral on 31 July 2026.
- A protected Vercel Preview is deployed with staging Supabase. Vercel Production is configured for production Supabase, but its two listed deployments predate the corrected mappings and authorization containment.

## Exit-gate status

| Required output | Status | Evidence or remaining action |
|---|---|---|
| Feature inventory | Complete | Inventory below |
| Database map | Complete | Production-derived baseline applied to staging; post-apply inventory matches production object-for-object |
| Authentication diagnosis | Static diagnosis complete | Staging magic-link and deactivation tests remain |
| Validated estimate | Provisional | Finalise after live database and staging checks |

### Lint disposition

Evidence: [lint classification](evidence/lint-classification-2026-07-31.json).

Six lint errors came from two obsolete scratch scripts containing hard-coded test credentials, a private email address, and service-role operations. Those scripts were removed.

The remaining 41 errors and 10 warnings are concentrated in legacy pages that roadmap Phases 2–7 will repair, adapt, or replace:

- 31 explicit `any` errors;
- 8 effect/state refactor errors;
- 2 unescaped-entity errors;
- 10 unused-variable or dependency warnings.

Approved scoped disposition: keep lint enabled, permit no new findings, resolve affected-file findings when each page is changed, and require a clean lint run before launch.

Phase 2 should not begin until the critical privileged-route exposure is confirmed and contained in the deployed environment.

## Source and configuration recovery

The editable source and Git history are available. No `.env*`, `vercel.json`, middleware/proxy, ordered Supabase migration directory, or automated test suite is committed.

Environment-variable names referenced by the application:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `RAZORPAY_WEBHOOK_SECRET`

Never record values for these variables in this audit. Record only whether each variable is present in local, staging, and production environments.

## Feature inventory and disposition

| Area | Current implementation | Decision | Target phase |
|---|---|---|---|
| Application shell and styling | Next.js App Router with shared public, student, and admin UI | Keep | — |
| Student/Admin roles | `admin` and student` application roles | Keep | 2 |
| Magic-link login | Supabase OTP sign-in exists | Repair | 2 |
| Password login | Public password tab remains | Remove from production | 2 |
| Quick Access/Test credentials | Hard-coded student/admin credentials and “Super Admin” label | Remove from production | 2 |
| Admin access control | Client-side layout redirect | Repair with server-side enforcement | 2 |
| Student access control | Client-side redirects plus RLS-dependent reads | Repair | 2 |
| Admin user invitation | Service-role API creates/invites and enrolls users | Repair urgently | 2 |
| User deletion | Service-role API deletes authentication users | Repair urgently; replace with deactivation for MVP | 2 |
| Courses/batches and sessions | Admin-editable course and session records | Adapt to fixed curriculum/cohort model | 3–4 |
| Master curriculum | Master sessions/materials exist | Adapt and reseed from revised curriculum | 3 |
| Notion pre-reads | Notion URL parsing, API fetch, and embedded rendering exist | Keep renderer; repair authorization/error reporting | 3–5 |
| PDFs/material storage | Public-URL upload and PDF material flow exist | Adapt; use private access and release checks | 3–5 |
| Release timing | Fixed IST times calculated in client-facing code | Replace with authoritative programme-time-zone timestamps | 4 |
| Student dashboard | Course/session overview exists | Adapt to next-action timeline | 5 |
| Native practice and grading | Answers, correctness, difficulty, ranking, and targets | Remove from MVP interface | 6–7 |
| Worksheet tracking | Attempts and daily aggregate logs exist | Replace with student–worksheet–question manual records | 6 |
| Admin analytics | Ranking, accuracy, on-track/behind metrics | Replace with MVP totals and question-level tracker view | 7 |
| Public registration/payments | Registration and Razorpay routes/tables exist | Isolate; not required by current LMS acceptance criteria | Separate scope decision |

## Route and access map

| Route group | Intended access | Current enforcement | Audit result |
|---|---|---|---|
| `/`, `/register`, `/payment/*` | Public | Public | Expected, but outside core LMS acceptance path |
| `/login` | Public | Public | Contains production-excluded password and Quick Access controls |
| `/dashboard` | Student | Client redirect and database policies | Insufficient as the only route boundary |
| `/session/[id]` | Enrolled Student | Client redirect; reads session by ID | Enrollment and release enforcement must be moved server/database side |
| `/session/[id]/material/[materialId]` | Enrolled Student after release | UI availability checks | Direct-URL protection requires authoritative server/RLS checks |
| `/admin/*` | Admin | Client-side admin layout redirect and RLS | UI redirect is not an authorization boundary |
| `/api/admin/bulk-enroll` | Active Admin | Server verifies session, profile state, and Admin role before service-role use | Local containment complete; deployment pending |
| `/api/admin/delete-user` | Active Admin | Server verifies session, profile state, and Admin role before service-role use | Local containment complete; deployment pending |
| `/api/notion` | Enrolled Student/Admin after release | No caller, enrollment, or release check | **High** |
| `/api/register/*`, payment APIs | Public | Input/signature logic varies by route | Review separately if retained |

No repository middleware or proxy currently centralises session refresh or protected-route authorization.

## Repository database map

The SQL files declare 22 public tables:

`profiles`, `courses`, `sessions`, `materials`, `enrollments`, `master_sessions`,
`master_materials`, `practice_sets`, `practice_questions`, `practice_attempts`,
`master_practice_sets`, `master_practice_questions`, `master_practice_attempts`,
`master_worksheet_plans`, `master_worksheet_session_rules`,
`worksheet_daily_targets`, `student_worksheet_logs`, `questions`,
`question_sets`, `set_questions`, `registrations`, and `payments`.

They also declare authentication/profile triggers and worksheet/statistics functions. No scheduled job definition was found in the repository.

The repository is not a trustworthy migration history:

- `schema.sql` is a combined snapshot using several unconditional `CREATE TABLE`, `CREATE POLICY`, and `CREATE TRIGGER` statements.
- Standalone `supabase_*.sql` files repeat and modify parts of that snapshot.
- There is no ordering, migration ledger, rollback, or proof that every script was applied to the deployed project.

Therefore, the live Supabase result from `supabase-inventory.sql` is the database authority for Phase 1.

### Production reconciliation — 31 July 2026

Evidence: [production Supabase inventory](evidence/production-supabase-inventory-2026-07-31.json) and [production schema definitions](evidence/production-schema-definitions-2026-07-31.json).

- All 19 production public tables have RLS enabled; none force RLS.
- The 19 tables overlap the repository schema. The repository-only `questions`, `question_sets`, and `set_questions` tables are not deployed.
- Production adds `profiles.is_active`, `profiles.invited_at`, and `profiles.activated_at`, which are absent from repository SQL.
- Production has five public functions absent from repository SQL: `can_access_course`, `is_active_portal_user`, `is_portal_admin`, `mark_own_account_active`, and `rls_auto_enable`.
- Production policies are materially hardened beyond the repository snapshot for profile privacy, active-user checks, enrollment-based course access, sessions, and materials.
- Production has no storage buckets and no cron table. Its database time zone is UTC.
- The supplemental inventory captures 77 constraints, 40 indexes, all 15 function bodies, and all 5 trigger definitions. Production has no public views or enum types.
- The ordered baseline is [20260731051000_production_baseline.sql](../../supabase/migrations/20260731051000_production_baseline.sql). Static reconciliation confirms all 19 tables, 77 constraints, 40 indexes, 15 functions, 43 policies, and 5 triggers are represented.
- The baseline applied successfully to the empty staging project on 31 July 2026. The post-push Docker warning affected only local catalog caching.
- The [post-baseline staging inventory](evidence/staging-supabase-inventory-post-baseline-2026-07-31.json) matches production for tables, columns, foreign keys, policies, triggers, functions, extensions, storage buckets, cron presence, and database time zone.

Do not apply `schema.sql` or the standalone `supabase_*.sql` files to staging. They would omit production-only account/RLS behaviour and add undeployed question-bank objects.

## Authentication and security diagnosis

### Critical

1. At the audited commit, `/api/admin/bulk-enroll` constructed a service-role client before verifying the caller. Local containment now requires an active Admin session before service-role use; deployment and positive-role verification remain.
2. At the audited commit, `/api/admin/delete-user` used the service role without verifying the caller. The same local containment now protects this route; deployment and positive-role verification remain.
3. The bulk-enrolment rate-limit fallback creates confirmed users with a shared hard-coded password.

### High

1. Repository RLS permits universal reads of profiles, courses, sessions, materials, practice content, and master content.
2. Material release is primarily calculated in browser-facing code and is not an authoritative data-access boundary.
3. `/api/notion` accepts a page ID without authenticating the caller or checking enrollment/release.
4. Material uploads return public storage URLs; the live bucket configuration must be checked.
5. Protected pages rely on client redirects. This can hide UI but cannot replace server/API/RLS authorization.

### Medium

1. Production password login, Quick Access buttons, hard-coded test credentials, and “Super Admin” wording conflict with the MVP.
2. No account-active/deactivated field is present in the repository profile model.
3. Magic-link redirect configuration is split between `window.location.origin`, `NEXT_PUBLIC_SITE_URL`, and a localhost fallback.
4. There are no automated authentication, privacy, release-boundary, or direct-URL tests.

## Gap register

| ID | Gap | Severity | Required disposition |
|---|---|---:|---|
| P1-01 | Privileged admin APIs lacked caller authorization | Critical | Contained locally; deploy and verify before closure |
| P1-02 | Shared fallback password and public test credentials | Critical | Remove in Phase 2 |
| P1-03 | Repository SQL is not an ordered migration history | High | Export live schema, reconcile, then establish migrations |
| P1-04 | Public/select RLS conflicts with enrollment and release boundaries | High | Redesign and cross-student test in Phase 2/4 |
| P1-05 | Release checks are client-side/fixed-time logic | High | Store release timestamps and enforce server/RLS-side |
| P1-06 | Notion endpoint lacks auth/enrollment/release validation | High | Repair before content journey |
| P1-07 | Storage public/private state is unknown | High | Verify live buckets; use signed/private access where required |
| P1-08 | No deactivation model | Medium | Add active/access state and test reactivation |
| P1-09 | Current tracker implements excluded automated analytics | Medium | Replace incrementally in Phase 6–7 |
| P1-10 | No automated test harness | Medium | Add focused auth/RLS/release/tracker tests as work proceeds |
| P1-11 | Public registration/payment scope is not resolved | Medium | Product owner decides keep/separate/remove |

## Provisional delivery estimate

These ranges replace the original estimate until live verification provides contrary evidence.

| Phase | Provisional range | Main reason |
|---|---:|---|
| 2 — Accounts and authorization | 4–6 working days | Privileged API, RLS, redirects, deactivation, and staging setup |
| 3 — Master course | 4–6 working days | Schema reconciliation and fixed curriculum import |
| 4 — Cohorts/releases | 5–8 working days | Authoritative scheduling, time zones, and direct-URL protection |
| 5 — Student experience | 4–6 working days | Timeline/next-action adaptation |
| 6 — Tracker | 6–9 working days | New manual per-question persistence and privacy model |
| 7 — Admin progress | 4–6 working days | New aggregates and authorised drill-down |
| 8 — Pilot/stabilisation | 1–2 weeks | End-to-end, privacy, mobile, and boundary testing |

Planning range: approximately **6–8 engineering weeks plus 1–2 weeks of pilot/stabilisation** for one full-stack engineer, with explicit QA and product acceptance.

## Phase 1 completion decision

The static audit and local recovery portions of Phase 1 are complete. The exit gate remains **conditional** until lint/build, live database inventories, staging authentication, release protection, and privacy probes pass. After those inputs are reconciled, this document can be marked complete without repeating the source audit.
