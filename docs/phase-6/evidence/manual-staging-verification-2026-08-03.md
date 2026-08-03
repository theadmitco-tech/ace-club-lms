# Phase 6 Manual Staging Verification — 3 August 2026

Status: Partial — Student overview and individual status persistence pass; remaining checklist scenarios are pending  
Environment: Vercel Preview backed by staging Supabase `eyphkkginlgoaxflauog`

## Product Owner verification

- A Week 0 Student with no released eligible worksheet saw the deliberate `No released worksheets yet` state.
- A past-dated staging cohort exposed its released diagnostic worksheet in Practice log.
- The Product Owner revised the overview from week groups to curriculum section/type groups and accepted the deployed result.
- The released diagnostic appeared under `MOCK`, retained `Week 0` on its row, and displayed 20 total questions.
- The overview displayed 15 Done, 5 review and 0 Not updated with last-update information.
- Opening Update log reached the matching worksheet log.
- Replacing one review status with Done, refreshing, and returning to Practice log produced 16 Done and 4 review. The Product Owner reported the result working.
- Selecting exactly two Done questions, bulk marking the selection for review, confirming and refreshing changed the overview to 14 Done and 6 review. The Product Owner reported that only the selected questions changed.
- Entering `1:30` and a staging-only comment, blurring the fields and refreshing preserved both values.
- The same check exposed horizontal scrolling inside the side-by-side tracker panel. Engineering widened the desktop workspace, allocated more width to the tracker and reduced the table minimum width; deployment and Product Owner recheck are pending.

No screenshots are stored because the supplied images contained a staging Student's name. This evidence records only anonymized behavior and totals.

## Still pending

- invalid time feedback and cross-student comment privacy;
- Select all and bulk Done changes;
- forced partial failure and failed-only retry;
- duplicate-record checks across every deep link;
- signed-out, deactivated, unreleased and cross-student privacy probes;
- keyboard, focus and text-zoom acceptance.
