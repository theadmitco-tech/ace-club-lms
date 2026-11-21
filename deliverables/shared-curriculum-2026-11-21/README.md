# Shared curriculum integration

New live batches retain explicit links to the selected published subject curriculum. Subsequent published recording and reading changes reach linked batches; the introductory and concluding reading pages remain available without becoming scheduled classes. Feedback for the same linked session is reused across the library and batch.

The implementation is locally verified, not staging-accepted. Existing batches remain unchanged and are not automatically linked. Production is excluded.

## Completed local checks

- [x] Batch creation saves its curriculum links atomically; stale sources cannot leave a half-linked batch.
- [x] Classes prefill from published course sessions; reading pages are excluded from scheduling.
- [x] Course recording replacement reaches the linked cohort, and publication review includes affected cohorts.
- [x] Unpublishing removes inherited delivery without exposing stale copied resources.
- [x] Both fixed reading pages remain accessible to an entitled cohort learner.
- [x] Same-session library and live feedback obligations appear together and resolve through one submission.
- [x] Unpaid, unenrolled, revoked and unauthorized access is denied.
- [x] The activation packet preserves existing rows, permissions and migration records; repeated activation is rejected.
- [x] Database, server and curriculum regressions: 24 tests passed.
- [x] Browser fixture journeys: 7 passed, covering prefill, combined subjects, missing curriculum, publication and interrupted-save recovery.
- [x] ESLint, TypeScript, optimized webpack build and whitespace checks passed.

Browser journeys use the actual UI with synthetic server adapters. Database tests use disposable PostgreSQL and the actual activation packet. These results do not constitute a hosted browser-to-database acceptance run.

## Staging activation and review

1. The staging operator runs the entire [RUN-SHARED-CURRICULUM.sql](RUN-SHARED-CURRICULUM.sql) in a new SQL Editor query for project `eyphkkginlgoaxflauog`.
2. The final result must identify `shared_curriculum`, preserve existing rows, permissions and the original ledger, and report zero existing batches linked.
3. The reviewed application candidate is deployed only to staging. New linked-batch creation requires the migration; missing support returns a recoverable setup message.
4. An administrator creates a dedicated sample batch from published course sessions, sets class dates and publishes it.
5. An entitled, enrolled test learner checks the two reading pages and lesson resources. A source recording replacement is reviewed and published, then checked from both routes.
6. The same-session recording/live feedback journey is checked using a dedicated test learner. Existing learner progress and real attendance must not be repurposed as test fixtures.

- [x] Staging migration applied; the operator-supplied [result](staging-activation-result.json) reports 93 existing public tables preserved and matches the reviewed source hash. This receipt has not been independently re-queried.
- [ ] Exact application candidate pushed and Preview verified.
- [ ] Hosted integrated journey and scoped test cleanup completed.

Separate outstanding work includes explicit adoption for older cohorts, class-mapping confirmation, feedback support/correction semantics, provider-backed Phase 3 acceptance and final combined release acceptance. This change does not close those gates.

## Source identity

- Migration: `20261121100000_add_v2_curriculum_links.sql`
- Migration SHA-256: `65d19390b295d187db266b52c09244329e696ea5df2a7311ca83ad5b43f0180a`
- Activation packet SHA-256: `129ed932228430f6628e1facef087b3eb92ec24356dd6673bc5ca75a2dae7f99`
- Local baseline before these working-tree changes: `3da1577654e4ae0f42edf7353445345e2164db94`; this is not the final candidate SHA.
