# Batch workflow repairs

Review date: 2026-11-19. Base commit: `9f8890e882a3b8ae221b11a65636bbe3b9cb5bf2`. These results describe uncommitted repairs; the original audit remains unchanged.

## Changes

- Initial batch fields now use account-scoped, tab-local recovery before schedule review. Subject, copied-session choice, feedback-session consent and every class field remain recoverable, including incomplete or invalid values. Browser Back does not intercept native history; returning to creation offers Restore edits. Repeated Back and reload preserve the same form.
- A pending recovery choice disables the blank form until Restore or Discard. An attempted prepared save cannot be overwritten by typing into a new form. Existing prepared requests retain their original identifiers for retry.
- Creating a batch without copied course sessions now requires explicit consent to create one resource/feedback session for each live class. Each session has its own UUID and starts with empty resources. Review explains that the Admin must explicitly link classes to their published sessions before completion. No mapping, attendance or feedback record is invented.
- Legacy recovered schedules without course sessions remain replayable without changing request identifiers. A visible warning directs the Admin to add course sessions after saving the batch draft and before publication.

The new recovery shape test is included in the existing Phase 2 verification entry used by CI. The browser fixture copies the new validation module along with the actual application components.

## Verification

| Check | Result |
| --- | --- |
| Incomplete scratch-state round trip and account isolation | Passed |
| Corrupt shape, array-valued subject, duplicate class keys and oversized classes rejected | Passed |
| Repeated native Back → return → Restore edits | Passed; subject, names, empty time, invalid duration and unfinished second class preserved |
| Reload recovery and explicit discard | Passed |
| Different synthetic Admin owner | Passed; another account's scratch state unavailable |
| Pending recovery cannot be overwritten by new form edits | Passed; fields disabled until choice |
| New feedback sessions require explicit consent | Passed; unchecked choice prevents review and writes |
| Lost template-save confirmation → reload → retry | Passed; same request, event/session UUIDs and template reused |
| Two classes with identical titles | Passed; four distinct event/session UUIDs persisted, no mapping call issued |
| New session deep link → four draft resource fields → edit → save privately | Passed; exact requested session selected and all resources editable before publication |
| Mobile creation and review at 390px/320px | Passed; no horizontal overflow or clipped review action, scoped accessibility scan passed |
| Focused lint and application TypeScript check | Passed |

The first repair fixture stopped at a sibling publication callback type-check issue before executing browser tests. After that annotation was corrected, the full Admin run passed 24 of 25 journeys; the remaining new deep-link check used an overly strict accessible-name selector. The actual session had opened correctly. The selector and details-group scope were corrected without changing application behavior. A fresh focused run passed all six selected journeys, including the deep-link continuation. These attempts are recorded separately in `batch-repairs.json`.

The browser-generated template request was captured privately for the parallel disposable-PostgreSQL completion check. This report does not claim that database result; delivery verification records it separately.

## Same-page recovery-link follow-up

A further real-browser check found that Add a course session changed the batch query but retained the publication tab. A temporary workspace key corrected differing-query navigation, but the same-URL variant still failed after the Admin switched tabs. That temporary page change was reverted.

The final correction uses ordinary document navigation for this recovery link. The existing `beforeunload` guard protects an unconfirmed publication review. Both fresh regressions passed: cancelling the leave prompt retains the publication review, while accepting opens course-session editing for either an identical URL or a changed query. Adding and saving the missing session keeps the editor open after refresh and does not publish anything. The batch page and general history architecture remain unchanged.

The permanent Admin browser suite now includes both recovery-link paths, bringing its journey count to 27. This task's final focused link run passed 2/2; a complete 27-journey rerun belongs to the parent integration verification.

## Scope and residual limits

The run used actual Admin components, shared validation and Server Action wrappers with isolated synthetic authorization/data adapters. The route returning to Course content was a placeholder heading; the actual Admin navigation and enabled redirect behavior were retained. No hosted service, provider, Production data or real Student record was touched. Browser proof establishes form/recovery/publishing handoffs, not hosted authorization or database enforcement. Initial-form scratch state remains tab-local with the existing 24-hour retention and storage-unavailable warning. No commit, push or deployment was performed by this repair task.
