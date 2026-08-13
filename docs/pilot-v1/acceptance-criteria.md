# Pilot V1 — Product Review and Acceptance Criteria

Status: Approved for implementation planning
Owner: Product owner and Engineering
Last updated: 11 August 2026

## How to review this file

This is the Product Owner review copy for Pilot V1.

For each change:

1. Read the short **What will change** section.
2. Tick accepted statements by changing `[ ]` to `[x]`.
3. Type edits or questions under **Product Owner notes**.
4. Mark the change **Approved** or **Changes requested**.

These are product outcomes, not step-by-step QA scripts. Engineering will derive a separate manual verification checklist after this file is approved.

This document does not authorize Production changes. V1 remains local and staging-only until verification passes and the Product Owner separately approves Production promotion.

## Decisions already agreed

- [x] Pilot V1 contains four changes: titled resource cards, independent worksheet/log scrolling, complete recommendations, and batch-specific Session materials.
- [x] Later pre-reads unlock seven days before class.
- [x] Pre-reads are recommended one calendar day before class in `Asia/Kolkata`.
- [x] Recommendation does not change release time or grant access.
- [x] Worksheets, recordings, and Session materials release after their batch session ends.
- [x] Recordings and Session materials belong to one batch session and never synchronize into another batch.
- [x] Flexible course templates, crash courses, and batch schedule building belong to Pilot V2.
- [x] Existing live batches and Production data remain untouched during V1 development and staging verification.
- [x] The supplied Ace Club logo variants replace temporary text/letter marks across the public, login, Student and Admin shells before Phase 7 acceptance.

---

## Product Owner amendment — shared Ace Club logo

Date: 13 August 2026
Status: Approved for implementation before Phase 7 acceptance

The supplied square SVGs are the approved V1 brand assets:

- `public/5.svg` is the dark green treatment;
- `public/6.svg` is the light treatment.

Accept when the public navigation, login page, Student header and Admin sidebar show the appropriate variant without distortion, clipping or duplicate visible brand wording. Brand links retain clear accessible names and visible keyboard focus; non-interactive logos expose useful alternative text. Both variants remain legible at supported desktop widths and 200% text zoom.

This amendment changes presentation only. It does not change authentication, roles, authorization, release behavior, data, migrations or Production approval.

---

## V1-01 — Titled resource cards

### What will change

Generic controls such as `Pre-read`, `Pre-read`, `Worksheet`, and `Log` will become compact cards that show the resource type and its actual title.

Example:

```text
PRE-READ
CR: Finding the Assumptions
```

A worksheet and its tracker actions will stay together:

```text
WORKSHEET
RC: Inferences
[Open worksheet] [Update log]
```

### Accept when

- [x] Every resource card shows both its type and saved title.
- [x] Multiple resources of the same type are easy to distinguish.
- [x] Each worksheet title appears once with its matching `Open worksheet` and `Update log` actions.
- [x] This week, Timeline, Browse by section, curriculum-item pages, and recommendations use one shared card structure and wording system.
- [x] Pre-reads, worksheets, recordings, and Session materials are visually distinguishable through their visible type label plus a local icon and/or accent treatment; meaning does not rely on colour alone.
- [x] Locked resources show their title and correct availability without exposing an active link.
- [x] Unconfigured resources do not create empty or broken buttons.
- [x] Long titles wrap cleanly at supported desktop widths and 200% text zoom.
- [x] Keyboard focus is visible and action names are clear to assistive technology.

### Must not happen

- A Log action must not open a different worksheet or create duplicate tracker records.
- A title must not be replaced by another generic `Pre-read` or `Worksheet` label.
- A locked material URL must not be exposed in the page.

### Product Owner notes

> Product Owner requested visibly different treatments for pre-reads, worksheets, recordings, and Session materials. V1 will use a shared card structure with distinct type labels and local visual variants. Sourcing a new external icon set is not required for V1.

### Review decision

- [x] Approved with the visual-variant edit above
- [ ] Changes requested

---

## V1-02 — Independent PDF and tracker scrolling

### What will change

In the desktop side-by-side workspace, the worksheet PDF and manual tracker will each have their own vertical scroll area. A Student can keep the relevant PDF page visible while moving through tracker questions.

At narrow widths and 200% text zoom, the panels will continue to stack instead of forcing two cramped scroll areas.

### Accept when

- [x] Scrolling the PDF does not change the tracker position.
- [x] Scrolling the tracker does not change the visible PDF page or move the entire workspace away.
- [x] Tracker totals, column meaning, selection, bulk update, save, and retry controls remain easy to reach.
- [x] The stacked layout uses normal page scrolling and has no page-level horizontal overflow.
- [x] A PDF loading or retry failure does not erase tracker input.
- [x] A tracker loading or retry failure does not unnecessarily reload the PDF.
- [x] Saved tracker values remain after refresh.
- [x] Keyboard users can enter, scroll, and leave both panels with visible focus.

### Must not happen

- The page must not trap the Student inside a scroll area.
- One panel must not reset when the other panel scrolls or retries.
- The desktop improvement must not break the stacked text-zoom layout.

### Product Owner notes

> Add comments about preferred height, sticky controls, or scrolling behaviour here.

### Review decision

- [x] Approved
- [ ] Changes requested

---

## V1-03 — Complete weekly recommendations

### What will change

Recommended practice will show every released worksheet from the active class in each academic section. If a VA class has both CR and RC worksheets, both will appear.

The current pre-read rule remains unchanged: unlock seven days before class, recommend one day before class.

### Worksheet recommendation rule

For each section—QA, VA, and DI:

1. Recommend all released worksheets from the latest session that has released worksheet work.
2. Keep that complete set visible until a later session in the same section releases replacement worksheets.
3. Replace the old set only when the replacement set is actually released.

### Accept when

- [x] Every released worksheet in the active same-section set appears once.
- [x] Every worksheet shows its own title and opens its own PDF and matching log.
- [x] Multiple VA worksheets do not suppress one another or hide QA and DI recommendations.
- [x] An older set remains recommended if the next same-section class has no released worksheet.
- [x] A later released set replaces the earlier set for that section.
- [x] Timeline, Browse by section, Practice log, and Recommended practice reach the same worksheet and tracker records.
- [x] Thursday recommends Friday VA, Friday recommends Saturday QA, and Saturday recommends Sunday DI for the current standard schedule.
- [x] A pre-read still unlocks seven days before class; its recommendation does not alter access.
- [x] Empty or partially configured sections do not break valid recommendations from other sections.

### Must not happen

- Only the first worksheet from a session must not be selected while its sibling worksheets disappear.
- The same worksheet must not appear twice in one recommendation set.
- Recommendation must not reveal an unreleased, unpublished, cross-batch, or unauthorized resource.

### Product Owner notes

> Add comments about recommendation order, wording, or replacement behaviour here.

### Review decision

- [x] Approved
- [ ] Changes requested

---

## V1-04 — Batch-specific Session materials and Recommended reading

### What will change

The current Recordings area will become a Session resources area. After selecting a batch and session, an Admin can manage:

- a titled YouTube recording; and
- one or more titled private PDF Session materials.

Session materials behave like recordings: they belong to one batch session, release after that class, and never copy into another batch.

Released Session materials will appear under **Recommended reading**. Recommended worksheets remain under **Recommended practice**.

### Session-material recommendation rule

For each section—QA, VA, and DI:

1. Recommend all released Session materials from the latest session that has released reading.
2. Keep that complete set visible until a later session in the same section releases replacement Session materials.
3. Do not remove useful reading merely because a later class has no uploaded replacement.

### Accept when

- [x] Admin can manage the recording and Session materials for the same selected batch session in one place.
- [x] Admin can upload a titled private PDF Session material.
- [x] Admin can rename it, replace its PDF, or remove it with confirmation.
- [x] A valid Session material releases when its selected session ends.
- [x] Before release, Students can see accurate availability but cannot open the PDF through the interface or a direct URL.
- [x] After release, an active Student enrolled in that batch can open the protected PDF.
- [x] Session material appears as a titled resource in This week, Timeline, Browse by section, and the curriculum-item journey where applicable.
- [x] Every released Session material in the active set appears once under Recommended reading.
- [x] A later released same-section reading set replaces the earlier set.
- [x] Adding, editing, replacing, or removing Session material in one batch changes no other batch.
- [x] Creating a batch or using Sync materials never copies Session materials or recordings.
- [x] Invalid files, oversized files, blank titles, failed uploads, and invalid sessions produce clear feedback without damaging an existing material.
- [x] Only an authorized Admin can create, edit, replace, or remove Session materials.

### Must not happen

- Session material must not become reusable Master Course content.
- A Student, inactive account, signed-out user, or unauthorized account must not manage Session materials.
- A Student must not read Session material from another batch or before release.
- Replacing or removing a PDF must not leave a broken Student card or stale recommendation.
- Private storage URLs, credentials, or Student data must not enter Git or evidence.

### Product Owner notes

> Add comments about the Admin layout, PDF limits, Student wording, or recommendation placement here.

### Review decision

- [x] Approved
- [ ] Changes requested

---

## V1-wide safety checks

All four changes must preserve:

- [x] Google-only controlled Admin and Student access.
- [x] Server-side role checks and Supabase Row Level Security.
- [x] Student ownership and privacy of tracker data.
- [x] Read-only Admin progress with totals matching canonical Student rows.
- [x] Direct-URL protection for unreleased and unpublished resources.
- [x] Batch-specific recordings and private worksheet delivery.
- [x] Existing reusable Master pre-read and worksheet synchronization.
- [x] Existing live Production batches, sessions, materials, enrollments, and tracker rows.
- [x] Supported desktop widths, keyboard navigation, visible focus, and 200% text zoom.
- [x] Clear loading, saved, retry, empty, and failure states.

## Reserved for Pilot V2

V1 will not include:

- course-template creation;
- crash-course construction;
- free-form batch schedule building;
- session reordering or date, time, and duration redesign;
- changing the fixed Master Course;
- converting breaks and week-long support windows into a new event model; or
- destructive cleanup of legacy data, routes, tables, functions, or files.

## Overall Product Owner decision

- [ ] Approve all Pilot V1 acceptance criteria
- [x] Approve with the edits written above
- [ ] Request another review pass

### Overall notes

> Add final scope decisions or approval conditions here.

### Approval record

- Scope agreed: 11 August 2026
- Acceptance criteria approved with Product Owner edits: 11 August 2026
- Engineering review: Pending
- Staging verification: Not started
- Production approval: Not granted
