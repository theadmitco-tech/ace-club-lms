# Pilot V2 — Recommended Reading Bug and Revised Contract

Status: Approved and verified on Staging; Phase 4 accepted
Owner: Product owner and Engineering
Last updated: 14 August 2026

## Purpose

This file records the Production defect found on 14 August 2026 and the Product Owner's replacement Recommended reading behavior. It is the handoff for a later implementation and staging review.

This decision changes recommendation presentation only. It does not change material release timestamps, content authorization, batch ownership, Production data or the deferred weekly-schedule migration.

## Product Owner Phase 4 timing amendment — 18 August 2026

This amendment supersedes any conflicting timing or Recommended Practice statement later in this historical decision record.

- Evaluate `QA`, `VA` and `DI` independently.
- Before `cohort_start_date`, show every released Starter Pack in Recommended Reading. Stop this Home recommendation when the batch starts; the packs remain available in Resources.
- Recommended Practice shows every released worksheet from that Section's immediately previous completed class, beginning when that class ends and stopping when the next same-Section class starts.
- Last class Session materials use the same previous-class/end-to-next-start window.
- Next class pre-reads appear only after the previous same-Section class ends and remain until the next same-Section class starts.
- At the next class start, the previous worksheet, previous Session materials and that class's pre-reads all disappear for that Section. The following pre-read set waits until the class in progress ends.
- A Section with no matching worksheet, Session material or pre-read is omitted from that subsection; do not fall back to an older class or another Section. If the entire subsection is empty, show one compact subsection-level state.


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

- For each academic section, return every distinct pre-read attached to that section's next class.
- Render one card per pre-read using stable material identity and deterministic source order.
- Add a regression fixture with at least two pre-reads on one QA session.
- Do not repair this by deleting, merging or renaming Production materials.

## Product Owner decision — revised Recommended reading

Recommended reading becomes one parent area with two clearly labeled subsections:

1. **Next class pre-reads**
2. **Last class Session materials**

Each subsection may contain zero, one or many files. Multiple files must produce multiple independent resource cards; no first-item shortcut is allowed.

Recommended Practice follows the Phase 4 amendment above; no manual selector or Admin-pinned recommendation is introduced.

The rule is section-wise. `QA`, `VA` and `DI` each maintain their own next-class pre-read set and previous-class Session-material set. A class in one section must not replace or suppress recommendations for another section.

## A. Next class pre-reads

### Selection rule

1. Use the signed-in Student's enrolled batch and its database-owned schedule.
2. Evaluate `QA`, `VA` and `DI` independently.
3. For each section, select that section's earliest published class whose `session_date` is later than the current database/programme time.
4. Require the immediately previous same-Section class to have ended at or before the current database/programme time.
5. Return every distinct `pre_read` attached to the selected next same-section class.
6. Preserve deterministic material order and show every sibling once within its section.

### Visibility and release rule

- Recommendation does not grant access and does not change `available_from`.
- A released pre-read has an active Open action.
- If a configured pre-read is still locked, its card may show the accurate availability state but must not expose an active content or private URL.
- Each section's pre-reads remain recommended until that selected class starts at `session_date`.
- At the class-start boundary, remove that class's pre-reads and select the following published class in the same section.
- If a section has no later published class or its next class has no pre-read, omit that Section from the subsection rather than selecting an old or different-section item.

### Thursday example

On Thursday, if Friday's VA class is the next published VA session, show every pre-read attached to that VA class. If it has two pre-reads, show both until the Friday VA class starts. QA and DI simultaneously show all pre-reads for their own next classes. When Friday VA starts, only the VA pre-read set rotates to the following VA class.

The rule is schedule-driven, not hard-coded to Thursday or a particular subject. It must continue to work if a batch has different class days.

## B. Last class Session materials

### Selection rule

1. Use the same enrolled batch and evaluate `QA`, `VA` and `DI` independently.
2. For each section, select its most recent published class whose `session_end_at` is at or before the current database/programme time.
3. Return every distinct released `session_material` attached to that same-section class.
4. Preserve deterministic material order and show every sibling once within its section.

### Visibility and rotation rule

- Show only Session materials belonging to that exact batch session.
- Each file receives its own protected Open action after release.
- A section's Session materials enter Recommended reading only after that class ends at `session_end_at`.
- Keep all files from that completed class only until the next published class in the same section starts at `session_date`.
- At the next same-section class-start boundary, remove the previous class's Session materials. Do not wait for the new class to end before removing the old set.
- During the new class there may be no Session-material recommendation for that section. After the new class ends, show every released Session material from that newly completed class.
- If a completed class has no Session material, omit that Section from the subsection. Do not silently keep material from an older same-section class.
- Never fall back to another batch or to reusable Master materials.

## C. Shared timing model

Both subsections use the selected batch's database timestamps and `schedule_timezone`, currently `Asia/Kolkata`. Each academic section has its own independent recommendation window:

- **Pre-read window:** from the previous same-Section class ending at `session_end_at` until the next class starts at `session_date`.
- **Session-material window:** from a section class ending at `session_end_at` until the next published class in that same section starts at `session_date`.

For one section, the intended sequence is:

1. After the previous class ends and before Class A starts: recommend every pre-read for Class A plus every released worksheet and Session material from the previous completed class in that Section.
2. When Class A starts: remove Class A pre-reads and the previous class's worksheets and Session materials. Show no replacement for that Section while Class A is in progress.
3. When Class A ends: recommend every pre-read for Class B plus every released worksheet and Session material from Class A.
4. When Class B starts: remove Class B pre-reads and Class A worksheets and Session materials, then repeat the same-Section cycle.

This timing changes recommendation membership only. Existing seven-day pre-read release and post-class Session-material release remain authoritative.

## D. Presentation contract

Recommended reading should render:

```text
Recommended reading

Next class pre-reads
  QA: [zero, one or many pre-read cards for next QA class]
  VA: [zero, one or many pre-read cards for next VA class]
  DI: [zero, one or many pre-read cards for next DI class]

Last class Session materials
  QA: [zero, one or many cards from last QA class, within its window]
  VA: [zero, one or many cards from last VA class, within its window]
  DI: [zero, one or many cards from last DI class, within its window]
```

Requirements:

- Use distinct subsection headings and context copy.
- Keep QA, VA and DI recommendation state independent inside each subsection.
- Every resource card retains its saved title, type, availability and class context.
- Use stable material IDs as keys and destinations.
- One unavailable or broken resource must not hide working siblings.
- Each subsection owns at most one compact empty state; one empty subsection must not hide the other.
- Preserve keyboard focus, 200% text zoom, supported desktop layouts, loading, error and retry behavior.

## E. Non-regression boundaries

- Recommended Practice uses the same previous-class/end-to-next-start window section-wise for worksheets.
- Pre-read and Session-material release timestamps remain unchanged.
- Direct unreleased/unpublished access remains denied.
- Recordings and Session materials remain batch-specific and never copy or sync across batches.
- Master pre-reads and worksheets retain their existing generation and explicit Sync materials behavior.
- Student tracker ownership and read-only Admin progress remain unchanged.
- No weekly-schedule, Orientation, class-day or existing batch-date migration is part of this change.
- `20260804120000_realign_weekly_course_schedule.sql` remains excluded.

## F. Minimum implementation and verification coverage

### Focused automated cases

- next QA, VA and DI sessions are selected independently;
- next QA session with two or more released pre-reads returns all siblings once;
- multiple pre-reads preserve deterministic order;
- one locked sibling does not expose access or hide released siblings;
- last completed same-section session with two or more released Session materials returns all siblings once;
- a section's pre-reads disappear at that class's `session_date` and rotate to the following same-section class;
- a section's Session materials appear at `session_end_at` and disappear at the next same-section class's `session_date`;
- a QA boundary changes QA recommendations without changing VA or DI recommendations;
- missing next-class pre-read and last-class Session-material sets produce independent subsection-level empty states without Section placeholders;
- unpublished, cross-batch, unreleased and duplicate resources are not exposed;
- the rule works across Thursday/Friday/weekend and arbitrary batch dates without weekday hard-coding;
- section-wise Recommended Practice fixtures cover the previous-class, class-start and class-end boundaries.

### Staging journeys

- Use one staging Student enrolled in a batch with multiple next-class pre-reads and multiple last-class Session materials.
- Verify both subsections before class start, during class, after class end and at the next same-section class start.
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

- `src/lib/studentTimeline.ts` — replace the singular pre-read return model with complete per-section collections and implement the separate pre-read and Session-material windows.
- `src/app/dashboard/page.tsx` — render the two subsections and all resource cards.
- `scripts/student-timeline-recommendations.test.mjs` — add sibling, rotation, empty-state and non-regression fixtures.
- `src/lib/server/studentTimeline.ts` and the timeline RPC should be reviewed to confirm they continue returning every material; the diagnosis indicates the current payload already contains all Production pre-reads.

No database migration is currently expected. Confirm this through Phase 0 review rather than assuming it during implementation.

## Authorization boundary and exact next action

This file approves the product behavior for implementation planning. It does not authorize application changes, a staging mutation, merge, Production deployment or Production data change.

Exact next action: include this file in the V2 reading list and implementation plan, then implement the recommendation-only change on the approved V2 branch with focused tests before staging review.
