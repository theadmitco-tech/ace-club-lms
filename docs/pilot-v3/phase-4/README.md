# Pilot V3 Phase 4 — Results, diagnostics and Admin reporting

Status: **Staging migration and Preview deployment complete; Product Owner acceptance remains pending**  
Date: 24 August 2026  
Branch: `codex/pilot-v3-phase-4`

## Delivered boundary

- Student results overview with raw correct count, accuracy, total time, incorrect and unanswered counts.
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
- Current Preview deployment: `dpl_Ar2iW7PJDEbgLEqMkpvrmbuvWECE`.
- Current Preview URL: `https://ace-club-fp197k4y4-theadmitco-techs-projects.vercel.app`.
- Vercel status is READY and functions are built in `sin1`.

The first Preview exposed one bounded defect: the result loader attempted a direct PostgREST read from the deliberately unexposed `private` schema and returned the application 404. Correction `5a408ca` adds a completed-attempt-only, service-role-only key reader, returns no explanation data, and records loader failures server-side. The corrected hostname reaches the normal Ace Club authentication boundary; a fresh Student sign-in is required on the new hostname.

## Remaining acceptance

- Verify one completed Student attempt against the Admin detail view.
- Verify note creation/edit and Admin read-only visibility.
- Verify Student and Admin protected historical media.
- Complete desktop/mobile Product Owner visual acceptance.

Production remains outside this boundary and was not contacted.
