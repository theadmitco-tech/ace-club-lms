# Phase 6 — Simplify the Tracker

Status: Active — local implementation and automated checks pass; staging migration is applied; staging acceptance is pending  
Owner: Product owner and Engineering  
Last updated: 3 August 2026

## Scope

Phase 6 implements the Student-facing manual tracker defined by `AC-TRACK-00` through `AC-TRACK-11`:

- one persistent Practice log overview grouped by curriculum section/type, with QA, VA and DI first, other worksheet-bearing types grouped separately, and programme week retained on every row;
- one canonical released-worksheet workspace reached from every Log or Update log entry point;
- independent Student–course–session–worksheet–question records;
- `Done`, `Come back for review`, and system-owned `Not updated` states;
- optional `mm:ss` time and comment fields;
- individual autosave feedback;
- Select all and selected-only bulk status changes;
- exact partial-failure reporting and failed-only retry;
- release-aware, student-owned database access.

Phase 7 Admin progress screens are not part of this implementation. The new records are readable by authorised Admins under RLS so Phase 7 can build its views without changing Student data ownership.

On 3 August 2026, the Product Owner revised the overview from course-week groups to curriculum section/type groups because Students retrieve practice by section. QA, VA and DI appear first; other configured worksheet-bearing types such as MOCK remain separately grouped rather than disappearing. Week information remains visible per worksheet. This approved revision supersedes the earlier Phase 5 handoff wording without changing canonical worksheet records or release rules. Practice log remains a persistent primary Student navigation item beside Course; contextual Log and Update log actions remain beside released worksheets.

## Implementation boundary

Migration `20260803120000_add_student_practice_log.sql` creates `student_question_logs`, provisioning triggers, RLS and the Student tracker RPCs. Records are created when an enrollment, copied worksheet material or master worksheet question is created; the migration also backfills existing enrollments. The unique key prevents duplicate records across repeated deep links.

The manual table deliberately does not reuse `master_practice_attempts` or `student_worksheet_logs`. Those legacy models encode answers, correctness, accuracy or daily targets that are excluded from the Phase 6 Student experience.

The worksheet material route is the canonical workspace. The released PDF and question log share that route; `?focus=log#worksheet-log` focuses the tracker without creating another data destination. Practice log, Recommended practice, Timeline, Browse by section and curriculum-item Tracker actions all use the same material and question identifiers.

## Current verification

- `npx tsc --noEmit`: pass.
- Targeted ESLint for every Phase 6 TypeScript file: pass.
- `npm run build`: pass on Next.js 16.2.4.
- `git diff --check`: pass.
- `npm run lint`: unchanged signed Phase 5 baseline of 22 errors and 3 warnings, all outside Phase 6-touched files.
- Staging migration application: pass on 3 August 2026; Supabase SQL Editor returned `Success. No rows returned`.
- RLS probes and signed-in staging journeys: pending.

The immutable local check summary is in [automated verification evidence](evidence/automated-verification-2026-08-03.md).

Repository-wide lint retains the signed Phase 5 legacy baseline outside the Phase 6 files and must not be reported as resolved unless the full command passes.

## Next gate

1. Complete the [manual verification checklist](manual-verification-checklist.md) incrementally with the controlled staging Student.
2. Run disposable Student A, Student B and Admin privacy/release probes.
3. Record immutable evidence before any Production rollout or Phase 6 sign-off.
