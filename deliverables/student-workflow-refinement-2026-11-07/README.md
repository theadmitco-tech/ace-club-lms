# Student workflow refinement — 2026-11-07

The Student learning interface follows the supplied journey brief and the previously reviewed annotated wireframe. Implementation remains on `intern/v2-admin-workflow-review`, together with the preceding Admin navigation refinement. Local verification is complete; publication and hosted Preview verification remain pending the authenticated branch push. Production, database records, applied migrations and PR readiness are unchanged.

## Source mapping

The following entries paraphrase the supplied sources; they are not quotations or reproductions. Original source-document hashes are distinct from the implementation hashes in `source-hashes.json`.

- Original `V2-student-and-admin-journeys.md` SHA-256: `c1500fecb999b84eeb08290f6d534b0a77a7aa93322616b0f8e80db4be7285f8`.
- Original `ace-v2-wireframes-2026-10-28.pdf` SHA-256: `11534c49281d8f88ca69cd8474439fb621a66b1844147a9ac762f2afa2c480d0`.

| Workflow requirement | Result |
| --- | --- |
| Separate recording and live journeys | My learning opens with two route choices. The live list includes only batches with confirmed live registration. Unverified learning state provides no live action. |
| Any-order course navigation | Quant, Verbal, DI and any existing programme content have subject selectors. The collapsible outline lists available sessions for the chosen subject. |
| More space for reading | The outline sits above a full-width session view. Reading options contain text size and focus controls. The long mobile outline remains bounded and keyboard accessible. |
| Resume indicator | The last-opened session has a resume action and outline label. Visual progress remains distinct from completion or attendance. |
| Four ordered session resources | Pre-class read, recording, post-class read and worksheet retain their established order and protected resource routes. |
| Subject-specific feedback gates | The affected subject has an explicit notice and disabled session entries. Current obligation sessions and other entitled subjects stay accessible. Every pending obligation remains visible. |
| Live absence and feedback | The existing live feedback form permits a missed-class report without requiring playback or a rating. Only confirmed server responses clear applicable obligations. |
| Quiet unavailable-access state | The course route links to access dates and purchase history without a course-purchase action in its unavailable state. |
| Simple primary navigation | My learning, My access and Explore courses stay visible. More contains Dashboard & mocks, Schedule, Resources and Practice log. |

Later approved decisions remain authoritative: the temporary in-page feedback form continues pending the external form integration; supported playback uses the existing 80% observed-time rule, with labeled self-report for unsupported recordings. Payment activation remains separate. Student Full Course labels and entitlements remain accurate; the preceding three-subject-only change applies to Admin offering choices.

## Verification

The Student story runs from the learning library to a selected subject/session, through existing progress or feedback requests, and back to confirmed learning state. This change does not modify server authorization or database functions.

| Check | Evidence |
| --- | --- |
| Student workflow browser fixtures | 16 passing cases in `student-browser-results.json`; zero unexpected browser errors or external requests. Includes subject gates, interrupted confirmation, multiple obligations, missed classes, focus, bounded outline and actual mobile menu hit testing. |
| Content placement and read-only preview regressions | 13 passing cases in `content-browser-results.json`. |
| Publishing, scheduling and Admin regressions | 43 passing cases in `publishing-browser-results.json`. |
| Phase 4 local checks | Five suites passed with `npm run test:v2:phase4`. |
| Static checks | Focused ESLint, TypeScript and webpack application build passed. |
| Visual review | Five synthetic screenshots were inspected; PNG ancillary metadata was absent. The mobile review found and corrected clipping in the More menu. |

All browser reports use isolated synthetic data and test responses. Authentication and feature switches are stubbed in the Student header fixture; no real sign-out or account action is asserted. The report source hashes identify the actual fixture inputs, including those substitutions. External font imports are omitted from fixture styling. The content and publishing regressions preceded the final menu-only CSS correction; the 16-case Student run and final build include that correction. These results are local UI evidence, not fresh hosted database or payment acceptance.

## Screenshots

- [Learning library](student-library.png)
- [Full-width session](student-session.png)
- [Subject feedback gate](student-feedback-gate.png)
- [Long mobile outline and resume state](student-mobile-outline.png)
- [Mobile navigation](student-navigation-mobile.png)

All captures use synthetic resources and generic account labels. No real Student records, credentials or session links are included. The supplied source documents remain outside this deliverable.
