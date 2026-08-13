# Pilot V1 — Phase 0 Readiness Record

Status: Complete
Owner: Engineering
Last updated: 11 August 2026

## Result

Pilot V1 is ready to enter Phase 1 from the verified `origin/main` application baseline. Phase 0 changed documentation only: no application code, migration, upload, deployment, staging data, or Production state was changed.

## Git and document baseline

- Remote refs were fetched read-only on 11 August 2026.
- Branch: `codex/pilot-v1`.
- Start and application baseline: `0e7be4d40f7a47d34fe1c9441ffa5834eaf12ef2`.
- `HEAD`, `origin/main`, and their merge base matched at inspection with zero ahead/behind divergence.
- The working tree contained only the intentional Pilot V1 planning documents and documentation-index link before Phase 0 reconciliation.
- Signed Phase 8 closeout commit `cc162ad` exists on `origin/codex/phase-8-closeout` but is not an ancestor of `origin/main`. Its documentation-only closeout record is carried forward on this V1 branch so the required reading layer is complete; no application change from another branch was imported.

## Environment boundary

- `.env.local` targets staging project `eyphkkginlgoaxflauog`; only variable names and target classification were inspected.
- The local Supabase CLI link also targets `eyphkkginlgoaxflauog`.
- The four required Vercel Preview variable names are present and Sensitive.
- The latest immutable Preview for the current application baseline lineage (`2a17c56`, 6 August 2026) is Ready and its build log records: `Required preview environment variables are present and environment URLs are correctly separated.`
- The repository prebuild guard rejects a Preview build unless its Supabase host is the staging project. No Preview was created for Phase 0.
- Local `.env.local` does not contain `SUPABASE_SERVICE_ROLE_KEY`. Do not copy a service-role value into evidence or Git. Later server-side upload verification must use an approved secure staging configuration, normally the staging-backed Preview.
- Production was not queried through privileged access and was not changed.

## Next.js 16 conventions selected

The bundled Next.js 16.2.4 guides read for this version were:

- `01-app/01-getting-started/05-server-and-client-components.md`;
- `01-app/01-getting-started/15-route-handlers.md`;
- `01-app/02-guides/authentication.md`; and
- `01-app/02-guides/data-security.md`.

Pilot V1 will keep pages and data composition as Server Components by default, limit Client Components to browser interaction and local UI state, keep privileged data access in `server-only` modules, pass only minimal serializable data to Client Components, validate route and mutation input, and re-run authentication plus resource-level authorization inside every callable mutation boundary. Authenticated file routes remain request-time and uncached; presentation state never replaces database/server authorization.

## Affected implementation inventory

### Shared titled resource cards and recommendations

- `src/lib/studentTimeline.ts`
- `src/lib/server/studentTimeline.ts`
- `src/components/student/ResourceActions.tsx`
- `src/components/student/TimelineItem.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/dashboard.css`
- `src/app/session/[id]/page.tsx`
- `src/app/practice/page.tsx`
- `src/app/practice/practice.css`

### Worksheet workspace scrolling

- `src/app/session/[id]/material/[materialId]/page.tsx`
- `src/app/session/[id]/material/[materialId]/material.css`
- `src/components/student/PdfViewer.tsx`
- `src/components/student/WorksheetLog.tsx`

### Session-material data, storage, authorization, and Admin experience

- `src/app/admin/recordings/page.tsx`
- `src/app/admin/AdminShell.tsx`
- `src/app/api/admin/master-material-upload/route.ts` as the private signed-upload reference pattern
- `src/app/api/materials/file/route.ts`
- `src/lib/materialFiles.ts`
- `src/lib/server/requireAdmin.ts`
- `src/lib/server/portalAuthorization.ts`
- `src/lib/types.ts`
- `src/lib/studentTimeline.ts`
- `src/lib/server/studentTimeline.ts`
- `supabase/migrations/20260731051000_production_baseline.sql`
- `supabase/migrations/20260731150000_add_private_master_worksheets.sql`
- `supabase/migrations/20260802100000_add_student_timeline_and_recording_sync.sql`
- `supabase/migrations/20260802230000_make_recordings_batch_specific.sql`
- `supabase/migrations/20260804120000_realign_weekly_course_schedule.sql`

Existing Production migrations are reference history only. Pilot V1 will add a new ordered migration and will not amend an applied migration.

## Read-only staging material inventory

The signed-in staging Table Editor was inspected without running SQL or changing rows.

- `master_materials`: 3 rows — 2 `pre_read`, 1 `worksheet`, 0 `video`, 0 `class_material`, and 0 `session_material`.
- `materials`: 12 rows — 8 `pre_read`, 1 `worksheet`, 3 `video`, 0 `class_material`, and 0 `session_material`.
- The visible Master rows are reusable pre-read/worksheet content linked to Master sessions.
- Videos exist only in cohort materials, consistent with the current batch-specific recording trigger/functions and the absence of Master video rows.
- The private `course-materials` bucket and protected material route are the current worksheet delivery boundary.

The inventory supports a new additive `session_material` cohort-only type. Reusing `class_material` would blur historical behavior, and interpreting `video` as reading would violate the shipped recording contract.

## Findings and dispositions

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| P0-01 | Medium | The signed Phase 8 closeout commit is on `origin/codex/phase-8-closeout` but is not merged into `origin/main`. | Carry its documentation-only closeout record onto `codex/pilot-v1`; keep `origin/main` as the application baseline and record the ancestry explicitly. |
| P0-02 | Medium | Local public configuration targets staging, but the local service-role variable is absent. | Do not weaken authorization or copy secrets. Use secure staging Preview configuration for later privileged upload tests, or provision local staging access through an approved secret-handling step before Phase 4 verification. |
| P0-03 | Expected migration work | Current material constraints and TypeScript unions do not include `session_material`. | Add the type through one new ordered, additive migration and focused application type changes in Phases 4–5; apply to staging first. |
| P0-04 | Expected authorization work | The protected file handler currently accepts only `worksheets/` storage paths. | Extend the protected route deliberately for a separate Session-material prefix while retaining active-account, enrollment, release, RLS, short-lived signed URL, and no-store behavior. |
| P0-05 | Expected UI work | The existing Admin recordings page is a broad Client Component that reads and mutates Supabase directly through Admin-only RPCs. | Preserve the RPC authorization boundary; add only the interaction state required for Session resources and use an Admin-authorized Route Handler for signed uploads. |

None of these findings blocks Phase 1. P0-02 must be resolved before privileged local upload verification is claimed, and P0-03/P0-04 are Phase 4 gates.

## Phase 0 gate

- [x] Branch and remote baseline are exact and current.
- [x] Approved V1 planning and signed closeout documents are present without unrelated application changes.
- [x] Local and Preview staging separation is evidenced without exposing values.
- [x] Relevant bundled Next.js 16 conventions are recorded.
- [x] Affected application, database, storage, authorization, and styling files are identified.
- [x] Read-only staging inventory supports the additive `session_material` direction.
- [x] Phase 0 performed no application code, SQL, upload, deployment, or Production mutation.

Exact next action: begin V1 Phase 1 by implementing the shared titled resource-card structure only.
