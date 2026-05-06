# Master Worksheet Questions

Worksheet questions are now designed to live once globally per master session.

## Tables

- `master_practice_sets`: one global worksheet set per `master_sessions.id`.
- `master_practice_questions`: ordered questions inside the global worksheet set.
- `master_practice_attempts`: student attempts against global questions, scoped by `course_id` and `session_id` so progress remains batch-aware.

The legacy `practice_sets`, `practice_questions`, and `practice_attempts` tables remain available for rollback and older session-specific content.

## Applying The Migration

Run `supabase_master_practice.sql` in the Supabase SQL Editor. It will:

- Create the master worksheet question tables.
- Add indexes, RLS, and admin/student policies.
- Backfill master questions from the first existing batch copy for each session number.
- Preserve existing attempts by mapping old questions to master questions by `session_number + order_index`.

## CSV Import

Use:

```bash
node scratch/import_worksheet_session_csvs.js
```

The importer now writes to `master_practice_sets` and `master_practice_questions`.

## App Flow

- Admins edit global worksheet questions from `Master Base -> Edit worksheet`.
- Students open their normal batch session; the app uses `sessions.session_number` to load the matching master worksheet questions.
- New batches do not need question copies. They automatically use the global questions for each session number.
- Student and admin dashboards use `master_practice_attempts` for automatic progress, class averages, and accuracy. `student_worksheet_logs` remains legacy history only.
