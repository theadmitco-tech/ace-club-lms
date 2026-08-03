# Phase 5 — UI State and Content Matrix

Status: Approved and staging-verified for Phase 5
Owner: Product owner and Engineering  
Last updated: 3 August 2026

Implementation note: Phase 5 states in this matrix passed staging acceptance. Rows under Phase 6 placeholders, manual-log access points and quick-log states remain the binding design for the next phase, not claims about the current interface.

## Navigation states

| Context | Display | Behaviour |
| --- | --- | --- |
| Student arrives | Timeline selected | Show This week followed by week-grouped curriculum. |
| Student arrives with an active section worksheet | Timeline selected | Show Recommended practice above This week. |
| Week 0 during programme Week 0 | Open by default | Student may collapse it. |
| Week 0 after programme Week 0 | Collapsed by default | Student may expand it. |
| Current week | Open by default | Student may collapse it. |
| Past or future week | Collapsed by default | Student may expand it. |
| Browse by section | `QA`, `VA`, `DI` only | List matching curriculum items in course order. |
| Non-academic event | Timeline only | Never place mocks, orientation, breaks, or calls under QA/VA/DI. |

## This week recommendation states

| Condition in `Asia/Kolkata` | Callout treatment | Recommended label |
| --- | --- | --- |
| Thursday with Friday DI item | Show all applicable weekly actions | DI pre-read |
| Friday with Saturday VA item | Show all applicable weekly actions | VA pre-read |
| Saturday with Sunday QA item | Show all applicable weekly actions | QA pre-read |
| Monday–Wednesday or Sunday | Show all applicable weekly actions | No pre-read recommendation |
| Week 0 or exceptional week | Show actual scheduled items | None unless separately approved |
| Expected pre-read is not configured | Explain that no pre-read has been added | No broken or disabled recommendation |
| Expected pre-read is configured but failed to load | Keep it available in the callout | `Retry pre-read` |

The Recommended label affects emphasis only. It does not alter release state or authorization.

## Recommended practice states

| Condition | Display | Actions |
| --- | --- | --- |
| A section class has ended and its next same-section class has not begun | Recommend that class's released worksheet as one whole task | Open worksheet; add Update log when Phase 6 tracking exists |
| DI, VA, and QA each have an active worksheet window | Show one Recommended practice section with at most one worksheet per section | Open worksheet on every row; add Update log to that row when Phase 6 tracking exists |
| The next class in a section begins | Remove the preceding worksheet from Recommended practice only | Keep it available in Timeline and Browse by section |
| The final class in a section ends | Keep its released worksheet recommended because there is no later same-section class | Open worksheet |
| Thursday, Friday, or Saturday with a pre-read recommendation | Show preparation recommendation and Recommended practice together | Keep both usable |
| Any day | Derive the active worksheet independently for DI, VA, and QA | Do not invent a daily quota or question range |
| Worksheet released but Phase 6 tracker not active | Show Open worksheet only | Do not render a disabled or broken Update log control |
| Tracker active | Show whole-worksheet manual status summary | Update log deep-links to worksheet |
| Worksheet has no tracker destination | Do not expose a broken control | Keep the released worksheet accessible normally |

Recommended practice uses class end and the next same-section class start as its display window. This affects only recommendation placement; released worksheets remain available elsewhere. It must not restore daily targets, rank, accuracy, correctness, class comparison, streak, or automated grading.

## Material states

| Internal state | Student copy | Action |
| --- | --- | --- |
| Available pre-read | Available now | Open pre-read |
| Available recording | Available now | Watch recording |
| Available worksheet | Available now | Open worksheet |
| Upcoming pre-read | Available on `{date}` at `{time}` | No open action |
| Post-class material | Available after class on `{date}` | No open action |
| Not configured | No material has been added for this step | No broken action |
| Load failed | We couldn't load this material | Retry; provide support guidance after repeated failure |
| Direct URL before release | Available on/after `{release information}` | Deny access and return to curriculum item |

## Request states

| State | Required presentation |
| --- | --- |
| Loading | Descriptive skeleton or status naming what is loading. |
| Success | Render authoritative data and available actions. |
| Empty enrollment | Explain that no course is assigned and how to contact support. |
| Empty curriculum | Explain that the schedule is not available yet. |
| Partial material failure | Keep the rest of the curriculum usable and show retry on the failed item. |
| Page failure | Explain the failure, provide retry, and preserve a safe route back. |

## Curriculum event variants

| Type | Required information | Journey steps |
| --- | --- | --- |
| QA | Bundle label, date, time, Unnati | Pre-read, class, recording, worksheet, tracker when configured |
| VA | Bundle label, date, time, Tanya | Pre-read, class, recording, worksheet, tracker when configured |
| DI | Bundle label, date, time, Ishan | Pre-read, class, recording, worksheet, tracker when configured |
| Orientation | Title, date, time | Only configured materials and event details |
| Mock | Title, date, time | Only configured materials and event details |
| Break | Title and date | No invented learning steps |
| Support call | Title, date, time or scheduling guidance | Only configured actions |

## Admin YouTube states

| State | Admin feedback | Result |
| --- | --- | --- |
| Blank new link | YouTube link is required | Do not save. |
| Unsupported URL | Enter a valid YouTube or youtu.be link | Do not save or embed. |
| Saving | Saving recording… | Disable duplicate submission. |
| Batch selected | Show that batch's ordered sessions | Never mix recording links from another batch. |
| Saved | Recording saved | Only the selected batch session reflects the title and link. |
| Save failed | Recording couldn't be saved | Preserve input and offer retry. |
| Another batch has the same curriculum item | Keep its recording independent | Do not copy edits or removals across batches. |
| Generate or Sync materials | Copy reusable pre-reads and worksheets only | Never add or update recordings. |

## Phase 6 placeholders

- Do not display “Continue tracking,” “In progress,” “Completed,” or “unfinished” until persisted manual tracker data supports the state.
- A worksheet may be opened in Phase 5 without implying tracker progress.
- Keep room for Update log in the shared worksheet-action component, but do not render it until the manual tracker destination and records exist.
- Update log should deep-link to the selected worksheet rather than returning to a generic tracker landing page.
- Phase 6 introduces `Done`, `Come back for review`, `Not updated`, optional time, optional comment, saving, saved, and retry states.
- Phase 6 also introduces a central **Practice log** overview so Students can find every released worksheet log without navigating through the course timeline.

## Manual-log access points

| Entry point | Update log destination |
| --- | --- |
| Student navigation → Practice log | Overview grouped by curriculum section/type, with QA, VA and DI first, other worksheet-bearing types separate, and programme week on each row plus saved totals and review counts |
| This week → Recommended practice | Matching worksheet workspace with its question list focused |
| Timeline → released worksheet | Matching worksheet workspace with the log panel focused |
| Browse by section → released worksheet | Matching worksheet workspace with the log panel focused |
| Worksheet workspace | Full question log with an Open worksheet action, preserving worksheet context |

All entry points address the same Student–worksheet–question records. Navigation must never create duplicate tracker records.

## Compact resource row

| Resource | Available | Unavailable | Not configured |
| --- | --- | --- | --- |
| Pre-read | `Pre-read` button | Availability text | Omit from compact row |
| Recording | `Recording` button | Available after class | Omit from compact row |
| Worksheet | `Worksheet` button | Available after class | Omit from compact row |
| Log | `Log` button | Available with worksheet/tracker | Omit until tracker exists |

The row appears on academic items in Timeline and Browse by section and uses text labels in journey order.

## Quick-log states

| State | Presentation | Actions |
| --- | --- | --- |
| Initial worksheet | Full question list and existing statuses | Select questions; Select all |
| Questions selected | Selected question numbers are visibly distinct | Mark selected Done; Mark selected for review; clear selection |
| Bulk confirmation | State exact selection and number of questions affected | Confirm or cancel |
| Saving | Identify the affected questions | Prevent duplicate submission |
| Saved | Each question shows its persisted status | Continue individual editing |
| Partial failure | Identify unsaved question numbers | Retry failed only |
| Individual edit | One question row is active | Done; Come back for review; optional time/comment |
