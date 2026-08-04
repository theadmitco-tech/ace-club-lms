# Phase 8 — Pilot and Launch Plan

Status: Proposed operating plan
Owner: Product owner, Engineering and pilot operations
Last updated: 3 August 2026

## Sequence

### Gate 1 — Launch cleanliness

- Bring repository-wide lint from 22 errors/3 warnings to zero without suppressing findings.
- Repair or remove broken package commands and unsafe/stale operational guidance.
- Confirm no MVP-excluded analytics or editing controls are reachable.
- Decide whether public registration/payment is a live business surface; isolate it if not.
- Run TypeScript, targeted lint, full lint, guarded Production build and route inventory.

### Gate 2 — Controlled staging rehearsal

Use one Test Admin and one Test Student. Create a disposable cohort and exercise:

- provisioning, Google sign-in, role routing, logout, deactivation/reactivation and unknown-account denial;
- Week 0 immediate access, seven-day pre-read release, class state, post-class PDF release and direct-URL protection;
- batch-specific recording creation/release/isolation;
- canonical Student worksheet tracking, individual/bulk saves, refresh persistence and retry paths;
- matching read-only Admin totals and question inspection;
- cross-student, signed-out, inactive, unenrolled, unreleased and unpublished denial;
- programme time-zone boundaries, laptop/desktop widths, 200% text zoom and keyboard use; and
- recoverable Notion/PDF failures without exposing adjacent private data.

### Gate 3 — First-time pilot

Invite five to ten first-time Students. Do not count the Test Admin or Test Student toward this minimum. Give participants only the instructions a real cohort receives, then observe:

- account setup and first sign-in completion;
- ability to understand Dashboard, Timeline, Practice log and material states;
- Week 0 and scheduled pre-read completion;
- class/recording discovery and worksheet access;
- tracker status, time/comment, bulk action and retry comprehension;
- logout/re-entry and direct-link behavior; and
- support requests, confusing language, blocked tasks and browser/device details.

Store only anonymized outcomes. Do not retain names, emails, comments, screenshots containing private data or authentication artifacts.

### Gate 4 — Stabilization

Classify every finding:

- **Critical:** privacy/security exposure, unauthorized access, data loss or complete launch failure — stop pilot/launch immediately.
- **High:** a required journey is blocked without a safe workaround — fix before launch.
- **Medium/low:** non-blocking friction or polish — assign an owner and disposition; do not expand Phase 8 scope automatically.

Rerun the affected end-to-end path plus authorization/release regressions after every critical/high fix.

### Gate 5 — Live launch and monitoring

- Complete the mandatory Production environment preflight and migration/deployment plan.
- Require successful deployment plus live `/` and `/login` probes.
- Smoke-test Production as Student and Admin without creating unnecessary tracker data.
- Launch the first cohort only when critical/high queues are empty and the Product Owner signs off.
- Monitor sign-in/role failures, content-render failures, incorrect release timing, tracker save failures, Admin/Student mismatches and privacy incidents through the first live cycle.
- Record incident owner, severity, workaround, fix and verification without private Student data.

## Completion evidence

- completed checklist;
- anonymized rehearsal and pilot matrix;
- defect register with severity/disposition;
- automated verification outputs;
- Production preflight/deployment evidence; and
- Product Owner launch decision plus post-launch monitoring result.
