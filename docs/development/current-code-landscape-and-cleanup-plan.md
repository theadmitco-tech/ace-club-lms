# Ace Club LMS — Current Code Landscape and Cleanup Plan

Status: Archived — historical audit and cleanup snapshot
Owner: Engineering
Last updated: 31 August 2026

Superseded for current system orientation by: [Project Manual](../PROJECT_MANUAL.md) and [Current State](../CURRENT_STATE.md)

The audit below remains useful historical evidence. Its Git state, lint counts, continuation instructions, and cleanup priorities are not current authorization.

## Purpose and boundary

This document maps the repository after the Phase 2 sign-off, records cleanup candidates, and proposes how to integrate only necessary cleanup into Phase 3 and Phase 8 without weakening already verified behaviour.

This is an assessment, not cleanup authorization. No candidate in this document is approved for implementation or deletion merely because it is listed here. Phase 3 must not begin until the Product Owner supplies the approved revised curriculum and the team confirms the correct Git baseline.

Current update: the start-gate language and audit counts below are preserved as the 31 July snapshot. Phases 3–8 are signed off, and the Product Owner confirmed on 10 August 2026 that the MVP is live with real Students. Repository-wide lint still reports 22 errors and 3 warnings. Phase 8 closure does not authorize destructive database cleanup; unresolved cleanup remains post-MVP work requiring its own scope and verification.

Product scope remains controlled by the [MVP acceptance criteria](../../instruction/Ace_Club_LMS_MVP_Acceptance_Criteria.md), the [roadmap](../../instruction/Ace_Club_LMS_Product_Roadmap.md), and the [running handoff](../handoffs/ace-club-lms-running-handoff.md).

## Audit snapshot

- Repository inspected: `/Users/tanishagarg/Developer/ace-club-lms`
- Inspected worktree: clean at `822d053` on `agent/phase-2-recovery`
- Local `origin/main`: `1e7d77d`
- Signed handoff says Phase 2 was merged through `eaef0f3`, but objects `edd3766` and `eaef0f3` are not present in the local object database.
- Current stack from `package.json`: Next.js 16.2.4, React 19.2.4, Supabase SSR 0.10.2, Supabase JS 2.104.1.
- `npm run lint` reports 40 errors and 8 warnings. The signed Phase 1 disposition allows legacy findings to be repaired as files are touched but requires clean lint for launch.
- This audit used repository source and signed evidence only. It did not query or modify staging, Production, Vercel, Supabase, or Google configuration.

The Git mismatch is a start-gate issue, not proof that the handoff is wrong. Before implementation, fetch remote refs read-only, confirm the merge commits, update local `main`, and create the Phase 3 branch from the verified remote baseline. Do not build Phase 3 on the currently checked-out recovery branch by default.

## Protected working baseline

The following Phase 1–2 behaviour has signed evidence and should be treated as a non-regression boundary:

- Google-only authentication for controlled, pre-provisioned Admin and Student identities;
- server-side Admin and Student page boundaries and session refresh;
- Admin authorization before service-role operations;
- reversible student activation and deactivation;
- Notion access through an authenticated, RLS-visible material;
- enrollment, cross-student privacy, and future-material RLS protections;
- separate staging/Preview and Production Supabase configuration;
- deployment-environment validation and the mandatory Production preflight.

Cleanup should not rewrite `src/proxy.ts`, `src/lib/server/portalAuthorization.ts`, `src/lib/server/requireAdmin.ts`, the Supabase client factories, or the three signed migrations unless a failing probe demonstrates a defect. Client redirects in `AuthContext` and `AdminShell` may be redundant from an authorization perspective, but they still provide user-experience behaviour and are not an early cleanup target.

## Repository landscape

| Area | Primary locations | Current responsibility | Phase relevance |
|---|---|---|---|
| Product authority and continuity | `instruction/`, `docs/handoffs/`, `docs/phase-1/`, `docs/phase-2/` | MVP behaviour, roadmap gates, signed evidence, release safeguards | Protect throughout |
| Public and registration surface | `src/app/page.tsx`, `src/app/register/`, `src/app/payment/`, `src/app/api/register/`, duplicate root payment APIs, `src/lib/registration.ts` | Marketing, cohort registration, Razorpay reservation/payment | Outside current LMS acceptance path; decision required before removal |
| Authentication and portal boundary | `src/app/login/`, `src/app/auth/callback/`, protected layouts, `src/proxy.ts`, `src/lib/AuthContext.tsx`, `src/lib/server/` | Google authentication, session refresh, role checks, access denial, Admin API checks | Signed Phase 2 baseline |
| Admin shell and user access | `src/app/admin/AdminShell.tsx`, `src/app/admin/users/`, Admin API routes | Navigation, provisioning/enrollment, activation/deactivation | Keep stable |
| Master course | `src/lib/curriculum.ts`, `src/app/admin/curriculum/`, `master_sessions`, `master_materials`, `master_practice_*` | Hard-coded default curriculum plus editable database master sessions, materials, and auto-graded questions | Core Phase 3 fault line |
| Cohort/batch generation | `src/app/admin/courses/`, `src/app/admin/sessions/`, `courses`, `sessions`, `materials` | Creates batches, copies master rows, edits/reorders cohort sessions, pushes schedules | Phase 3 compatibility; Phase 4 ownership |
| Student course journey | `src/app/dashboard/`, `src/app/session/`, `src/lib/sessionAvailability.ts` | Enrollment lookup, session/material display, release labels, legacy/master practice fallback | Mainly Phases 4–6 |
| Worksheet and practice models | Admin curriculum worksheet editor, Admin worksheet dashboard, `src/lib/worksheetProgress.ts`, practice and worksheet tables/functions | Master auto-graded questions/attempts, legacy per-session practice, daily aggregate worksheet targets/logs | Does not yet match manual MVP tracker |
| Notion and files | `src/app/api/notion/route.ts`, material page, `src/lib/notion.ts`, `src/utils/supabase/storage.ts` | Protected Notion rendering; browser-side upload helper returning public URLs | Phases 3–5, with security constraints |
| Database history | `supabase/migrations/` | Production-derived ordered baseline plus release and account-control migrations | Authoritative schema path |
| Legacy database scripts | root `schema.sql` and `supabase_*.sql` | Overlapping snapshots and one-off feature scripts | Explicitly unsafe to apply as migrations |
| Import/conversion documentation | root `README.md`, three feature guides, `package.json` scripts | Describes question/PDF workflows whose referenced `scratch/` tools are absent | Broken operational surface |
| Styling and static assets | large route CSS files, `public/` | Existing design system and several unreferenced starter SVGs | Low-risk Phase 8 review only |

## How course data currently flows

There are three overlapping representations of the course:

1. `src/lib/curriculum.ts` contains a 16-session `DEFAULT_CURRICULUM`. It supplies fallback titles, category/worksheet inference, public-site curriculum content, and schedule generation.
2. `master_sessions` and `master_materials` store global database content. `master_sessions` currently has only `title`, `session_number`, and timestamps; it does not represent week, day, class type, instructor, or a stable curriculum version.
3. `courses`, `sessions`, and `materials` store cohort-specific copies. The Admin batch page creates sessions from `master_sessions` and copies `master_materials`. Student pages read these cohort rows.

Worksheet questions add three more models:

- deployed `master_practice_sets`, `master_practice_questions`, and `master_practice_attempts` support globally defined auto-graded questions;
- deployed `practice_sets`, `practice_questions`, and `practice_attempts` support older per-session auto-graded practice;
- deployed `master_worksheet_*`, `worksheet_daily_targets`, and `student_worksheet_logs` support daily aggregate attempted counts, ranges, accuracy, rank, on-track, and behind calculations.

The MVP instead requires fixed worksheet question rows with manual `Done` or `Come back for review`, optional time/comment, and system-owned `Not updated`. Existing tables can inform migration design, but none is a direct match. Phase 3 should align the master worksheet question structure and associations only; Phase 6 and Phase 7 remain responsible for the student tracker and Admin progress behaviour.

Release handling is also split. `materials.available_from` is the enforced database boundary, while `src/lib/sessionAvailability.ts` and Admin session pages calculate display/copy timestamps with fixed IST assumptions. Phase 3 must preserve `available_from`; Phase 4 should establish the authoritative schedule and time-zone calculation. A Phase 3 cleanup must not pre-empt Phase 4 by silently changing release semantics.

## Cleanup register

| ID | Candidate | Evidence and risk | Recommended timing | Do not do |
|---|---|---|---|---|
| CL-01 | Reconcile the Git starting point | Local refs do not contain merge commits named by the signed handoff. Starting from the wrong branch risks losing or duplicating signed work. | Mandatory pre-Phase-3 gate | Do not reset, rebase, or rewrite the recovery branch. |
| CL-02 | Establish one curriculum authority | Hard-coded defaults, master rows, and cohort copies can drift. The schema lacks approved class type and instructor fields. | Integral to Phase 3 | Do not bulk-delete or mutate content before the approved curriculum and a staging inventory exist. |
| CL-03 | Stop actionable references to unsafe root SQL | `supabase/README.md` forbids root scripts, but Admin error text and feature docs instruct users to run them. Applying them can bypass the reconciled migration history. | Replace touched Phase 3 guidance after an ordered replacement migration exists; finish repository-wide in Phase 8 | Do not delete historical scripts before their unique schema/data logic is reconciled. Never apply them to staging or Production. |
| CL-04 | Resolve broken import/conversion commands | Four `package.json` commands and three guides reference missing `scratch/` scripts; the root README advertises them. | Phase 3 only if the approved curriculum import needs them; otherwise Phase 8 documentation/tooling cleanup | Do not recreate obsolete privileged importers merely to make commands exist. |
| CL-05 | Separate fixed worksheet structure from auto-grading | Current question editors require answers, explanations, correctness, difficulty, rank, and accuracy that exceed the manual MVP tracker. | Define the target master rows in Phase 3; hide/retire excluded UI after Phases 6–7, finalized in Phase 8 | Do not drop attempt/history tables during Phase 3. Do not migrate correctness into manual completion. |
| CL-06 | Remove fallback reads to undeployed question-bank tables | Admin curriculum reads `questions` and `question_sets`, although Phase 1 proved those root-script tables are not deployed. Fallbacks obscure real errors. | Phase 3 when the approved master worksheet path is proven in staging | Do not remove the functioning `master_practice_*` path until its replacement is verified. |
| CL-07 | Reduce large, weakly typed client pages | Several Admin and Student pages are 500–1,000 lines and contain most of the 40 lint errors. A broad refactor would mix behaviour change with data migration. | Fix lint and extract only the domain boundary in Phase 3-touched files; finish clean lint in Phase 8 | Do not perform a repository-wide component/style rewrite before the vertical slice works. |
| CL-08 | Clarify file storage ownership and privacy | `uploadFile` returns a public bucket URL, while inventories report no storage buckets. PDF delivery needs a deliberate private or otherwise protected design. | Decide the master PDF reference/storage contract in Phase 3; implement delivery in Phases 4–5; verify in Phase 8 | Do not create a public `materials` bucket as a shortcut. |
| CL-09 | Consolidate duplicate payment endpoints | Both `/api/create-order` and `/api/register/create-order`, and both verify-payment variants, exist. The registration flow uses only `/api/register/*`. Public registration is outside the current LMS acceptance criteria but may still be a business surface. | Product decision before Phase 8; consolidate or isolate in Phase 8 only if approved | Do not remove payment/registration paths as incidental Phase 3 cleanup. |
| CL-10 | Retire advanced worksheet analytics from launch UI | Rank, correctness, accuracy, daily targets, on-track, and behind remain in student/Admin screens and database functions, contrary to MVP exclusions. | Preserve data during build; remove from the MVP interface through Phases 6–7 and verify absence in Phase 8 | Do not drop database functions/tables before rollback and retention decisions. |
| CL-11 | Correct stale top-level documentation | Root README says Next.js 14, promotes undeployed question-bank setup, and points to manual SQL. Feature guides also describe absent tools. | Phase 8, except Phase 3 instructions that would otherwise be dangerous | Do not rewrite signed handoffs or immutable evidence to match the new state. |
| CL-12 | Review unused starter assets and dead helpers | Starter SVGs appear unreferenced; lint reports unused values. Removing them gives little Phase 3 value. | Low-risk Phase 8 cleanup after reachability/build checks | Do not treat search-only evidence as sufficient for dynamic assets. |
| CL-13 | Add regression coverage around data changes | There is no committed general automated test suite. Current confidence comes from focused probes, lint/build, and manual evidence. | Add curriculum/import invariants in Phase 3; complete end-to-end regression in Phase 8 | Do not substitute a passing build for staging auth, RLS, release, and journey tests. |

## Recommended integration into Phase 3

Phase 3 remains **Align the master course**. Cleanup is allowed only where it reduces ambiguity or risk in that delivery.

### Start gate

1. Reconcile remote Git refs and branch from the verified updated `origin/main`.
2. Obtain and freeze the approved revised curriculum, including stable sequence, Week 0, title, class type, instructor, Notion association, PDF association, and worksheet question source.
3. Capture a read-only staging inventory of current master and cohort content, including duplicate/placeholder classification and stable IDs referenced by existing cohorts.
4. Record a pre-change smoke baseline for Google Admin/Student access, logout, Admin provisioning, Notion access, future-material denial, and one existing student session.
5. Decide the PDF storage/reference contract and the worksheet master-row contract before changing data.

### Implementation shape

1. Use additive, ordered Supabase migrations. Add missing master-course fields and constraints without dropping signed baseline objects.
2. Create an idempotent, reviewable curriculum import/upsert keyed by a stable curriculum identity or sequence. Produce a dry-run diff before applying it to staging.
3. Preserve `session_number` compatibility initially because batch creation, student pages, worksheet lookup, and existing database functions depend on it.
4. Change the smallest shared boundary so Admin master-course views and batch generation read the same authoritative master representation. Keep existing cohort rows readable while new cohorts inherit the aligned master.
5. Handle placeholders and duplicates as explicit reviewed data operations. Prefer deactivate/archive or narrowly targeted deletion after reference checks over broad delete-and-reseed.
6. Replace only the unsafe/broken instructions encountered by the new Phase 3 workflow, and only after the ordered migration/import replacement exists.
7. Resolve all lint findings in files touched by Phase 3 and add focused checks for curriculum completeness, unique sequence, fixed instructor mapping, material associations, and idempotent re-import.

### Phase 3 non-regression gate

- The approved master course has exactly the expected sequence and no reviewed placeholders/duplicates.
- DI maps to Ishan, VA maps to Tanya, and QA maps to Unnati from explicit data, not title inference.
- Existing Admin and Student Google journeys still pass.
- Existing cohorts remain readable, or an explicit compatible migration has been verified in staging.
- Notion access still requires an RLS-visible released material.
- Future materials remain denied by direct URL and database policy.
- No service-role key or privileged import logic enters browser code.
- The deployment-environment validator and four-variable separation remain unchanged and passing.
- Phase 3-touched files are lint-clean; build passes with staging configuration.

## Recommended integration into Phase 8

Phase 8 should finish cleanup only after the Phase 3–7 vertical slice and pilot demonstrate which legacy paths are truly unused.

### Before pilot

1. Run repository-wide lint and bring the baseline to zero errors and warnings without suppressing new findings.
2. Remove or correct broken package scripts, unsafe setup instructions, stale README claims, and obsolete UI error messages.
3. Remove MVP-excluded analytics and editing controls from the reachable launch interface while retaining historical data until retention and rollback are approved.
4. Consolidate or isolate registration/payment endpoints only after the Product Owner confirms whether public enrollment is part of the live business surface.
5. Remove unreferenced assets and helpers only after static search, production build, and route smoke tests agree they are unreachable.

### Pilot and launch verification

Use one Test Admin, one Test Student, and the first-time-student pilot to rerun:

- Google sign-in, role routing, logout, deactivation/reactivation, and unknown-account denial;
- Week 0, seven-day pre-read, class, post-class PDF, and direct-URL release boundaries;
- one complete manual worksheet tracker and matching Admin view;
- cross-student privacy and authorized Admin visibility;
- exact programme time-zone boundaries;
- mobile, keyboard, retry/error states, and Notion/PDF failure handling;
- deployment preflight plus live `/` and `/login` HTTP probes.

### Physical retirement policy

Prefer a two-stage retirement:

1. Stop reads/writes, remove the path from reachable UI, and monitor the pilot/stabilization window.
2. Drop tables, columns, functions, routes, or stored content only in a later reviewed migration/change after backup, retention, rollback, and Production usage are confirmed.

Phase 8 launch cleanliness does not require destructive database cleanup. It requires that the supported interface and operational path are unambiguous, tested, secure, and free of critical/high defects.

## Change packaging and rollback guardrails

- Keep curriculum schema, data import, UI adaptation, and cleanup in separate focused commits.
- Do not mix authentication/environment edits into a curriculum cleanup commit.
- Run all migrations and imports against staging first; store sanitized diff/count evidence.
- Use additive compatibility fields and dual-read only for a bounded transition; document the removal condition.
- Never identify destructive targets through an unreviewed title pattern alone. Use stable IDs plus reference counts.
- Do not amend signed migrations already recorded in Production. Add a new ordered migration.
- Retain the current Production deployment as the rollback application until the new staging vertical slice passes.
- A Vercel `Ready` state is insufficient; preserve the signed runtime probes and manual Google journey.

## Decision disposition after Phase 5

1. Resolved in Phases 3–4: the revised 31-item curriculum, Week 0 model, canonical class types, instructor mapping, worksheet question rows, and private PDF storage/release model are implemented and signed off.
2. Still open for a later launch/cleanup decision: whether public registration and Razorpay remain a supported launch surface or are separate from this LMS release.
3. Still open before physical cleanup: the retention period for legacy practice attempts, worksheet logs, and payment records.

Continue to treat cleanup as separately reviewed work. Phase 6 may reuse or migrate tracker data structures where safe, but it does not authorize deletion of legacy data or broad lint cleanup.
