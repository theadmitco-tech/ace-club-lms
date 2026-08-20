# Pilot V2 Phase 5 — Staging Integrated Safety Evidence

Status: Passed; Phase 5 accepted
Environment: Staging (`eyphkkginlgoaxflauog`) only
Date: 18 August 2026

## Authorization and boundary

The Product Owner explicitly approved one bounded Phase 5 Staging probe and fixture cleanup on 18 August 2026. The probe retrieved the Staging service-role key through pinned Supabase CLI `2.114.0` without storing or displaying it, created only UUID-scoped disposable fixtures and permanently deleted only those fixtures.

No Preview, push, merge, deployment, Production migration, Production query or Production data change occurred. Evidence contains no credential, authentication artifact, signed URL, private object path or account identity.

## Probe design

The probe created one disposable Admin, two disposable Students and two published batches from different templates: DI Crash Course and Full Course. Both Students were enrolled only in the crash-course batch. A released, Master-linked worksheet provisioned canonical tracker rows for both Students; a released recording belonged to the crash-course event, while a unique standalone marker belonged only to the Full Course batch.

The probe then changed one Student-owned tracker row, compared Admin aggregate/detail projections, shifted the crash-course schedule forward by exactly two days, repeated the tracker/Admin comparisons and attempted an Admin write to the canonical tracker table.

## Results

| Check | Result |
|---|---|
| Two template batches have different schedules | Pass |
| Batch A recording is projected only in Batch A; Batch B marker is absent | Pass |
| Each Student can select only their own canonical tracker rows | Pass |
| Student A saves `done`, 95 seconds and a disposable comment marker | Pass |
| Student-to-Admin and Admin-to-Student protected RPC crossover is denied with `42501` | Pass |
| Admin aggregate matches Student A `done = 1` and Student B `done = 0` before the shift | Pass |
| Every eligible Batch A event start/end moves by exactly two days | Pass |
| Released worksheet identity/timestamp and Student-owned tracker identity/value persist | Pass |
| Admin aggregate/detail remains numerically identical after the shift | Pass |
| Admin direct tracker update affects zero rows and the Student value remains unchanged | Pass |

Result: **10/10 passed**. No critical/high authorization, privacy, isolation or compatibility finding remains open.

The first execution used an overly narrow assertion that searched only the top-level resource list for the event recording. The fixture cleanup still ran. Engineering corrected the assertion to accept either valid projection location—top-level released resources or event-embedded materials—while continuing to require the other batch's marker to be absent everywhere. The corrected probe then passed 10/10; this was a test-harness correction, not a product-code change.

## Cleanup and compatibility

The probe captured exact global counts for `courses`, `sessions`, `materials`, `enrollments` and `student_question_logs` before fixture creation and after cleanup. The final counts matched exactly. The audit also found:

- disposable batches remaining: `0`;
- disposable auth users remaining: `0`; and
- aggregate counts restored: `true`.

The run changed no reusable template revision, Master material/question row, existing batch row or migration ledger entry.

## Final engineering gates

| Gate | Result |
|---|---|
| `npm run test:pilot-v2` | Pass — 45/45 |
| `npx tsc --noEmit --incremental false` | Pass |
| Touched Pilot V2 TypeScript/JavaScript ESLint, including the probe | Pass — zero findings |
| `npm run build` | Pass — Next.js 16.2.4 production build |
| `git diff --check` | Pass |
| Changed-document local links | Pass — 22 Markdown files checked |
| Changed-file credential/signed-token review | Pass |

Repository-wide lint remains the previously recorded inherited baseline of 14 errors and 2 warnings outside Pilot V2 touched files. The Node typeless-package notices remain non-failing warnings.

## Acceptance

Together with the [Phase 5 local integrated-safety evidence](phase-5-local-integrated-safety-2026-08-18.md), the accepted [Phase 4 Staging evidence](phase-4-staging-verification-2026-08-18.md) and completed native keyboard checks, this closes the Phase 5 exit gate. Phase 6 remains a separate, unauthorized action requiring one immutable staging-backed Preview and exact Product Owner acceptance against that Preview.
