# Admin exploratory review

Status: local engineering review completed; human usability and hosted acceptance remain separate.

The review used production-built disposable Next.js applications containing the actual Admin components. Authentication, data reads and mutation responses used synthetic fixtures. Browser requests outside the loopback origin were blocked. No hosted account, real course record, payment provider, deployment or Production setting was accessed. Source hashes and evidence filenames are recorded in `exploratory-source-evidence.json`.

## Observed workflows

| Workflow | Exploratory actions and observation |
| --- | --- |
| Course content | Desktop Quant/Verbal/DI navigation, selected session, ordered resource sections and mobile session selector were inspected visually. |
| Add session | A synthetic session name was entered and saved. The result clearly distinguished a private session draft from published content and offered review/publication. The workflow limitation below remains. |
| Rename | Double-clicking the title text opened inline editing. Name review, return to editing and Escape were exercised. A submitted name draft remained unpublished until confirmation. |
| Reorder | Keyboard ArrowDown moved a session inside the sidebar and retained handle focus. Selected-session resources remained visible. A synthetic save interruption displayed retry, and retry recovered the same request. |
| Resource editing | A reading was opened, its location context inspected, and invalid source input submitted. The misleading connectivity guidance was reproduced and repaired. The regression also exercised invalid title and file input, preserved protected source references and same-request save retry. |
| Create batch | A batch with two named classes and separate dates was prepared and reviewed. The mobile review exposed clipped action text, repaired below. Schedule review did not publish the batch. |
| Calendar | Desktop and mobile dialogs were inspected. Tomorrow and a time preset were selected; Escape discarded both and restored focus to the calendar trigger. Explicit confirmation applied the date. |
| Student access | Mobile subject-library enrollment and live-registration sections were inspected. A synthetic unavailable-enrollment response displayed a warning and suppressed mutation links instead of presenting missing access as a fact. |

## Confirmed defects repaired

### Invalid resource input incorrectly suggested a connection problem

Reproduction: Course content → Add pre-class read → a valid title and an invalid resource URL → Save draft.

The previous screen displayed a validation error followed by “Retry the action after checking the connection.” The invalid field was not identified or focused. The repair gives title, source and file validation specific messages, focuses the relevant control, and links the error through `aria-invalid` and `aria-describedby`. General error guidance no longer diagnoses a connection problem. Valid protected LMS references remain accepted when the upload tab is selected. Transport failures retain entered values and the existing retry request identity.

### Mobile batch review clipped the primary action

Reproduction: a 390-pixel viewport → Create batch → complete class details → Review schedule.

The “Save schedule & continue” button had a 144-pixel content width and a 178-pixel scroll width. Equal-width action buttons combined with non-wrapping text and hidden overflow clipped the label. The repair stacks mobile actions and permits wrapping. Browser checks and visual inspection confirmed complete labels at 390 and 320 pixels, with no horizontal or vertical clipping.

## Remaining workflow observation

Adding a session creates an empty private batch draft, while the content browser continues to show the published session outline. The administrator is directed through “Review & publish session” before the new session can appear in that content surface. This creates a potentially awkward publish-before-populating workflow for an administrator preparing several resources.

The empty draft, unchanged outline and review link were observed in the synthetic browser and corroborated by the component source. A complete hosted publication round trip was not performed. The next working session should establish whether preparing resources for an unpublished session is required. No publication or persistence redesign was included in these repairs.

## Verification

- Phase 5 browser suite: **33 passed, 0 failed**; two new cases cover validation/focus/error relationships, preserved protected sources and retry identity.
- Admin workflow browser suite: **21 passed, 0 failed**; mobile batch review now checks full button content at 390 and 320 pixels.
- Both exploratory fixture sessions completed without a browser runtime error or external-origin browser request.
- `git diff --check` passed for the resulting changes.

The suites used the installed `playwright-core`, `/usr/bin/chromium`, and temporary local Next.js production builds. The commands were run from the Phase 3 integration worktree:

```sh
CHROMIUM_EXECUTABLE=/usr/bin/chromium V2_PHASE5_BROWSER_OUTPUT=/tmp/ace-admin-validation-regression-2026-11-19 node scripts/browser/v2-phase5/verify.mjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium ADMIN_WORKFLOW_OUTPUT=/tmp/ace-admin-workflow-review-2026-11-19 node scripts/browser/admin-workflow/verify.mjs
```

Loopback binding and Chromium execution required sandbox escalation. No externally reachable server was started. Private exploratory runners reused the synthetic fixture adapters, accepted local review actions and were removed from the active process set after review. They are not application routes or published test interfaces.

## Screenshots inspected

Screenshots remain private under `/tmp`; they are not included in the repository. Inspected files included desktop course content, add-session form, mobile content and reorder views, desktop batch list, desktop/mobile calendar, mobile batch review before repair, mobile Student access, and both repaired batch-review widths. Exact filenames and hashes are recorded in the accompanying JSON. Automated browser interaction and agent visual inspection do not substitute for a nontechnical administrator's usability acceptance.
