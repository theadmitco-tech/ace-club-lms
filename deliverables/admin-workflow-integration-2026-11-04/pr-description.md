The Admin dashboard previously exposed several editing and publishing controls at once. This change integrates the reviewed Admin wireframe into the existing LMS with four main destinations: Home, Course content, Batches and Students.

Course resources follow save → review → publish, with explicit cross-course placement selection, Student preview, conflict recovery and unsaved-navigation protection. Batch scheduling uses a calendar with explicit date application and separate publication review. Student pages distinguish purchases, expiry, enrollment and live registration. Secondary operations remain available in expandable sections.

Existing authorization and database contracts remain in place. The redesign is gated to the staging V2 workspace. No migration, payment activation or Production configuration change is included. Local verification and hosted Preview status are recorded in `deliverables/admin-workflow-integration-2026-11-04/README.md`.

This PR is intended to remain Draft and unmerged against `intern/v2-phase-7-review`.
