# Pilot V2 Phase 5 — Local Integrated Safety Evidence

Status: Local automated and engineering checks passed; followed by accepted Staging verification
Owner: Engineering and QA/Security
Last updated: 18 August 2026

## Authorized boundary

The Product Owner asked Engineering to begin Phase 5 on 18 August 2026. This checkpoint covers local, non-mutating integrated-safety checks only. No Staging or Production row, account, migration ledger or environment was changed. No Preview, push, merge, deployment or Production action occurred.

This local checkpoint was later followed by completed Phase 4 native Tab/Shift+Tab traversal, Product Owner acceptance and the authorized bounded Phase 5 Staging probe.

## Implemented verification

Added `scripts/phase5-integrated-safety.test.mjs` and the consolidated `npm run test:pilot-v2` command. The new suite proves from the reviewed application and ordered migration sources that:

- Student and Admin route groups enforce active-account and exact-role authorization;
- every Pilot V2 Admin Server Action and upload Route Handler re-authorizes its caller;
- protected PDF delivery validates the private path, authenticates the user, checks the active profile and performs an RLS-filtered material lookup before creating the service-role client;
- signed PDF access lasts 60 seconds and both JSON and redirect responses use `Cache-Control: private, no-store`;
- canonical Student tracker RLS and write functions bind ownership to `auth.uid()`;
- Admin progress reads the canonical tracker rows through Admin-only read functions and exposes no write path;
- none of the seven ordered Pilot V2 migrations writes, alters, truncates or deletes canonical `student_question_logs` rows;
- schedule shift/reorder migrations update only unreleased material timestamps and do not change material identity or ownership relationships;
- template and Student-projection migrations do not retrofit existing batch provenance or mutate existing course/session/material/enrollment rows;
- recordings and Session materials remain attached to one event in one batch and cannot acquire a reusable template origin.

## Results

| Check | Result |
|---|---|
| `npm run test:phase5-safety` | Pass — 8/8 |
| `npm run test:pilot-v2` | Pass — 45/45 across all seven Pilot V2 suites |
| Touched-file ESLint | Pass — zero findings |
| `npx tsc --noEmit --incremental false` | Pass |
| `npm run build` | Pass — Next.js 16.2.4; all Admin/Student/API routes compiled |
| `git diff --check` | Pass |
| Full `npm run lint` | Inherited baseline unchanged: 14 errors and 2 warnings outside Pilot V2 touched files |

The Node typeless-package messages remain non-failing warnings. Changed-file review found no credential, authentication artifact, signed URL, private Student identity or private object path.

## Evidence carried forward

The [Phase 4 Staging evidence](phase-4-staging-verification-2026-08-18.md) already records 12/12 signed-out, inactive, unenrolled, unpublished, pre-release, cross-batch and direct-material RLS checks; protected-PDF delivery; Full Course and crash-course journeys; and cleanup at zero remaining disposable batches/users. The Phase 3 Staging evidence separately records two-batch recording/Session-material isolation and released-resource behavior.

Those accepted results were not rerun in this local checkpoint. The Product Owner later supplied exact authorization for the bounded disposable Staging probe recorded below.

## Follow-on evidence

All formerly open Phase 5 items passed. The final [Phase 5 Staging evidence](phase-5-staging-verification-2026-08-18.md) records 10/10 live isolation/tracker/Admin/schedule checks, exact aggregate restoration and zero remaining disposable batches/users. Phase 5 is accepted.

Any new fixture, migration, Preview, push, merge, deployment or Production action requires a later exact Product Owner instruction.
