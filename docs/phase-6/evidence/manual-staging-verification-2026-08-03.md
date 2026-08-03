# Phase 6 Manual Staging Verification — 3 August 2026

Status: Passed — Phase 6 staging acceptance complete
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
- A read-only staging audit found 20 expected rows for the current enrollment, no missing rows, no duplicate identity groups and no Admin-owned rows. Twenty additional rows belonged to a future worksheet in a historical course; direct authenticated probing confirmed they remained unreadable, including when the worksheet was temporarily released inside a rolled-back transaction.
- The rollback-only provisioning probe completed with `PASS: existing coverage, new enrollment, copied worksheet, new question and duplicate protection`.
- The rollback-only release probe completed with `PASS: unreleased worksheet table, RPC, Practice log and Timeline boundaries`.
- The rollback-only Admin probe completed with `PASS: Admin read access without Student ownership or writes`.
- The signed-out RPC probe completed with `PASS: signed-out tracker write blocked`.
- Automated browser verification confirmed Practice log and the canonical worksheet workspace both retained 18 Done, 2 Review and 0 Not updated, including Question 1's `1:30` and comment and Question 2's `2:20`. Timeline and curriculum-item Log actions used the same canonical material URL. Recommended practice had no eligible worksheet, and Browse by section had no released QA, VA or DI worksheet, so those two positive same-log paths remain unavailable in current staging data.
- At a 1280px laptop viewport, the tracker used two columns with no page or table horizontal overflow. A 640px CSS viewport, equivalent to 200% zoom on that laptop width, stacked the workspace without page overflow and contained the table overflow inside its scroll region.
- Keyboard focus verification found one blocker: global input styles remove native outlines, while the Select all checkbox is not included in the tracker checkbox `:focus-visible` selector. Other tracker buttons, row checkboxes, time inputs and comment fields have explicit focus-visible styling.
- Engineering added Select all to the tracker `:focus-visible` selector and deployed commit `9f2c641`. The Preview recheck found `focusVisible: true` with a solid 3px `rgb(227, 166, 49)` outline and 2px offset. Tracker totals remained 18 Done and 2 Review.
- The canonical workspace produced no browser console warnings or errors during the final check.

No screenshots are stored because the supplied images contained a staging Student's name. This evidence records only anonymized behavior and totals.

## Coverage notes

- Recommended practice had no eligible worksheet, and Browse by section had no released QA, VA or DI worksheet. Their conditional link behavior and shared canonical route were therefore verified through the implementation contract plus the live empty/absent states rather than positive clicks.
- The available browser surface did not expose request interception. PDF and tracker failure isolation were verified from their independent render and retry paths, while the healthy staging workspace confirmed both can coexist without console errors.
