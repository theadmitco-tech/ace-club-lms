# Ace Club LMS V2 — Product Roadmap

Status: Draft for Product Owner review
Owner: Product owner and Engineering
Last updated: 18 October 2026

This roadmap sequences the V2 acceptance criteria into intern-sized delivery phases. It is a planning document only. It does not authorize application changes, database migrations, merging, Production deployment, or changes to student/course data.

## Product model

V2 is an online-first LMS with two product types:

- **Full Batch:** Quant + Verbal + DI together, delivered over approximately eight weeks.
- **Crash Course:** Quant, Verbal, or DI individually, delivered over approximately one week when a live batch is available, with recordings always available.

Launch pricing:

- One Crash Course: ₹10,000.
- Two Crash Courses: ₹18,000.
- All three Crash Courses: ₹25,000, as approved in V2-DEC-03; this remains distinct from Full Batch.
- Full Batch: ₹25,000.

Full Batch cannot be assembled by purchasing Crash Courses in parts. Students receive six months of access from successful payment. Live attendance is optional; recordings and website materials remain available.

## Phase summary

| Phase | Outcome | Primary owner | Exit gate |
|---|---|---|---|
| 0 | Product and technical baseline | Intern + Engineering | Scope, flows, data model, and risks reviewed |
| 1 | Product catalogue and entitlement foundation | Intern | Product access boundaries pass |
| 2 | Full Batch and Crash Course publishing | Intern | Admin can publish both product types |
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
- Identify which existing structures can support Full Batch, Crash Course, section entitlements, six-month expiry, and independent schedules.
- Define the smallest safe additive data model, if changes are required.
- Define the Admin and Student journeys with screenshots or wireframes where useful.
- Prepare a compatibility and rollback note for existing MVP students.
- Record open implementation decisions, especially recording hosting and gradual Notion migration.

### Exit gate

- [ ] No conflict remains between the product decisions and acceptance criteria.
- [ ] Full Batch cannot be accidentally purchased or granted by section.
- [ ] Crash Course access boundaries are defined.
- [ ] Existing MVP student treatment is documented.
- [ ] Proposed migrations and rollback approach are reviewed before implementation.

## Phase 1 — Product catalogue and entitlement foundation

### Objective

Represent Full Batch and the three Crash Courses as explicit products with correct pricing and access rules.

### Work

- Add product definitions for Full Batch, Quant Crash Course, Verbal Crash Course, and DI Crash Course.
- Store prices as commercial configuration.
- Model section entitlements separately from product presentation where necessary.
- Apply six-month access expiry from verified payment time.
- Ensure Full Batch grants all three sections together.
- Ensure Crash Courses grant only the purchased section.
- Prevent Crash Courses from silently creating Full Batch entitlement.
- Preserve current MVP access while migration remains unapproved.

### Exit gate

- [ ] All four products can be represented without hard-coded UI assumptions.
- [ ] Pricing is correct.
- [ ] Entitlement tests pass for every product.
- [ ] Expired access is denied consistently.
- [ ] Cross-section and Full Batch leakage tests pass.

## Phase 2 — Full Batch and Crash Course publishing

### Objective

Allow an Admin to publish product-specific batch details without manually reconstructing schedules.

### Work

- Create separate Admin flows or templates for Full Batch and Crash Course.
- Support approximately eight-week Full Batch schedules.
- Support approximately one-week Crash Course schedules.
- Allow Admins to configure other durations where approved.
- Specify included sections, delivery mode, dates, times, instructors, Google Meet details, recordings, and materials.
- Allow Full Batch and Crash Course schedules to differ.
- Publish, edit, unpublish, and republish batch details.
- Keep live capacity at eight by default.
- Defer waitlist implementation unless separately approved.

### Exit gate

- [ ] Admin can publish a Full Batch.
- [ ] Admin can publish Quant, Verbal, and DI Crash Courses.
- [ ] Full Batch and Crash Course schedules remain independent.
- [ ] A Crash Course can be recording/materials-only when no live batch exists.
- [ ] Published schedule changes appear to entitled students.

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
- [ ] Full Batch purchase grants all three sections.
- [ ] Crash Course purchase grants only the selected section.
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

- [ ] Full Batch students see Quant, Verbal, and DI.
- [ ] Crash Course students see only their purchased section.
- [ ] Recording-only access works when no live batch is published.
- [ ] Live attendance is optional and does not affect website access.
- [ ] Protected resources cannot be opened by unauthorised users.

## Phase 5 — Admin publishing and content workflow

### Objective

Reduce routine Admin work for recordings, pre-reads, and video-adjacent reading material.

### Work

- Allow Admins to upload, replace, and delete recordings or additional class videos.
- Provide reading-material placements:
  - top of Quant, Verbal, or DI;
  - before a video;
  - after a video.
- Allow Admin create, edit, preview, publish, unpublish, and replace actions.
- Use immediate publishing only; no scheduled publishing at launch.
- Open a full student-facing preview in a new tab before publishing.
- Keep Notion as an authoring source during gradual migration to the controlled ACE renderer.
- Define and document the intern-owned recording-hosting decision.
- Define and document the intern-owned Notion migration launch process.

### Exit gate

- [ ] Admin can manage all three reading placements.
- [ ] Preview reflects the intended student-facing placement.
- [ ] Published and unpublished states are clear.
- [ ] Unsupported or failed Notion content is handled safely.
- [ ] Recording replacement and deletion do not expose stale or unauthorised content.

## Phase 6 — Integrated QA and staging acceptance

### Objective

Verify the complete V2 flow on local and staging environments before any Production decision.

### Review journeys

1. Full Batch purchase and access.
2. Quant Crash Course purchase and access.
3. Verbal Crash Course purchase and access.
4. DI Crash Course purchase and access.
5. Recording-only access with no live batch.
6. Live schedule publication and update.
7. Eight-seat live-session reservation behavior.
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
- Full Batch assembled through Crash Course purchases.
- Unapproved migration of existing MVP data.
- Unrelated repository cleanup.

## Intern handoff rule

The intern receives one active phase at a time. A phase may move to implementation only when its previous exit gate is accepted. Every handoff must state the current phase, branch, commit, completed criteria, evidence, blockers, decisions needed, and exact next action.

## Product Owner review

Comments:

Decision: Draft / Approved with changes / Approved

Name: ____________________  
Date: ____________________
