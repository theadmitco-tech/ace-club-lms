# Phase 5 — Adapt the Student Experience

Status: Implementation in progress; automated checks pass and manual staging acceptance remains open
Owner: Product owner and Engineering
Last updated: 2 August 2026

## Implemented vertical slice

- Server-composed Student timeline data with locked-material metadata and no locked URLs.
- Recommended practice for released prior-week worksheets as whole weekly tasks.
- This week guidance with Thursday DI, Friday VA and Saturday QA pre-read emphasis in the programme timezone.
- A 31-item week-grouped Timeline plus QA, VA and DI section browsing over the same curriculum records.
- Compact released Pre-read, Video and Worksheet access with explicit upcoming, after-class and not-configured states.
- Journey-based curriculum-item pages with legacy auto-graded practice removed from the reachable Student interface.
- Retryable Notion presentation, private PDF workspace and validated release-aware YouTube viewing.
- Admin master YouTube recording creation, editing, removal and validation.
- Explicit cohort material sync that adds missing master materials and propagates edited linked content without changing `available_from`.

## Database state

Migration `20260802100000_add_student_timeline_and_recording_sync.sql` was applied to linked staging project `eyphkkginlgoaxflauog` on 2 August 2026. Before application, the staging migration ledger was reconciled with signed Phase 2–4 and title-migration evidence. The final ledger matches all local migrations through `20260802100000`.

The timeline RPC requires an active Student profile and uses the caller's latest enrollment. It exposes configured material identity, title, type and release time for Student presentation, but never exposes content URLs. Existing RLS and material routes remain responsible for released content and direct-URL denial.

## Verification state

- TypeScript: pass.
- Targeted lint for all Phase 5-touched TypeScript: pass.
- Guarded production build: pass on Next.js 16.2.4.
- Signed-out local probes: `/dashboard` and `/session/:id` redirect to `/login`.
- Repository-wide lint: improved from the signed 40-error baseline to 22 errors and 3 warnings; remaining findings are in untouched legacy Admin worksheet/session editors and public registration/payment code.
- Manual staging Student and Admin journeys: pending.

See [automated verification evidence](evidence/automated-verification-2026-08-02.md) and the [manual verification checklist](manual-verification-checklist.md).

## Remaining gate

Manual staging acceptance must verify the authenticated Student timeline, section navigation, release states, private PDF and Notion journeys, plus Admin YouTube add/edit/sync behaviour. Production migration, merge and rollout remain out of scope until that evidence passes.
