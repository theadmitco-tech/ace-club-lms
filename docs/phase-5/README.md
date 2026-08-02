# Phase 5 — Adapt the Student Experience

Status: Staging acceptance complete; PR #5 ready for review
Owner: Product owner and Engineering
Last updated: 2 August 2026

## Completed implementation

- Server-composed Student timeline data with locked-material metadata and no locked URLs.
- Recommended practice with a rotating maximum of one released worksheet each for DI, VA, and QA.
- This week guidance with Thursday DI, Friday VA and Saturday QA pre-read emphasis in the programme timezone.
- A 31-item week-grouped Timeline plus QA, VA and DI section browsing over the same curriculum records.
- Compact released Pre-read, Recording and Worksheet access with explicit upcoming, after-class and not-configured states.
- Journey-based curriculum-item pages with legacy auto-graded practice removed from the reachable Student interface.
- Retryable Notion and protected PDF failure states plus validated release-aware YouTube viewing.
- Admin master YouTube recording creation, editing, removal and validation.
- Explicit cohort material sync that adds missing master materials and propagates edited linked content without changing `available_from`; removing a master recording also removes its linked cohort copies atomically.

## Database state

Phase 5 migrations were applied to the linked staging project on 2 August 2026. Before application, the staging migration ledger was reconciled with signed Phase 2–4 and title-migration evidence. The final local and remote ledgers match through `20260802180000_remove_master_recordings_from_cohorts.sql`.

The timeline RPC requires an active Student profile and uses the caller's latest enrollment. It exposes configured material identity, title, type and release time for Student presentation, but never exposes content URLs. Existing RLS and material routes remain responsible for released content and direct-URL denial.

## Verification state

- TypeScript: pass.
- Targeted lint for all Phase 5-touched TypeScript: pass.
- Guarded production build: pass on Next.js 16.2.4.
- Signed-out local probes: `/dashboard` and `/session/:id` redirect to `/login`.
- Repository-wide lint: improved from the signed 40-error baseline to 22 errors and 3 warnings; remaining findings are in untouched legacy Admin worksheet/session editors and public registration/payment code.
- Manual staging Student and Admin journeys: pass.
- Vercel checks for the accepted branch head: pass.

See [automated verification evidence](evidence/automated-verification-2026-08-02.md), [manual staging evidence](evidence/manual-staging-verification-2026-08-02.md), and the [manual verification checklist](manual-verification-checklist.md).

## Review and rollout boundary

[PR #5](https://github.com/theadmitco-tech/ace-club-lms/pull/5) is ready for review, clean, and mergeable. It has not been merged, and Production remains untouched. Reviewer approval, merge, and Production rollout are separate decisions.

The only unchecked items in the shared verification checklist belong to Phase 6: the persistent Practice log, worksheet-specific question records, selected-question bulk updates, persistence, shared deep links, and partial-failure retry.
