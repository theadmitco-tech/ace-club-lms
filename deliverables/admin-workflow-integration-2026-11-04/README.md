# Admin workflow integration

Status: implemented; Preview verification pending.

The Admin wireframe is integrated into the existing LMS on `intern/v2-admin-workflow-review`, based on `intern/v2-phase-7-review`. The staging content-publishing gate selects the new dashboard. Production continues to use the existing dashboard and rejects the V2 workspace.

## Workflow coverage

| Area | Implemented behavior |
| --- | --- |
| Navigation | Home, Course content, Batches and Students; secondary tools in an expandable menu; responsive navigation and keyboard dismissal |
| Home | Current saved resource drafts, upcoming published classes and direct task links; explicit loading failures |
| Course content | Published course selection, session outline, four ordered resource groups, search, uploads, session heading edits and a separate Student preview tab |
| Resource editing | Save, review and confirm publication; explicit placement selection across courses; ordering and all five reading locations; affected placements returned by the server |
| Recovery | Unsaved-navigation protection, interrupted-save request identity, stale-conflict recovery and fresh review before confirmation |
| Batches | Batch selection, course/schedule editing, separate publication task, contextual enrollment and live-operation links |
| Calendar | Temporary date selection, explicit application, cancellation without changes, IST scheduling and separate draft confirmation |
| Templates | One session editor at a time; expandable resource groups and optional live-class planning |
| Students | Authorized search and pagination; distinct purchase, expiry, enrollment and registration states; links to existing management operations |
| Advanced operations | Existing pricing, imports, multi-offering publication, private meetings and legacy tools remain reachable |

The design uses existing authorization, publication fingerprints and caller-bound database functions. No schema migration or payment activation is introduced. Recording-only courses derive their schedule behavior from the saved template. Capacity enforcement remains part of the outstanding Phase 3 integration.

## Verification

Local verification passed the existing Phase 1, 2, 4, 5 and 6 suites, TypeScript, lint and webpack build. Focused browser coverage includes nine Admin workflow cases and nine resource/Student regression cases. All 43 inherited browser cases passed; the tests retain their assertions while opening the newly collapsed controls explicitly. Phase 7 preflight tests also passed. Dedicated Student access tests check role denial, disabled-workspace denial, identity-scoped queries and explicit database failures.

Browser reports use actual application components with synthetic server adapters. They do not substitute for hosted authorization acceptance. Source hashes identify the tested component versions. Screenshots contain synthetic data only.

## Deployment controls

Automatic deployment is disabled for this new branch until its scoped Preview configuration is installed. Branch-only staging credentials and private test links were explicitly authorized. The connected Vercel project is `ace-club-lms`; the staging project is `eyphkkginlgoaxflauog`. Production configuration, data, migrations and traffic remain outside this change.

The proposed PR targets `intern/v2-phase-7-review` and remains Draft and unmerged. Release readiness remains conditional on the outstanding payment integration and final combined acceptance.
