# Changelog

All notable Ace Club LMS changes are recorded here. Detailed execution evidence belongs in dated release records under `docs/releases/`.

## Unreleased

### Release 1.1 login course chooser — Staging accepted

- Routed authenticated portal entry through `/post-login`.
- Verified that multi-course Students see the chooser after every fresh login, including when a saved preference exists.
- Preserved direct entry for single-course Students, `/admin` entry for Admins, historical-course selection, saved preference, and the in-session “Switch course” control.
- Deployed and accepted an isolated Staging-backed Preview, then removed all disposable fixtures with zero residue.
- Made no Production, migration, role, enrollment, or course-material change.

### Release 1 Production rollout

- Promoted the Staging-accepted reconciled application to Production.
- Restored `/courses` and “Switch course” while preserving the Notion embedding fix.
- Verified current and historical course switching with the real multi-course test Student and restored its original RC selection.
- Confirmed the existing Admin reporting surface remained healthy.
- Made no migration, role, access, enrollment, or course-material change.

### Release 1 course-selection Staging acceptance

- Added an environment-locked disposable fixture workflow for multi-course Staging acceptance.
- Verified first-login selection, active and historical courses, switching, persistence, and Student-surface navigation on a Staging-backed Preview.
- Removed all QA fixtures and confirmed zero database residue.
- Kept Production application, database, roles, access, and Student data unchanged.

### Release 0 source reconciliation

- Reconciled the accepted worksheet-count/course-selection line, Production Notion fix, and documentation line into `codex/release-0-reconciled-baseline`.
- Verified focused behavior, type safety, changed-file lint, documentation integrity, and a production Webpack build.
- Preserved the database-ledger reconciliation boundary; no environment, database, access, or deployment change was made.

### Documentation consolidation

- Added the Project Manual as the master documentation front door.
- Added Current State as the single active operational handoff.
- Added and expanded the Engineering Handbook, including future-handoff rules.
- Added a disposition inventory covering the documentation and instruction corpus.
- Simplified the documentation and instruction routers.
- Marked competing running handoffs and the Pilot V2 bootstrap archived for continuation while preserving signed history.
- Consolidated living coding and document-convention rules into the Engineering Handbook.
- Added automated documentation link, header, inventory, and handoff checks.

No application, database, access, environment, Staging, or Production behavior changed.
