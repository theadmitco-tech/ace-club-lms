# Admin batch workflow simplification

The batch workflow now separates a private draft save from a single publication review. Saved schedules allow class names, dates and times to be edited, classes to be added, and unfinished classes to be removed. Removal requires confirmation; Undo restores edits made before removal. At least one live class remains in the focused batch editor.

Creation supports Quant, Verbal, DI or All subjects. A combined batch assigns a subject to each live class. New batches receive empty course sessions for class resources, or optionally copy existing course sessions. Readings, worksheets, mocks and breaks do not enter the live timetable. Existing class subjects and completed class history remain protected by database validation.

Class completion suggests a previous valid link or a unique matching title in the same subject. Suggestions require explicit confirmation; ambiguous matches remain manual. Bulk confirmation reports failures individually and retries only unsuccessful links. Confirmation does not assert attendance or complete a class.

## Verification

- [x] Thirty synthetic Admin browser journeys passed, including creation, editing, publication, interrupted saves, recovery and accessibility checks.
- [x] A focused browser rerun passed after the final Undo refinement. It is additional verification of an existing journey, not an additional distinct journey.
- [x] Forty-three earlier browser regression journeys passed.
- [x] TypeScript, scoped ESLint and the final webpack build passed.
- [x] Domain/recovery checks and the mapping suggestion helper/browser checks passed.
- [x] Disposable database tests and the activation packet rehearsal passed, covering concurrency, permissions, preservation and completed-class protection.
- [x] Staging application was reported successful by the deployment operator; the result preserved 92 public tables, existing rows, metadata and the migration ledger.
- [ ] Hosted browser acceptance and a new Preview deployment are separate from this local review.

`browser-checks.json` contains the browser results. The main run preceded the final Undo refinement; the focused report covers that refinement. Screenshots contain synthetic demonstration content. `staging-application.json` labels operator-supplied evidence separately from independent browser observations.

## Local review

The Admin path is `/admin/v2/batches` on the local review server. The review sequence is: create a batch, save privately, edit the schedule, review publication, then explicitly publish when ready. Existing published schedules remain unchanged by private saves. Authenticated localhost actions use the staging database, so local actions are real staging edits.

The database packet and its preservation checks are described in `MIGRATION.md`. Production remains outside this change.
