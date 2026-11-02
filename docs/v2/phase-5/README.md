# Phase 5 — Independent content publishing

Status: implementation and local validation complete; no Phase 5 staging activation or acceptance is claimed.

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

## Exit gates

- [ ] Independent create/edit/replace/preview/publish/unpublish/reorder actions.
- [ ] Five-placement matrix passes in Admin preview and Student delivery.
- [ ] Notion rendering and explicit provider failures remain usable.
- [ ] Real Student components render preview without learning writes.
- [ ] Universal scope is visible and stale confirmations are rejected.
- [ ] Reading reminders remain visual; no completion analytics are introduced.
- [ ] Replacement/deletion denies stale protected resource requests.
- [ ] Full new-tab Admin Student-view preview is available.
- [ ] Original course rows, migrations and walkthrough records are preserved.

Evidence must include local and hosted permission tests, exact Preview commit,
recovery rehearsal, activation receipt, rendering checks and exact QA cleanup.

Storage limits and upload behavior follow the [Supabase file-limit documentation](https://supabase.com/docs/guides/storage/uploads/file-limits) and [standard-upload documentation](https://supabase.com/docs/guides/storage/uploads/standard-uploads).

Content targets are pinned to the reviewed batch publication. A later batch publication requires explicit target revision refresh and publication review.
