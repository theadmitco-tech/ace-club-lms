# Pilot V3 Phase 3 — Student Mock Attempt Player

Phase 3 adds the Student mock library and the server-authoritative fixed-form attempt player. It is additive to the accepted Phase 1 question bank and Phase 2 mock release model.

## Student routes

- `/mocks` — released assignments, resume/completion states, and all six section-order permutations.
- `/mocks/[attemptId]` — section instructions, timed question player, navigator, review, optional break, submission, and completion placeholder.
- `/api/student/mock-attempts` — idempotent attempt realization.
- `/api/student/mock-attempts/[attemptId]` — attempt state plus lock-versioned mutations.
- `/api/student/mock-attempts/[attemptId]/media/[mediaId]` — attempt-authorized, short-lived protected media redirect.

## Authority and privacy

- One attempt is enforced per Student and assignment.
- The selected section order is immutable and must be one of the six permutations.
- Every section receives a server deadline exactly 2,700 seconds after it begins.
- Mutations use a UUID idempotency key, request hash, attempt lock version, and response version where applicable.
- Timeout, submitted sections, and completed attempts are terminal.
- Review allows changes to at most three distinct questions; subsequent changes on those questions are free and reverting does not refund a slot.
- Renderable question/stimulus content is snapshotted into the attempt. Answer keys and explanations are snapshotted separately in `private.mock_attempt_keys` and are never granted to browser roles.
- The `mock-media` bucket remains private. A Student can request only media linked to a question realized in their own attempt.
- Scaled scoring and result analytics are intentionally deferred to Phase 4. Completion is the only result shown here.

## Database migrations

- `supabase/migrations/20260822213000_add_mock_attempt_player.sql`
- `supabase/migrations/20260823100000_allow_mock_import_taxonomy_labels.sql`
- `supabase/migrations/20260823101000_allow_mock_builder_server_mutations.sql`
- `supabase/migrations/20260823102000_allow_reused_mock_media_bytes.sql`

All four migrations are applied and ledgered on Staging. Production remains unchanged and unauthorized.

## Verification

See `evidence/phase-3-verification-2026-08-22.md`.

Engineering and QA Staging acceptance passed on 23 August 2026 against immutable Preview deployment `dpl_GBBas92jMv8VEm5AN7uiphJN5mEJ`. Product Owner visual acceptance is the remaining Phase 3 closeout gate.

For local browser QA only, start the app with `NEXT_PUBLIC_ENABLE_LOCAL_PASSWORD_LOGIN=true` to expose the development-gated email/password form. The normal Google-only Production login is unchanged when the flag is absent.
