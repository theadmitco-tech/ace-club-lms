# Phase 4 — Cohorts and Release Automation

Status: Active
Owner: Product owner and Engineering
Last updated: 31 July 2026

## Objective

Generate the complete 31-item cohort timeline from a Week 0 start date and enforce Week 0, pre-read, and worksheet release boundaries.

## Approved rules

See [ADR-0002](../decisions/adr-0002-cohort-schedule-and-material-sync.md) for schedule times, durations, release rules, legacy archival, and explicit existing-cohort material sync.

## Implementation status

- Phase 4 branch: `codex/phase-4-cohort-releases` from signed Phase 3 tip `e1f02c7`.
- The Production-safe Phase 3 migration archives legacy master rows before inserting the current curriculum.
- The Phase 4 migration adds stable master links, cohort start/time-zone fields, session end times, transactional 31-item generation, and additive material sync.
- Admin batch creation uses the database generator; the legacy 16-slot fallback is no longer used.
- Student availability reads the database-owned `available_from` timestamp.
- TypeScript, targeted lint, and Production build pass locally.

## Verification pending

- Phase 4 migration applied successfully to staging through the SQL Editor.
- Generate two disposable cohorts with different Week 0 Fridays.
- Verify all 31 dates, Friday/Saturday/Sunday times, Orientation duration, and release timestamps.
- Verify Week 0 and direct-URL release behavior with staging Admin and Student identities.
- Add a disposable master material, run explicit sync once and again, and verify additive/idempotent behavior.
- Confirm archived legacy rows are absent from current Admin workflows while linked history remains intact.

## Exit gate

Two cohorts with different start dates receive correct schedules and releases, and locked content remains protected through direct URLs.
