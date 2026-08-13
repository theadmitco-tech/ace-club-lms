# Pilot V1 — Phase-wise Implementation Plan

Status: Approved for staged implementation
Owner: Product owner and Engineering
Last updated: 11 August 2026

## Objective

Deliver the four approved [Pilot V1 acceptance-criteria changes](acceptance-criteria.md) as one independently releasable, staging-first version:

1. titled and visually distinguishable resource cards;
2. independently scrollable worksheet and tracker panels;
3. complete worksheet and pre-read recommendations; and
4. private batch-session Session materials with Recommended reading.

This plan uses `V1 Phase N` labels so it cannot be confused with the signed MVP roadmap Phases 1–8.

## Release boundary

- All implementation begins from updated `origin/main` on `codex/pilot-v1`.
- Local and Vercel Preview use staging configuration only.
- Database changes are additive, ordered, and applied to staging first.
- Existing live batches and Production data remain untouched during implementation and staging verification.
- A passing build, migration message, or Vercel `Ready` state does not authorize Production.
- Merge, Production SQL, deployment, uploads, or Production data changes require separate Product Owner approval after staging acceptance.

## Technical direction locked for planning

### Resource-card system

Use one reusable resource-card structure with variants for Pre-read, Worksheet, Recording, and Session material. Each variant has a visible text type, title, relevant actions, and a local icon/accent treatment. V1 does not depend on downloading an external icon set.

### Session-material identity

Model the new batch-only resource as a dedicated `session_material` type rather than reinterpreting legacy `class_material` rows. This keeps the change additive and prevents existing reusable or historical material behavior from being silently changed.

Before the migration is finalized, Engineering must confirm the current staging material-type inventory read-only. If that inventory exposes a schema conflict, record it as a finding and revise the migration without mutating existing data.

### Private file delivery

Reuse the private `course-materials` storage boundary and protected material route. A server-authorized Admin upload flow creates a private PDF reference; Students receive only a short-lived signed read URL after enrollment and release checks pass.

### Recommendation replacement rule

Calculate an independent active set for each academic section and resource kind:

- worksheet recommendations use the latest same-section session with released worksheets;
- reading recommendations use the latest same-section session with released Session materials; and
- an older set remains until a later same-section replacement set is actually released.

Pre-read availability remains seven days before class. The dashboard recommendation selects the academic class scheduled for the next programme-calendar day.

## Phase map

| V1 phase | Primary result | Acceptance-criteria coverage |
|---|---|---|
| 0 | Approved baseline, branch and implementation inventory | All entry boundaries |
| 1 | Shared titled resource-card system | V1-01 |
| 2 | Independent PDF/tracker scrolling | V1-02 |
| 3 | Correct worksheet and pre-read recommendations | V1-03 |
| 4 | Session-material database, storage and authorization foundation | V1-04 security/data |
| 5 | Session resources Admin UI and Student Recommended reading | V1-04 experience plus V1-01 reuse |
| 6 | Integrated local verification and staging Preview | All V1 changes |
| 7 | Staging acceptance, findings and release decision | V1-wide gate |

---

## V1 Phase 0 — Baseline and implementation readiness

### Purpose

Start V1 from the correct Git and environment baseline, carry the approved planning documents forward, and resolve technical assumptions before application or SQL changes.

### Work

1. Fetch current remote refs and confirm the latest `origin/main` commit.
2. Preserve the approved V1 criteria, implementation plan, pilot handoff changes, and documentation links.
3. Create `codex/pilot-v1` from updated `origin/main` without rewriting the Phase 8 closeout branch.
4. Confirm the working tree contains only intentional V1 documentation changes.
5. Confirm local and Preview variables point to staging; do not display or record secret values.
6. Read the relevant bundled Next.js 16 documentation under `node_modules/next/dist/docs/` before changing App Router, Server/Client Component, Route Handler, or data-access code.
7. Inspect the precise V1 files, current RLS/functions, private storage flow, and existing migration order.
8. Capture a read-only staging inventory of material types and batch/master linkage needed to finalize the additive Session-material migration.
9. Record any baseline finding in the pilot handoff before implementation.

### Exit criteria

Evidence: [Phase 0 readiness record](phase-0-readiness.md).

- [x] `codex/pilot-v1` exists from the verified updated `origin/main` baseline.
- [x] Approved V1 documents are present on the branch with no unrelated user changes.
- [x] Git status, branch, baseline commit, and remote relationship are recorded.
- [x] Staging/Production separation is confirmed without exposing environment values.
- [x] Relevant Next.js 16 guides have been read and the selected conventions are recorded.
- [x] The affected application, database, storage, authorization, and styling files are identified.
- [x] The staging material inventory supports the additive `session_material` direction, or a blocking finding and revised safe direction are recorded.
- [x] No application code, migration, upload, deployment, or Production mutation has occurred before this gate passes.

---

## V1 Phase 1 — Titled resource-card system

### Purpose

Replace repetitive generic controls with one accessible resource-card system that makes every configured resource identifiable.

### Work

1. Build a shared resource-card presentation using the existing server-composed material title and release state.
2. Add variants for Pre-read, Worksheet, Recording, and the planned Session-material type.
3. Use a common structure with visible type, title, availability, and relevant actions.
4. Pair each Worksheet with `Open worksheet` and its matching `Update log` when tracker records exist.
5. Replace generic resource actions in This week, Timeline, Browse by section, and applicable curriculum-item surfaces.
6. Ensure locked resources receive no interactive URL and unconfigured resources create no broken control.
7. Add wrapping, focus, contrast, non-colour identification, and supported-width behavior.

### Verification

- Render one session with multiple pre-reads and multiple worksheets.
- Verify every title and action resolves to the correct material ID.
- Verify locked, released, missing, long-title, keyboard, and 200% text-zoom states.
- Run targeted lint and TypeScript for the touched files.

### Exit criteria

- [x] All V1-01 acceptance criteria pass locally with representative fixtures.
- [x] Pre-read, Worksheet, Recording, and Session-material variants share one structure but remain visibly distinguishable.
- [x] Worksheet and log actions remain paired to the same canonical material.
- [x] Locked resources expose no usable material URL.
- [x] No page-level horizontal overflow appears at supported widths or 200% text zoom.
- [x] Targeted lint and TypeScript pass for Phase 1 files.
- [x] The change is captured in one focused commit without unrelated behavior changes.

---

## V1 Phase 2 — Independent worksheet and tracker scrolling

### Purpose

Let Students reference the PDF and update the tracker side by side without one panel displacing the other.

### Work

1. Give the supported desktop workspace a bounded viewport-aware height.
2. Make the PDF and tracker separate vertical scroll regions.
3. Keep table headings and the controls required for understanding or updating the log reachable while scrolling.
4. Preserve normal stacked document flow below the side-by-side breakpoint and at 200% text zoom.
5. Preserve independent PDF/tracker loading, failure, retry, and saved-state behavior.
6. Verify keyboard focus is not clipped or trapped by either scroll container.

### Verification

- Record PDF and tracker scroll positions before and after scrolling the opposite panel.
- Exercise a long 50-question log, PDF retry, tracker retry, refresh, keyboard navigation, desktop widths, and 200% text zoom.

### Exit criteria

- [x] All V1-02 acceptance criteria pass locally.
- [x] Scrolling either desktop panel leaves the other panel's position unchanged.
- [x] The stacked layout has no scroll trap or page-level horizontal overflow.
- [x] Retrying one panel does not erase or unnecessarily reload the other panel.
- [x] Saved tracker state persists after refresh.
- [x] Keyboard navigation and visible focus pass.
- [x] Targeted lint, TypeScript, and a focused build check pass for Phase 2 files.
- [x] The change is captured in one focused commit.

---

## V1 Phase 3 — Recommendation selection and replacement

### Purpose

Show every current worksheet for QA, VA, and DI and preserve the agreed seven-day release/one-day recommendation behavior for pre-reads.

### Work

1. Replace the single-worksheet selection with a deterministic active worksheet set per section.
2. Keep the prior set until a later same-section worksheet set is actually released.
3. Return every released worksheet from the selected session without duplicates.
4. Preserve each worksheet's canonical PDF and tracker destinations.
5. Calculate tomorrow's academic class in the programme timezone for pre-read emphasis while leaving material release untouched.
6. Isolate missing or partial content so one section cannot break the others.
7. Add focused pure-logic coverage for multiple resources, replacement boundaries, empty sections, and programme-day transitions.

### Exit criteria

- [x] All V1-03 acceptance criteria pass against controlled local or staging-like fixtures.
- [x] A VA session containing CR and RC worksheets recommends both.
- [x] QA, VA, and DI active sets are calculated independently and deterministically.
- [x] Earlier work remains until a later same-section worksheet set releases.
- [x] Thursday VA, Friday QA, and Saturday DI recommendations pass for the current standard schedule.
- [x] The seven-day pre-read release timestamp is unchanged.
- [x] Unreleased, unpublished, cross-batch, and unauthorized resources remain inaccessible.
- [x] Focused logic checks, targeted lint, TypeScript, and build pass.
- [x] The change is captured in one focused commit.

---

## V1 Phase 4 — Session-material data, storage and authorization

### Purpose

Create the safe batch-only foundation for private PDF Session materials without changing reusable Master resources or existing batches.

### Work

1. Add a new ordered migration for the `session_material` material type and any required function or constraint updates.
2. Keep `session_material` invalid for Master materials and excluded from cohort generation and Sync materials.
3. Add Admin-only server/database operations to create, rename, replace, and remove a Session material for one validated batch session.
4. Set `available_from` from the selected session's authoritative `session_end_at`.
5. Add a private signed-upload endpoint scoped to the selected batch session, PDF validation, size validation, and unique storage paths.
6. Reuse the protected Student material route and enrollment/release authorization for reads.
7. Define safe replacement/removal ordering so failure does not destroy the last working resource or leave an unrestricted file.
8. Add authorization probes for Admin, Student, signed-out, inactive, cross-batch, and pre-release cases.

### Exit criteria

- [x] The migration is new, ordered, transactional where applicable, and has not been applied to Production.
- [x] Existing rows require no destructive rewrite and existing live batches remain unchanged.
- [x] `session_material` cannot be created as reusable Master content or copied by generation or sync.
- [x] Only an authorized Admin can manage a Session material.
- [x] Only an active enrolled Student can read it after release.
- [x] Signed-out, inactive, pre-release, and cross-batch reads are denied without leaking a storage URL.
- [x] Invalid or failed upload, replace, or remove operations preserve the last valid state and return actionable errors.
- [x] Migration review, targeted lint, TypeScript, build, and focused authorization checks pass locally.
- [x] Data and server work are captured in a focused commit before UI integration.

---

## V1 Phase 5 — Session resources and Recommended reading experience

### Purpose

Let Admins manage Session materials beside recordings and let Students find released reading throughout the course journey and weekly recommendations.

### Work

1. Adapt the Recordings destination into a Session resources surface without weakening the accepted recording flow.
2. Keep the existing batch and session selection context.
3. Add Session-material title, PDF upload, saved, validation, replace, rename, removal-confirmation, and retry states.
4. Add the Session-material card variant to This week, Timeline, Browse by section, and curriculum-item journey surfaces where applicable.
5. Add a Recommended reading group calculated independently for QA, VA, and DI.
6. Show every released Session material in the active reading set.
7. Keep earlier reading until a later same-section Session-material set releases.
8. Remove a replaced or deleted resource from Student surfaces without leaving a stale card.
9. Recheck recording add, edit, remove, batch isolation, release, and validation behavior.

### Exit criteria

- [x] All V1-04 product acceptance criteria pass with controlled fixtures and the sanitized staging Preview lifecycle.
- [x] Admin manages Recording and Session material for the same batch session from one coherent surface.
- [x] Session-material create, rename, replace, and remove states are clear and recoverable.
- [x] The Student sees accurate locked and released states through the shared resource cards.
- [x] Recommended reading shows the complete latest released set per section and replaces it only when new reading releases.
- [x] Another batch remains unchanged through every Admin action and Sync materials.
- [x] Existing recording behavior passes its focused regression checks.
- [x] Supported desktop widths, keyboard access, focus, text zoom, targeted lint, TypeScript, and build pass.
- [x] Admin and Student integration is captured in focused commits without unrelated cleanup.

---

## V1 Phase 6 — Integrated local checks and staging Preview

### Purpose

Prove the complete V1 version is internally consistent before asking the Product Owner to run account-dependent staging acceptance.

### Work

1. Update the V1 branch from the latest `origin/main` through a reviewed, non-destructive integration if the baseline moved.
2. Run `git diff --check`, secret and unrelated-file review, targeted lint, TypeScript, and guarded Production build.
3. Measure repository-wide lint honestly against the signed 22-error and 3-warning baseline; V1-touched files must have zero findings.
4. Review the ordered migration diff and rollback or compatibility path.
5. Push the branch and confirm its Vercel Preview uses staging configuration.
6. Apply the ordered V1 migration to staging only after review and record the exact result.
7. Run non-account and automated checks against the staging-backed Preview.
8. Prepare anonymized Test Admin and Test Student fixtures without changing Production.

### Exit criteria

- [x] Git diff contains only approved V1 code, migration, tests, and documentation.
- [x] No secret, unrestricted private URL, authentication artifact, or private Student data is present.
- [x] `git diff --check`, targeted lint, TypeScript, and guarded Production build pass.
- [x] Repository-wide lint is reported accurately and has no new V1 findings.
- [x] The reviewed migrations are applied successfully to staging only and their state is recorded.
- [x] The Vercel Preview is Ready, immutable by commit, and confirmed against staging.
- [x] Automated authorization, release, and recommendation checks pass.
- [x] No critical or high finding remains before manual staging acceptance begins.

---

## V1 Phase 7 — Staging acceptance and version decision

### Purpose

Verify the complete affected Admin and Student journeys, classify findings, and make an explicit version decision without implying Production promotion.

### Manual staging journeys

1. Test Admin manages a recording and multiple Session materials in one selected batch session.
2. Another batch remains unchanged before and after create, rename, replace, remove, generation, and Sync materials actions.
3. Test Student verifies titled resource cards across This week, Timeline, Browse by section, curriculum-item journey, Recommended reading, and Recommended practice.
4. Test Student verifies two worksheets from one VA class both appear and reach their own canonical logs.
5. Test Student verifies independent PDF and tracker scrolling, saving, refresh, failure isolation, keyboard behavior, and 200% text zoom.
6. Time and release checks verify pre-read seven-day availability, next-day recommendation, post-class worksheet, recording and Session-material release, and replacement boundaries.
7. Authorization probes verify Admin-only writes plus signed-out, inactive, cross-batch, cross-student, unreleased, and direct-URL denial.
8. Existing Admin progress and Student Practice log remain consistent and operational.

### Exit criteria

- [ ] Every approved V1 acceptance criterion has a recorded pass, accepted exception, or failing finding.
- [ ] Every finding has severity, owner, disposition, and retest result.
- [ ] No critical or high defect, privacy exposure, cross-batch propagation, or unreleased-file exposure remains open.
- [ ] Test Admin and Test Student journeys pass in the staging-backed Preview.
- [ ] Existing recording, Master material sync, Student tracker, Admin progress, role-routing, and private-file boundaries pass regression.
- [ ] Product Owner reviews the immutable Preview and explicitly accepts, defers, rejects, or requests changes to V1.
- [ ] Branch, exact commit, pushed state, migration state, Preview result, findings, and one exact next action are recorded in the pilot handoff.
- [ ] Production remains untouched unless a later, separately reviewed Product Owner instruction authorizes promotion.

## Conditional Production promotion

Production promotion is not part of the authority granted by this plan. If the Product Owner accepts staging and explicitly authorizes Production, prepare a separate reviewed release plan containing:

- final branch and commit;
- Production environment preflight;
- ordered migration and application sequence;
- application deployment sequence;
- rollback and private-file compatibility plan;
- authenticated Student and Admin smoke tests;
- post-deployment authorization, recommendation, and cross-batch checks; and
- separately dated immutable Production evidence.

## Plan approval

- [x] Product Owner approves this implementation sequence and its exit criteria.
- [ ] Product Owner approves with edits written below.
- [ ] Product Owner requests another planning pass.

- Product Owner review: Approved by the instruction to start Pilot V1 Phase 0 on 11 August 2026.
- Engineering review: Complete through the Phase 0 readiness inventory.
- Implementation authorized: Phase-by-phase on staging, subject to each preceding exit gate.
- Staging migration authorized: No
- Production promotion authorized: No

### Product Owner notes

> Add sequencing changes, approval conditions, or implementation constraints here.
