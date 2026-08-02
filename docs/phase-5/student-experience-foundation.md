# Phase 5 — Student Experience Foundation

Status: Approved preparation record — Phase 5 staging acceptance complete
Owner: Product owner and Engineering  
Last updated: 2 August 2026

## Objective

Prepare a decision-complete Student experience before Phase 5 application work begins. The default Student journey is chronological through Timeline, with a secondary Browse by section view for `QA`, `VA`, and `DI` only.

Implementation outcome: the approved experience is implemented and accepted on staging in [PR #5](https://github.com/theadmitco-tech/ace-club-lms/pull/5). The [Phase 5 status](README.md), [verification checklist](manual-verification-checklist.md), and [running handoff](../handoffs/ace-club-lms-running-handoff.md) contain the current delivery evidence and continuation boundary.

## Approved experience decisions

- The dashboard callout is **This week**, not “Today’s task.”
- Thursday recommends the DI pre-read, Friday recommends the VA pre-read, and Saturday recommends the QA pre-read in `Asia/Kolkata`.
- Recommended practice shows at most one released worksheet each for DI, VA, and QA: from that class's end until the next class in the same section begins.
- Recommended practice appears above This week.
- Recommended practice provides Open worksheet immediately. Phase 6 adds Update log on each worksheet row and a central Practice log overview.
- Timeline remains the default and groups the 31 fixed curriculum items by week.
- Only the current programme week opens by default. Week 0 starts open during Week 0 and starts collapsed after the programme advances; every week remains expandable and collapsible.
- Browse by section contains exactly `QA`, `VA`, and `DI`; there are no topic tags or topic taxonomy.
- Curriculum-item detail keeps pre-read, class details, optional recording, worksheet, and tracker in journey order. Timeline and Browse by section use only the compact released-resource row plus release text for configured locked resources.
- Admin-managed YouTube recordings reuse the existing `video` material model and release after class.
- Legacy rankings, correctness, accuracy, daily targets, and auto-graded practice leave the reachable Student interface.
- Manual tracker states and summaries remain Phase 6–7 scope.
- The preparation prototype is desktop-only; the active acceptance criteria now formally defer mobile optimisation while retaining desktop, keyboard, and text-zoom support.

## Pre-implementation interface inventory

| Surface | Current behaviour | Decision | Phase 5 preparation consequence |
| --- | --- | --- | --- |
| Student dashboard | One large Client Component fetches enrollment, sessions, materials, legacy worksheet targets, attempts, rank, accuracy, pace, and chart data. | Replace | Compose a focused Student view model and remove legacy analytics from the reachable UI. |
| Dashboard progress area | Shows a course rail, a next-action card, prep counts, and an all-classes table. | Adapt | Replace the explicit next-action treatment with This week and a week-grouped Timeline. |
| Dashboard availability | Uses `materials.available_from` and session timestamps. | Retain | Presentation may recommend an item but must not recalculate its release or authorization. |
| Session page | Uses Pre-reads, Practice, Recording, and Class Material tabs and includes legacy auto-graded practice. | Replace | Present one journey order and remove auto-graded practice from the Student path. |
| Notion material reader | Loads authenticated Notion content but uses generic loading/error language. | Adapt | Preserve containment while adding explicit retry and support states. |
| Worksheet delivery | Private PDF delivery and signed URLs are already implemented. | Retain | Link the released PDF into the journey; Phase 6 adds the manual tracker workspace. |
| Student recording | Existing session UI can embed the first `video` material after release. | Adapt | Support validated recording lists and journey placement without bypassing release rules. |
| Master curriculum Admin | Supports multiple Notion pre-reads and private PDF worksheets. | Extend | Add titled YouTube link management to the master curriculum workflow. |
| Cohort material sync | Adds missing master materials idempotently but does not propagate edited links. | Extend | Propagate edited master `video_url` values by `master_material_id` without changing `available_from`. |
| Curriculum classification | Cohort sessions carry `class_type`; master sessions carry `QA`, `VA`, `DI`, and non-academic event types. | Retain | Browse by section can use authoritative class type; no new topic model is required. |
| Non-academic events | Orientation, mocks, breaks, and support calls are part of the 31-item timeline. | Adapt | Use shared event-card variants and exclude them from section browsing. |
| Loading and empty states | Several routes use indefinite spinners or generic empty messages. | Replace | Every request resolves to success, empty, or actionable failure. |
| Mobile | The launch interface is desktop-first. | Defer | Mobile optimisation is formally deferred by the active acceptance criteria; desktop keyboard and text-zoom support remain required. |

## Retain, adapt, remove, and defer

### Retain

- Google-only authentication and protected Student layout.
- Enrollment and role boundaries.
- The fixed 31-item curriculum and programme timezone.
- Database-owned `available_from`, session start, and session end timestamps.
- Week 0, seven-day pre-read, and post-class worksheet release rules.
- Authenticated Notion access, private PDF delivery, RLS, and direct-URL protection.
- Stable master-session links and explicit cohort material sync.

### Adapt

- Dashboard into This week, Timeline, and Browse by section.
- Compact Pre-read, Recording, and Worksheet actions on academic items in both navigation views; Log appears only after the Phase 6 tracker destination exists.
- Session detail into a journey instead of legacy feature tabs.
- Recording display into validated, release-aware YouTube resources.
- Loading, missing-content, and failure messages.
- Master curriculum Admin to manage YouTube links.

### Remove from the reachable Student interface

- Rank and percentile.
- Student-versus-class pace and accuracy.
- Correctness and automated grading.
- Daily target charts and behind/on-track calculations.
- Legacy practice modes, answer submission, incorrect filters, and marked-question modes.

Historical data is preserved until a separate retention and cleanup decision.

### Defer

- Manual question tracker persistence, autosave, comments, time, and completion to Phase 6.
- Admin manual-progress totals and question inspection to Phase 7.
- Physical removal of legacy tables and functions to a later reviewed cleanup.
- Question-level topic metadata; it is not required for QA/VA/DI section browsing.

## Weekly recommendation contract

The callout contains the current programme week's events and available actions. One pre-read may receive a **Recommended** label:

| Programme day | Recommended item |
| --- | --- |
| Thursday | Pre-read for Friday DI |
| Friday | Pre-read for Saturday VA |
| Saturday | Pre-read for Sunday QA |
| Other days | No forced recommendation; show the week's available actions |

The recommendation is derived in `Asia/Kolkata`. It never changes `available_from`, hides another released material, or grants access to locked content. Week 0 and exceptional weeks use their actual scheduled events.

The dashboard includes a **Recommended practice** group sourced independently from DI, VA, and QA. A released worksheet enters the group when its class ends and leaves when the next class in that section begins. The final worksheet in a section remains because no later same-section class exists. Each worksheet is one whole task with two adjacent actions:

- **Open worksheet** — opens the authenticated released PDF.
- **Update log** — opens the matching worksheet tracker once Phase 6 activates manual tracking.

At most one worksheet per section appears, so the group contains no more than three rows. Rotation affects Recommended practice only; every released worksheet remains accessible in Timeline and Browse by section. Practice remains visible alongside Thursday DI, Friday VA, and Saturday QA pre-read recommendations.

## Quick-log experience

Update log opens the full worksheet question list. The Student selects one or more questions—or uses Select all—then chooses **Mark selected Done** or **Mark selected for review**. Individual edits, optional time, and optional comments remain available.

Bulk actions never affect unselected questions and must preserve one independent record per Student, worksheet, and question.

Phase 6 also adds a persistent **Practice log** entry in Student navigation. It opens an overview of released worksheets grouped by course week. Each worksheet shows its saved Done total, review count, and last update, and opens the same worksheet-specific log reached from Recommended practice, Timeline, or Browse by section.

## Preparation completion record

- [x] Record the product hierarchy and navigation decisions.
- [x] Inventory the current Student surfaces.
- [x] Remove topic taxonomy from the intended scope.
- [x] Define the weekly recommendation contract.
- [x] Draft Phase 5 delivery exit criteria before engineering.
- [x] Reconcile mobile scope with the authoritative MVP acceptance criteria.
- [x] Produce the clickable desktop prototype covering This week, Timeline, QA/VA/DI browsing, and day-based recommendations.
- [x] Product Owner approved the clickable desktop prototype direction on 1 August 2026.
- [x] Approve the UI state and content matrix.
- [x] Complete Section A of the preparation verification checklist.
- [x] Record Product Owner and Engineering approval in the running handoff.
