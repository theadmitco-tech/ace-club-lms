# Admin reading preview — 25 October 2026

Local follow-up on `work/reading-preview-2026-10-25`, built from
`6d12bd9ee87f1c7070b78e3bb77fb292e485c918`. This change is not yet on the hosted
Preview. PR #24 remains Draft.

## Result

Pre-reads and post-reads can be opened within Admin template/batch editing and
publication review. The shared Student Notion renderer displays the current
draft title, formatted content, images and links with the session placement and
item order. Editing a source removes old content immediately. Blank or failed
readings show an error; retry and source correction recover the view.

The endpoint requires an active Admin and an enabled non-Production authoring
feature. Invalid or extra request parameters are rejected. Responses are private
and non-cacheable. Preview has no database write dependency, and Student reads
still use their existing material-authorized endpoint.

## Verification

- **204 Phase 2 tests passed across 17 suite files**, without failures or skips,
  including six new reader/helper/API tests and disposable PostgreSQL regressions.
- **39 synthetic browser scenarios passed**, including five new reading cases.
  After tightening blank-content detection, the six reader/API tests and all five
  reading browser cases passed again against the final source. Other test suites
  were not repeated for that isolated guard change.
- Final lint, TypeScript and webpack production build passed. Builds used
  synthetic localhost configuration; no deployment was performed.
- Browser runs used Chromium 155, synthetic Notion records/images and synthetic
  auth/data adapters. No external browser requests or runtime errors occurred.
- The mobile reading view and desktop publication preview were inspected.

The five reading browser cases cover draft titles, formatting/links/images,
pre/post placement, ordering, keyboard opening, mobile width, no preview writes,
source replacement, blank/failed/unsupported content, retries, Student endpoint
selection and publication review of the saved batch revision.

Evidence:

- [Full browser run](reading-preview-browser-full-2026-10-25.json): 39 scenarios
  before the final blank-content guard refinement.
- [Final reading run](reading-preview-browser-final-2026-10-25.json): five scenarios
  with copied-source SHA-256 hashes, after the refinement.
- [Mobile reading view](reading-preview-mobile-2026-10-25.png).
- [Publication reading view](reading-publication-preview-2026-10-25.png).

Commands: `npm run test:v2:phase2`, `node scripts/v2-reading-preview.test.mjs`,
`npm run test:v2:browser` (full, then `V2_BROWSER_CASE='Reading preview'`),
`npm run lint`, `npx tsc --noEmit`, `npm run build -- --webpack`.

## Limits and boundaries

No live Notion page or hosted authenticated session was tested. This covers public
Notion page bodies, not private Notion credentials, arbitrary files, iframe-only
sources, recording previews, final Student cards, feedback locks or universal
publication. The fetched external page can change independently of its saved
reference. See [supported behavior](../reading-preview.md).

No shared migrations, existing Student/course-data changes, Production changes,
Flexible Mocks changes, pushes, PR metadata updates or merges were performed.
The applied Phase 1 migration retains SHA-256
`ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7`.
The separate Phase 1 forward/rollback proposal remains unapplied.
