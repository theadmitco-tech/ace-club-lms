# Phase 3 verification — 22 August 2026

## Implemented acceptance coverage

| Contract area | Evidence |
| --- | --- |
| Exactly one attempt | `unique (assignment_id, student_id)` and idempotent `start_mock_attempt` |
| Six section orders | `SECTION_ORDERS`, `isSectionOrder`, database permutation check, and six-choice setup UI |
| Server timing | 2,700-second section deadlines, deadline enforcement on every mutation, 5-minute and 1-minute warnings |
| Resume and concurrency | persisted current item, response autosave, attempt lock version, response version, stale-write `409` recovery |
| All eight types | revision snapshots retain question type, rich content, interaction config, response slots/options, stimuli, and protected media |
| Bookmark and review | persisted bookmarks, navigator, review snapshot, three-distinct-question edit ledger |
| Optional break | one server-timed 10-minute break after section 1 or 2; take, skip/begin, early end, and expiry states |
| Submission and timeout | confirmation UI, terminal section states, automatic timeout submission, completed-attempt placeholder |
| Key privacy | private attempt-key snapshot; no browser grants; no answer or explanation in Student state/API |
| Media privacy | attempt ownership plus question/stimulus association checks before a 60-second signed redirect |

## Automated verification

- `npm run test:mock-attempt-player` — 3/3 passed.
- `npm run test:mock-question-package` — 8/8 passed.
- `npm run test:pilot-v2` — 46/46 passed.
- `npx tsc --noEmit` — passed.
- Focused ESLint for all Phase 3 TypeScript/TSX and tests — passed.
- `npm run build` — passed; Next.js generated `/mocks`, `/mocks/[attemptId]`, and all three Student attempt API route groups.

## Scope note

This paragraph records the 22 August local-only checkpoint. The separately authorized Staging acceptance completed on 23 August and is recorded below. No Production migration, deployment, data operation or environment change occurred, and no official scaled score is claimed or displayed.

## Local database and browser acceptance — 23 August 2026

- Started a fresh Docker-backed local Supabase stack, applied the original 34 migrations through `20260822213000_add_mock_attempt_player.sql`, then applied the two narrowly scoped server-role grant migrations found necessary by the accepted-package run.
- Created a disposable local Student, course, released assignment, and 64-question full-length fixture spanning PS, DS, CR, RC, GI, TI, MSR, and TPA.
- Confirmed the Student mock library, all six section-order permutations, immutable Option 6 attempt creation, 45-minute server deadline, multi-slot Data Insights autosave, bookmark persistence, question navigation, reload/resume, three-distinct-question review cap, fourth-edit rejection, submission confirmation, one-time break offer, break timer, and break consumption.
- Browser QA identified and corrected deterministic date formatting, deadline hydration, friendly mutation errors, singular review-edit grammar, guaranteed busy-state cleanup, and fast stale-conflict handling.
- Remote Supabase commands were not used. The linked Staging project and Production were not changed.

## Accepted V1.2 package and Student rendering acceptance — 23 August 2026

- Used `ACE-QUESTION-PACKAGE-UNNATI-20260822-d1737807-bb2d-40f3-ba5a-4b45324ee939.zip` as the primary fixture. The real Admin dry run returned valid with 11 questions, four stimuli, one asset, zero errors, zero warnings, and all eight question types in the declared counts.
- Imported and published the 11 questions through the real local Admin APIs, built a 64-question executable mock through the real Mock Builder APIs, assigned it to a disposable local Student, selected section-order Option 5, and opened every official fixture question in Student View.
- GI displayed the protected, legible chart with its supplied `alt` text and two native dropdowns. TI displayed the sortable six-row table plus a three-row Yes/No matrix. MSR displayed three keyboard-operable source tabs plus its Yes/No matrix. TPA enforced one radio selection per answer column. PS, DS, CR, and RC retained native single-choice controls.
- All four linked RC questions appeared consecutively and displayed the same 2,632-character shared passage beside each distinct question. The desktop layout used passage, question, and navigator columns; CSS collapses the passage workspace to one column below 1,050px and the navigator below the question below 760px.
- Reload checks passed for GI, TI, MSR, TPA, PS, and RC. Stored response JSON used the package slot IDs exactly: GI `blank1`/`blank2`; TI `r1`/`r2`/`r3`; MSR `r1`; TPA `purse_i`/`purse_ii`; standard questions `answer`.
- Student-readable snapshots expose only `question_type`, `stem`, media/stimulus data, interaction/options, and response type. Correct answers and explanations remain solely in `private.mock_attempt_keys`, which has no `anon` or `authenticated` grants.
- Accessibility checks confirmed native labels/fieldsets, screen-reader-only captions, visible `:focus-visible` outlines, `aria-sort`, native selects, matrix radio labels, tab roles, and Arrow/End keyboard tab navigation. Images use `max-width: 100%` and `height: auto`; media requests are ownership-checked and returned through short-lived signed redirects.
- Browser QA found and fixed three local closure defects: missing server-only grants for import-created taxonomy labels, missing server-only Mock Builder mutation grants, and a missing visually-hidden utility that caused the image alt caption to duplicate visibly. No accepted V1.2 schema field changed and no package regeneration is required.
- Focused verification after the fixes: Phase 3 formats 3/3, question package 8/8, attempt player 3/3, and TypeScript all passed.

## Staging migration, Preview and Student acceptance — 23 August 2026

- Applied and ledgered only the four reviewed Phase 3 migrations: `20260822213000`, `20260823100000`, `20260823101000`, and `20260823102000`. The Student relations have RLS enabled, authenticated Students have only the intended read grants, `mock_operation_receipts` remains unreadable to browser roles, and `private.mock_attempt_keys` has no authenticated read grant.
- Deployed immutable Staging-backed Vercel Preview `dpl_GBBas92jMv8VEm5AN7uiphJN5mEJ`, READY at `https://ace-club-jd5x39ao7-theadmitco-techs-projects.vercel.app`. The Preview environment-separation guard passed and no `--prod` deployment was used.
- The accepted V1.2 package dry-run passed with 11 questions, four stimuli, one asset and zero errors. Six non-blocking similarity warnings reflected existing synthetic Staging content.
- The first confirmation failed safely because the same chart bytes already existed under a different namespace-scoped external asset ID. No partial import remained. Migration `20260823102000_allow_reused_mock_media_bytes.sql` preserves unique storage paths and external asset IDs while changing the namespace/hash constraint to a duplicate-detection index, allowing independent packages to reuse identical bytes without package regeneration.
- Retest passed: the package imported all-or-nothing, all 11 official revisions were Published, and the real Mock Builder API validated, published and immediately assigned the clearly named 64-question acceptance mock at 21 Quant, 23 Verbal and 20 Data Insights with 45-minute section limits.
- The approved Staging test Student saw the released mock and all six section-order permutations. Option 5 opened Data Insights first. Every official question opened in Student View: GI, TI, MSR, TPA, PS, DS, CR and four consecutive RC questions.
- GI rendered a legible protected chart, supplied alt text and two dropdowns. TI rendered a sortable seven-column/six-row table and six-radio Yes/No matrix. MSR rendered three source tabs, Arrow/End keyboard navigation and its matrix. TPA rendered ten radios grouped into exactly one choice for each of `purse_i` and `purse_ii`. PS, DS, CR and RC rendered five native single-choice controls.
- All four RC questions displayed the same 2,632-character passage beside four distinct stems in positions 2–5. Desktop visual QA confirmed the passage/question/navigator layout.
- Reload persistence passed for GI, TI, MSR, TPA, PS and RC. Database evidence showed exact slot-keyed JSON: GI `blank1`/`blank2`; TI `r1`; MSR `r1`; TPA `purse_i`/`purse_ii`; standard questions `answer`.
- Student-readable Staging snapshots contain only `question_type`, `stem`, media/stimulus data, `response_type`, interaction and options. No correct-answer or explanation field is present.
- Local regression after the Staging-found compatibility correction passed: Phase 3 formats 3/3, TypeScript and focused ESLint. Both Vercel builds passed Next.js compilation and TypeScript.
- Production was not queried or changed. Product Owner visual acceptance of the immutable Preview is the remaining closeout gate.
