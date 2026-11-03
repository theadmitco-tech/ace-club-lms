Phase 5 adds independent content drafts and publication to the LMS. Admins can create, edit, replace, reorder, preview, publish, unpublish and delete individual resources after reviewing every affected course/session. Student readings support all five placement locations, and the separate Admin preview uses Student components without learning writes.

Private recording and PDF uploads use staging Supabase storage with authorization checked before streaming. Recording revisions receive new resource identities; old LMS file requests are rejected after replacement, unpublishing or deletion. External provider links retain provider-controlled sharing. Existing course revisions and applied migrations are preserved.

Local validation includes Phase 1, 2 and 4 regressions, six Phase 5 suites, six Phase 5 browser journeys, 13 Phase 4 browser regressions, TypeScript, lint and webpack build. Fresh recovery and activation rehearsal preserved 85 existing application tables / 3,919 rows. Staging activation, hosted acceptance and exact QA cleanup remain pending; this PR remains Draft and unmerged. Production and Phase 3 activation are unchanged.

Evidence and remaining steps are recorded in `deliverables/phase5-preview-activation/README.md`. The review is based on `intern/v2-phase-4-review` while the separate Phase 4 PR remains open.
