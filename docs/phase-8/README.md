# Phase 8 — Pilot, Launch and Stabilise

Status: Signed off with explicit evidence exceptions
Owner: Product owner, Engineering and pilot operations
Last updated: 10 August 2026

## Closeout decision

The Product Owner confirmed on 10 August 2026 that the MVP is running in Production with real Students and approved Phase 8 closure. This is an operational launch sign-off, not a retrospective claim that every item in the proposed pilot checklist was completed or documented.

The closeout preserves these explicit exceptions:

- the repository-wide lint target is not met; the current baseline remains 22 errors and 3 warnings;
- the repository does not contain the proposed anonymized five-to-ten-Student pilot matrix, complete defect register, or authenticated Phase 8 Production smoke-test record;
- the Production application of `20260804120000_realign_weekly_course_schedule.sql` is not independently evidenced in the repository and must not be inferred from the application being live; and
- public registration/payment scope remains a separate Product Owner decision unless documented elsewhere.

The local Production build passed on 10 August 2026, and anonymous read-only requests to the live `/` and `/login` pages returned HTTP 200. No Production database, deployment, environment, account, or application change was made during closeout. See [operational closeout evidence](evidence/operational-closeout-2026-08-10.md).

## Objective

Prove the complete Production journey with first-time users, remove launch blockers, fix critical/high defects and launch the first live cohort with monitoring. Phase 8 is validation and stabilization, not a new feature phase.

## Pilot size decision

Phase 8 is not only a four-to-five Student test.

- One Test Admin and one Test Student run the controlled staging rehearsal.
- Five to ten first-time Students form the pilot required by the signed roadmap; five is the minimum exit-gate sample.
- Four first-time Students may be useful as an earlier rehearsal if availability is limited, but that run does not complete the pilot gate.
- The first live cohort launches only after the pilot, security and severity gates pass.

The value of the pilot comes from independent first-time behavior, not load testing or statistical significance. It must expose onboarding confusion, permission mistakes, release timing errors, browser issues and operational support gaps before launch.

## Workstreams

1. **Launch cleanliness:** resolve the signed 22-error/3-warning lint baseline; correct broken scripts, unsafe guidance and stale claims; verify excluded analytics remain unreachable; obtain the Product Owner's public-registration/payment decision.
2. **Controlled rehearsal:** use Test Admin/Test Student in staging to exercise the complete Week 0 through worksheet/Admin-progress journey and failure recovery.
3. **First-time pilot:** onboard five to ten people without coaching them through expected UI behavior; record anonymized pass/fail and confusion points.
4. **Stabilization:** classify findings, fix all critical/high defects, rerun affected security and end-to-end paths and avoid scope-expanding polish.
5. **Launch and monitoring:** perform the release preflight, launch the first live cohort and monitor key authentication, content, release, tracker, Admin-parity and privacy failures.

## Non-negotiable boundaries

- Preserve Google-only controlled accounts, role routing, RLS, release timing, Student tracker ownership and read-only Admin progress.
- Do not expose private Student data in screenshots, logs or evidence.
- Do not use Production data seeding to manufacture positive states.
- Do not physically delete legacy tables, functions, routes or content without a separate retention, backup and rollback decision.
- Mobile optimization and new product features remain outside Phase 8 unless a launch-blocking defect requires a narrowly approved change.

## Exit gate

Phase 8 is closed by explicit Product Owner operational acceptance because the MVP is live with real Students. Items not evidenced by the repository remain visible in the [closeout checklist](manual-verification-checklist.md) and are not silently marked passed.
