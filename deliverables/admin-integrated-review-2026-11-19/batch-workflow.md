# Batch workflow integration review

Review date: 2026-11-19. Candidate: `9f8890e882a3b8ae221b11a65636bbe3b9cb5bf2`.

The normal batch creation path connects successfully through private draft, publication, unpublication and reopening. Browser Back loses an unreviewed creation form. Default live-only creation also reaches publication with no course sessions and no explanation of the downstream session-mapping requirement.

## Execution and limits

The browser review used actual `AdminShell`, `NewLiveBatch`, `BatchWorkspace`, `BatchDraftEditor`, `BatchDatePicker`, `PublicationPanel`, Server Action wrappers and shared validation in a disposable Next.js production build. Authentication, feature flags and data access were replaced by local synthetic adapters. The Admin entry redirect mirrored the enabled application route; the Course content destination was a placeholder heading. All browser requests were restricted to the local fixture origin. No credentials, hosted services, provider requests, Production data or real Student records were used.

The first run completed **four journeys and failed one**. A separate follow-up completed **two diagnostic checks that reproduced the defects**; these results do not mean the defects were fixed. Both runs recorded zero browser exceptions and zero external requests. One intentional transport interruption produced the expected server exception and recoverable UI state.

Source hashes identify repository inputs; overridden authentication/data-access files were not executed as their original implementations. The fixture publication adapter does not enforce all database constraints or propagate publication to Student schedules. Hosted authorization, actual database persistence, payment, capacity, live completion and Student access acceptance are therefore outside this report.

## Workflow checklist

| Journey | Observed result |
| --- | --- |
| Admin entry → actual Batches navigation → Create batch | Passed with actual client routing; no synthetic history manipulation |
| Optional saved Quant sessions → two named classes on separate dates | Passed; copied session key retained and original templates unchanged |
| Dates entered out of chronological order | Passed; first date anchored to earliest class, each class retained its requested date and time |
| 23:30 IST class ending after midnight | Passed through proposal and saved synthetic record; UTC end matched the following local day |
| Review → edit → review | Passed; class names, dates and times retained; no writes before confirmation |
| Save schedule → review batch → confirm private draft | Passed; one new schedule and one new batch; nothing published automatically |
| Preview publication → cancel → preview → confirm | Passed; cancellation changed no publication, confirmation published only the selected batch |
| Review unpublish → confirm → All batches → reload → reopen | Passed; list showed Unpublished and two independent class controls remained |
| Empty form, empty time, duration below 15 minutes | Passed; review blocked and no save called |
| Quant copied-session choice → DI subject | Passed; source selection reset and DI draft contained no Quant sessions |
| Keyboard calendar arrow/select → Escape | Passed; tentative date/time discarded and trigger focus restored |
| 390px and 320px review | Passed; no horizontal overflow and scoped automated accessibility scan found no WCAG A/AA violations |
| Schedule saved → All batches → Create batch → Restore edits → retry | Passed; same schedule reused, one batch created, no duplicate template |
| Lost confirmation after batch save → confirm same review | Passed; identical request replayed, revision remained 2 and recovered receipt shown |
| Another revision appears before confirmation | Passed for stale rejection/display only; remote title preserved, local title retained and reload guidance shown |
| Unreviewed creation → browser Back | **Failed: form lost without confirmation or recovery** |
| Default Live classes only → publish | Publication succeeded with zero sessions; downstream completion dependency absent from setup guidance |

## First broken boundary: browser history navigation

Priority: **high for accidental data loss**.

Reproduction used the actual navigation button and native browser history:

1. The browser opened `/admin`, which redirected to `/admin/v2/content`.
2. The actual Admin sidebar Batches button called `router.push('/admin/v2/batches')`.
3. The Admin opened Create batch and entered a batch name, class name and date without reviewing.
4. Clicking the explicit Course content button triggered one leave confirmation; dismissing it retained the form.
5. Browser Back navigated to Course content with no additional confirmation.
6. Returning through Batches → Create batch showed empty batch/class fields and no Restore edits option. No save or preview had occurred.

`AdminDraftNavigation.tsx:32` registers `beforeunload`, while explicit links and navigation buttons call `confirmLeave`. Same-document browser history is not covered by those handlers. `NewLiveBatch.tsx:60` only remembers a prepared schedule after Review schedule, so initial typed fields cannot be restored after this navigation.

Recommended correction: retain the editable creation form before review, including incomplete values, and define a consistent history-navigation recovery behavior. Browser Back/Forward, explicit sidebar navigation, reload and cancel should then be verified separately. This audit made no application changes.

## Creation-to-completion dependency

Priority: **high for completing the default Admin workflow**, subject to the separate delivery/database review.

The default selector is Live classes only. The actual creation component sends `sessions: []`, displays “0 course sessions included” at review and explains publication/enrollment, but does not explain feedback-session mapping. The browser successfully saved and published that synthetic batch; the resulting page exposed “Mark classes complete & manage registration”.

Source inspection shows that `LiveSessionMappings.tsx:24` offers only sessions from the same publication, while `LiveOperations.tsx:48` disables completion when learning is enabled and the event has no mapping for that publication revision. A zero-session publication therefore provides no mapping choice. The live-management route was not opened in this fixture and database enforcement was not exercised here; the parallel delivery review owns that boundary.

Recommended correction: make the session requirement explicit during creation and provide an immediate supported path to create/select matching feedback sessions before publication or completion. The application should not silently invent session mappings.

## Visual assessment

The reviewed desktop batch view kept two class cards readable and separated, with dates/time controls available independently. The 320px schedule review wrapped the primary action correctly and retained a clear single-column hierarchy. The wider workflow still requires two private save/review stages followed by a separate publication review; this is functional but needs clearer progress continuity for nontechnical Admins. The successful saved-schedule recovery contrasts with the lost pre-review form.

Screenshots and disposable runners remain private. Their hashes, exact journey results, synthetic call traces and observed limits are recorded in `batch-evidence.json`. No application edits, commits or pushes were performed for this audit.
