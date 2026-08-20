# Pilot V2 Production compatibility verification — 20 August 2026

Status: Local verification passed; Production unchanged; reauthorization required

## Change

`20260817090845_add_versioned_course_templates.sql` now requires at least one
active `mvp-2026` Master event and verifies that the Full Course template copies
every active event. It no longer assumes the Staging-specific count of 31.

New migration SHA-256:
`390d649fbc85acb9f915a492b14157c3c4161fbdd709de45e41975c7c9e3683e`.

The migration remains additive. It does not update existing courses, sessions
or canonical tracker rows. Later migrations add compatibility metadata columns
and backfill resource classification, but do not change existing schedule,
content, release, enrollment, tracker or Storage relationships.

## Verification

- `npm run test:pilot-v2`: 46/46 passed.
- Touched-file ESLint passed.
- `npx tsc --noEmit --incremental false` passed.
- The fresh encrypted Production snapshot was restored into a disposable
  Supabase CLI `2.114.0` Postgres `17.6.1` stack.
- All seven V2 migrations applied successfully to that 30-event snapshot.
- Four template identities and four initial revisions were created.
- The Full Course template contained exactly the snapshot's 30 active Master events.
- Existing course and session original-column digests remained identical.
- Existing material original-column digest remained identical after expected
  additive metadata backfill.
- Enrollment, tracker, Master-session and Storage-object counts/digests remained identical.
- No existing course, session or material gained a template provenance link.
- All template tables had RLS; `anon` had no template-table privilege.
- The disposable stack, volumes and plaintext snapshot were deleted after verification.

## Gate

Because the migration checksum and source tip changed, the prior Production
authorization cannot be reused. Freeze the new commit, repeat the volatile
preflight and fresh backup, then obtain exact Product Owner authorization before
any retry. Production still has the 16-version baseline and the old application.
