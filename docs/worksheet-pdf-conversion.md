# Worksheet PDF Conversion

Use this workflow to convert uploaded worksheet PDFs into session-wise CSV files for the existing `practice_sets` / `practice_questions` flow.

## Input

Place PDFs in:

```text
scratch/worksheet_pdfs/
```

Filenames should include a session cue such as `Session 4`, `S04`, or `worksheet-04`. If a PDF contains multiple visible session headings, review the generated notes before import.

## Convert

Run a dry-run:

```bash
npm run worksheets:dry-run
```

Write CSV files and review notes:

```bash
npm run worksheets:convert
```

Use custom folders if needed:

```bash
node scratch/convert_worksheet_pdfs.js --input-dir /path/to/pdfs --output-dir /path/to/output
```

## Output

The converter writes one folder per detected session:

```text
scratch/worksheet_import/session-04/questions.csv
scratch/worksheet_import/session-04/review_notes.md
```

Each `questions.csv` contains:

- `order_index`
- `question_text`
- `options`
- `correct_answer`
- `explanation`
- `difficulty`
- `question_type`

`options` is a JSON array string. Missing answer keys are left blank and listed in `review_notes.md`.

## Review Rules

Before importing into Supabase, confirm:

- Session folder matches the intended class session.
- PDF question count matches CSV row count.
- Wording, symbols, options, and DS statements match the PDF exactly.
- Blank `correct_answer` values are intentional or filled manually.
- Rows in `review_notes.md` are resolved or accepted.
