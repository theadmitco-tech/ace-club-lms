# Product alignment audit — 21 November 2026

This source review compares the approved decision records, the supplied current Student/Admin journey, the supplied timetable, the local-to-staging procedure and subsequent conversation corrections with the current implementation. It is not a fresh hosted acceptance run.

The committed baseline is `3da1577654e4ae0f42edf7353445345e2164db94`. Additional working-tree content-editor changes were present during the audit and remain separately unverified by this review. No application source, credentials, database records or applied migrations were changed by this audit.

## Product model

- Quant, Verbal and DI are complete courses; Full Course remains a commercial combination of all three. Removing Full Course from the content navigation does not remove the purchased offering.
- A session is a teaching unit with its reading, recording and worksheet resources. Fixed introductory/concluding reading pages are not scheduled classes.
- A live batch schedules teaching for a cohort. The approved model includes combined offerings as well as individual subjects; the existence of combined offerings is not an unanswered product question.
- Only actual live classes require dates. The timetable includes orientation, mock-analysis and review activities as well as subject classes. The later instruction excludes scheduling non-live items; not every brochure item is an LMS feature requirement.
- The timetable gives a reference structure, not authority to overwrite the existing course library. Whether additional orientation/review classes should be seeded automatically is not established by the current subject-session implementation.

## Prioritized gaps

| Priority | Finding | Evidence and completion condition |
| --- | --- | --- |
| P0 | Course-to-batch content continuity is not complete merely because class names are prefilled. | `NewLiveBatch.tsx` copies selected session content into a new template. Content publication targets identify batch/session/revision. Newly created copies are not automatically registered as future targets. Verify and implement one reviewed shared-update path: change a course recording once, then confirm all intended batch learners receive it with correct access. |
| P0 | Cross-route feedback reuse needs reconciliation. | The current feedback uniqueness and lookup include student, batch and session. A library session and its copied live-batch session therefore have distinct feedback identity even when the session key is retained. Prove that switching between the two does not duplicate feedback or lock the other representation of the current session. Same-batch live/recording tests do not establish this. |
| P0 | Fixed reading pages need verification through actual paid/live enrollment. | Batch creation deliberately excludes README pages. Verify that every intended learner can still reach both pages through their entitled, enrolled course library. Visibility in the Admin outline alone is insufficient. |
| P1 | Class completion still requires a separate mapping confirmation. | The live page requires a mapping for the current publication. Republishing, including meeting changes, requires reconfirmation. Review the expected mapping during publication and make the next action obvious; do not silently invent attendance or feedback. |
| P1 | Feedback support remains incomplete against the broader journey. | The journey requests a feedback status/error view, reasoned overrides and completion correction. No corresponding V2 Admin override/correction action was located; `LiveOperations.tsx` explicitly states completion cannot be reversed there. The later Phase 4 contract separately leaves reversal semantics unresolved. Define the effect on existing obligations before implementation; preserve submissions and access checks. |
| P1 | New draft-session editing remains under active change. | Additional uncommitted changes expose draft sessions in the course browser. Verify adding resources, renaming, reordering, deleting, publishing and reopening in one browser-to-database flow before claiming that boundary is complete. |
| P1 | Deployment instructions are stale. | The owner handoff still names `0841e70...`; the activation handoff names an earlier baseline. Prepare one final SHA after all current edits, review migrations/configuration and replace the operational handoff. Historical reports remain unchanged. Remote push and deployment must be verified separately. |
| P1 | Phase 3 provider-backed acceptance remains open. | The latest known accessible environment was localhost. Genuine Google return, captured Razorpay Test payment, callback-independent webhook fulfillment, failures/retries, duplicate delivery, upgrades and eight-place contention require the exact configured Preview. |
| Release | Phase 6 and Phase 7 are not fully closed. | Combined final-candidate acceptance and Product Owner sign-off remain required. Production enablement is still a documented engineering specification, followed by schema/content reconciliation, recovery rehearsal and separately authorized release. |

The continuity and cross-route findings are source-backed integration risks, not newly reproduced hosted incidents. Focused database and browser reproductions should precede changes to their contracts.

## Already implemented locally; retain rather than rebuild

- [x] Existing teaching sessions prefill batch creation; dates/times remain explicit inputs.
- [x] Course review has a dedicated route instead of the batch publication screen.
- [x] Fixed before/after reading pages use Reading material and remain outside session ordering.
- [x] Session and resource editing, ordering and removal controls exist.
- [x] Batch archive/restore support exists; the operator supplied its staging migration receipt.
- [x] Private content, entitlement checks, subject feedback gates and payment adapters have earlier implementation and attributed verification evidence.
- [ ] Current combined candidate verified through one real Admin-to-Student journey.

## Avoided scope expansion

WhatsApp remains excluded. A waitlist and per-session seat reservations are excluded. Expiry reminders remain a pending decision. The temporary in-page feedback form and 80% observed playback rule have later recorded authorization; Tally replacement is not a prerequisite for the existing accepted temporary flow. Production Live Mode must not be inferred from Razorpay Test Mode preparation.

## Completion order

1. Reproduce course/batch recording continuity, cross-route feedback reuse and README access with isolated records.
2. Finish draft-session authoring and address confirmed continuity defects; retain exact course identity and audited publication scope.
3. Exercise creation, scheduling, publication, enrollment, meeting delivery, completion, feedback, recording access, updates and archive/restore as one integrated journey.
4. Prepare one final reviewed commit and current owner handoff; verify the remote SHA.
5. Execute owner-managed Preview/payment acceptance, cleanup and final combined sign-off.
6. Implement and verify the separately scoped Production enablement and release gates.

## Sources

- `docs/v2/decisions/owner-decisions-2026-10-20.md`
- `docs/v2/decisions/course-model-correction-2026-10-25.md`
- `docs/v2/decisions/enrolled-batch-access-2026-10-25.md`
- Supplied Student/Admin journey, current-rules section; supplied local-to-staging SOP; supplied tutoring timetable. Descriptions above paraphrase those sources.
- `docs/v2/phase-4/README.md`
- `deliverables/admin-integrated-review-2026-11-19/REPAIRS.md`
- `deliverables/admin-curriculum-workflow-2026-11-21/README.md`
- `deliverables/phase3-owner-handoff-2026-11-19/OWNER-HANDOFF.md`
- `deliverables/phase7-release-preparation/RELEASE-ENABLEMENT-SPEC.md`
