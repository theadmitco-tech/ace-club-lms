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
- The same check exposed horizontal scrolling inside the side-by-side tracker panel. Engineering widened the desktop workspace, allocated more width to the tracker and reduced the table minimum width. After deployment, the Product Owner confirmed the workspace was much better and Time and Comment no longer required horizontal scrolling at the tested desktop width.
- Select all followed by Mark selected Done, confirmation and refresh persisted all 20 records as Done with 0 review and 0 Not updated. The Product Owner reported the result working.
- Entering invalid duration `1:99` left the value visible and displayed the actionable `Use mm:ss, for example 2:30.` Retry state. The Product Owner reported it working.
- With Question 1 carrying that invalid duration, a two-question bulk Review saved Question 2 while identifying Question 1 as the sole failure and leaving it selected. After correcting the time, Retry failed only saved Question 1; refresh showed 18 Done and 2 review.
- Opening the same released worksheet from its Timeline Log/Tracker action returned the existing 20 Done records and preserved the saved `1:30` time and staging comment. No duplicate tracker state appeared.
- After sign-out, reopening the copied worksheet-log URL redirected to login and exposed neither the PDF nor tracker totals, time or comment.
- The rollback-only staging privacy probe completed with `PASS: cross-student read/write, signed-out and deactivated tracker boundaries`. It confirmed a second active Student could not directly read the tracker owner's rows or mutate the owner's row through the worksheet RPC, a signed-out database caller saw no tracker rows, and a temporarily deactivated owner could neither read their rows nor update through the RPC.

No screenshots are stored because the supplied images contained a staging Student's name. This evidence records only anonymized behavior and totals.

## Still pending

- duplicate-record checks from Recommended practice and Browse by section;
- signed-out RPC write and unreleased-worksheet privacy probes;
- keyboard, focus and text-zoom acceptance.
