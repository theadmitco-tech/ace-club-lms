# Journey and decision alignment — 28 October 2026

PR #24 remains Draft. This audit compares requirements with source, local tests
and the offline design; it does not establish hosted acceptance or authorize a
migration. The last recorded hosted checks belong to `ace8f8c8f5ddfa1141da6cd704483043fea8bf2c`.
The later calm-design and alignment changes require their own checks if pushed.

> Packaging correction: wireframes and their test scripts are now a separate
> design deliverable, excluded from PR #24. References to offline design checks
> below record the separate design audit; they are not application acceptance.

## Sources and precedence

Both supplied originals were available and read; no replacement upload is needed:

- `V2-decisions-for-approval.md`, 20 October, SHA-256
  `74eb7249ae61d5c44c5f579857e9af0ade6a68678df27e882f2988f0e93c4703`.
  The [preserved approval record](../../decisions/owner-decisions-2026-10-20.md)
  retains Approved, qualified, Pending and Deferred distinctions.
- `V2-student-and-admin-journeys.md`, 24 October, SHA-256
  `c1500fecb999b84eeb08290f6d534b0a77a7aa93322616b0f8e80db4be7285f8`.
  The incorporated current-rules section takes precedence over historical
  annotations. Its final delivery paragraph explicitly extends the UI brief
  without claiming PR #23 or #24 implements every journey.
- [25 October course-model correction](../../decisions/course-model-correction-2026-10-25.md),
  [enrolled-batch restriction](../../decisions/enrolled-batch-access-2026-10-25.md)
  and the subsequent stored-contract/content-transfer instruction supplied in chat.

The current planning register, roadmap and acceptance criteria now explicitly
use all **five** approved reading placements. The obsolete Phase-1-only candidate
status and old Phase 2 branch reference were corrected. Original approval and
historical verification records were not rewritten.

## Requirement-to-delivery comparison

| Source requirement | Current result and evidence | Remaining limit |
| --- | --- | --- |
| B1 / 25 October: Full Course plus complete Quant, Verbal and DI offerings | V2 templates, batch drafts and publication use canonical offering identities; all-offering lifecycle coverage in `scripts/v2-publication-database.test.mjs` | Shared Phase 2 schema remains unapplied |
| A1 / correction: complete content, only actual live classes scheduled | Ordered course sessions retain materials, recordings and pre/post reads; optional independent dated live events; pinned private revisions | Local fixtures prove preservation, not real content migration |
| Stored identifiers, not a label-only change | Applied Phase 1 uses legacy keys in primary/foreign keys, immutable prices, access and replay. [Separate forward proposal and rollback plan](../../phase-1/proposals/README.md) add canonical interfaces while retaining ledger keys | Proposal is outside the migration queue and unapplied; compatibility acceptance and consumer cutover remain required |
| No old product terminology in visible labels | V2 catalogue normalizes display names. This audit also corrects remaining legacy Dashboard, Schedule and template badges | Legacy mode fields/helpers remain compatibility implementation details; the historical grouping heuristic cannot identify an individual product |
| D1 / Admin 2: preserve existing material before customization rollout | [Mapping and transfer plan](../content-transfer-plan.md), preservation checks and offline unpublished draft planner exist | Actual reviewed source mappings, import/store, representative rendering, rollback rehearsal and authorized execution remain outstanding; planner says `imported:false` |
| D2: five reading placements; visual read state | Current decisions/criteria/roadmap and wireframes now agree: before course, top of subject, before video, after video, after course | Production independent item publication and all five placement workflows remain later work |
| D3 / Admin reading preview: Notion remains authoring source; exact draft rendering | App Admin preview renders the selected Notion reading body with title and error handling; offline prototype demonstrates placement and student preview | The app preview is inline. Full student-view new-tab preview and representative real Notion content acceptance remain unfinished; illustrative wireframe rendering is not evidence of either |
| D1 / Admin 2–4: independent/universal items and one shared recording | Wireframes show scope review, shared references and automatic outline; transfer manifest records shared recording identity | Shared asset lifecycle, universal item publishing and production importer are not implemented by the planner |
| Recordings A1–3 / live B1–3: browse without protected assets, separate live registration | Wireframes model separate routes and eligible live enrollment. V2 Student schedules enforce entitlement plus enrolled, published batch | Public registration B2 remains Pending; purchase/seat allocation and protected content delivery require later implementation/acceptance |
| Recordings A4–7: arbitrary session order and subject-wide feedback locks | Wireframes cover Quant 4 first, no pre-read trigger, all other same-subject sessions locked, other entitled subjects open, verified unlock | Secure form verification, player trigger, duplicate/delayed delivery and runtime enforcement are design requirements, not implemented Phase 2 features |
| Live B5–7 / Admin 7–9: completion, non-attendance, correction and override | Offline design demonstrates scoped completion, valid non-attendance even without recording, reasoned corrections/overrides and preserved submissions | Production feedback workflow remains unfinished; reversal effects on existing locks must be decided separately |
| Access / enrolled-batch restriction | Phase 1 expiry/access tests and Phase 2 enrolled-schedule tests cover local database boundaries; Mocks remain unchanged | Real-JWT hosted acceptance and protected content delivery remain separate gates |

## Changes made by this audit

- Reconciled the current business decisions, roadmap and acceptance criteria with
  D2's five placements, B3's approved standalone price-difference upgrades and
  D3's continued Notion authoring. Upgrade eligibility and expiry were not invented.
- Replaced the remaining legacy visible “Crash course” labels with neutral
  course wording. Stored fields, grouping behavior and entitlement keys are unchanged.
- Audited the offline journey interactions. Findings include browsing incorrectly
  enabling the simulated Meet action, incomplete public session availability,
  stale draft/offering previews and completion/correction confirmation gaps.
  These wireframe defects were corrected; they do not establish a hosted app
  vulnerability. Live enrollment is now independent of browsing and subject
  entitlement. New-tab previews retain unsaved drafts and position the selected
  reading. Completion confirms the saved schedule; corrections retain submissions
  and unresolved locks while recording Admin, time and reason.

## Open decisions and release gates

Watch detection (80% versus 90%), simultaneous feedback obligations, reversal
consequences for existing locks, upgrade eligibility/expiry, Full Course live
capacity allocation, public registration B2 and notifications remain unresolved.
The design must not silently select a policy for them.

The applied Phase 1 migration was not edited or rerun. Its SHA-256 is still
`ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7`.
No shared migration, real import, student/course-data change, Production change,
Flexible Mocks change or merge was performed. Canonical compatibility approval,
authorized staging rollout and authenticated acceptance remain merge gates.

## Verification of this alignment change

- Canonical forward/rollback proposal: **11 tests passed**, no failures or skips,
  on a disposable local PostgreSQL database. No shared database was used.
- Wireframes: **23 scenarios**, zero interaction failures and zero browser errors.
  New regressions cover live browsing and cross-subject registration isolation,
  public session availability, unsaved new-tab drafts and placement/order,
  saved-schedule confirmation and audited class-status correction.
- Export: all 23 desktop screens rendered without horizontal overflow; refreshed
  **24-page PDF**, no external requests or runtime errors.
- Targeted ESLint, TypeScript and `git diff --check` passed.
- No schema/proposal SQL changed in this pass. The earlier 348 application tests
  and 39 app browser scenarios are recorded in the completion report; they were
  not relabeled as fresh runs for these display/documentation changes.
