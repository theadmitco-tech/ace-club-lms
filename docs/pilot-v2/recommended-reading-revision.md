# Pilot V2 — Recommended Reading Bug and Revised Contract

Status: Approved for implementation planning; application code unchanged
Owner: Product owner and Engineering
Last updated: 14 August 2026

## Purpose

This file records the Production defect found on 14 August 2026 and the Product Owner's replacement Recommended reading behavior. It is the handoff for a later implementation and staging review.

This decision changes recommendation presentation only. It does not change material release timestamps, content authorization, batch ownership, Recommended practice, Production data or the deferred weekly-schedule migration.

The phrase “last year's Session material” in the Product Owner discussion is recorded here as “last session's Session material,” based on the surrounding requirement.

## Finding RR-01 — only one Quant pre-read is recommended

Severity: Medium

### Observed Production state

The published QA/Quant session scheduled for 15 August 2026 has two distinct pre-reads. Both are released, but Recommended reading displays only one. The earlier published QA session also contains multiple released pre-reads, so this is a repeatable logic defect rather than missing material data.

The read-only Production check found:

| QA session date | Configured pre-reads | Released pre-reads | Current recommendation capacity |
|---|---:|---:|---:|
| 8 August 2026 | 3 | 3 | 1 |
| 15 August 2026 | 2 | 2 | 1 |

No Production data was changed during diagnosis.

### Root cause

`getPreReadRecommendation` in `src/lib/studentTimeline.ts` returns one recommendation object and uses `session.materials.find(...)`. `find` selects only the first `pre_read` attached to the selected session. The Dashboard consequently renders only one pre-read card.

The focused recommendation suite passes because its pre-read fixtures contain only one pre-read per session. It does not cover sibling pre-reads, while worksheet and Session-material tests already cover multiple siblings.

### Required defect correction

- Return every distinct pre-read attached to the selected next academic session.
- Render one card per pre-read using stable material identity and deterministic source order.
- Add a regression fixture with at least two pre-reads on one QA session.
- Do not repair this by deleting, merging or renaming Production materials.

## Product Owner decision — revised Recommended reading

Recommended reading becomes one parent area with two clearly labeled subsections:

1. **Next class pre-reads**
2. **Last class Session materials**

Each subsection may contain zero, one or many files. Multiple files must produce multiple independent resource cards; no first-item shortcut is allowed.

Recommended practice remains exactly as shipped and is outside this change.

## A. Next class pre-reads

### Selection rule

1. Use the signed-in Student's enrolled batch and its database-owned schedule.
2. Consider published academic sessions only: `QA`, `VA` and `DI`.
3. Select the next session window in chronological order. The current/next class remains selected until its `session_end_at`; after that boundary, rotate to the following academic session.
4. Return every distinct `pre_read` attached to that selected session.
5. Preserve deterministic material order and show every sibling once.

### Visibility and release rule

- Recommendation does not grant access and does not change `available_from`.
- A released pre-read has an active Open action.
- If a configured pre-read is still locked, its card may show the accurate availability state but must not expose an active content or private URL.
- Pre-reads remain in this subsection through the selected class window. They rotate together when that class reaches its database-owned end time.
- If there is no later published academic session, show a clear subsection empty state rather than selecting an old or unrelated item.
- If the next session has no pre-read, show a clear next-class empty state naming the class context without inventing a material.

### Thursday example

On Thursday, when Friday's class is the next published academic session, show every pre-read attached to Friday's class. If Friday has two pre-reads, show both. At Friday's `session_end_at`, rotate this subsection to every pre-read for the next published academic class.

The rule is schedule-driven, not hard-coded to Thursday or a particular subject. It must continue to work if a batch has different class days.

## B. Last class Session materials

### Selection rule

1. Use the same enrolled batch and published academic-session sequence.
2. Select the most recent academic session whose `session_end_at` is at or before the current database/programme time.
3. Return every distinct released `session_material` attached to that session.
4. Preserve deterministic material order and show every sibling once.

### Visibility and rotation rule

- Show only Session materials belonging to that exact batch session.
- Each file receives its own protected Open action after release.
- Keep all files from the last completed class until the next academic class reaches `session_end_at`.
- At that boundary, replace the previous set with every released Session material from the newly completed class.
- If the newly completed class has no Session material, show a clear empty state for the last class. Do not silently keep material from an older class, because the Product Owner wants the complete Recommended reading state to advance with the class sequence.
- Never fall back to another batch or to reusable Master materials.

## C. Shared timing model

Both subsections use the selected batch's database timestamps and `schedule_timezone`, currently `Asia/Kolkata`. The class-end boundary gives one coherent rotation event:

- before class end: all pre-reads for that current/next class plus all Session materials from the previously completed class;
- at/after class end: all pre-reads for the following academic class plus all Session materials from the class that just completed.

This timing changes recommendation membership only. Existing seven-day pre-read release and post-class Session-material release remain authoritative.

## D. Presentation contract

Recommended reading should render:

```text
Recommended reading

Next class pre-reads
  [zero, one or many pre-read cards]

Last class Session materials
  [zero, one or many Session-material cards]
```

Requirements:

- Use distinct subsection headings and context copy.
- Every resource card retains its saved title, type, availability and class context.
- Use stable material IDs as keys and destinations.
- One unavailable or broken resource must not hide working siblings.
- Each subsection owns its own empty state; one empty subsection must not hide the other.
- Preserve keyboard focus, 200% text zoom, supported desktop layouts, loading, error and retry behavior.

## E. Non-regression boundaries

- Recommended practice logic and ordering remain unchanged.
- Pre-read and Session-material release timestamps remain unchanged.
- Direct unreleased/unpublished access remains denied.
- Recordings and Session materials remain batch-specific and never copy or sync across batches.
- Master pre-reads and worksheets retain their existing generation and explicit Sync materials behavior.
- Student tracker ownership and read-only Admin progress remain unchanged.
- No weekly-schedule, Orientation, class-day or existing batch-date migration is part of this change.
- `20260804120000_realign_weekly_course_schedule.sql` remains excluded.

## F. Minimum implementation and verification coverage

### Focused automated cases

- next QA session with two or more released pre-reads returns all siblings once;
- multiple pre-reads preserve deterministic order;
- one locked sibling does not expose access or hide released siblings;
- last completed session with two or more released Session materials returns all siblings once;
- the pre-read and Session-material subsections rotate together at `session_end_at`;
- a missing next-class pre-read set and a missing last-class Session-material set produce independent empty states;
- unpublished, cross-batch, unreleased and duplicate resources are not exposed;
- the rule works across Thursday/Friday/weekend and arbitrary batch dates without weekday hard-coding;
- existing Recommended practice fixtures remain unchanged and pass.

### Staging journeys

- Use one staging Student enrolled in a batch with multiple next-class pre-reads and multiple last-class Session materials.
- Verify both subsections before and after a controlled class-end boundary.
- Open every eligible file through its canonical protected route.
- Confirm locked, missing, duplicate, cross-batch and signed-out denial states.
- Confirm Timeline and class-detail resource lists remain complete and unchanged.
- Verify supported desktop width, keyboard navigation and 200% effective-width layout.

### Quality gates

- recommendation fixtures pass;
- targeted lint for touched files passes;
- TypeScript passes;
- guarded Next.js Production build passes;
- `git diff --check` and changed-file secret/privacy review pass; and
- Product Owner accepts one immutable staging-backed Preview.

## Likely implementation surface

- `src/lib/studentTimeline.ts` — replace the singular pre-read return model with complete subsection collections and implement the shared class-window selection.
- `src/app/dashboard/page.tsx` — render the two subsections and all resource cards.
- `scripts/student-timeline-recommendations.test.mjs` — add sibling, rotation, empty-state and non-regression fixtures.
- `src/lib/server/studentTimeline.ts` and the timeline RPC should be reviewed to confirm they continue returning every material; the diagnosis indicates the current payload already contains all Production pre-reads.

No database migration is currently expected. Confirm this through Phase 0 review rather than assuming it during implementation.

## Authorization boundary and exact next action

This file approves the product behavior for implementation planning. It does not authorize application changes, a staging mutation, merge, Production deployment or Production data change.

Exact next action: include this file in the V2 reading list and implementation plan, then implement the recommendation-only change on the approved V2 branch with focused tests before staging review.
