# Ace Club LMS V2 — Product Roadmap

> Current correction — 25 October 2026: [approved course model](../decisions/course-model-correction-2026-10-25.md) controls terminology and structure. Quant, Verbal and DI are complete individual courses; Full Course contains all three. Every course retains sessions, materials, recordings, pre-session reads and post-session reads. Only actual live classes require scheduling. Phase 2 review is paused; PR #24 stays Draft.

> Authority update — 20 October 2026: [preserved approvals](../decisions/README.md) supersede conflicting older requirements. The later [expiry confirmation](../decisions/phase-1-expiry-confirmation-2026-10-20.md) confirms denial after six months. PR #24 contains the Phase 2 Admin-authoring candidate. Broader journey requirements are not a claim of implemented or hosted acceptance; see the [28 October alignment audit](../phase-2/evidence/journey-decision-alignment-2026-10-28.md).

Status: Draft for Product Owner review
Owner: Product owner and Engineering
Last updated: 28 October 2026

This roadmap sequences the V2 acceptance criteria into intern-sized delivery phases. It is a planning document only. It does not authorize application changes, database migrations, merging, Production deployment, or changes to student/course data.

## Product model

V2 is an online-first LMS with two product types:

- **Full Course:** Quant + Verbal + DI together. Optional live delivery may run over approximately eight weeks; undated course content has no required schedule.
- **Individual course:** Quant, Verbal, or DI individually, complete courses with optional live classes and recording/material access.

Launch pricing:

- One individual course: ₹10,000.
- Two individual courses: ₹18,000.
- All three individual courses: ₹25,000, as approved in V2-DEC-03; this remains distinct from Full Course.
- Full Course: ₹25,000.

Full Course cannot be assembled by purchasing individual courses in parts. Students receive six months of access from successful payment. Live attendance is optional; recordings and website materials remain available.

## Phase summary

| Phase | Outcome | Primary owner | Exit gate |
|---|---|---|---|
| 0 | Product and technical baseline | Intern + Engineering | Scope, flows, data model, and risks reviewed |
| 1 | Product catalogue and entitlement foundation | Intern | Product access boundaries pass |
| 2 | Full Course and individual course publishing | Intern | Admin can publish both product types |
| 3 | Self-registration and payment | Intern | Verified payment creates correct access |
| 4 | Website learning delivery | Intern | Recordings, pre-reads, and materials work online |
| 5 | Admin publishing and content workflow | Intern | Admin can preview and publish materials safely |
| 6 | Integrated QA and staging acceptance | Intern + Product Owner | Acceptance criteria pass on Preview/Staging |
| 7 | Production launch preparation and release | Product Owner + Engineering | Separately approved release is ready |

## Phase 0 — Product and technical baseline

### Objective

Convert the approved decisions into an implementation-ready specification without changing code or data.

### Work

- Read `AGENTS.md`, the existing MVP documentation, V2 product decisions, acceptance criteria, and coding/release rules.
- Map current MVP users, courses, sessions, materials, registrations, payments, enrollments, and release logic.
- Identify which existing structures can support Full Course, individual course, section entitlements, six-month expiry, and independent schedules.
- Define the smallest safe additive data model, if changes are required.
- Define the Admin and Student journeys with screenshots or wireframes where useful.
- Prepare a compatibility and rollback note for existing MVP students.
- Record open implementation decisions, especially recording hosting and gradual Notion migration.

### Exit gate

- [ ] No conflict remains between the product decisions and acceptance criteria.
- [ ] Full Course cannot be accidentally purchased or granted by section.
- [ ] individual course access boundaries are defined.
- [ ] Existing MVP student treatment is documented.
- [ ] Proposed migrations and rollback approach are reviewed before implementation.

## Phase 1 — Product catalogue and entitlement foundation

### Objective

Represent Full Course and the three individual courses as explicit products with correct pricing and access rules.

### Work

- Add product definitions for Full Course, Quant individual course, Verbal individual course, and DI individual course.
- Store prices as commercial configuration.
- Model section entitlements separately from product presentation where necessary.
- Apply six-month access expiry from verified payment time.
- Ensure Full Course grants all three sections together.
- Ensure individual courses grant only the purchased section.
- Prevent individual courses from silently creating Full Course entitlement.
- Preserve current MVP access while migration remains unapproved.

### Exit gate

- [ ] All four products can be represented without hard-coded UI assumptions.
- [ ] Pricing is correct.
- [ ] Entitlement tests pass for every product.
- [ ] Expired access is denied consistently.
- [ ] Cross-section and Full Course leakage tests pass.

## Phase 2 — Full Course and Individual Offering publishing

### Objective

Allow an Admin to create and publish complete Full Course, Quant, Verbal and DI structures, with optional independent live-class schedules.

### Work

- Create Full Course and individual Quant, Verbal and DI offerings.
- Keep course sessions and their materials, recordings, pre-session and post-session reads separate from live-class events.
- Leave non-live course content undated; only actual live classes need scheduling.
- Preview the complete course structure and content references before confirming publication.
- Support approximately eight-week Full Course schedules.
- Support complete individual courses with optional live-class schedules; no compressed-duration assumption.
- Allow Admins to configure other durations where approved.
- Specify included sections, delivery mode, dates, times, instructors, Google Meet details, recordings, and materials.
- Allow Full Course and individual course schedules to differ.
- Publish, edit, unpublish, and republish batch details.
- Publish the approved eight-student live-course registration limit as metadata. Phase 3 must enforce paid seat allocation; Phase 2 schedule membership is not a registration allocator.
- Exclude per-session reservations and waitlists from the current scope.

### Exit gate

- [ ] Admin can create and publish the Full Course structure, including all three sections.
- [ ] Course sessions and all four content collections are preserved without requiring live events.
- [ ] Draft edits do not alter published content until a new preview is confirmed.
- [ ] Whole-course publish, edit, unpublish and republish preserve revision history and independent batches.
- [ ] Private Google Meet details remain Admin-only.
- [ ] Admin can publish Quant, Verbal, and DI individual courses.
- [ ] Full Course and individual course schedules remain independent.
- [ ] An individual course can be recording/materials-only when no live batch exists.
- [ ] Published schedule changes appear only to entitled students enrolled in that batch.

## Phase 3 — Self-registration and payment

### Objective

Allow students to select and pay for a product without routine Admin enrollment.

### Work

- Display published products and relevant batch details on the website.
- Collect full name, Google email, and WhatsApp number.
- Compare and select the payment provider through the intern’s approved recommendation.
- Create payment orders and verify successful payment securely.
- Handle payment cancellation, failure, delay, duplicate callbacks, and retries.
- Create the correct product entitlement automatically.
- Send the approved confirmation and access information.
- Preserve a recoverable Admin exception state for unusual payment/access failures.

### Exit gate

- [ ] A student can complete a successful purchase end-to-end in staging.
- [ ] Full Course purchase grants all three sections.
- [ ] individual course purchase grants only the selected section.
- [ ] No manual enrollment is required for the normal path.
- [ ] Payment failure and retry scenarios are safe and idempotent.

## Phase 4 — Website learning delivery

### Objective

Make the website the reliable primary delivery surface for live information, recordings, pre-reads, and materials.

### Work

- Build the student product/course view.
- Show current and upcoming live schedules.
- Show Google Meet details only to entitled students where appropriate.
- Support one shared recording set per class/topic structure.
- Allow students to watch recordings regardless of live attendance.
- Keep pre-reads continuously available after purchase.
- Preserve protected worksheets and other included materials.
- Show visual opened/read/completed state for pre-reads without hard completion analytics.
- Enforce entitlement and six-month expiry on every protected resource.

### Exit gate

- [ ] Full Course students see Quant, Verbal, and DI.
- [ ] individual course students see only their purchased section.
- [ ] Recording-only access works when no live batch is published.
- [ ] Live attendance is optional and does not affect website access.
- [ ] Protected resources cannot be opened by unauthorised users.

## Phase 5 — Admin publishing and content workflow

### Objective

Reduce routine Admin work for recordings, pre-reads, and video-adjacent reading material.

### Work

- Allow Admins to upload, replace, and delete recordings or additional class videos.
- Provide all five reading-material placements (20 October D2):
  - before the course area;
  - top of Quant, Verbal, or DI;
  - before a video;
  - after a video;
  - after the course area.
- Allow Admin create, edit, preview, publish, unpublish, and replace actions.
- Use immediate publishing only; no scheduled publishing at launch.
- Open a full student-facing preview in a new tab before publishing.
- Keep Notion as an authoring source during gradual migration to the controlled ACE renderer.
- Define and document the intern-owned recording-hosting decision.
- Define and document the intern-owned Notion migration launch process.

### Exit gate

- [ ] Admin can manage all five reading placements.
- [ ] Preview reflects the intended student-facing placement.
- [ ] Published and unpublished states are clear.
- [ ] Unsupported or failed Notion content is handled safely.
- [ ] Recording replacement and deletion do not expose stale or unauthorised content.

## Phase 6 — Integrated QA and staging acceptance

### Objective

Verify the complete V2 flow on local and staging environments before any Production decision.

### Review journeys

1. Full Course purchase and access.
2. Quant individual course purchase and access.
3. Verbal individual course purchase and access.
4. DI individual course purchase and access.
5. Recording-only access with no live batch.
6. Live schedule publication and update.
7. Eight-student live-course registration limit.
8. Recording upload, replacement, and deletion.
9. Pre-read access and visual progress state.
10. Admin preview and immediate publication.
11. Expired access and direct-URL protection.
12. Existing MVP student compatibility.

### Exit gate

- [ ] Acceptance criteria are mapped to evidence.
- [ ] No critical authorization, privacy, payment, or entitlement issue remains.
- [ ] Local checks, targeted tests, lint, and build pass.
- [ ] Preview/Staging review names the exact commit.
- [ ] Product Owner accepts or rejects the staging result explicitly.

## Phase 7 — Production launch preparation and release

### Objective

Prepare a separate, reversible Production release after V2 staging acceptance.

### Work

- Prepare a dated release plan naming the exact source commit and migrations.
- Verify environment separation and required secrets without exposing values.
- Run read-only Production preflight checks.
- Prepare rollback steps and post-release smoke checks.
- Obtain explicit authorization for merge, migrations, deployment, and any existing-data operation.
- Deploy only the approved release.
- Record post-release evidence and unresolved limitations.

### Exit gate

- [ ] Product Owner has approved the exact release candidate.
- [ ] Production authorization names every permitted action.
- [ ] Rollback plan is documented and usable.
- [ ] Post-release product, access, payment, and resource checks pass.
- [ ] Handoff documentation is updated.

## Deferred or excluded from first launch

- Waitlist implementation.
- Hard pre-read completion analytics.
- Attendance analytics.
- Automated grading and advanced learning analytics.
- Scheduled content publishing.
- Full Course assembled through individual course purchases.
- Unapproved migration of existing MVP data.
- Unrelated repository cleanup.

## Intern handoff rule

The intern receives one active phase at a time. A phase may move to implementation only when its previous exit gate is accepted. Every handoff must state the current phase, branch, commit, completed criteria, evidence, blockers, decisions needed, and exact next action.

## Product Owner review

Comments:

Decision: Draft / Approved with changes / Approved

Name: ____________________  
Date: ____________________
