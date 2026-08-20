# Pilot V2 — Approved Template and Admin Interface Specification

Status: Approved for local Phase 1 implementation
Owner: Product owner and Engineering
Last updated: 17 August 2026

## Decision

The Product Owner supplied three curriculum screenshots and confirmed the implementation defaults on 17 August 2026. This specification closes the Phase 0 template/interface input gate and authorizes local Phase 1 implementation plus creation of one additive migration. It does not authorize applying a migration to staging or Production, modifying an existing batch, deployment, merge or live-data mutation.

## Shared crash-course rules

- Session 1 is on relative day 0, the selected future batch start date.
- Later sessions use consecutive relative days in displayed order.
- Every class and the end-of-course mock runs from 8:00–9:00 PM in `Asia/Kolkata`.
- All events are published by default. Instructions initially remain empty and editable for later batch-event and Student display. Venue and reporting time are excluded from the reusable-template editor and remain later batch/mock scheduling concerns.
- Crash-course revisions initially contain no reusable resources.
- Topic labels below preserve the supplied wording and abbreviations.
- Event rows remain reorderable after seeding; the seed order is the approved initial order.

## Critical Reasoning Crash Course

Section: Critical Reasoning. Instructor: Tanya.

| Relative day | Event type | Topic |
|---:|---|---|
| 0 | Live class | CR (Boldface + Inferences) |
| 1 | Live class | CR (Finding the Assumptions) |
| 2 | Live class | CR (Strengthen + Weaken the Conclusion) |
| 3 | Live class | CR (Evaluate the Conclusion) |
| 4 | Live class | CR (Complete the Argument + Paradoxes) |
| 5 | Mock | End-of-course Mock |

## Reading Comprehension Crash Course

Section: Reading Comprehension. Instructor: Unnati.

| Relative day | Event type | Topic |
|---:|---|---|
| 0 | Live class | RC (Intro to Mind-Mapping + Question Types) |
| 1 | Live class | RC (Primary Purpose Qs) |
| 2 | Live class | RC (Inference Qs) |
| 3 | Live class | RC (Point of View Qs) |
| 4 | Live class | RC (Function & Role Qs) |
| 5 | Mock | End-of-course Mock |

## Data Interpretation Crash Course

Section: Data Interpretation. Instructor: Ishan.

| Relative day | Event type | Topic |
|---:|---|---|
| 0 | Live class | DS + GI |
| 1 | Live class | DS + TA |
| 2 | Live class | TPA + MSR |
| 3 | Live class | TPA + MSR (Non-Math) |
| 4 | Mock | End-of-course Mock |

## Full Course

Revision 1 is a structural snapshot of the existing active `mvp-2026` Master Course:

- all active Master events retain their stable curriculum keys, order, relative day, current start time, duration, event type, Section and instructor; the seed validates against the active Master count instead of assuming one environment-specific total;
- existing Master pre-reads and worksheets are associated with their matching template event in deterministic order;
- no recording or private Session material becomes reusable template content; and
- later template revisions do not update `master_sessions`, `master_materials`, existing `courses`, `sessions` or `materials`.

The exact active Master rows remain defined by [`20260731160000_align_master_course.sql`](../../supabase/migrations/20260731160000_align_master_course.sql); the approved snapshot transformation is defined by the new Phase 1 migration.

## Admin interface

Use the existing Admin visual language and add a dedicated Course templates destination:

1. Show exactly four stable template identities and their current revision/event count.
2. Keep the page a Server Component and load Admin-authorized data through a server-only data-access layer.
3. Use a narrow Client Component for editing, reordering, preview and form state.
4. Allow structured edits to template title and event title/type/Section/order/days after batch start/start time/duration/instructor/instructions/publication default. Section names are fixed by the selected template; each event assigns one through a dropdown.
5. Allow adding and removing events; removing an event also removes its associations only in the proposed new revision.
6. Show current reusable-resource associations without introducing the Phase 3 resource-management workflow.
7. Require a successful complete preview before Save is enabled.
8. Preview event count, order, relative timing, duration, instructor, publication default and reusable-resource count.

### Product Owner amendment — 17 August 2026

Remove Venue from the Phase 1 reusable-template editor and its consequence preview. Retain the additive database field for later batch/mock scheduling compatibility; this amendment does not remove venue from the approved batch-event or mock requirements.

Use `Review changes` and `Save template` actions without an inline review panel. Review validates the draft and shows the existing top-right Admin notification with the selected template, added/edited/removed counts, resulting event total and proposed revision; only then is Save enabled. A no-change review shows a top-right notification and leaves Save disabled. After saving, preserve the selected template and identify it in the success notification. Keep version history as an internal safety mechanism and state explicitly that saving does not create another template or change an existing batch. Event-to-Section assignment remains a dropdown; remove the editable Section-label area so fixed programme choices cannot be renamed accidentally.

When an Admin adds an event to a long template, keep their scroll position and use the existing top-right Admin toast pattern to summarize the new event number, selected template and unsaved state. Mark the eventual card `New · unsaved`. A no-change review must not offer a confirm action. Show the selected template's immutable revision records in a visible `Revision history` disclosure, identify the current revision and state honestly that full comparison and one-click restore are not Phase 1 features.

Remove the unused `Window` choice from the Admin event-type dropdown; `Support` covers the approved scheduled support use case. Rename `Relative day` to `Days after batch start (0 = start date)`. Remove Reporting time from the reusable-template editor while retaining the additive compatibility field for later batch/mock scheduling. Phase 1 stores Instructions but does not expose template data to Students; batch copying and Student display remain Phase 2 and Phase 4 work respectively.
9. Save atomically as a new immutable revision with an expected-revision check; an existing batch is never changed.
10. Return actionable field errors and stale-revision errors.

No Student interface changes are part of Phase 1. The approved Phase 4 Student specification remains governed by the acceptance criteria and roadmap.
