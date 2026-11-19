# Session deletion from the course workspace

The selected session now has a quiet **Delete** action beside its rename control. A native modal names the selected session, explains the publication step and initially focuses **Cancel**. Escape cancels before saving and focus returns to the trigger. The mobile layout retains readable text and full-size action buttons.

Deletion saves a new course draft through the existing Admin-authorized preview/save functions. It removes exactly the selected stable session key, preserving the other sessions, existing schedule and historical revisions. The published outline remains unchanged until the Admin follows **Review & publish deletion**. The operation does not delete stored files, other courses or live events. Existing pending drafts require review rather than silent overwriting. Interrupted saves retain the same request and fingerprint for retry.

## Manual verification

1. The Admin opens `http://localhost:3000/admin/v2/content` and selects a disposable session in the intended subject.
2. **Delete** opens a confirmation naming that session. **Cancel** or Escape leaves the course unchanged.
3. **Delete session** saves a draft; **Deletion saved as a draft** explains that students still see the published version.
4. **Review & publish deletion** opens the existing publication review. Publishing the reviewed draft removes the selected session from the current outline.
5. Returning to the course workspace and refreshing shows the remaining sessions. Existing files and live-class schedules remain; live-session mappings require review where applicable.

Localhost uses staging data. Manual deletion is limited to designated disposable content. No existing staging session was deleted during engineering verification.

## Verification

- 12 local checks passed, including the deletion helper, session draft guards, ordering regressions and disposable PostgreSQL publication/replay/Student-denial checks.
- 39 isolated browser journeys passed, including four deletion cases plus existing course/content regressions. New cases cover cancellation and focus return, exact draft payload, mobile accessibility and interrupted-save replay, stale lists and existing drafts.
- Lint, standalone TypeScript and the webpack application build passed. The existing multiple-lockfile warning remains non-blocking.
- Desktop and mobile synthetic screenshots were inspected locally. Screenshots are not published in this packet.
- The new local checks are included in the Verify workflow.

The [verification record](session-deletion-verification.json) identifies tested source hashes. Browser Server Actions use synthetic adapters; separate disposable-database checks exercise actual SQL. This is not a hosted mutation test or Product Owner acceptance. No migration or external service configuration changed.
