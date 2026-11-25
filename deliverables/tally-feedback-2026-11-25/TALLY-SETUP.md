# Session feedback through Tally — setup

Updated: 2026-11-25 (Asia/Kolkata). Branch: `intern/v2-phase-3-integration-review`.

**Status: implemented and locally verified; not configured on any hosted environment.** Until the three settings below are present, students keep the existing in-app feedback form. Nothing here changes Production by itself.

## How it works

1. When feedback is due, the student opens it from the course page. The approved Tally form loads inside the page.
2. The form is opened with a hidden `ref` value. The server signs it so that it names exactly one student and one feedback obligation, and it expires after 30 days. A student cannot edit it to clear another student's feedback or a different session.
3. After submission, Tally calls `/api/v2/feedback/tally`. The server checks Tally's signature, then the signed `ref`, then records the submission with the service-only database function `record_v2_tally_feedback`.
4. The student's page shows "confirming your feedback" and refreshes on its own until the subject reopens, usually within seconds.

Repeated webhook deliveries of the same submission are ignored. A second submission for a session that already has feedback does not create a new record. Invalid signatures, forged or expired links and other students' obligations are refused and not retried. Temporary database failures answer `503`, so Tally retries.

## Owner steps

### 1. Prepare the Tally form

- Use the approved feedback questions.
- Under **Hidden fields**, add exactly `ref` and `session`. `ref` is required; `session` only shows the session title to the reviewer.
- Note the form ID, the short code in `tally.so/r/<form-id>`.

### 2. Connect the webhook (one per environment)

- In the form's **Integrations → Webhooks**, add `https://<site>/api/v2/feedback/tally`.
  - For staging, use a Preview address that Tally can reach without the Vercel login screen.
  - For Production, use `https://aceclub.theadmitco.com/api/v2/feedback/tally`.
- Set a **signing secret** and keep it for step 3.

### 3. Set the environment variables (separately for staging and Production)

| Variable | Value |
| --- | --- |
| `V2_TALLY_FEEDBACK_FORM_ID` | The form ID from step 1 |
| `V2_TALLY_SIGNING_SECRET` | The webhook signing secret from step 2 (at least 16 characters) |
| `V2_FEEDBACK_LINK_SECRET` | A new random value of at least 32 characters, for example from `openssl rand -base64 48`. Use a different value per environment and never reuse the Tally secret. |

### 4. Apply the migration

- `supabase/migrations/20261125100000_add_v2_tally_feedback.sql` allows the `tally` provider on `v2_session_feedback` and adds `record_v2_tally_feedback`, callable only by the service role.
- Existing feedback, obligations and history are unchanged.
- Apply it to staging through the reviewed migration process, and to Production only as part of an authorized release.

### 5. Check on staging

- Trigger feedback for a test student, submit the Tally form, and confirm that the subject reopens.
- Confirm that one row exists in `v2_session_feedback` with provider `tally`.
- Confirm that Tally's webhook log shows a `200` response.

## What is stored

- The Tally submission ID, plus a bounded copy of the answers (labels, types and values; long answers are trimmed).
- The signed `ref` is not stored with the answers.
- Responses remain viewable in Tally as usual.

## Verification

- `scripts/v2-tally-feedback.test.mjs` — 4 tests: settings, signed links, Tally signatures and payloads, and webhook responses.
- `scripts/v2-tally-feedback-database.test.mjs` — the full migration chain in a disposable database:
  - browser roles are refused;
  - other students' obligations are refused;
  - replays are ignored;
  - the provider is recorded.
- The existing in-app form tests still pass.
