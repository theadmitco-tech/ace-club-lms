# Ace Club LMS — Running Handoff

Status: Active
Owner: Product owner and Engineering
Last updated: 31 August 2026

This is the current cross-phase continuity document. Append a signed section when a phase closes; preserve earlier sections as historical snapshots instead of rewriting them to match later state.

## How to use this handoff

Read:

1. [`AGENTS.md`](../../AGENTS.md).
2. The [Engineering Handbook](../governance/engineering-handbook.md) for the proposed source-control, migration, release, rollback, evidence, and handoff standard.
3. The [`instruction/` register](../../instruction/README.md).
4. This running handoff, starting with the latest signed section.
5. The [MVP acceptance criteria](../../instruction/Ace_Club_LMS_MVP_Acceptance_Criteria.md).
6. The relevant phase in the [product roadmap](../../instruction/Ace_Club_LMS_Product_Roadmap.md).
7. For post-MVP pilot changes, read the signed [Phase 8 closeout](../phase-8/README.md), [closeout evidence](../phase-8/evidence/operational-closeout-2026-08-10.md), and [verification exceptions](../phase-8/manual-verification-checklist.md).
8. For the shipped Admin/Student tracker boundary, the [Phase 7 status](../phase-7/README.md), [Phase 7 checklist](../phase-7/manual-verification-checklist.md), [staging evidence](../phase-7/evidence/manual-staging-verification-2026-08-03.md), and [Production rollout evidence](../phase-7/evidence/production-rollout-2026-08-03.md).
9. For historical Phase 5 interaction decisions, the [foundation plan](../phase-5/student-experience-foundation-plan.md), [decision summary](../phase-5/student-experience-foundation.md), [UI state and content matrix](../phase-5/ui-state-and-content-matrix.md), and [shared Phase 5–6 verification checklist](../phase-5/manual-verification-checklist.md).
10. For the shipped Student tracker contract, the [Phase 6 status](../phase-6/README.md), [Phase 6 checklist](../phase-6/manual-verification-checklist.md), [staging evidence](../phase-6/evidence/manual-staging-verification-2026-08-03.md), and [Production rollout evidence](../phase-6/evidence/production-rollout-2026-08-03.md).
11. The [approved revised course structure](../phase-3/revised-course-structure.md), without reconstructing curriculum labels from screenshots or title parsing.
11. The [documentation index](../README.md), [coding rules](../development/coding-rules.md), and [current code landscape and cleanup plan](../development/current-code-landscape-and-cleanup-plan.md).
12. The relevant Next.js 16 guides under `node_modules/next/dist/docs/` before writing or changing Next.js code, then only the implementation files relevant to the immediate task.

Do not repeat completed recovery, audit, scheduling, release, or foundation work unless newer evidence invalidates it. The latest signed section and its linked product files are the durable replacement for chat history.

---

## Phase 0.5 handoff — Setup and recovery

Date: 31 July 2026  
Status: **Signed off**

The full immutable checkpoint remains in [Phase 0.5 Setup and Recovery Sign-off](../../instruction/Phase_0.5_Setup_Recovery_Signoff.md). The sections below preserve its continuation context.

### Purpose

Phase 0.5 established a safe, recoverable working environment before product implementation. It recovered the editable source and Git history, separated staging from production, validated local execution, and established the working agreement.

### Required reading at the checkpoint

The required order was `AGENTS.md`, the instruction register, the Phase 0.5 sign-off, acceptance criteria, roadmap, documentation index, coding rules, and Phase 1 status.

### Working-memory bootstrap at the checkpoint

- Product: Ace Club LMS for the first live GMAT cohort.
- Production roles: Admin and Student only.
- Course model: fixed revised curriculum.
- Instructor mapping: DI–Ishan, VA–Tanya, QA–Unnati.
- Journey: Week 0 immediately; later Notion pre-reads seven days before class; PDF worksheets after class.
- Tracker: per-student, per-worksheet, per-question manual status and optional time/comment.
- Security: RLS, server-side privileged authorization, direct-URL release protection, private student data, and no browser-visible elevated keys.
- Environment: local and Preview use staging; Production remains isolated.

### Phase map at the checkpoint

- Phase 0.5: complete.
- Phase 1: active recovery and audit.
- Phase 2: repair and simplify accounts after Phase 1 sign-off.
- Phases 3–8: retain the roadmap names, order, scope, and gates.
- No Phase 1.5 was approved.

### Signed-off outcomes

- Editable source, Git history, local toolchain, dependencies, development startup, and production build were recovered.
- Product requirements, roadmap, Phase 1 audit structure, setup guidance, and coding rules were committed.
- Production and staging Supabase projects were identified and separated.
- Local `.env.local` used public staging values and remained ignored.
- The staging inventory and initial lint baseline were recorded.

### Environment boundaries

- Production Supabase: `owmlxsnzogfapotmjrqk`; treat all data and credentials as live.
- Staging Supabase: `eyphkkginlgoaxflauog`; use for schema, identity, release, privacy, and end-to-end testing.
- Local repository: `/Users/tanishagarg/Developer/ace-club-lms`; keep `.env.local` on staging.

### Git checkpoint

The branch was `agent/phase-2-recovery`, built incrementally on the original `origin/main` baseline. Recovery commits were to be preserved without reset, squash, amend, or rebase unless explicitly approved.

### Work intentionally incomplete at Phase 0.5

Production inventory, schema reconciliation, ordered migrations, lint disposition, staging authentication, privacy/release probes, and the validated estimate remained Phase 1 work.

### Non-regression rules

- Never connect local development to Production Supabase.
- Never place service-role or secret keys in `.env.local` or browser-visible variables.
- Never treat client redirects as authorization.
- Never run destructive Production probes without an approved plan.
- Preserve evidence and unrelated user changes.
- Do not redo completed audits without invalidating evidence.

### Token-efficient working agreement

Use one small handoff at a time: state the outcome, give one manual account-dependent task, receive the result, record evidence, and continue. Never paste secrets, credentials, magic links, or private student data into chat or documentation.

### Phase 0.5 sign-off

Phase 0.5 was accepted because source recovery, toolchain setup, environment separation, build baseline, evidence structure, rules, and continuation method were established. It did not approve Production changes or declare Phase 1 complete.

---

## Phase 1 handoff — Recovery and audit

Date: 31 July 2026  
Status: **Signed off with an explicit Phase 2 authentication exception**

### Outcome

Phase 1 is complete. Source, database, deployment, authorization, release, and privacy evidence are reconciled. The validated delivery range is **6–8 engineering weeks plus 1–2 weeks of pilot/stabilisation** for one full-stack engineer with explicit QA and product acceptance.

Authoritative Phase 1 records:

- [Phase 1 sign-off and audit](../phase-1/README.md)
- [Manual verification checklist](../phase-1/manual-verification-checklist.md)
- [Immutable evidence](../phase-1/evidence/)

### Current product decision

The product owner resolved the deferred login-method decision on 31 July 2026: Phase 2 will use Google Sign-In only for controlled, pre-provisioned accounts. Magic-link and password login are paused and excluded from the Phase 2 exit gate. Phase 2 will inventory surviving Google Cloud and Supabase OAuth configuration before rebuilding it.

Legacy password and Quick Access UI still exists and must not be mistaken for approved launch behaviour.

### Environment and deployment state

- Local Supabase link: staging `eyphkkginlgoaxflauog`.
- Vercel Preview: protected and connected to staging.
- Production Supabase: `owmlxsnzogfapotmjrqk`.
- Production application: [aceclub.theadmitco.com](https://aceclub.theadmitco.com).
- Vercel Preview and Production use separate Supabase URLs, anon keys, and service-role keys.
- Production `NEXT_PUBLIC_SITE_URL` is `https://aceclub.theadmitco.com`.
- No secret values are stored in the repository evidence.

### Database and migration state

- Production-derived baseline: `20260731051000_production_baseline.sql`.
- Release-boundary migration: `20260731062700_enforce_material_release.sql`.
- The baseline is applied to staging and recorded as applied in Production’s migration ledger.
- The release policy is applied to staging and Production.
- `materials` access now requires both course access and `available_from <= now()`.
- The local repository is relinked to staging after Production work.

### Security and privacy state

- `/api/admin/bulk-enroll` and `/api/admin/delete-user` require an active Admin session before service-role use.
- `/api/notion` requires an active session and an RLS-visible material whose Notion page matches the request.
- Signed-out Production probes return application `401` responses for all three routes.
- Disposable staging and Production RLS suites pass **12/12**.
- Anonymous, cross-student, enrollment, Admin visibility, deactivation, and future-material boundaries pass.
- There are no storage buckets to validate.

### Quality state

- Production build passes on Next.js 16.2.4.
- Targeted lint for Phase 1 containment changes passes.
- Full lint remains at 40 errors and 10 warnings under the approved scoped legacy deferral.
- Lint remains enabled; no new findings are allowed; touched legacy files must be improved; launch requires clean lint.

### Git and publication state

- Branch: `agent/phase-2-recovery`.
- Phase 1 sign-off commit: `5f5a862`.
- The branch is pushed to `origin`.
- The branch is not merged into `main`.
- Latest deployed Phase 1 application code: `df3581f`.

### Phase 2 starting scope

1. Inventory surviving Google OAuth, Supabase provider, consent-screen, and redirect configuration before rebuilding anything.
2. Implement the approved Google-only authentication decision and record its configuration without secrets.
3. Remove production Quick Access, hard-coded demo credentials, password behaviour not included in the decision, and “Super Admin” presentation.
4. Establish server-side route/page authorization and session refresh consistently.
5. Create controlled staging Admin and Student identities for the selected login method.
6. Verify role redirects, logout, deactivation/reactivation, unknown-email disclosure behaviour, and positive Admin operations.
7. Resolve the affected legacy lint findings as authentication files are changed.

### Phase 2 non-regression rules

- Keep local and Preview on staging.
- Do not expose or store service-role, OAuth, email, or payment secrets.
- Do not weaken the deployed Admin, Notion, RLS, or release-boundary containment.
- Do not revive Phase 1 audit work without contradictory new evidence.
- Keep Admin and Student as the only product roles unless the acceptance criteria are deliberately amended.

### Resume instruction

> Continue Ace Club LMS from `docs/handoffs/ace-club-lms-running-handoff.md`. Read `AGENTS.md`, `instruction/README.md`, the latest handoff section, the Markdown acceptance criteria, the Phase 2 roadmap section, and `docs/development/coding-rules.md`. Inspect Git status and recent commits. Preserve completed Phase 1 evidence, continue incrementally on `agent/phase-2-recovery`, optimize for tokens, and give one account-dependent task at a time.

### Phase 1 sign-off decision

Phase 1 is accepted as complete because the recovery outputs, database map, validated estimate, migration baseline, environment separation, build verification, Production deployment, privileged-route containment, and staging/Production privacy and release evidence are complete.

The approved authentication exception is Phase 2 scope and is recorded as deferred rather than passed.

---

## Phase 2 handoff — Google-only accounts

Date: 31 July 2026

Status: **Signed off**

### Completed implementation and verification

- Google Sign-In is the only portal login method; password, magic-link, Quick Access, demo credentials and Super Admin presentation are removed.
- Unknown Google identities receive an inactive Student profile and no portal access.
- Server-side Admin and Student route boundaries, session refresh, logout and reversible activation are implemented.
- Staging Preview passed Admin, Student, denial, logout, provisioning, enrolment, deactivation and reactivation journeys.
- Staging and Production use separate Supabase projects, OAuth clients, callbacks and Vercel scopes.
- Production access-control migration `20260731110000_require_provisioned_portal_access.sql` was applied successfully.
- Pull request #1 merged Phase 0.5 through Phase 2 into `main` at `edd3766`.
- Pull request #2 added permanent deployment safeguards and merged at `eaef0f3`.
- The guarded Production deployment passed, both `/` and `/login` returned HTTP 200, and the approved Production Admin Google journey, refresh and logout passed.

### Production deployment incident

The first Phase 2 Production build completed in Vercel but `/login` returned HTTP 500. A rollback redeployment then showed the safe Supabase configuration screen. The root cause was incomplete Vercel Production variables: Production had `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, but `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL` were not present in the Production scope. Vercel's `Ready` state proved only that the build completed; it did not prove runtime health.

The two missing Production variables were added, malformed URL values were corrected, and the new build guard rejected the invalid attempt before deployment. The subsequent guarded deployment passed and restored healthy Production service. The Production SQL migration remained compatible throughout and required no rollback.

### Permanent deployment safeguards

- `npm run build` now runs `scripts/validate-deployment-env.mjs` first.
- Vercel Preview builds fail unless all four required variables are present and the Supabase URL targets staging.
- Vercel Production builds fail unless all four required variables are present, the Supabase URL targets Production, and the site URL is `https://aceclub.theadmitco.com`.
- The request proxy no longer converts missing public Supabase variables into an opaque site-wide HTTP 500; the login page can show its explicit configuration error.
- The build check never prints secret values.

### Mandatory release preflight

Before every Production merge or promotion:

1. In Vercel Environment Variables, filter to **Production** and verify exactly one Production-scoped entry exists for each required name:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL`
2. Confirm the Production Supabase URL uses project `owmlxsnzogfapotmjrqk` and the site URL is `https://aceclub.theadmitco.com`.
3. Filter to **Preview** and confirm the same four names exist only with staging values, using project `eyphkkginlgoaxflauog`.
4. Never delete a shared variable until both replacement scopes have been verified independently.
5. Save all environment changes before triggering one fresh deployment. Do not redeploy after each variable.
6. Require a successful Vercel check plus live HTTP probes of `/` and `/login`; never accept `Ready` alone.
7. Manually verify Google Sign-In uses the expected Supabase project, role routing works, logout blocks protected pages, and deprecated login controls are absent.
8. Record only names, scopes, project references and pass/fail results. Never store or paste key values.

Environment variables are persistent deployment configuration. Once the four correct Production and Preview entries exist, routine releases must reuse them and must not ask the Product Owner to re-enter keys.

### Phase 2 sign-off decision

Phase 2 is accepted as complete because controlled Google-only authentication, provisioning, role enforcement, inactive access, logout, environment separation, staging validation, Production migration, Production deployment and Production Admin smoke testing all pass. Password, magic-link, Super Admin and public Quick Access paths are absent.

### Phase 3 continuation point

Phase 3 is **Align the master course**. Start from updated `origin/main` on a new feature branch. Read the Phase 3 roadmap and acceptance criteria, inventory the current course and material rows in staging, and obtain the approved revised fixed curriculum before changing data. The Phase 3 exit gate is one complete master course with approved titles, class types, DI–Ishan, VA–Tanya and QA–Unnati mappings, Notion pre-reads, PDF worksheets and worksheet question rows, with placeholders and duplicates removed.

Do not reopen Phase 2 authentication or environment work unless a new failing probe contradicts this signed evidence. Continue to use the mandatory release preflight above for every deployment.

---

## Phase 3 handoff — Align the master course

Date: 31 July 2026
Status: **Signed off**

### Completed implementation and verification

- The approved revised curriculum is represented as 31 stable master timeline items.
- DI maps to Ishan, VA to Tanya, and QA to Unnati; orientation, mocks, calls, breaks, and support events have no inherited teaching instructor.
- Admins can attach multiple Notion pre-reads and multiple private PDF worksheets to a master item, with a manual positive question count per worksheet.
- Worksheet question rows are generated from the entered count, and private files are delivered through an authenticated route using 60-second signed URLs.
- The three Phase 3 migrations applied successfully to staging.
- Admin Preview, the DI 1 master-content vertical slice, new-cohort inheritance, Student pre-read visibility, Student worksheet delivery, release locking, and signed-URL expiry passed.
- DI 1 evidence recorded one pre-read, one worksheet, question count 20, one private PDF, and 20 generated question rows.
- Targeted lint, TypeScript, and the production build pass.

### Confirmed Phase 4 boundary

Existing cohorts do not automatically receive master materials added after cohort creation. The staging `Aug test` batch continued showing its original pre-read after another was added to the master item. New cohort generation copies available master materials, but retroactive propagation is not implemented.

The current batch generator also remains the legacy 16-session implementation and produces incorrect inferred metadata for some items. Phase 4 must generate cohorts from the full 31-item master timeline and decide whether existing cohorts receive later master-content additions automatically or through an explicit Admin action.

### Release state and continuation

- Branch: `codex/phase-3-master-course`.
- Implementation commits: `4951494`, `e4d6268`, and `599804e`.
- The branch is pushed and its Vercel Preview is connected to staging.
- No Phase 3 migration has been applied to Production and the branch has not been merged into `main`.
- On 31 July 2026, the Product Owner approved the 31-session curriculum and verified workflow, with remaining Notion links and worksheets to be populated later through Admin.
- Production contains 16 legacy master sessions, 33 master materials, 10 master practice sets, 512 master questions, 32 student master attempts, one worksheet plan, 16 worksheet rules, and 94 worksheet targets.
- The Product Owner approved archiving rather than physically deleting that legacy template. Phase 4 must hide it from current workflows while preserving linked history.

### Phase 3 sign-off decision

Phase 3 is accepted as complete because the revised structure, instructor mappings, multiple-material Admin workflow, question-row generation, private PDF delivery, release boundary, staging Student journey, build checks, Product Owner content decision, and Production legacy archival decision are complete.

Production rollout is intentionally coordinated with Phase 4. Do not apply the current Phase 3 migrations to Production unchanged: they must preserve and archive legacy master records instead of remapping or deleting them. Phase 4 must also replace the 16-slot cohort generator with the 31-item timeline and define existing-cohort material propagation.

Continue with one account-dependent task at a time and never paste credentials, OAuth codes, signed file URLs, or private student data into chat or documentation.

---

## Phase 4 handoff — Cohorts and release automation

Date: 31 July 2026

Status: **Signed off**

### Completed implementation and verification

- New cohorts generate all 31 approved timeline items from a Week 0 Friday in one database transaction.
- Friday items start at 8:00 PM IST; Saturday and Sunday items start at 10:00 AM IST. Orientation lasts one hour and other items use the approved two-hour default.
- Week 0 pre-reads release immediately, later pre-reads release exactly seven days before their item, and worksheets release at item end.
- New cohorts inherit current master materials and worksheet counts. Existing Phase 4 cohorts receive later additions through an explicit, additive, idempotent Admin sync.
- Student availability uses database-owned release timestamps, locked Notion and worksheet direct URLs remain denied, and the obsolete inferred Section column is removed.
- Two disposable staging cohorts with different start dates each generated 31 correct sessions with zero date, time, duration, material-link, release, or question-count errors.
- Production preserved 16 linked legacy master sessions as archived history and added 31 current `mvp-2026` sessions. Existing batches remained readable while current Admin workflows show only the 31 approved items.
- Pull request #4 merged at `579f468`. The guarded Production deployment, HTTP probes, Production Admin Google journey, logout, and migration-ledger reconciliation passed.

### Phase 4 sign-off decision

Phase 4 is accepted because cohort generation, programme time-zone rules, all required material releases, direct-URL protection, master inheritance, explicit synchronization, legacy preservation, staging verification, Production rollout, and operational migration records pass.

### Phase 5 continuation point

Phase 5 is **Adapt the Student experience**. Start from updated `origin/main` on a new feature branch. Retain the 31-item schedule and database-owned release boundaries. Adapt the dashboard to show the next relevant action and a chronological Week 0 timeline with pre-read, class, worksheet, and tracker order plus Available now, Upcoming, Available after class, empty, and actionable error states.

Do not reopen Phase 4 scheduling, legacy archival, or release enforcement unless a new failing probe contradicts this signed evidence. Remaining master Notion links and worksheets may be populated through Admin as approved in Phase 3.

---

## Pre–Phase 5 foundation checkpoint — Student experience preparation

Date: 1 August 2026

Status: **Signed off — Phase 5 implementation may begin**

### Product decisions now locked

- Recommended practice appears above This week.
- Each released prior-week worksheet is one whole weekly task visible throughout the current week; there are no daily worksheet quotas or question ranges.
- This week recommends the DI pre-read on Thursday, VA pre-read on Friday, and QA pre-read on Saturday in `Asia/Kolkata` without changing material release rules.
- Timeline is the default course view. Browse by section contains exactly QA, VA, and DI; there are no topic tags or topic taxonomy.
- Phase 5 academic items expose compact Pre-read, Video, and Worksheet actions when those destinations exist. Do not show a disabled or broken Log action.
- Phase 6 adds a persistent Practice log overview grouped by course week plus direct Update log links from Recommended practice, Timeline, and Browse by section. Every entry point opens the same worksheet-specific records.
- The Phase 6 worksheet log allows Select all, Mark selected Done, and Mark selected for review; unselected questions are never changed by a bulk action. Optional time and comments remain available.
- Admin-managed YouTube recordings, post-class release, new-cohort inheritance, and explicit existing-cohort synchronization are Phase 5 scope.
- The launch interface is desktop-first. Mobile optimisation is deferred; keyboard navigation, text zoom, and common laptop/desktop widths remain required.

### Authoritative curriculum labels

- The approved QA/VA/DI labels are recorded in the [revised course structure](../phase-3/revised-course-structure.md).
- The ordered migration [20260801090000_refine_academic_curriculum_titles.sql](../../supabase/migrations/20260801090000_refine_academic_curriculum_titles.sql) updates only active `mvp-2026` master titles by stable curriculum key; sequence, schedule, instructor, release, and historical rows remain unchanged.
- The migration was applied successfully in staging on 1 August 2026; its built-in assertion confirmed all 17 approved rows. It has not been applied to Production as part of preparation.

### Required reading before Phase 5 implementation

Phase 5 must read these links before changing application code:

1. [MVP acceptance criteria](../../instruction/Ace_Club_LMS_MVP_Acceptance_Criteria.md), especially sections 3–8 and 12.
2. [Product roadmap](../../instruction/Ace_Club_LMS_Product_Roadmap.md), especially the Pre–Phase 5 checkpoint and Phases 5–6.
3. [Student experience foundation plan](../phase-5/student-experience-foundation-plan.md).
4. [Decision summary](../phase-5/student-experience-foundation.md).
5. [UI state and content matrix](../phase-5/ui-state-and-content-matrix.md).
6. [Preparation and delivery verification checklist](../phase-5/manual-verification-checklist.md).
7. [Approved revised course structure](../phase-3/revised-course-structure.md).
8. [Living coding rules](../development/coding-rules.md), plus the relevant Next.js 16 guides under `node_modules/next/dist/docs/` before writing code.

The reviewed clickable desktop prototype is stored locally at `/Users/tanishagarg/.codex/visualizations/2026/07/31/019fb91b-ccea-7a61-b0ef-bdf67899be49/weekly-student-dashboard.html`. It is a behaviour reference, not product authority; the linked acceptance criteria and state matrix control if they differ.

### Durable record of the preparation chat

The Phase 5 task does not need the original chat or source screenshots. Every approved decision and preparation artifact from that discussion is preserved here:

| Chat outcome | Durable repository record |
| --- | --- |
| MVP scope, weekly guidance, QA/VA/DI browsing, material access, desktop-first scope, and tracker behaviour | [MVP acceptance criteria](../../instruction/Ace_Club_LMS_MVP_Acceptance_Criteria.md) |
| Pre–Phase 5 gate, Phase 5 implementation scope, YouTube propagation, and Phase 6 Practice log/tracker scope | [Product roadmap](../../instruction/Ace_Club_LMS_Product_Roadmap.md) |
| Annotated UX preparation plan and locked delivery exit criteria | [Student experience foundation plan](../phase-5/student-experience-foundation-plan.md) |
| Consolidated product and engineering decisions | [Decision summary](../phase-5/student-experience-foundation.md) |
| Recommended practice, This week, Timeline, section browsing, material, failure, and Phase 6 log states | [UI state and content matrix](../phase-5/ui-state-and-content-matrix.md) |
| Preparation gate plus Phase 5–6 manual acceptance scenarios | [Preparation and delivery verification checklist](../phase-5/manual-verification-checklist.md) |
| Approved timetable-derived QA/VA/DI class labels, including the five DI labels | [Revised course structure](../phase-3/revised-course-structure.md) |
| Staging-safe update of all 17 academic titles by stable curriculum key | [Ordered title migration](../../supabase/migrations/20260801090000_refine_academic_curriculum_titles.sql) |
| Reviewed interaction direction, including whole-worksheet recommendation rows and future selected-question bulk logging | Local [weekly Student dashboard prototype](/Users/tanishagarg/.codex/visualizations/2026/07/31/019fb91b-ccea-7a61-b0ef-bdf67899be49/weekly-student-dashboard.html) |

The timetable screenshots and WhatsApp images were source references only. Their approved content is now authoritative in the revised course structure and title migration; temporary image paths are not continuation dependencies.

### Phase boundary and manual-work status

- Phase 5 implements the Student experience, weekly recommendation logic, Timeline, QA/VA/DI browsing, compact released-material access, YouTube Admin management and cohort propagation, and removal of legacy Student analytics.
- Phase 5 shows Open worksheet but no non-functional Log control.
- Phase 6 implements the persistent Practice log overview, worksheet-specific question logs, selected-question bulk status changes, optional time/comments, persistence, retry, and privacy behaviour.
- There are no remaining Product Owner preparation tasks before Phase 5.
- The title migration passed in staging. Do not apply it to Production merely as preparation; Production rollout requires the normal reviewed release path.
- If later work needs an account-dependent manual action, assign only one small task at a time. Use repository and terminal checks by default; do not control Chrome or the computer unless the Product Owner explicitly changes that instruction.

### Git state before Phase 5 code

At this checkpoint, the preparation documents and title migration are still uncommitted in the working tree on `codex/phase-4-signoff`. The checked local `origin/main` reference is Phase 4 merge commit `579f468`; local `main` is stale.

Before writing Phase 5 application code:

1. Preserve every current preparation change; do not discard or overwrite the dirty working tree.
2. Move the approved preparation work onto a dedicated `codex/phase-5-*` branch based on `origin/main`.
3. Commit the preparation checkpoint separately from Phase 5 application code so its scope and approval remain reviewable.
4. Read the relevant Next.js 16 documentation required by `AGENTS.md`, then begin implementation.

### Exit criteria before Phase 5 starts

- [x] MVP acceptance criteria and roadmap reflect the approved Student experience, weekly practice, section browsing, YouTube, tracker, and desktop-first scope.
- [x] The MVP acceptance criteria and product roadmap are maintained in Markdown only; parallel Word copies and synchronization tooling are removed.
- [x] Detailed QA/VA/DI labels are documented and an ordered migration exists.
- [x] Foundation plan, decision summary, state matrix, verification checklist, and approved prototype direction are aligned.
- [x] Phase 5 and Phase 6 exit criteria are defined before implementation.
- [x] Apply the title migration to staging; its built-in assertion confirmed all 17 academic rows by stable curriculum key on 1 August 2026.
- [x] Product Owner approved the final state/content matrix and Engineering readiness was recorded on 1 August 2026.

### Resume instruction

> Continue Ace Club LMS from this signed Pre–Phase 5 foundation checkpoint. Read every item under Required reading before Phase 5 implementation. Phase 5 application work is now authorized. Preserve the 31-item schedule and database-owned release boundaries. Do not reintroduce daily worksheet targets, topic taxonomy, rankings, correctness, accuracy, or auto-graded practice. Include master YouTube-link management and propagation in Phase 5. Show worksheet access in Phase 5 without a dead Log control; keep the central Practice log, worksheet tracker persistence and bulk-selected status changes in Phase 6. Use repository and terminal checks only unless the Product Owner explicitly authorizes another tool, and assign one account-dependent manual task at a time.

This historical start instruction is superseded for recordings by the later batch-specific Product Owner revision in the active Phase 5 section.

---

## Phase 5 handoff — Adapt the Student experience

Date: 2 August 2026
Status: **Signed off**

### Completed implementation

- The Student dashboard now presents Recommended practice above This week, followed by a chronological 31-item Timeline grouped by programme week.
- Timeline is the default view. Browse by section exposes exactly QA, VA, and DI in curriculum order; non-academic events remain Timeline-only.
- Recommended practice independently rotates a maximum of one released worksheet each for DI, VA, and QA. A worksheet enters after its class ends, leaves when the next same-section class begins, and remains available in Timeline and section browsing.
- Timeline and section cards expose compact Pre-read, Recording, and Worksheet actions only when configured. Locked resources show release timing, and missing resources do not create broken controls.
- Week 0 uses controlled disclosure state: it opens during programme Week 0, starts collapsed after advancement, and remains expandable. Past or future material return links open their target week and focus the matching Timeline card.
- Curriculum-item and material destinations preserve the preparation, class, recording, and worksheet journey. Timeline/section switching preserves scroll position.
- Student sign-out redirects to login and reports failures. Global Admin/Student operation notifications are mounted and dismissible.
- Notion and protected PDF viewers provide explicit loading, failure, retry, and recovery states. Private PDF access continues through short-lived authenticated signed URLs.
- Admins manage titled, validated YouTube recordings on individual batch sessions. Each recording is batch-owned and releases at that session's end.
- New cohort generation and Sync materials continue to copy reusable pre-reads and worksheets but exclude recordings.
- Rank, percentile, correctness, accuracy, streak, daily targets, and auto-graded practice are absent from the reachable Student experience.

### Staging verification and review fixes

- The complete Phase 5 manual record is in [manual staging verification](../phase-5/evidence/manual-staging-verification-2026-08-02.md), and the acceptance state is in the [Phase 5 checklist](../phase-5/manual-verification-checklist.md).
- Product Owner staging checks passed for Timeline and QA/VA/DI browsing, rotating recommendations, material destinations and release states, Week 0 behaviour, sign-out, notification feedback, scroll preservation, return navigation, private YouTube viewing, and recoverable Notion/PDF failures.
- The original master-recording propagation tests passed but were superseded by the Product Owner's later batch-specific recording decision; they remain historical evidence only.
- Review fixed return navigation into collapsed weeks and the former master-recording removal path. The batch-specific revision removed legacy cross-batch recording copies and isolated all new recordings on their selected batch sessions.
- Staging and Production are applied and reconciled through `20260802235900_cascade_master_material_removals.sql`. Two-batch recording isolation, local editing, validation, post-class release, new-cohort exclusion, Sync materials exclusion, and orphaned-master-material cleanup all passed.
- `npx tsc --noEmit`, targeted ESLint for Phase 5-touched files, deterministic recommendation/release assertions, and the guarded Next.js 16.2.4 Production build pass. Vercel Preview checks pass.

### Pull request and release boundary

- Branch: `codex/phase-5-student-experience`.
- Pull request: [#5 — Build Phase 5 student course experience](https://github.com/theadmitco-tech/ace-club-lms/pull/5).
- Original accepted implementation head before the recording-rule revision: `e401450`.
- Product Owner signed off Phase 5 on 2 August 2026 after complete staging acceptance.
- PR #5 is the merged Phase 5 implementation.
- Production rollout passed on 3 August 2026. Because the Free Supabase project had no managed backup or PITR, restricted migration `20260801085900_snapshot_phase5_rollout_state.sql` captured the affected tables and database definitions before mutation. The complete record is in [Production rollout evidence](../phase-5/evidence/production-rollout-2026-08-03.md).
- Repository-wide lint still reports 22 errors and 3 warnings in untouched legacy Admin worksheet/session editors, registration/payment routes, and helpers. Phase 5-touched files are clean; do not misreport the legacy lint baseline as resolved.

### Post-acceptance Product Owner revision — recordings

On 2 August 2026, the Product Owner clarified that every batch uses a different YouTube recording for the same curriculum session. This supersedes the earlier master-recording inheritance and propagation decision without changing pre-read or worksheet reuse.

- Recordings are stored and managed on individual batch sessions.
- Adding, editing, or removing a recording in one batch must not change another batch.
- New cohort generation does not copy recordings.
- Sync materials continues to add or update reusable pre-reads and worksheets but never recordings.
- Legacy master-derived cross-batch copies are cleaned up; new recordings are created only on the selected batch session.
- The database owns the recording release timestamp and forces it to the selected batch session's end.

Staging passed two-batch link isolation, batch-local editing, invalid-link validation, post-class release, new-cohort non-inheritance, and Sync materials non-propagation.

### Phase 6 continuation point

Phase 6 is **Simplify the tracker**. The only unchecked items in the shared Phase 5–6 checklist are intentionally deferred tracker behaviours: the persistent Practice log, worksheet-specific Student–worksheet–question records, Select all, bulk Done/review updates that never affect unselected questions, persistence, shared deep links, and partial-failure retry.

Do not add a Log or Update log control until its real Phase 6 destination and persisted records exist. Every future entry point from Recommended practice, Timeline, Browse by section, and the central Practice log must address the same worksheet records without duplication. Begin Phase 6 from updated `origin/main` on a new feature branch.

---

## Phase 6 handoff — Simplify the tracker

Date: 3 August 2026
Status: **Signed off and deployed to Production**

### Outcome

Phase 6 is complete. Students now have a persistent, manual, release-aware Practice log backed by independent Student–course–session–worksheet–question records. [PR #7](https://github.com/theadmitco-tech/ace-club-lms/pull/7) merged the implementation to `main` at merge commit `13aeb9e`; Vercel deployed that commit to Production and both Student and Admin smoke tests passed.

Authoritative Phase 6 records:

- [Phase 6 implementation status and boundary](../phase-6/README.md)
- [Manual verification checklist](../phase-6/manual-verification-checklist.md)
- [Automated verification evidence](../phase-6/evidence/automated-verification-2026-08-03.md)
- [Staging migration evidence](../phase-6/evidence/staging-migration-application-2026-08-03.md)
- [Manual staging acceptance evidence](../phase-6/evidence/manual-staging-verification-2026-08-03.md)
- [Production rollout evidence](../phase-6/evidence/production-rollout-2026-08-03.md)

### Product decisions and delivered Student experience

- Student navigation contains persistent `Course` and `Practice log` destinations.
- The Product Owner revised the Practice log overview from programme-week groups to curriculum section/event-type groups. `QA`, `VA`, and `DI` are ordered first; other worksheet-bearing types such as `MOCK` remain visible in separate groups. Programme week remains visible on every worksheet row.
- Each released worksheet row shows Done, Come back for review, Not updated, and last-update information and opens the canonical worksheet workspace.
- Recommended practice, Timeline, Browse by section, curriculum-item detail, and Practice log all resolve to the same material route and persisted records. Conditional Log or Update log controls appear only when the worksheet is released and tracker records exist.
- The canonical desktop workspace places the protected PDF and manual question log together. At common desktop and laptop widths, the tracker has sufficient width for Status, Time, and Comment without page-level horizontal scrolling; at the 200%-zoom equivalent it stacks and contains table overflow locally.
- Each question supports exactly one Student-selected status: `Done` or `Come back for review`. `Not updated` is a system-owned null state, not a third selectable value.
- Optional time uses validated `mm:ss`; optional comments save on blur. Individual changes autosave with explicit saving, saved, and actionable retry feedback.
- Select all and selected-question bulk actions support Mark selected Done and Mark selected for review. Confirmation names the count and target status, unselected questions remain unchanged, successful records stay saved during a partial failure, failed question numbers remain selected, and Retry failed only resubmits failed records.
- Rank, accuracy, correctness, streaks, daily targets, automated grading, and other legacy analytics remain absent from the reachable Student tracker.

### Database and authorization implementation

- Ordered migration `20260803120000_add_student_practice_log.sql` creates `public.student_question_logs` with a unique identity across `user_id`, `course_id`, `session_id`, `material_id`, and `master_question_id`.
- Enrollment, copied-worksheet, and master-question triggers provision missing tracker rows idempotently. Existing eligible enrollments are backfilled by the migration.
- The database prevents tracker identity changes, prevents returning an existing status to Not updated, validates non-negative time and bounded comments, and owns `updated_at`.
- `get_student_practice_log`, `get_student_worksheet_log`, and `update_student_question_log` provide the released Student surfaces. The Student timeline RPC was extended to expose canonical tracker availability without bypassing material release.
- RLS permits an active enrolled Student to read and update only their own released tracker rows. Signed-out, cross-student, deactivated, unenrolled, and unreleased access is denied.
- Authorised Admins may read Student tracker rows for Phase 7, but do not become Student owners and do not receive Student write access.
- Privileged provisioning functions are not executable by ordinary callers; only the three authenticated tracker RPCs receive their intended execution grants.
- The tracker deliberately does not reuse legacy answer, correctness, attempt, daily-target, or worksheet-plan models.

### Staging application and acceptance

- The migration applied successfully to staging Supabase `eyphkkginlgoaxflauog`; the SQL Editor returned `Success. No rows returned`.
- Provisioning probes passed for existing coverage, new enrollment, copied worksheets, new questions, and duplicate protection.
- Privacy probes passed for cross-student read/write denial, signed-out denial, deactivated-Student denial, release boundaries, and Admin read-without-ownership behavior.
- A staging audit found 20 expected rows for the exercised released worksheet, zero missing rows, zero duplicate identity groups, and zero Admin-owned rows.
- The Product Owner verified overview grouping, totals, last updated, canonical navigation, individual status replacement, time/comment persistence, selected-only bulk updates, Select all, invalid-duration recovery, partial-failure identification, failed-only retry, refresh persistence, sign-out containment, and the final wider desktop layout.
- Browser verification confirmed the same records through the canonical course links, no page/table overflow at a 1280px laptop width, stacked behavior at a 640px CSS viewport, no final console errors, and visible keyboard focus. The Select all focus fix at `9f2c641` produces a solid 3px gold outline with 2px offset.
- Current staging data contained no eligible Recommended practice worksheet and no released QA/VA/DI worksheet for positive clicks. Their conditional absent states and shared-route implementation contract passed; Timeline and curriculum-item canonical links passed positively. Do not misreport unavailable data paths as failed behavior.

### Quality state

- `npx tsc --noEmit`: pass.
- Targeted ESLint for every Phase 6-touched TypeScript file: pass with zero findings.
- Guarded Next.js 16.2.4 Production build: pass.
- `git diff --check`: pass.
- Repository-wide lint remains at the signed Phase 5 baseline of 22 errors and 3 warnings in untouched legacy Admin worksheet/session editors, registration/payment code, the public home page, and legacy helpers. Phase 6 did not introduce new lint findings. Do not report this baseline as resolved.

### Production rollout

- Production Supabase is `owmlxsnzogfapotmjrqk`; the Production application is [aceclub.theadmitco.com](https://aceclub.theadmitco.com).
- Preflight confirmed no existing Phase 6 table, one enrollment, 12 linked worksheets, and `master_worksheet_questions` as the question source.
- The ordered migration applied successfully and returned `Success. No rows returned`.
- Post-migration validation found RLS enabled and all three tracker RPCs present. Expected, actual, missing, and duplicate tracker-row counts were all zero. Zero is correct because Production currently has no eligible enrolled worksheet-question combination.
- Vercel reported the `main` deployment for merge commit `13aeb9e` Ready in Production.
- Student smoke testing passed Dashboard, Course/Practice log navigation, the deliberate `No released worksheets yet` state, and Return to course.
- Admin smoke testing passed the Admin dashboard and existing Students/courses/sessions; direct Admin access to `/practice` redirected to `/admin`.
- The final Production database check remained at zero total tracker rows, zero Admin-owned tracker rows, and zero duplicate identity groups. Smoke testing created or modified no Production tracker data.

### Git, documentation, and local recovery state

- Implementation branch: `codex/phase-6-practice-log`.
- Merged pull request: [#7 — Codex/phase 6 practice log](https://github.com/theadmitco-tech/ace-club-lms/pull/7).
- Accepted feature head: `83fc250`; Production merge commit: `13aeb9e`.
- Production-rollout documentation branch: `codex/phase-6-production-rollout`. Its README checkpoint is `a67e8f0`; the evidence/handoff update is prepared after that checkpoint and must be pushed and merged before starting Phase 7.
- A recoverable local Git stash named `preserve unexpected local Phase 6 migration truncation` contains an unrelated accidental blanking of the Phase 6 migration from the former feature branch. It is intentionally excluded from rollout documentation. Do not apply or drop that stash without reviewing it with the Product Owner; the committed migration on `main` remains intact.

### Phase 6 sign-off decision

Phase 6 is accepted because the manual Student tracker, release-aware provisioning, ownership and RLS boundaries, canonical entry points, individual and selected-only bulk persistence, optional time/comments, autosave, partial-failure recovery, keyboard and desktop behavior, staging evidence, Production migration, Production deployment, authenticated smoke tests, and post-smoke database checks all pass.

### Phase 7 continuation point

Phase 7 is **Adapt admin progress**. After the Production-rollout documentation branch is merged, start from updated `origin/main` on a new `codex/phase-7-*` branch.

1. Reuse `student_question_logs` and its authorised Admin read boundary; do not create a parallel tracker or transfer ownership to Admins.
2. Adapt existing Admin cohort/student-detail surfaces to show per-worksheet Done, Come back for review, Not updated, and last-update totals.
3. Allow authorised Admin inspection of question number, Student-entered status, optional time, comment, and last update.
4. Calculate completion only as Done divided by total worksheet questions. Review is not complete; Not updated remains system-owned.
5. Keep Admin access read-only unless product authority explicitly changes. Preserve cross-student privacy, enrollment scope, release rules, and the Student write boundary.
6. Remove advanced V2 analytics from the MVP Admin progress interface rather than rebuilding rank, accuracy, correctness, daily targets, trends, alerts, filters, or CSV exports.
7. Reuse the Phase 6 RPC/table contract where viable and add only the minimum Admin query surface required by `AC-ADMIN-01` through `AC-ADMIN-04`.
8. Verify Admin totals against the same Student records, question-level inspection, role denial, deactivation and cross-student privacy, empty Production-like data, targeted lint, TypeScript, guarded build, and common desktop/keyboard states.

Do not reopen Phase 6 tracker design, Student ownership, section-based grouping, or persistence unless new evidence contradicts this signed record. Do not seed Production tracker data merely to make Phase 7 screens non-empty; use staging fixtures and rollback-only probes for positive coverage.

### Resume instruction

> Continue Ace Club LMS from the signed Phase 6 handoff in `docs/handoffs/ace-club-lms-running-handoff.md`. Read `AGENTS.md`, the instruction register, the MVP acceptance criteria, the Phase 7 roadmap section, the Phase 6 status/checklist/evidence, the documentation index, and coding rules. Confirm the Phase 6 Production-rollout documentation PR is merged, fetch updated `origin/main`, and create a new `codex/phase-7-*` branch. Preserve `student_question_logs`, Student ownership, release-aware RLS, the three Phase 6 tracker RPCs, section-based Practice log grouping, and the signed 22-error/3-warning untouched lint baseline. Build read-only Admin progress from the same Student records, optimize for tokens, and give one account-dependent task at a time.

## Phase 7 — Adapt Admin Progress

### Current status

Phase 7 is complete. Read-only Admin progress now uses the Phase 6 Student-owned tracker records for cohort totals and question-level inspection. [PR #9](https://github.com/theadmitco-tech/ace-club-lms/pull/9) merged at `8a96a45`; the migration, Vercel Production deployment, live HTTP probes, authenticated Student/Admin smoke tests and post-smoke ownership check passed.

### Accepted implementation

- `/admin/progress` lists batches; the batch view shows every enrolled Student against released eligible worksheets with Done, Come back for review, Not updated, completion and last update.
- Admin question inspection exposes the canonical question number, Student-selected status, optional time, comment and last update without write controls or ownership transfer.
- `get_admin_course_practice_progress` and `get_admin_student_worksheet_progress` are authenticated Admin-only read RPCs with enrollment, publication and release boundaries.
- Dashboard, Batches and Users reach the same progress surface. `/admin/worksheets` redirects to `/admin/progress`.
- Rank, correctness, accuracy, daily targets, on-track/behind analytics, trends, alerts, filters and CSV exports are absent from the reachable Admin progress interface.
- Student, signed-out, mismatch, inactive-history, empty-data, keyboard, text-zoom, responsive and read-only boundaries passed. The Product Owner accepted all 34 staging checks.
- Production remains at zero tracker rows and zero Admin-owned tracker rows; no data was seeded for positive coverage.

### Phase 8 continuation point

Phase 8 is **Pilot, launch and stabilise**. Begin from updated `origin/main` after the Phase 7 rollout-documentation PR is merged.

1. Use one Test Admin and one Test Student for a controlled rehearsal, then pilot with five to ten first-time Students. Four first-time Students may be used for an early rehearsal but do not satisfy the signed pilot gate.
2. Exercise Week 0, scheduled pre-read, class, released worksheet, matching Student/Admin progress, permissions, time-zone and supported desktop-browser behavior.
3. Bring repository-wide lint from the signed 22-error/3-warning legacy baseline to zero without suppressing findings.
4. Correct broken scripts, unsafe setup guidance and stale documentation; retire only launch-interface paths proven unreachable.
5. Preserve historical data until retention, backup and rollback decisions authorize physical deletion.
6. Fix critical/high defects, launch the first live cohort and monitor key failures.

### Resume instruction

> Continue Ace Club LMS from the signed Phase 7 handoff in `docs/handoffs/ace-club-lms-running-handoff.md`. Read `AGENTS.md`, the instruction register, the MVP acceptance criteria, the Phase 8 roadmap section, `docs/phase-8/README.md`, the Phase 8 pilot plan/checklist, the Phase 7 status/checklist/staging/Production evidence, the documentation index, cleanup plan and coding rules. Confirm PR #10 is merged, fetch updated `origin/main`, and create a new `codex/phase-8-*` implementation branch. Preserve the signed Phase 1–7 authentication, curriculum, schedule/release, Student tracker and Admin read-only boundaries. Work through launch cleanup, rehearsal, a five-to-ten first-time-Student pilot, stabilization and monitored launch; do not perform destructive data cleanup without a separately reviewed retention and rollback decision.

---

## Post–Phase 7 curriculum revision — Weekly class days

Date: 4 August 2026
Status: **Product decision approved; implementation prepared; Production application pending**

The Product Owner removed Orientation from the active curriculum and approved Friday VA, Saturday QA/mocks, and Sunday DI. Week 3 has no Sunday class. All approved detailed academic titles, instructors, master IDs, pre-reads, worksheets, and question associations remain unchanged.

The one-day preparation emphasis is now Thursday VA, Friday QA, and Saturday DI. Configured pre-reads still release exactly seven days before class; recommendation emphasis does not alter release or authorization.

The durable decision is [ADR-0003](../decisions/adr-0003-weekly-course-schedule.md). Ordered migration `20260804120000_realign_weekly_course_schedule.sql` archives Orientation, realigns existing cohort sessions and material release timestamps, and changes future generation to 30 active timeline items. Do not mark this revision deployed until the Production SQL result and application rollout are verified.

---

## Phase 8 handoff — Pilot, launch and stabilise

Date: 10 August 2026
Status: **Signed off with explicit evidence exceptions**

### Operational outcome

The Product Owner confirmed that the MVP is running in Production with real Students and approved Phase 8 closure. This confirmation establishes the operational launch outcome. It does not retroactively prove every item in the proposed pilot checklist.

Closeout verification was deliberately non-mutating:

- latest remote `main` was confirmed at `0e7be4d`, including the merged PDF-upload fix from PR #14;
- the local Next.js Production build, including TypeScript, passed;
- anonymous read-only requests to Production `/` and `/login` returned HTTP 200; and
- no Supabase query, migration, Vercel action, Production login, account operation, deployment, or application-code change was performed.

### Explicit exceptions and remaining debt

- Repository-wide lint remains at 22 errors and 3 warnings; the original zero-lint Phase 8 target is not met.
- No complete anonymized five-to-ten-Student pilot matrix, defect register, authenticated Phase 8 Production smoke-test record, or first-cycle monitoring record is committed.
- The Production application of `20260804120000_realign_weekly_course_schedule.sql` remains unverified in repository evidence. The earlier pending statement is preserved; live application service is not proof of a specific migration ledger entry.
- Public registration/payment scope remains unresolved unless a separate Product Owner decision records it.

These items must not be described as passed. They are accepted closeout exceptions and may be addressed as scoped post-MVP operational or pilot iterations.

### Continuation point for iterative pilot changes

Continue post-MVP pilot work in the separate [Pilot Iterations Running Handoff](pilot-iterations-running-handoff.md) so V1/V2 working notes do not expand this signed Phase 0.5–8 history. Start every pilot version from updated `origin/main` on a new `codex/pilot-vN` branch. Define three or four coherent changes with explicit acceptance criteria, keep all local and Preview work connected to staging, apply ordered migrations to staging first, and merge to `main` only after the version is independently releasable and the Product Owner approves Production. Preserve the signed authentication, RLS, release, Student ownership, and read-only Admin boundaries.

Authoritative closeout records:

- [Phase 8 status and exceptions](../phase-8/README.md)
- [Closeout checklist](../phase-8/manual-verification-checklist.md)
- [Operational closeout evidence](../phase-8/evidence/operational-closeout-2026-08-10.md)
- [Pilot iterations running handoff](pilot-iterations-running-handoff.md)
