# Phase 8 — Pilot, Launch and Stabilise

Status: Planning active
Owner: Product owner, Engineering and pilot operations
Last updated: 3 August 2026

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

The [manual verification checklist](manual-verification-checklist.md) passes end to end, the first-time pilot includes at least five Students, there are no open critical/high defects or cross-student exposures, Production preflight passes and the first live cohort launches with monitoring and an owner for every unresolved lower-severity issue.
