# Pilot V3 Phase 4 — Results, diagnostics and Admin reporting

Status: **Closed and accepted on Staging/Preview; Production remains separately authorized**
Date: 24 August 2026  
Branch: `codex/pilot-v3-phase-4`

## Delivered boundary

- Student results overview with raw correct count, accuracy, total time, incorrect and unanswered counts.
- Four result tabs: Overall, Data Insights (DI), Quantitative Reasoning (QA) and Verbal Reasoning (VA).
- Overall and section diagnostics report average time per question, calculated as section question time divided by section question count.
- Each sectional tab starts with a response-time-per-question pacing chart and then a question-wise breakdown.
- Linked question numbers open the exact completed-attempt review; browser/onscreen Back restores the originating section, row, scroll position and focused question link.
- Section, topic and subtopic diagnostics derived from immutable attempt items.
- Per-question review of the attempted snapshot, selected answer, correct answer and time spent.
- No explanation, scaled score, rank, prediction or comparative profile.
- Student-owned question notes, editable only after completion; active Admins have read-only visibility.
- Admin assignment reporting for Not Started, In Progress and Completed Students, plus completed-attempt detail.
- Shared Student/Admin result derivation from the same attempt, response and private answer-key snapshot rows.
- Protected historical media for both owner and Admin result review.

## Database boundary

Migration `20260824173000_add_mock_results_and_notes.sql` is additive. It adds only:

- `public.mock_attempt_item_notes` with RLS, ownership/attempt consistency enforcement and no Admin write policy;
- a taxonomy-snapshot trigger for new attempt items; and
- a bounded backfill of missing taxonomy labels into existing attempt question snapshots.

Score and diagnostic totals are not persisted. They remain derived from immutable attempt items, responses and private attempt answer keys.

## Staging Preview

- Migrations `20260824173000_add_mock_results_and_notes.sql` and `20260824190000_add_mock_result_key_reader.sql` are applied and ledgered exactly once on Staging.
- Current Preview deployment: `dpl_HEiQk2yZFZanKXq9wgNe1F3oLWpF`.
- Immutable Preview URL: `https://ace-club-njo8516s7-theadmitco-techs-projects.vercel.app`.
- Stable Preview alias: `https://ace-club-phase4-theadmitco-techs-projects.vercel.app`.
- Vercel status is READY and functions are built in `sin1`.

The first Preview exposed one bounded defect: the result loader attempted a direct PostgREST read from the deliberately unexposed `private` schema and returned the application 404. Correction `5a408ca` adds a completed-attempt-only, service-role-only key reader, returns no explanation data, and records loader failures server-side.

Authenticated verification then exposed a Next.js Server/Client boundary defect in the review renderer. Correction `f0328fb` makes the interactive renderer a Client Component and adds regression coverage. READY deployment `dpl_3rMNoPHJcXmKgY8u22auXKJuSsKe` is assigned to stable Preview alias `https://ace-club-phase4-theadmitco-techs-projects.vercel.app`; a fresh Student sign-in is required once on this alias.

Product Owner feedback on the result layout is implemented in `5cb34bc`. Authenticated live verification on the stable alias confirmed the four tabs, DI pacing chart, question-wise breakdown, linked Question 1 review, answer/correct-answer/note content, and Back restoration to the DI table with focus returned to the originating Question 1 link.

## Acceptance closeout

- The completed Student attempt and Admin detail reconcile exactly at 8/64, 13% accuracy, 46 incorrect, 10 unanswered and 3m 39s total time.
- Student note creation, editing and persistence after reload passed. Admin displays the edited note without an input or save control.
- The protected historical GI image rendered for Student and Admin at its full 1429 × 339 dimensions through their separate role-scoped endpoints.
- Admin reporting displays the expected Completed, Not Started and In Progress assignment states.
- Desktop Product Owner acceptance is complete. The Product Owner explicitly waived mobile acceptance on 24 August 2026.

Phase 4 is closed on Staging/Preview. Production remains outside this boundary and was not contacted.
