# Phase 1 staging enrollment failure — 25 October 2026

Status: Enrollment failure reported; local feedback fix verified; hosted cause pending

## Observed behavior and confirmed defect

Enrollment into the dedicated staging batch `Phase 1 QA - 2026-10-25` was reported
as unsuccessful. The screenshot shows the edit form with an empty enrollment
textarea and both publication and public registration unchecked. It does not show
the attempted request's HTTP status, payload or response. An empty field alone
does not establish whether an email was entered before the attempt.

The reviewed `CoursesClient` handler has a confirmed error-handling defect: it
does not check the bulk-enrollment HTTP status, ignores responses containing only
an error, logs transport failures without visible feedback, and closes/reset the
form whenever the separate batch update succeeds. It can therefore display
“Batch updated” and discard the entered emails after enrollment fails. It also
attempts enrollment even when the batch update returns an error.

The source of the hosted enrollment failure is not established. Missing server
configuration, authorization, profile writes and enrollment writes are distinct
possibilities; none is diagnosed from the screenshot. Inspect the existing
`/api/admin/bulk-enroll` Network response, with account addresses redacted and no
headers or tokens copied. Avoid repeated submissions while the result is unclear.

## Local change

- Keep the edit form and entered emails after HTTP, network, malformed-response
  or partial-enrollment failure; show a persistent inline alert and an error toast.
- Stop before enrollment when the batch save fails. Always release the submitting
  state so an error cannot leave the button stuck.
- Validate every entered email before writes and deduplicate normalized addresses.
- Require nonnegative integer result counts matching the submitted list before
  treating enrollment as confirmed. Report partial success without claiming that
  the whole operation failed atomically or that it fully succeeded.
- Close the form only after confirmed success. Preserve the batch-only update path.
- If refreshing the list fails after a successful save, release the loading state
  and distinguish saved changes from an unconfirmed enrollment result.
- Leave the server enrollment implementation, authorization, database schema and
  publication behavior unchanged. No remote requests or account changes ran as
  part of implementing or testing this fix.

Files changed for the fix:

- `src/app/admin/courses/CoursesClient.tsx`
- `scripts/batch-enrollment-feedback.test.mjs`
- `scripts/verify-v2-phase1.mjs`
- This evidence record and its links in the Phase 1 checklist/application report.

## Verification and limitations

`env -u NODE_TEST_CONTEXT node scripts/batch-enrollment-feedback.test.mjs`:
**8 tests passed**. The tests execute the actual component handlers with mocked
hooks and I/O, covering HTTP 400/401/403/500, transport failure, invalid JSON,
malformed counts, partial success, failed batch writes, invalid email input,
duplicate addresses, successful enrollment, updates without enrollment and list
refresh failure after a successful save.

Targeted ESLint with zero warnings, TypeScript (`tsc --noEmit --incremental false`)
and `git diff --check` passed. Tests use synthetic identities and no hosted data.
They do not simulate React scheduling, an actual browser or live Supabase requests.

This is a local fix, not a deployed repair of the reported enrollment failure.
The batch update and enrollment remain separate operations. Profile activation
can occur before enrollment fails in the existing endpoint, so check the result
before retrying; no automatic retry or cleanup is introduced. The form preserves
input while it stays open, not across reloads or navigation.

The local branch contains other phase work. A future PR #23 update must carry
only the isolated Phase 1 fix and appropriate evidence, not the entire branch.
After an authorized deployment, recheck candidate mapping and repeat the affected
browser enrollment scenario. Phase 2 migration, merge and Production remain gated.

Next required evidence: the failed request's sanitized HTTP status and response,
then confirmation of the designated test account's enrollment state. No new
product decision is required to correct the misleading feedback.
