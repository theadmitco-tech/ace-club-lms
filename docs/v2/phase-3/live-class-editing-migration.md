# Live-class editing migration packet

Status: applied to staging according to the deployment operator’s SQL Editor result in `deliverables/admin-batch-simplification-2026-11-20/staging-application.json`. All 92 public tables and their existing records, metadata and migration ledger were preserved. Production application has not occurred. Hosted browser acceptance remains separate.

The candidate migration is `supabase/migrations/20261120100000_add_v2_live_class_editing.sql`.
Its SHA-256 is `7128d3044b6a8c8819399acb25f8287d48682e360e028e4a0750c9296dc25cfb`.
This hash identifies the new migration source, not a production export or an edited copy of an applied migration.

The migration replaces the batch request validator and the private draft/publication projection functions. It adds a private completed-class preservation validator. Existing save RPCs, authorization, row locks, request-token replay, fingerprints, and revision checks remain unchanged. No table data or historical migration is rewritten.

The deployment operator must verify the target and migration ledger before a separately authorized application. The expected baseline includes the V2 learning-feedback schema and `20261103120000_fix_v2_integration_conflicts.sql`; disposable verification also includes the sales, checkout, and fulfillment migrations through `20261113110000`. Pending earlier migrations require their own reviewed plan. The application must use the repository migration mechanism with its normal ledger recording, then refresh the API schema cache if required by that mechanism.

Before application, the operator should retain the three replaced function definitions and their grants, plus the current migration ledger and database backup reference. Application runs in a transaction. A failure rolls back its DDL. After successful application, the updated interface can submit optional class titles/subjects and complete desired event sets. Existing clients that omit metadata remain valid.

Verification uses `node --test scripts/v2-batch-authoring.test.mjs scripts/v2-live-class-editing-database.test.mjs`. The disposable suite covers legacy projection fingerprints, exact reviewed writes, concurrent retry, stale revisions, title/add/remove edits, immutable subjects, outline preservation, historical identifier reuse, session collisions, completed-class protection at draft save and publication, permissions, and preservation of publication, meeting, mapping, purchase, enrollment, and registration rows.

After an authorized staging application, a synthetic Admin flow should save a renamed/new class privately, verify that the published timetable remains unchanged, review publication separately, and verify that completed classes cannot be removed or retargeted. The operator should retain scoped evidence without secrets or personal identifiers.

Rollback must preserve newly saved revisions and all publication/completion history. The application feature can be disabled or the prior application build restored first. Database rollback requires a separately reviewed forward migration restoring compatible function definitions; deleting revisions or replaying older applied migrations is not a rollback procedure. Publication protection should remain in place while any changed draft exists alongside completed live classes.
