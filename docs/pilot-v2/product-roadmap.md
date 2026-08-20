# Pilot V2 — Product Roadmap

Status: Phase 1–6 accepted; Phase 7 preflight/recovery complete; Production unauthorized
Owner: Product owner and Engineering
Last updated: 20 August 2026

## Purpose and authorization boundary

This roadmap sequences the approved [Pilot V2 acceptance criteria](acceptance-criteria.md) into product phases and review gates. These are Pilot V2 execution phases, not amendments to the signed MVP roadmap.

Roadmap approval does not authorize application changes, migrations, staging mutations, merge, deployment, Production changes or modification of an existing batch. Each later gate retains the authorization rules in the [Pilot V2 running handoff](README.md).

## Phase summary

| Phase | Product outcome | Product Owner review | Exit state |
|---|---|---|---|
| Phase 0 | Exact template, interface and technical baseline | Templates, screenshots, compatibility and plans | Ready for separately approved implementation |
| Phase 1 | Four editable course templates | Four rendered templates and one editing journey | Template foundation accepted |
| Phase 2 | Intuitive batch creation and schedule editing | Creation, extra class, shifts and reordering | Schedule builder accepted |
| Phase 3 | Flexible standalone, Section and session resources | Notion, PDF, YouTube and recommendation journeys | Resource model accepted |
| Phase 4 | Flexible Student Home, Schedule and Resources | Full Course, crash course, mock and resources | Student experience accepted |
| Phase 5 | Integrated safety and non-regression | Authorization, isolation, tracker and compatibility report | Engineering/QA gate complete |
| Phase 6 | Product Owner staging acceptance | End-to-end immutable Preview | Accepted or rejected for Production planning |
| Phase 7 | Separately authorized Production release | Exact release plan and post-release evidence | Deployed or rolled back |

## Phase 0 — Product structure and read-only readiness

### Outcome

Convert the approved criteria into exact templates, interface specifications and a verified Git/environment/schema baseline.

### Work

- Receive and review the Product Owner's template/interface screenshot.
- Define all four template event structures, Sections, relative timing, instructors, mocks, starter packs and required/optional items.
- Specify the Admin template editor, batch builder, schedule editor, resource manager and Student surfaces.
- Fetch remote Git references read-only and record the exact `origin/main` baseline before creating a V2 implementation branch.
- Inventory staging and Production schema and migration ledgers read-only.
- Inventory at least two staging batches without recording identities.
- Map current Admin creation/edit flows and Student release consumers.
- Read and record the relevant bundled Next.js 16 guides.
- Produce the implementation plan, additive migration/data plan if needed, compatibility/rollback plan and manual checklist.

### Exit gate

- [ ] Four exact template definitions are approved.
- [ ] Admin and Student interface specifications are approved.
- [ ] Git, environment, schema and ledger state are recorded.
- [ ] Existing-batch compatibility is explicitly decided.
- [ ] Implementation, migration and staging plans are separately approved.

## Phase 1 — Editable template foundation

### Outcome

An authorized Admin can edit and preview the four seeded templates without changing code or existing batches.

### Work

- Seed Full Course, CR Crash Course, RC Crash Course and DI Crash Course templates.
- Implement the approved structured fields and validation.
- Preview event count, order, timing, instructors, publication defaults and reusable resources. Venue remains outside the reusable-template editor.
- Preserve independent existing batch snapshots.

### Exit gate

- [x] All four templates reproduce the approved definitions.
- [x] Valid edits save and invalid structures fail actionably.
- [x] Preview matches the saved result.
- [x] Editing a template leaves an existing batch unchanged.

Engineering evidence is complete. The Product Owner reviewed the four current templates and editing journey and accepted Phase 1 on 17 August 2026. This acceptance does not authorize Phase 2 implementation or any push, merge, deployment or Production action.

## Phase 2 — Batch creation and schedule builder

### Outcome

An Admin can create a batch from a template and safely adjust that batch's future delivery.

### Work

- Collect batch name, template, start date, IST display and publication state.
- Generate a complete proposed schedule using canonical `Asia/Kolkata` calculations.
- Allow eligible individual event editing.
- Allow an extra class to be added to one batch.
- Reorder any eligible future events or Sections.
- Shift a selected future event and subsequent eligible events by a chosen number of days.
- Compare before/after events and affected unreleased timestamps.
- Confirm atomically and idempotently.
- Apply the accepted enrolled/running-batch protections.

### Exit gate

- [x] One Full Course and one crash-course creation journey pass.
- [x] Extra-class, two-day-shift and arbitrary-reorder journeys pass.
- [x] Batch edits do not modify the template or another batch.
- [x] Completed/current event protections pass.
- [x] Retry creates no duplicate schedule or resource assignment.

## Phase 3 — Flexible resource management

### Outcome

Admins can manage reusable and batch-specific resources without fake sessions or cross-batch leakage.

### Work

- Support whole-batch, Section, session/event and standalone associations.
- Use the approved controlled resource categories.
- Support Notion starter/pre-read links, protected worksheet/Session-material PDFs and YouTube recordings.
- Release starter packs at batch creation behind publication/enrollment authorization.
- Preserve shipped pre-read, worksheet, recording and Session-material timing.
- Preserve reusable generation/sync and batch-owned recording/Session-material isolation.
- Implement the detailed Recommended Reading contract on Home.
- Preserve Recommended Practice exactly as shipped; do not add a new manual selector or change its timing.

### Exit gate

- [x] Multiple starter resources work without fake sessions.
- [x] Notion, protected PDF and YouTube journeys pass.
- [x] Current session-linked release boundaries remain correct.
- [x] Released material remains accessible after rescheduling.
- [x] Two batches prove recording and Session-material isolation.

Local engineering completed the additive resource model, reusable-resource authoring for all four templates, retained Full Course Master Base links, atomic/idempotent batch inheritance, reviewed stale-safe explicit sync, the server-authorized Admin batch resource manager, protected PDF upload paths, controlled validation, released-resource protection and focused tests on 18 August 2026. The exact migration was then applied to Staging, the bounded 8/8 probe and cleanup passed, and the Product Owner confirmed protected template PDF upload and accepted Phase 3 on 18 August 2026.

## Phase 4 — Flexible Student portal

### Outcome

Students can understand what is next and browse all available schedule and resource information without empty structural placeholders.

### Work

- Build the approved compact Home summary.
- Provide Full Course Week views.
- Provide crash-course Day views.
- Keep Section browsing in Resources rather than Schedule.
- Omit separate History and Chronological destinations.
- Expose standalone resources by Section and category.
- Order resource filters as instant-selection Sections, Topic and Category dropdowns with QA, VA and DI ordering, no Apply button and contextual choices; keep Starter Packs available with All Sections and All Topics.
- Show released Starter Packs in Home Recommended Reading before the batch starts.
- Present mocks with date, time, venue, reporting time, instructions and preparation.
- Preserve completed-event and released-resource access through Schedule and Resources.

### Exit gate

- [x] Full Course Week journeys pass.
- [x] Crash-course Day journeys pass.
- [x] Starter packs, Recommended Reading and Recommended Practice are discoverable.
- [x] Mock details are complete.
- [x] Empty weeks/days/placeholders are absent.

Local Engineering completed the backward-compatible Student projection, compact recommendation-driven Home, Full Course Week and crash-course Day Schedule views, released-resource filtering and first-class mock presentation on 18 August 2026. Later Product Owner reviews removed Next Mock/Recently Released/Explore from Home, removed Section mode from Schedule, collapsed empty recommendation Sections into one subsection-level state, added pre-batch Starter Packs to Recommended Reading and changed Resources to consistent instant-selection Sections, Topic and Category dropdowns with QA/VA/DI ordering. Exact Staging migrations, authenticated Full/crash journeys, responsive and protected-file checks passed. A final native-keyboard run found and fixed the missing Resources-select focus ring; the complete traversal and engineering gates then passed. The Product Owner accepted Phase 4 on 18 August 2026.

## Phase 5 — Integrated safety and non-regression

### Outcome

Flexible templates, schedules and resources preserve all signed security, privacy, release and Student-data boundaries.

### Work

- Verify signed-out, inactive, wrong-role, unenrolled, unpublished, pre-release, cross-student and cross-batch denial.
- Verify protected PDF delivery and no-store behavior.
- Verify Student tracker ownership and read-only Admin progress.
- Verify rescheduling preserves tracker/material relationships.
- Verify existing running and historical batches are unchanged.
- Verify loading, empty, validation, failure, retry, keyboard, 200%-zoom and supported desktop states.
- Run focused tests, targeted lint, TypeScript, guarded Production build, `git diff --check`, links and changed-file privacy/secret review.

### Exit gate

- [x] No critical/high authorization or privacy finding is open.
- [x] Cross-batch isolation passes with two different schedules.
- [x] Tracker and Admin-progress non-regression passes.
- [x] Existing-batch compatibility passes.
- [x] Changed interfaces and quality gates pass.

Phase 5 closed on 18 August 2026. Local integrated safety passed 8/8 and the consolidated Pilot V2 regression passed 45/45. Live role-crossover and native-keyboard checks passed. The explicitly approved bounded Staging probe passed 10/10 for two-schedule isolation, cross-student denial, Student-owned tracker persistence, Admin numerical parity/read-only behavior and an exact two-day schedule shift. Cleanup restored exact global course/session/material/enrollment/tracker counts with zero disposable batches or users remaining.

## Phase 6 — Staging acceptance

### Outcome

The Product Owner accepts or rejects the complete Pilot V2 bundle on one immutable staging-backed Preview.

### Review set

1. Full Course creation.
2. Every accepted crash-course creation.
3. Extra class, two-day shift and arbitrary reordering.
4. Enrolled/running-batch protections.
5. Starter, pre-read, worksheet, recording and Session-material behavior.
6. Full Course Week and crash-course Day views plus Section-filtered Resources.
7. Mock, Recommended Reading and Recommended Practice behavior.
8. Authorization, privacy, isolation, responsive and accessibility results.

### Exit gate

- [x] Required automated/manual evidence is linked.
- [x] No release blocker remains open.
- [x] Product Owner acceptance names exact commit `547581efccf74300f3902df024db8bf47a27fa25` and its immutable Preview.

## Phase 7 — Conditional Production release

### Outcome

Promote only a separately authorized source and migration set with a reversible, evidenced procedure.

### Work

- Prepare a dated conditional release plan naming the exact source, migrations, environment checks, rollback target and smoke actions.
- Run a read-only Production preflight and preserve sanitized aggregates.
- Obtain a new Product Owner instruction naming every authorized migration, merge, deployment, environment change, compatibility operation, fixture and smoke action.
- Apply only the named migrations after a pinned-CLI exact dry run.
- Deploy the reviewed merge commit and compare post-release aggregates.
- Record immutable Production evidence separately.

### Exit gate

- [ ] Exact Production authorization is recorded.
- [ ] Only named changes are executed.
- [ ] Application, schema and aggregate verification pass.
- [ ] Production evidence is complete, or rollback is recorded.

The dated [conditional Production release plan](production-release-plan-2026-08-20.md), read-only preflight and tested manual snapshot recovery were completed on 20 August 2026. This authorizes no Production action; all Production-changing exit boxes remain open.

## Deferred and excluded

- Blank-template creation, duplication and a fifth template
- Automatic template-to-existing-batch structural sync
- Separate Student History and Chronological modes
- Withdrawal of released material
- Public registration/payment
- New analytics, grading or progress systems
- Broad mobile redesign beyond non-regression
- Destructive legacy cleanup
- Automatic migration of running Production batches
- Weekly-schedule replacement and the excluded `20260804120000` migration
- Unrelated repository-wide cleanup

## Product Owner roadmap decision

- [x] Accept the phase sequence as written — approved 17 August 2026.
- [ ] Accept with modifications recorded in a dated amendment.
- [ ] Reject for revision.

Roadmap acceptance remains a planning decision and does not authorize implementation or any environment change.

Exact next action: Engineering completes Phase 0 documentation and read-only readiness. The Product Owner supplies the template/interface screenshot before the template and interface specifications can reach their Phase 0 exit gate.

## Subsequent Phase 1 authorization — 17 August 2026

The Product Owner supplied and approved the [exact template/interface specification](template-interface-specification.md), approved the Phase 0 plan set and instructed Engineering to implement Phase 1 locally. One additive migration file may be created. No staging or Production migration application, existing-batch change, merge or deployment is authorized by this update.

## Subsequent Phase 1 Staging authorization — 17 August 2026

The Product Owner authorized exact Staging-only application of `20260817090845_add_versioned_course_templates.sql` and the Phase 1 Staging verification. Engineering checks passed; the Product Owner now owns the rendered-template and editing-journey acceptance decision. Phase 2 and every push, merge, deployment and Production action remain separately gated.
