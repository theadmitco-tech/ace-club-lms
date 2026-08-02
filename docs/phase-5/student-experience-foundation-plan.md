# Phase 5 — Student Experience Foundation Plan

Status: Approved — ready for Phase 5 implementation  
Owner: Product owner and Engineering  
Created: 31 July 2026  
Last updated: 1 August 2026

## How to annotate this plan

Add comments inside any **Product Owner annotation** block. You may approve a section, request a change, replace a decision, or add an open question. Do not worry about formatting the comments perfectly.

Example:

> **Product Owner annotation**  
> Approved, but change the button label to “Open pre-read.”

This plan defines the preparation checkpoint before Phase 5 engineering. It does not authorize application code, database, migration, staging, or Production changes.

> **Product Owner annotation — overall direction**  
> 

---

## 1. Agreed direction

The Student experience will follow one learning sequence:

```text
Prepare → Attend class → Practise → Track progress
```

Each applicable curriculum item will use this journey order:

```text
Pre-read → Class details → Recording (when present) → Worksheet → Tracker
```

The working decisions are:

- Design Student screens first while establishing shared rules that later Admin work can reuse.
- Use one Student home containing the complete course timeline.
- Provide two views of the same course content: **Timeline** for chronological progress and **Browse by section** for QA, VA, and DI retrieval.
- Group the timeline by programme week.
- Open only the current programme week by default while allowing the Student to collapse it. Week 0 starts open during Week 0 and collapsed after the programme advances; keep every other week available through expansion.
- Do not label or visually emphasize a Timeline item as current, next, or latest; This week already communicates programme position.
- Use a **This week** callout instead of a “Today’s task” callout.
- Recommend the DI pre-read on Thursday, the VA pre-read on Friday, and the QA pre-read on Saturday using the programme timezone.
- Show **Recommended practice** throughout the current week for every released prior-week worksheet, alongside any day-specific pre-read recommendation.
- Place Recommended practice above This week so the recurring weekday work is visible first.
- Give each recommended worksheet direct **Open worksheet** and **Update log** actions; Phase 5 reserves the placement and Phase 6 activates the manual log destination.
- Present useful actions directly on each applicable item without forcing primary and secondary labels.
- Use variants of one timeline grammar for teaching classes, orientation, mocks, breaks, calls, and support events.
- Remove legacy rankings, correctness, accuracy, daily-target analytics, and auto-graded practice from the reachable Student interface during Phase 5.
- Retain the manual-effort information required for Phases 6–7: `Done`, `Come back for review`, `Not updated`, optional time, optional comments, last update, and completion calculated only from `Done` entries.
- Allow Admins to add, edit, and remove titled YouTube recording links on master curriculum items; make released recordings available in the Student journey after class.
- Treat the Phase 5 foundation and launch interface as desktop-first; the authoritative acceptance criteria now defer mobile optimisation while retaining keyboard and text-zoom requirements.
- Preserve historical data unless a separate reviewed cleanup explicitly authorizes deletion.

> **Product Owner annotation — agreed direction**  
> Incorporated on 31 July 2026. Revised on 2 August 2026: only the current programme week starts open; Week 0 starts collapsed after the programme advances. Actions are presented without primary/secondary labels; legacy automated analytics are separated from required manual-effort summaries.

---

## 2. Preparation tasks

### 2.1 Audit the current Student journey

- Inventory reachable Student routes, content, calls to action, navigation, loading states, empty states, and errors.
- Capture representative desktop baselines without exposing private Production data.
- Classify each current feature as **retain**, **adapt**, **replace**, **defer to Phase 6**, or **remove from the Student interface**.
- Explicitly identify legacy analytics, auto-graded practice, duplicate navigation, and misleading availability or completion labels.
- Preserve the signed authentication, enrollment, authorization, release, Notion, and private-PDF boundaries.

**Deliverable:** A concise current-state inventory inside the Phase 5 foundation document.

> **Product Owner annotation — current-state audit**  
> 

### 2.2 Freeze the Student information architecture

The MVP Student destinations will be:

1. **Student home** — available actions, concise course position, and week-grouped timeline.
2. **Curriculum item detail** — pre-read, class information, worksheet, and tracker in journey order, omitting steps that do not apply.
3. **Pre-read reader** — authenticated embedded Notion content with a retryable failure state.
4. **Worksheet workspace** — authenticated PDF delivery and the Phase 6 tracker, side by side on desktop.
5. **Recording viewer** — a released YouTube recording embedded or opened from the curriculum-item journey using an Admin-managed master link.

The supported Phase 5 experience will not create separate Student destinations for rankings, accuracy, advanced analytics, question-bank practice, or automated grading.

The Student home will expose two navigation views without duplicating content:

- **Timeline** — the default view, grouped chronologically by programme week.
- **Browse by section** — a reference view containing only QA, VA, and DI.

Both views open the same curriculum-item, pre-read, recording, worksheet, and tracker destinations.

> **Product Owner annotation — information architecture**  
> Incorporated on 31 July 2026. Mobile presentation is removed from this preparation checkpoint and recorded as a formal scope exception requiring acceptance-criteria reconciliation.

### 2.3 Define the resource-action rules

Timeline items expose applicable released resources directly. They do not receive current, next, or latest labels. Before Phase 6, do not label work as “unfinished,” “in progress,” or “continue” unless persisted data supports that claim.

Weekly callout rules:

1. Label the callout **This week**, not “Today’s task.”
2. Show the applicable events and released learning materials for the current programme week.
3. On Thursday, recommend the pre-read for Friday's DI class.
4. On Friday, recommend the pre-read for Saturday's VA class.
5. On Saturday, recommend the pre-read for Sunday's QA class.
6. Calculate the recommendation day in the course timezone, currently `Asia/Kolkata`.
7. A recommendation changes emphasis only; it does not alter release time, authorization, or access.
8. Outside Thursday–Saturday, show the week's available actions without inventing a recommended task.
9. Week 0 and exceptional weeks show their actual mocks, calls, orientation, breaks, or support events instead of applying the DI/VA/QA pattern.
10. Show each released prior-week worksheet as one whole weekly task under **Recommended practice**; do not divide it into daily question ranges.
11. When several prior-week worksheets apply, keep them within one Recommended practice group and show each worksheet separately.
12. Recommended practice provides **Open worksheet** immediately and **Update log** once the Phase 6 manual tracker route exists.
13. On Thursday and Friday, the pre-read recommendation and Recommended practice are both visible; neither replaces the other.
14. Recommended practice renders immediately above This week on the Student home.

Action labels must describe the real outcome, for example:

- Start Week 0
- Open pre-read
- View class details
- Watch recording
- Open worksheet
- Update log
- Continue tracking
- Review entries
- Retry pre-read

> **Product Owner annotation — resource actions**
> 

### 2.4 Define one canonical UI state model

Material states:

| State | Student-facing meaning | Interaction |
| --- | --- | --- |
| Available | Available now | Enabled action appropriate to the material: read, watch, download, log, or review |
| Upcoming | Available on a stated date and time | Informative, unavailable action |
| After class | Available after the scheduled class | Informative, unavailable action |
| Not configured | The programme has not added this material | No broken action |
| Failed | The material could not be loaded | Retry or support action |

Activity states, used only when supported by persisted data:

| State | Meaning |
| --- | --- |
| Not started | The available activity has no saved Student input |
| In progress | Saved Student input exists but the activity is incomplete |
| Completed | The defined completion condition is satisfied |

Request states:

| State | Required behaviour |
| --- | --- |
| Loading | Show a descriptive loading state or skeleton |
| Empty | Explain why nothing is present and what happens next |
| Failed | Explain what failed and provide retry or support guidance |

Status must never rely on colour alone. Every state requires visible text and appropriate semantic or accessible labeling.

> **Product Owner annotation — state model**  
> 

### 2.5 Define the future Student timeline data contract

Phase 5 engineering should consume a server-composed Student timeline view model instead of interpreting raw database rows independently in multiple components.

The documented contract will contain:

- Course identity and programme timezone.
- Ordered week groups derived from linked master-curriculum metadata.
- The curriculum item's approved section identifier: `QA`, `VA`, `DI`, or no academic section.
- Ordered timeline items with class title, type, instructor, start, and end.
- Associated pre-reads, YouTube recordings, and worksheets with database-owned release timestamps.
- Journey steps and their canonical presentation states.
- Allowed actions grouped by purpose without artificial primary/secondary labels.
- Tracker summary only when Phase 6 provides persisted tracker records.

Presentation logic may translate authoritative timestamps into readable labels. It must not become a second authorization, release, or completion system.

> **Product Owner annotation — data contract**  
> 

### 2.6 Create the clickable prototype

Codex will produce an interactive prototype for review containing:

- A desktop Student-home presentation.
- Timeline and Browse by section view controls.
- A This week callout with Thursday DI, Friday VA, and Saturday QA recommendation states.
- A Recommended practice group for whole released prior-week worksheets, with Open worksheet and Update log actions.
- Compact resource rows inside Timeline and Browse by section items for Pre-read, Video, Worksheet, and Log.
- A worksheet/log workspace demonstrating selection, bulk Done, review exceptions, saving, saved, and retry states.
- Week-grouped expand and collapse behaviour, with only the current programme week open by default.
- Pre-read, class, optional recording, worksheet, and tracker steps in journey order.
- A competing-work scenario with two equal actions.
- Regular teaching, orientation, mock, break, call, and support-event variants.
- Available, upcoming, after-class, missing-content, loading, empty, and retryable-error states.
- Admin-managed recording states: no link, invalid link, available after class, and updated link.

The prototype will use fictional content and no live Student data. Approval concerns hierarchy, language, state clarity, supported desktop widths, and interaction—not final decorative polish.

> **Product Owner annotation — prototype requirements**  
> 

### 2.7 Define section navigation

The Browse by section view will use exactly these choices:

```text
QA | VA | DI
```

Selecting a section will show its curriculum items in course order. Each result retains its class label, week, availability state, and links to released pre-reads, recordings, and worksheets. Phase 6 adds tracker entry links when the matching destination exists.

The section view does not introduce searchable topic tags or a topic taxonomy. The detailed class bundle labels already approved from the timetable remain descriptive text on their associated QA, VA, and DI curriculum items.

Mocks, orientation, breaks, calls, and support events remain available in Timeline and do not appear in section results.

> **Product Owner annotation — section navigation**  
> Revised on 1 August 2026: browsing is by QA, VA, and DI only; topic tags and many-to-many taxonomy are removed.

### 2.8 Provide direct manual-log access

Once Phase 6 activates manual tracking, Students can reach a worksheet log from three consistent places:

1. **This week → Recommended practice → Update log** opens that worksheet workspace with the log focused on the selected worksheet.
2. **Timeline → released worksheet step → Update log** opens the same worksheet log without requiring the Student to navigate through unrelated class tabs.
3. **Worksheet workspace** keeps the PDF and manual log together, with the selected worksheet preserved.

Open worksheet and Update log are sibling actions. Open worksheet prioritises the source PDF; Update log prioritises manual entry. Both resolve to the same worksheet context and must not create separate progress records.

Before Phase 6 data and routes exist, Phase 5 may reserve this placement in the approved design but must not expose a broken control or claim log progress.

> **Product Owner annotation — manual-log access**  
> 

### 2.9 Keep curriculum resources accessible without clutter

Each academic curriculum item in Timeline and Browse by section includes one compact resource row in journey order:

```text
Pre-read | Video | Worksheet | Log
```

- Available resources render as short labeled buttons.
- Unreleased resources render as compact availability text, not clickable controls.
- Unconfigured resources are omitted from the default row; the expanded item may explain that content has not been added.
- Log appears only when a worksheet and manual tracker destination exist.
- The row uses text labels rather than icon-only controls and wraps only when the supported width requires it.
- Timeline and Browse by section reuse the same resource-action component and destinations.

> **Product Owner annotation — compact resource access**  
> 

### 2.10 Define the quick-log workflow

The manual worksheet log is question-based and preserves the required statuses: `Done`, `Come back for review`, and system-owned `Not updated`.

For a worksheet:

1. Open the worksheet workspace with the full worksheet question list in view.
2. Select one or more questions, or use **Select all**.
3. Choose **Mark selected Done** or **Mark selected for review**.
4. Save only the selected questions as independent Student–worksheet–question records and show saving, saved, or retry feedback.

Safety rules:

- Bulk actions apply only to explicitly selected questions; the system never silently changes unselected questions.
- The Student confirms a bulk action before the selected questions change status.
- Existing statuses are visible before confirmation and may be replaced deliberately.
- The Student can still update one question at a time and add optional time or comment.
- A failed bulk save identifies the affected questions and offers retry without duplicating records.
- Completion remains `Done ÷ total worksheet questions`; review questions are not complete.

> **Product Owner annotation — quick-log workflow**  
> 

---

## 3. UI and UX best practices

These rules must be approved before Phase 5 implementation and carried through Phases 5–7.

### 3.1 Product hierarchy

- Every Student screen should help answer: **What can I do now? What happens next? Where am I in the programme?**
- Time-sensitive preparation and available coursework take priority over analytics.
- Do not show invented urgency, completion, progress, or encouragement based on missing data.
- Use progressive disclosure so the 31-item timeline remains scannable.
- Keep one consistent journey order across the dashboard and curriculum-item detail.
- Keep Timeline as the default for programme orientation and Browse by section as the secondary retrieval path.
- Never create separate copies of a material for Timeline and Browse by section.

### 3.2 Content design

- Use calm, direct language: “Available after class on Saturday” instead of an unexplained “Locked.”
- Button labels must state the action and destination.
- Error messages must say what failed, whether the Student can retry, and how to obtain help.
- Dates and times must be explicit when they affect availability.
- Avoid internal terms such as database status, material type identifiers, or migration vocabulary.

### 3.3 Accessibility and desktop-browser behaviour

- Use semantic headings, landmarks, lists, links, buttons, and native controls.
- Preserve a logical keyboard order and visible focus indicators.
- Never communicate status through colour alone.
- Maintain readable contrast and text sizing.
- Support reduced-motion preferences for non-essential animation.
- Verify the supported current desktop browsers and common laptop and desktop widths.
- Do not claim mobile acceptance from this checkpoint. Mobile support remains deferred unless the authoritative acceptance criteria are amended again.

### 3.4 Engineering boundaries

- Prefer Server Components and server-composed data by default.
- Use Client Components only for browser state, effects, or interaction.
- Keep data retrieval, timeline selection, and presentation responsibilities separate.
- Reuse one canonical state vocabulary across Student screens.
- Every loading state must resolve to success, empty, or actionable failure.
- Database and server boundaries remain authoritative for authentication, enrollment, release, and privacy.
- Never treat a disabled button or hidden link as authorization.
- Read the relevant bundled Next.js 16 documentation before changing framework APIs or conventions.

### 3.5 Design-system boundaries

- Retain the existing Ace Club brand colours, typography direction, and assets as the starting point.
- Normalize existing tokens and interaction patterns instead of introducing page-specific variants.
- Define consistent spacing, card, timeline, button, focus, status, empty, loading, and error patterns.
- Avoid a wholesale brand redesign during Phase 5.
- Shared patterns should be suitable for later Admin reuse without making Student screens feel administrative.

### 3.6 Legacy retirement

- Remove MVP-excluded Student features from reachable navigation and screens during Phase 5.
- Do not physically delete historical tables, functions, attempts, or records as part of UI adaptation.
- Verify the new vertical slice before removing old reads or writes.
- Treat physical data cleanup as a later, separately reviewed retention and rollback decision.

### 3.7 YouTube recording management

- Reuse the existing `video` material type and `video_url`; do not create a parallel recording model.
- Let an Admin add, rename, edit, and remove one or more YouTube recording links on a master curriculum item.
- Accept supported `youtube.com` and `youtu.be` URLs only; reject malformed or non-YouTube iframe sources with an actionable validation message.
- Release recordings after the scheduled class end, matching the existing database-owned material release rule.
- Copy recordings to new cohorts through the existing cohort generator.
- Extend the explicit Admin material sync so newly added recordings and edited master links propagate to linked cohort materials by `master_material_id` without changing their release timestamp.
- Preserve direct-URL release protection and render only a validated YouTube embed or safe external YouTube link.
- Document that LMS release protection can hide a YouTube URL until release but cannot prevent access after a public or unlisted YouTube URL has been obtained or shared.
- Record saving, saved, validation-error, and retry states when an Admin edits a link.

### 3.8 Section navigation

- Reuse the authoritative master curriculum `class_type` values for `QA`, `VA`, and `DI`.
- Do not add topic tables, topic tags, topic slugs, or many-to-many topic mappings.
- Keep non-academic class types out of Browse by section while retaining them in Timeline.
- Preserve the selected section in a stable URL parameter, for example `section=QA`.
- Open the same curriculum-item and material destinations from Timeline and Browse by section.

> **Product Owner annotation — best practices**  
> 

---

## 4. Prototype and acceptance scenarios

The prototype and later Phase 5 implementation must cover:

1. A newly enrolled Student beginning Week 0.
2. A Student with an available pre-read for the nearest class.
3. A Student viewing a future class whose pre-read is not yet available.
4. A Student viewing a worksheet that becomes available after class.
5. A Student with current preparation and an older unfinished worksheet after Phase 6 tracker data exists.
6. A Student watching a valid YouTube recording after class.
7. A recording before class, with access denied and availability information shown.
8. An Admin adding a recording to the master item and explicitly syncing it to an existing cohort.
9. An Admin editing a recording link and the linked cohort receiving the new URL without a changed release timestamp or duplicate material.
10. An invalid or unsupported recording URL with an actionable Admin validation error.
11. A curriculum item with no associated pre-read, recording, or worksheet.
12. A retryable Notion failure.
13. A PDF delivery failure.
14. A Student with no enrollment.
15. A course with no published curriculum items.
16. A Student who has reached the end of the programme.
17. Orientation, mock, break, call, and support-event variants.
18. Browse all QA, VA, and DI curriculum items by section.
19. Open a section result without losing its week or release-state information.
20. Confirm non-academic events remain Timeline-only.
21. Show the This week callout without a “Today’s task” label.
22. Recommend the DI pre-read on Thursday, VA pre-read on Friday, and QA pre-read on Saturday in `Asia/Kolkata`.
23. Confirm day-based recommendation changes do not alter database release timestamps or direct-URL protection.
24. Show each released prior-week worksheet as one weekly Recommended practice task throughout the current week.
25. On Thursday and Friday, show both the pre-read recommendation and Recommended practice.
26. Open worksheet reaches the released PDF; Update log reaches the matching worksheet tracker after Phase 6.
27. Timeline and Browse by section expose compact Pre-read, Video, Worksheet, and Log resource rows without icon-only or broken controls.
28. A Student selects questions and marks the selection Done or Come back for review with one bulk action.
29. Bulk actions never change unselected questions.

Accessibility and supported-browser review must include:

- Current supported desktop browsers at common laptop and desktop widths.
- Keyboard-only navigation.
- Visible focus.
- Text zoom and content reflow.
- Status identification without relying on colour.
- Expand and collapse controls with understandable accessible names.

> **Product Owner annotation — scenarios**  
> 

---

## 5. Preparation deliverables

The checkpoint will produce:

1. This annotated and approved foundation plan.
2. A current-state Student-interface inventory.
3. A clickable desktop prototype.
4. An approved UI state and content matrix.
5. An approved QA/VA/DI section-browse mapping.
6. A manual verification checklist mapped to the MVP acceptance criteria.
7. A Phase 5 start-gate entry in the running handoff after Product Owner approval.

The supporting Phase 5 documentation should ultimately be organized as:

- `docs/phase-5/student-experience-foundation.md`
- `docs/phase-5/ui-state-and-content-matrix.md`
- `docs/phase-5/manual-verification-checklist.md`

> **Product Owner annotation — deliverables**  
> 

---

## 6. Exit gate before Phase 5 engineering

The preparation checkpoint passes only when:

- A first-time Student can identify their programme week and available actions in the prototype.
- Week 0, current, past, and future weeks are understandable without showing 31 fully expanded cards.
- A Student can switch between Timeline and Browse by section and reach the same curriculum content without duplication.
- QA, VA, and DI results contain the correct curriculum items in course order; non-academic events remain Timeline-only.
- The This week callout recommends DI on Thursday, VA on Friday, and QA on Saturday in the programme timezone.
- Recommended practice shows every applicable released prior-week worksheet as a whole weekly task.
- Recommended practice appears above This week.
- Each Recommended practice item offers Open worksheet and, after Phase 6 activation, Update log for the matching tracker.
- Available, upcoming, after-class, not-configured, loading, empty, and failed states are distinct and understandable.
- Regular classes and non-teaching events follow one consistent timeline grammar.
- Supported desktop layouts pass the agreed browser-width and accessibility review.
- Failure scenarios provide retry or support guidance.
- The state contract does not derive authorization, releases, or completion from presentation-only logic.
- Legacy analytics and auto-graded Student practice have an explicit Phase 5 interface-removal map.
- The Product Owner approves the prototype, state/content rules, and verification matrix.

Only after this gate passes should the team create the Phase 5 engineering implementation plan and begin application changes.

> **Product Owner annotation — exit gate and approval**  
> Incorporated on 31 July 2026. Existing video-material support will be reused; the Phase 5 requirement adds master-course Admin link management, validation, release-safe Student display, and propagation of edited links to linked cohorts.

### Approval record

- Product Owner: _Approved in the planning task_
- Engineering: _Ready after repository-only documentation and migration review_
- Approval date: _1 August 2026_
- Approved prototype version: _Weekly Student Dashboard prototype direction approved 1 August 2026_
- Remaining exceptions: _Mobile optimisation is formally deferred by the active MVP acceptance criteria; desktop keyboard and text-zoom support remain required._

---

## 7. Phase 5 delivery exit criteria — locked before engineering

Phase 5 implementation will be accepted only when all of the following pass in staging.

### Student orientation and navigation

- The Student home uses a This week callout and does not display “Today’s task.”
- Timeline remains the default view and presents all 31 curriculum items in chronological week order.
- Only the current programme week opens by default and remains collapsible; Week 0 and every other week can be expanded.
- Browse by section offers exactly QA, VA, and DI and lists the correct curriculum items in course order.
- Timeline and Browse by section open the same underlying curriculum items and materials without duplicated content.
- Mocks, orientation, breaks, calls, and support events appear in Timeline but not in QA, VA, or DI results.

### Weekly recommendation behaviour

- Thursday recommends the released pre-read for Friday's DI class.
- Friday recommends the released pre-read for Saturday's VA class.
- Saturday recommends the released pre-read for Sunday's QA class.
- Recommended practice shows released prior-week worksheets as whole weekly tasks without daily targets or question ranges.
- Thursday and Friday show both the applicable pre-read recommendation and Recommended practice.
- Recommendation-day and practice-target selection use the course timezone, currently `Asia/Kolkata`.
- Outside the day-specific pre-read pattern, the callout presents the week's available actions and scheduled practice without inventing another preparation recommendation.
- Week 0 and exceptional weeks show their real scheduled events rather than a nonexistent DI/VA/QA recommendation.
- Recommendation emphasis never changes `available_from`, RLS visibility, or direct-URL authorization.

### Learning journey and material states

- Each applicable curriculum item presents pre-read, class information, recording, and worksheet in journey order; the shared model can add Log in Phase 6 without restructuring the item.
- Timeline and Browse by section provide compact direct buttons for each configured resource without requiring a separate class-detail detour.
- Class information shows approved title or bundle label, date, time, class type, and instructor.
- Materials clearly show Available now, Upcoming, Available after class, Not configured, and actionable failure states.
- Week 0 materials remain immediately available according to the signed release rules.
- Later pre-reads remain released seven days before class; the weekly recommendation only changes when they are emphasized.
- Worksheets and YouTube recordings remain unavailable until the class end timestamp.
- Locked materials remain denied through direct URLs.
- Open worksheet from Recommended practice reaches the correct released PDF.
- Phase 5 does not render a disabled or broken Log action before the Phase 6 tracker destination exists.

### YouTube recording administration

- An Admin can add, title, edit, and remove supported YouTube recording links on a master curriculum item.
- Invalid or unsupported URLs produce an actionable validation error and are not embedded.
- New cohorts inherit master recordings with post-class release timestamps.
- Explicit sync adds new recordings and propagates edited links to existing linked cohort materials without duplicates or release-time changes.
- A released recording renders through a validated YouTube embed or safe YouTube link.

### MVP simplification and quality

- Legacy Student rankings, correctness, accuracy, daily-target analytics, and auto-graded practice are absent from the reachable Student interface.
- Phase 6 tracker placeholders do not claim progress, completion, or unfinished work without persisted tracker data.
- Loading, empty, failed, and retry states resolve deliberately without indefinite spinners.
- Supported desktop widths, keyboard navigation, visible focus, text zoom, and non-colour status identification pass.
- Google authentication, Student role boundaries, enrollment privacy, database-owned release rules, Notion containment, and private PDF delivery remain unchanged and passing.
- Targeted lint, TypeScript, and the guarded Production build pass; staging Student and Admin verification evidence is recorded before rollout.

> **Product Owner annotation — Phase 5 delivery exit criteria**  
> 
