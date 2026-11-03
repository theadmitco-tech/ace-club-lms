# Phase 5 — Independent content publishing

Status: implementation, staging acceptance and exact QA cleanup complete. Draft PR creation remains a separate handoff action.

The review branch is `intern/v2-phase-5-review`, based on the Phase 4 candidate
`5b4a2b12ca93c68079e523d1349b94c966893f7a`. Phase 4 remains a separate Draft PR.
Phase 3 payment work is independent. Production remains outside this scope.

## Delivery model

Independent content items retain draft revisions, a separately confirmed published
revision, explicit placement targets and an audit history. Draft edits never alter
Student delivery. A scope preview names every affected batch/session and binds the
confirmation to current content and course revisions. Unpublishing a replacement
hides its original target rather than unexpectedly restoring an old recording.

The five reading locations are before the course area, at the subject-area top,
before a specific recording, after a specific recording and after the course area.
Each placement retains a session authorization context. Course-level locations
only show content from currently accessible sessions; subject feedback gates and
entitlement checks continue to apply. The same item can target multiple sessions
and offerings through explicit, reviewed scope selection.

Admin preview uses the Student renderer in a separate authenticated tab. Progress,
watch samples, feedback and attendance writes are disabled in preview mode.

## Resource hosting and compatibility

Existing provider and Notion references remain unchanged. New native recordings
and PDFs use a private Supabase bucket in the existing staging project; browser
uploads use scoped upload authorization and delivery rechecks current publication
and Student authorization before streaming. No new paid hosting vendor is provisioned.
The upload size limit and supported formats are explicit in the authoring UI.
Uploads accept MP4, WebM and PDF files up to 50 MiB. The bucket limit remains
bounded by the project-wide Storage limit. Standard uploads are suitable for small
files; large recordings remain provider-hosted until a resumable hosting expansion
is reviewed. File removal from delivery preserves immutable audit references;
physical object retention is separate from publication deletion.
External URLs retain their provider's sharing behavior; the LMS does not claim
provider-level DRM or revoke a previously copied external provider link.

Notion remains the authoring source. The controlled renderer is attempted first;
clear failures and the reviewed original-embed fallback remain available. No bulk
Notion conversion or original-material rewrite is part of this phase.

## Content launch procedure

The Admin opens Course publishing → Content publishing, creates a reading draft
with the existing Notion source URL, and selects the entitled course/session and
one of the five reading locations. The new-tab Student preview shows the proposed
placement before publication. The Admin checks the rendered reading or its explicit
provider-failure state and original-source fallback, then reviews the named scope
and confirms immediate publication. Unsupported content remains clearly unavailable
until its source or replacement is corrected; the LMS does not silently publish a
conversion or broaden provider sharing permissions.

Native recordings and PDFs follow the same draft, preview and reviewed-publication
sequence after upload. Supported uploads are MP4, WebM or PDF, up to 50 MiB; larger
recordings retain their approved external provider. A replacement receives a new
resource identity. Publication deletion removes access through LMS resource routes
while preserving audit history. The Admin reviews the Student presentation after
publication and can unpublish the item independently if delivery needs correction.

## Exit gates

- [x] Independent create/edit/replace/preview/publish/unpublish/reorder actions.
- [x] Five-placement matrix passes in Admin preview and Student delivery.
- [x] Notion rendering and explicit provider failures remain usable.
- [x] Real Student components render preview without learning writes.
- [x] Universal scope is visible and stale confirmations are rejected.
- [x] Reading reminders remain visual; no completion analytics are introduced.
- [x] Replacement/deletion denies stale protected resource requests.
- [x] Full new-tab Admin Student-view preview is available.
- [x] Original course rows, migrations and walkthrough records are preserved.

Evidence includes local and hosted permission tests, exact Preview commits,
recovery rehearsal, activation and additive repair receipts, rendering checks and
exact QA cleanup. The [exit-gate record](../../../deliverables/phase5-hosted-acceptance/EXIT-GATES.md) links the reports and handoff boundary.

Storage limits and upload behavior follow the [Supabase file-limit documentation](https://supabase.com/docs/guides/storage/uploads/file-limits) and [standard-upload documentation](https://supabase.com/docs/guides/storage/uploads/standard-uploads).

Content targets are pinned to the reviewed batch publication. A later batch publication requires explicit target revision refresh and publication review.
