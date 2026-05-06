# GMAT Question Bank v1

The question bank is a new Supabase content layer for topic-wise and adaptive-ready practice. It sits alongside the existing session worksheet tables:

- Existing worksheets: `practice_sets`, `practice_questions`, `practice_attempts`
- New question bank: `questions`, `question_sets`, `set_questions`

## Setup

Run `supabase_question_bank.sql` in the Supabase SQL Editor. The migration creates tables, constraints, indexes, RLS policies, and `updated_at` triggers.

Students and anonymous users can read active content. Admin users, identified by `profiles.role = 'admin'`, can manage all question-bank content. The CSV importer uses `SUPABASE_SERVICE_ROLE_KEY` and bypasses RLS.

## Tables

`questions` stores standalone Quant QA, Verbal CR, and Quant DS questions.

`question_sets` stores shared RC passages and DI stimuli. `set_questions` stores the child questions for each set.

All three tables include:

- `external_id` for stable CSV/Sheets upserts
- `import_batch_id` for tracing a bulk import
- `difficulty` as `1-5`
- `tags` as a Postgres `text[]`
- `is_active` and `display_order` for delivery

## CSV Upload

Sample files live in `scratch/question_bank_sample/`:

- `questions.csv`
- `question_sets.csv`
- `set_questions.csv`

Run a validation-only pass:

```bash
npm run question-bank:dry-run
```

Import the sample directory:

```bash
npm run question-bank:import
```

Import another directory:

```bash
node scratch/import_question_bank_csv.js --dir /path/to/csv-folder --dry-run
node scratch/import_question_bank_csv.js --dir /path/to/csv-folder
```

Use pipe-separated values for array-like CSV fields:

- `tags`: `algebra|linear equations`
- `correct_options`: `A|C|D`

For `set_questions.csv`, provide either `set_id` or `set_external_id`. Prefer `set_external_id` for Sheets workflows because it lets the script resolve the Supabase UUID after importing `question_sets.csv`.

## Supabase API Examples

Fetch standalone Algebra questions:

```text
/rest/v1/questions?section=eq.Quant&primary_topic=eq.Algebra&is_active=eq.true&order=display_order.asc
```

Fetch CR assumption questions:

```text
/rest/v1/questions?question_type=eq.CR&subtopic=eq.Assumptions&is_active=eq.true&order=display_order.asc
```

Fetch RC sets:

```text
/rest/v1/question_sets?type=eq.RC&is_active=eq.true&order=display_order.asc
```

Fetch DI table sets:

```text
/rest/v1/question_sets?type=eq.DI&di_type=eq.table&is_active=eq.true&order=display_order.asc
```

Fetch a full RC/DI set with child questions using the Supabase client:

```ts
supabase
  .from('question_sets')
  .select('*, set_questions(*)')
  .eq('id', setId)
  .single();
```

The helper functions in `src/lib/questionBank.ts` wrap these common reads for frontend usage.
