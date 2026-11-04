# Admin workflow review revisions

Status: implemented and locally verified on `intern/v2-admin-workflow-review`. The previously deployed Preview remains the earlier design until the new commit is pushed and deployed.

The supplied annotated `admin-workflow-review.pdf` was visually reviewed across all 19 pages. The source SHA-256 is `80fa2598e6cdb99e9ec4f54e4e581ef01e79ba0705e533ea08c96db20ac5b842`. The source PDF remains outside Git. The table below paraphrases the review notes; it is not a verbatim transcript or an edited source copy.

| Review page | Requested behavior | Implementation |
| --- | --- | --- |
| 2 | No separate Home page | The gated Admin landing route opens Course content; primary navigation contains Course content, Batches and Students. |
| 3 | Quant, Verbal and DI as the content starting points | Three subject cards lead to matching libraries and sessions. Full Course is retained under existing combined libraries; its product, access and published content remain unchanged. |
| 4–5 | Retain session resources and focused editing | The four resource groups remain ordered. Returning from editing retains the selected subject, library and session. |
| 6 | Multiple readings, ordering and content removal | Named before/after choices replace unexplained order numbers, with a draft-order preview. Saved resources expose unpublish/delete review. Original resources link to the exact session in the course outline for removal followed by draft review and publication. |
| 9 | Recording content needs no new live batch; schedule every class | The main Batches view lists live batches. Recording libraries remain available for maintenance under a disclosure. Creation offers live templates; every saved live class has separate date/time controls before publication. |
| 10 | Time selection in the calendar | Saved class calendars apply date and time together. Cancel discards both temporary selections. |
| 12–13 | Explicit class-completion action | Batch management links name class completion. The confirmation button names the action, retaining the feedback consequence and irreversible-action explanation. |
| 14 | Retain the Student access view | Existing separate purchase, enrollment and live-registration states remain unchanged. |
| 15 | Shared library belongs under Course content | Sessions and Shared library are views within Course content. Imports and replacements remain linked from the library. |
| 16 | Explain newer-version recovery | The message explains another administrator or browser tab changed the resource and why review prevents overwriting changes. |
| 18 | No additional mobile design work | Existing responsive and keyboard behavior remains supported and regression-tested; no separate mobile project is introduced. |

The creation flow retains the database contract: an initial private batch draft derives every class from the saved template, followed by per-class schedule editing before publication. No new batch database model, automatic Full Course synchronization, purchase change, migration, payment activation or Production change is introduced. Existing combined libraries retain distinct publication placements and require explicit selection when a resource update should affect them.

## Verification results

All 28 Phase 2 suites / 278 checks passed. Browser verification passed 10 focused Admin cases, 11 content/Student cases and 43 inherited regressions (64 total). Four resource-order checks and four Student-access checks passed. Lint with zero warnings, TypeScript and the webpack build passed. Three synthetic screenshots were visually reviewed. Earlier failed runs were corrected before the final reruns; the final reports retain their exact source hashes.

## Verification scope

Browser tests use actual components with synthetic server adapters. They verify navigation, session retention, named resource order, confirmation boundaries, interrupted saves, stale revisions, class scheduling, keyboard dismissal and Student access states. They do not constitute new hosted acceptance.

The implementation adds four resource-order checks covering replacement identity, renamed resources, course/session/location isolation and dense/boundary positions. Existing Student authorization checks remain included in GitHub Verify.

Earlier implementation evidence remains in `../admin-workflow-integration-2026-11-04/`; it describes the earlier deployed source and does not establish hosted acceptance of this revision.
