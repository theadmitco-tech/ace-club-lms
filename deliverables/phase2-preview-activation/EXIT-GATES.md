# Phase 2 completion checklist — 1 November 2026

**Status: Pending; activation has not started.** The user's instruction is to
complete Phase 2 **if Phase 1 is complete**. The [Phase 1 audit](../phase1-exit-gate-audit-2026-11-01/README.md)
still has four open rows, so that condition has not yet been met. This checklist
records the full Phase 2 target and current gaps; it is not a completion claim.

Source: the Phase 2 section of [the product reviewer's supplied exit gates](../phase1-exit-gate-audit-2026-11-01/source-exit-gates.txt).
All 17 parent requirements, including the five session fields, are retained.
Requirements explicitly assigned to Phase 2 in this checklist cannot be counted
as complete by referring to an older plan that deferred them to Phase 4 or 5.

## Current candidate and boundaries

- Review branch `intern/v2-phase-2-review`, commit `07154f02c466cd17a940257f4c2b0f56096c453f`.
- Existing LMS Preview has setup-state editors. Saved authoring/publication
  activation is pending: six staging migrations and three Preview flags remain
  unapplied in the activation record.
- Staging target remains `eyphkkginlgoaxflauog`. Supabase OAuth is blocked;
  [the SQL Editor runbook](STAGING-SQL-EDITOR.md) supplies inspection/application steps.
- Production excluded; PR #24 stays Draft. Preserve original Phase 1 migration
  and all existing students, courses, purchases and grants.
- The [revised wireframes](../ace-v2-wireframes-2026-11-01/README.md) specify design;
  their calendar, sharing, completion, preview and publication simulations are
  not proof that corresponding LMS capabilities are implemented.

## Every required exit gate

| Check | Requirement | Current evidence and remaining work |
|---|---|---|
| [ ] P2-01 | Admin creates/edits Full Course and each individual offering | Canonical offering templates and local lifecycle tests exist. Enable only after schema/recovery verification; exercise all four through authenticated staging Admin. |
| [ ] P2-02 | Manage Quant, Verbal and DI sessions using migrated existing material | Session authoring exists. Real reviewed source mappings and actual unpublished import are missing; synthetic fixtures do not satisfy this. |
| [ ] P2-03 | Independently customize session heading/title, material, recording, pre-session reading and post-session reading | Current template model has these fields/collections and preservation tests. Verify every field independently through save/reopen/preview/publish using representative material. Apply the approved pre-read → recording → post-read → worksheet presentation. |
| [ ] P2-04 | Reference one shared recording across applicable offerings/batches, without re-upload | Drafts carry recording references; offline transfer manifest describes shared identity. Shared asset management/import lifecycle remains incomplete. Implement stable shared references, scoped replacement and preservation tests. |
| [ ] P2-05 | Only actual live classes require dates, times and optional Meet details | Model and local validation distinguish dated live events from undated sessions. Implement the revised calendar interaction in the LMS and verify timezone, validation and cancellation on staging. |
| [ ] P2-06 | Non-live sessions/outlines/regular content/mock reviews/breaks can remain undated | Local authoring/publication supports undated content. Verify that representative non-live cases save and publish without fabricated dates. An actual live mock review still needs its live event schedule. |
| [ ] P2-07 | Broad outline publishes automatically with offering | Current publication projects outline/session metadata. Demonstrate one coherent offering publication flow; no extra mandatory outline publication step. Verify subsequent edits/unpublish against the pinned revision. |
| [ ] P2-08 | Preview/publish/edit/unpublish/republish safely | Revision, stale-review, replay and publication tests exist. Run hosted lifecycle with synthetic drafts, recovery/retry and precise scope confirmation. |
| [ ] P2-09 | Universal publishing with visible scope preview | Offline design demonstrates it; deployed publication input is one batch/action. Implement server-derived affected scope, confirmation, revision checks and safe cross-offering application. |
| [ ] P2-10 | Independently editable, student-facing reading titles; type labels only for placement | Reading title editing and inline preview exist. Verify exact titles throughout actual Student preview/delivery projection, not generic labels replacing titles. |
| [ ] P2-11 | Exact Student preview: title/rendering/placement/order/links/images/formatting | Inline reading preview reuses NotionReader with draft titles and errors. Full session/recording Student-view preview and representative real-source rendering remain incomplete. Preview must not change progress or feedback. |
| [ ] P2-12 | Migrate existing material without loss, duplication or unintended publication | Offline transfer tool explicitly reports imported:false/published:false. Implement additive idempotent importer with approved source manifest, revision hashes, mapping review, unpublished destinations, comparison and recovery. No real import has occurred. |
| [ ] P2-13 | Private Meet visible only to eligible live registrants | Current V2 private Meet drafts remain Admin-only; public schedule excludes Meet details. Implement an eligible-registrant delivery boundary and test paid/expired/revoked/inactive/unregistered/wrong-batch cases. Hiding all links is not the complete required flow. |
| [ ] P2-14 | Mark a class completed without claiming attendance | No V2 class-completion transition was found in the audited authoring/publication services. Implement a distinct authorized, audited class-status action. Do not manufacture individual attendance. |
| [ ] P2-15 | Publication/completion/recording availability/feedback/attendance remain separate states | Current publication model is separate from content references, but full completion/feedback/attendance state handling is unfinished. Define explicit transitions and negative tests: publishing cannot grant access, complete feedback or imply attendance. |
| [ ] P2-16 | Existing mocks unchanged | Existing local regressions pass; no mock changes planned. Preserve schema/content fingerprints and verify the applicable hosted legacy journeys using designated QA data. |
| [ ] P2-17 | Students denied drafts, unpublished content and private Admin data | Local role/RLS and enrolled-schedule tests exist. New shared assets, import, preview, scope publication and Meet delivery require their own negative direct-URL/API/storage tests and authenticated staging evidence. |

All rows remain unchecked until the required implementation **and** appropriate
hosted/material evidence are available. This is not a claim that all existing
Phase 2 code is missing: the authoring and publication foundation is substantial,
but its tests and setup-state Preview alone do not close the complete product gate.

## Execution order once Phase 1 closes

1. Pin the exact review head and keep work isolated from the user's older working
   branch. Reconcile any intervening changes before implementing against it.
2. Complete shared asset references, exact Student preview, universal publication,
   class completion and eligible Meet delivery. Incorporate the approved Admin
   sidebar/calendar and session order. Keep backend transitions distinct.
3. Prepare a real source inventory and reviewed content mapping. Build and dry-run
   the additive importer against an isolated restore; reject missing/stale assets
   and collisions. Preserve existing materials and relationships.
4. Review the complete resulting migration set. The existing six-file packet may
   be insufficient for the added capabilities; do not claim merely running it
   completes Phase 2. Preserve Phase 1 and existing migration history.
5. Verify fresh staging recovery, read-only schema/ledger baselines, and apply
   only the exact reconciled migration set through the staging SQL Editor if OAuth
   remains blocked. Never use a blanket migration push from the older root branch.
6. Activate flags only for the existing LMS review-branch Preview, verify staging
   binding and exact deployment, and run the full authenticated role matrix.
7. Import only the reviewed material scope into unpublished drafts. Attach item
   counts, source/destination comparisons, rendering screenshots, replay/recovery
   results and the publication scope preview. Publication is a separate explicit
   action; no automatic publication during import.
8. Complete every gate above, attach dated exact-commit evidence, and obtain the
   product acceptance outcome. Keep Production untouched and PR #24 Draft.

## Inputs that must not be guessed

- Phase 1 upgrade eligibility/credit/expiry rules. The internal compatibility
  mapping was accepted by the user on 1 November; that decision is closed.
- Actual current source course/template/asset identities and reviewed mappings
  for material transfer; credentials or private URLs need not be pasted into chat.
- Fresh staging schema/recovery evidence and designated authenticated QA sessions.
- Effects of reversing a completed live class on existing feedback obligations:
  unresolved; no automatic deletion/unlock policy is inferred. Initial completion
  must remain distinct from attendance regardless of that later decision.

Source inspection this turn used the deployed commit's `v2Publications.ts`,
`v2StudentSchedules.ts`, `ReadingPreview.tsx`, Admin workspace and offline content
transfer tooling, plus the prior [alignment audit](../../docs/v2/phase-2/evidence/journey-decision-alignment-2026-10-28.md).
No code, deployment, migration, feature flag, course record or access grant was
changed while preparing this checklist.
