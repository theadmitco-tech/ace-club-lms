# Pilot V2 — Product Review and Acceptance Criteria

Status: Approved; Phase 1–6 accepted; Phase 7 not started
Owner: Product owner and Engineering
Last updated: 20 August 2026

## Decision and authorization boundary

The Product Owner completed the Pilot V2 scope review on 17 August 2026 and approved the outcomes, modifications, exclusions and staging journeys below.

This approval closes scope definition and authorizes documentation, read-only discovery, interface specification and implementation planning. It does not authorize application changes, database migrations, staging mutations, merge, deployment, Production changes or modification of an existing batch.

The detailed [Recommended Reading Bug and Revised Contract](recommended-reading-revision.md), including its 18 August Phase 4 amendment, controls the section-wise pre-read, Session-material and Recommended Practice timing behavior.

## Approved Pilot V2 bundle

1. Four editable reusable course templates.
2. A flexible, consequence-aware batch schedule builder.
3. Resources that may belong to a batch, Section, event or no event.
4. A flexible Student Home, Schedule and Resources experience.

## 1. Course templates

### AC-V2-TEMPLATE-01 — Provide four editable templates

**Given:** Pilot V2 template data is available.  
**When:** An authorized Admin opens the template list.  
**Then:** The Admin can use and edit exactly these seeded templates:

1. Full Course;
2. Critical Reasoning Crash Course;
3. Reading Comprehension Crash Course; and
4. Data Interpretation Crash Course.

Creating a completely blank template and duplicating a template to introduce a fifth course are deferred.

### AC-V2-TEMPLATE-02 — Use a structured editor

**Given:** An Admin edits one of the four templates.  
**When:** The template form is displayed.  
**Then:** It provides required fields for title, event type, Section, relative day/order, start time and duration, with optional instructor, publication-default and reusable-resource associations where applicable. Venue is not shown in the reusable-template editor; later batch/mock scheduling may still collect it where required.

The Product Owner's forthcoming screenshot is interface-design input; it does not reopen the approved scope.

### AC-V2-TEMPLATE-03 — Preview before saving

**Given:** An Admin changes a template.  
**When:** They request a preview.  
**Then:** The system shows the resulting event count, order, relative timing, durations, instructors, publication defaults and reusable-resource associations before saving.

Invalid or incomplete template structure cannot be saved.

### AC-V2-TEMPLATE-04 — Preserve existing batch snapshots

**Given:** A batch was previously created from a template.  
**When:** The reusable template is edited later.  
**Then:** The existing batch is unchanged.

Pilot V2 does not automatically synchronize structural template changes into existing batches.

## 2. Batch creation

### AC-V2-BATCH-01 — Create from a template

**Given:** An Admin starts batch creation.  
**When:** They enter the batch name, choose one approved template, choose a start date, use the displayed IST timezone and choose an initial publication state.  
**Then:** The system generates a proposed batch-specific schedule using canonical `Asia/Kolkata` calculations.

### AC-V2-BATCH-02 — Review the complete proposal

**Given:** A proposed schedule has been generated.  
**When:** The Admin reviews it before confirmation.  
**Then:** Every proposed event shows its title, event type, Section, order, date, start time, duration, instructor or venue where applicable, publication state and inherited reusable-resource associations.

### AC-V2-BATCH-03 — Confirm atomically and idempotently

**Given:** The Admin confirms batch creation.  
**When:** the operation succeeds, fails or is retried.  
**Then:** it does not leave a partial schedule, create a second schedule or duplicate resource assignments.

Nothing is published merely because the Admin opened or edited the preview.

## 3. Flexible schedule builder

### AC-V2-SCHEDULE-01 — Support useful event types

The schedule can represent live classes, mocks, orientation, breaks, support calls and approved extra events. A separate Window event type was removed because no approved workflow distinguished it usefully from Support. Empty placeholders are not required.

### AC-V2-SCHEDULE-02 — Edit one eligible future event

**Given:** An eligible future event exists in one batch.  
**When:** An Admin edits it.  
**Then:** the Admin may change its title, Section, order, date, start time, duration, instructor, venue and publication state where applicable without changing the reusable template or another batch.

### AC-V2-SCHEDULE-03 — Add an extra class

**Given:** A batch requires an additional class.  
**When:** An Admin adds it.  
**Then:** the Admin supplies the event title, Section, date, time, duration, instructor, publication state and optional resource associations, and the event belongs only to that batch.

### AC-V2-SCHEDULE-04 — Reorder any eligible sessions or Sections

**Given:** A batch's future delivery order changes.  
**When:** An Admin reorders events or moves a complete eligible Section.  
**Then:** the change may apply to any future sessions or Sections, not only Verbal and DI, and does not alter another batch or the template.

### AC-V2-SCHEDULE-05 — Shift subsequent events

**Given:** Delivery is delayed or advanced.  
**When:** An Admin selects one future event and a number of days.  
**Then:** that event and all eligible subsequent events move by the confirmed amount.

### AC-V2-SCHEDULE-06 — Preview consequences

**Given:** An Admin proposes a bulk shift, reordering, cancellation or other Student-affecting schedule change.  
**When:** they reach confirmation.  
**Then:** the system compares before/after dates and identifies every affected event and unreleased material timestamp.

### AC-V2-SCHEDULE-07 — Edit after enrollment

After Students enroll, an Admin may add a future class; edit a future event's permitted details; reorder future events or Sections; shift eligible future events; or cancel a future event with consequence review.

Completed events cannot be moved or deleted. Already-released material remains available.

### AC-V2-SCHEDULE-08 — Protect a Section already underway

A completed or currently running event is locked except for permitted non-scheduling corrections such as venue instructions. Eligible future events in the same Section may still be added, reordered or rescheduled. Future release timestamps follow the approved schedule while already-released material remains available.

## 4. Resources

### AC-V2-RESOURCE-01 — Associate resources flexibly

A resource may belong to the whole batch, one Section, one session/event or no Section/session as a standalone resource. An Admin does not create a fake session merely to expose standalone material.

### AC-V2-RESOURCE-02 — Use controlled categories

An Admin selects one controlled category:

- Starter Pack;
- Pre-read;
- Worksheet;
- Session Material;
- Recording;
- Post-class;
- Reference; or
- Other.

The Admin may freely title a resource. Categories organize Student browsing and do not create separate authorization rules.

### AC-V2-RESOURCE-03 — Support the approved formats

Pilot V2 supports:

- Notion links for starter packs and pre-reads;
- protected PDF uploads for worksheets and Session materials;
- supported YouTube or youtu.be links for batch-specific recordings; and
- short text instructions where approved in the interface specification.

### AC-V2-RESOURCE-04 — Release starter packs at batch creation

Starter packs default to released when the batch is created. Student access still requires active enrollment, publication and every existing server/database authorization boundary.

### AC-V2-RESOURCE-05 — Preserve existing session-linked release timing

The shipped release timing for pre-reads, worksheets, recordings and Session materials remains unchanged. Schedule changes update only approved unreleased timestamps and never silently withdraw material that was already accessible.

Pilot V2 provides no Admin action to withdraw already-released material.

### AC-V2-RESOURCE-06 — Preserve ownership boundaries

Reusable starter packs, pre-reads and worksheets may originate from a template and follow the approved generation or explicit synchronization contract. Recordings and private Session materials remain owned by one batch session and are never generated, copied, synchronized or exposed across batches.

### AC-V2-RESOURCE-07 — Add batch-specific material

An Admin may add a resource to one batch without adding it to the reusable template or another batch.

### AC-V2-RESOURCE-08 — Preserve recommendation contracts on Home

Home presents Recommended Reading and Recommended Practice according to the detailed [Recommended Reading contract](recommended-reading-revision.md). Before the batch start date, every released Starter Pack appears in Recommended Reading. For each academic Section independently after classes begin, the immediately previous completed class supplies the worksheet and Session materials until the next same-Section class starts. The next class supplies its pre-reads only after the previous same-Section class ends and until the next class starts. Generic Admin-pinned recommendations and a manual recommendation selector remain outside Pilot V2.

## 5. Student portal

### AC-V2-STUDENT-01 — Provide three primary destinations

The Student portal provides:

- **Home** for a compact summary;
- **Schedule** for published batch events; and
- **Resources** for all currently available learning material.

A separate History destination is excluded.

### AC-V2-STUDENT-02 — Keep Home compact and useful

Home shows:

- batch/course name;
- next class or event;
- Recommended Reading;
- Recommended Practice; and
- direct access to Schedule and Resources.

Home does not hide available resources or enforce one prescribed learning sequence.

### AC-V2-STUDENT-03 — Present Full Courses by Week

An enrolled Full Course Student browses the Schedule by Week. Events remain date-ordered within each week. Empty weeks, sessions and irrelevant placeholders are omitted. Section browsing belongs to Resources rather than Schedule.

### AC-V2-STUDENT-04 — Present crash courses by Day

An enrolled crash-course Student browses the Schedule by Day. Events remain date-ordered within each day. Empty days, sessions and irrelevant placeholders are omitted. Section browsing belongs to Resources rather than Schedule.

A separate Chronological mode is excluded because Week and Day views already preserve chronological order.

### AC-V2-STUDENT-05 — Browse available resources

Students can browse all currently accessible resources by Section, controlled category and associated session where applicable. A standalone resource remains discoverable without navigating through a session.

Resource filters appear as consistent, instant-selection dropdowns in the order **Sections**, **Topic** (the associated class/event title) and **Category**; no Apply action is required. Sections and all-Section topics use the `QA`, `VA`, `DI` academic order, followed by non-academic events. Topic contains only topics relevant to the selected Section. Category choices are derived from the selected Section and Topic, and include Starter Pack, Pre-read, Worksheet, Session Material and Class Recording plus the remaining approved controlled categories when present. Starter Packs remain discoverable under Resources with All Sections and All Topics because they do not require either association.

Completed events remain reachable through Schedule, and still-available material remains reachable through Resources.

### AC-V2-STUDENT-06 — Present mocks as first-class events

Where configured, a mock shows its date, start time, venue, reporting time, instructions and preparation resources. It does not require an artificial Week or Section placeholder.

Instructions are optional. The Student interface renders instructions only when the stored value contains non-whitespace text; a blank value creates no empty label, card, row or placeholder.

### AC-V2-STUDENT-07 — Keep access rules simple

Student visibility depends on active account, enrollment, publication, release time, protected-file authorization and batch ownership. Section and resource-category labels do not independently grant or deny access.

## 6. Non-regression boundaries

Pilot V2 must preserve:

- separate staging/Preview and Production configuration;
- Google-only access for controlled active Admin and Student accounts;
- server-side authorization before privileged service-role use;
- Supabase RLS, enrollment, publication and release-time enforcement;
- protected, no-store, short-lived signed private-file delivery;
- Student ownership and privacy of tracker rows;
- read-only Admin progress over the canonical Student rows;
- idempotent reusable pre-read/worksheet generation and explicit sync;
- batch isolation for recordings and Session materials;
- existing live batches, historical data and tracker records unless separately authorized;
- loading, empty, validation, failure and retry states;
- keyboard operation, 200% zoom and supported desktop widths; and
- changed-file secret and privacy review.

## 7. Explicit exclusions

Pilot V2 excludes:

- blank-template creation;
- template duplication and a fifth course template;
- automatic structural synchronization into existing batches;
- public registration and payments;
- new analytics, grading or progress systems;
- broad mobile redesign beyond responsive non-regression;
- destructive legacy cleanup;
- automatic migration of running Production batches;
- separate Student History and Chronological destinations;
- withdrawal of already-released material;
- unrelated repository-wide cleanup; and
- the deferred weekly-schedule replacement.

The excluded `20260804120000_realign_weekly_course_schedule.sql` migration must not be applied, repaired, marked as applied or reused.

## 8. Minimum staging acceptance journeys

1. Create and confirm one Full Course batch.
2. Create and confirm each accepted crash-course template.
3. Add one extra future class.
4. Shift one point and all eligible subsequent events by two days.
5. Reorder arbitrary eligible future sessions or Sections.
6. Edit an eligible future event after enrollment.
7. Prove completed/current event protections after a Section begins.
8. Release multiple standalone Notion starter packs without fake sessions.
9. Preserve current pre-read, worksheet, recording and Session-material timing.
10. Attach a YouTube recording to one batch session only.
11. Upload and open one protected Session-material PDF.
12. Display one mock with complete venue/reporting information.
13. Browse a Full Course Schedule by Week and its Resources by Section.
14. Browse a crash-course Schedule by Day and its Resources by Section.
15. Use Recommended Reading and Recommended Practice without hiding other resources.
16. Prove signed-out, inactive, unenrolled, unpublished, pre-release, cross-student and cross-batch denial.
17. Prove generation retry cannot duplicate a schedule or materials.
18. Prove existing running and historical batches remain unchanged.

## Product Owner decision

The Product Owner approved this scope through the closed review on 17 August 2026. The retained review history remains outside the repository working authority; this file is the concise repository source for Pilot V2 planning.

Exact next action: review the proposed [Pilot V2 Product Roadmap](product-roadmap.md), receive the Product Owner's template/interface screenshot, and complete Phase 0 documentation and read-only readiness before any implementation or environment mutation.

## Subsequent Phase 1 authorization — 17 August 2026

After the scope approval above, the Product Owner instructed Engineering to implement Phase 1, supplied the three crash-course curriculum screenshots, confirmed the schedule/instructor/Full Course/resource/interface defaults, approved the Phase 0 plan set, and authorized local implementation plus creation of one additive migration file. The exact approved input is recorded in the [Template and Admin Interface Specification](template-interface-specification.md).

This later instruction supersedes the earlier local-implementation restriction for Phase 1 only. It does not authorize applying a migration to staging or Production, changing an existing batch, pushing, merging, deploying or mutating live data.

## Subsequent Phase 1 Staging authorization — 17 August 2026

The Product Owner authorized exact Staging-only application of `20260817090845_add_versioned_course_templates.sql` and Phase 1 Staging verification. Engineering completed that scope and recorded it in the [Phase 1 Staging evidence](evidence/phase-1-staging-verification-2026-08-17.md).

## Subsequent Phase 1 Product Owner acceptance — 17 August 2026

After the final template-editor amendments and accessibility review, the Product Owner accepted the four current template revisions and Phase 1 editing workflow. Instructions remain an optional future Student-facing field and must be omitted entirely from Student rendering when blank. This acceptance does not include Phase 2 implementation, push, merge, Preview, deployment or any Production action.

## Subsequent Phase 4 local authorization — 18 August 2026

After accepting Phase 3, the Product Owner instructed Engineering to start Phase 4 implementation locally. Engineering added one new ordered Student-projection migration plus the Home, Schedule and Resources application surfaces and focused tests. This instruction did not authorize migration application, Staging mutation, push, Preview, merge, deployment or any Production action. The result and remaining authenticated journeys are recorded in the [Phase 4 local evidence](evidence/phase-4-local-verification-2026-08-18.md).
