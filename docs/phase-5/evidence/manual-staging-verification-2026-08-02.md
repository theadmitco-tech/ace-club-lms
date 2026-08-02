# Phase 5 Manual Staging Verification — 2 August 2026

Environment: Vercel Preview connected to staging Supabase project `eyphkkginlgoaxflauog`.

No account identifiers, credentials, private Student data or material URLs are recorded here.

> **Recording-rule revision:** The master-recording inheritance and synchronization checks below accurately preserve the behavior tested earlier on 2 August, but that product rule was subsequently superseded. Migration `20260802230000_make_recordings_batch_specific.sql` is applied; revised batch-isolation manual verification remains pending.

## Batch-specific recording revision

- Admin added a titled valid YouTube link from the new Recordings area for one batch session, and the recording appeared for the Student enrolled in that batch.
- Master Base no longer exposes recording management; it retains reusable pre-reads and worksheets only.
- Cross-batch review exposed detached copies of recordings inherited under the superseded Master Base rule. After cleanup migration `20260802234500_remove_cross_batch_legacy_recording_copies.sql`, Admin confirmed the newly added recording appeared in only its selected batch.
- Admin added a different recording to the matching curriculum session in a second batch and confirmed that each batch displayed its own link and title.
- Student batch-switch review exposed two stale worksheet actions whose Master Base rows had already been removed. The prior `ON DELETE SET NULL` behavior left cohort copies orphaned; cleanup and cascade migration `20260802235900_cascade_master_material_removals.sql` was prepared for staging retest.

## Verified

- A controlled staging Test Student completed Google Sign-In and reached the Phase 5 dashboard.
- The authenticated dashboard displayed This week and Timeline and showed programme position Week 2.
- The corrected Week 2 dashboard displayed Recommended practice above This week with a clear empty state when no released Week 1 worksheet existed.
- Student Sign out redirected to `/login` and protected dashboard access remained blocked afterward.
- In programme Week 2, Week 2 started open, Week 0 started collapsed, and Week 0 remained manually expandable.
- Browse by section displayed the QA, VA and DI curriculum views. Review removed both the Timeline item-emphasis rule and the duplicated four-step journey strip; cards now rely on course order, dates, and compact resource states.
- Recommended practice and Timeline/Browse by section opened the same DI worksheet, and the worksheet destination displayed the matching released PDF.
- Admin successfully saved a titled valid YouTube recording on a master curriculum item.
- Admin rejected a non-YouTube recording URL with the message “Enter a valid YouTube or youtu.be link,” while preserving the valid recording.
- Explicit material sync propagated the master recording to the existing staging cohort. After the master link was edited, a second explicit sync updated the linked Student recording without creating another Student action.
- A privately shared YouTube recording opened for the invited Test Student, remained unavailable to a signed-out viewer, and appeared as only one Student recording action.
- On the notification-fix Preview, a no-change material sync displayed “Batch materials are already up to date,” and the Student retained one recording action.
- A recording added to a future academic item propagated to the existing cohort but appeared to the Student only as non-clickable “Available after class” text.
- Student review confirmed that rank, percentile, accuracy, correctness, daily targets, streak, and auto-graded practice are absent from the reachable Student interface.
- Browse by section returned 6 QA, 6 VA, and 5 DI curriculum items, with orientation, mocks, breaks, and support events excluded from all three section views.
- A curriculum-item detail page with missing uploads showed clear Not configured states without clickable or disabled-looking actions.
- Timeline was selected by default and showed the complete 31-item curriculum: three items in each Week 0–8 group and one item in each Week 10, 12, 14, and 16 group; every week expanded and collapsed.
- Keyboard-only traversal had visible, sensible focus order, and the Student interface remained readable without overlap or horizontal page scrolling at 200% browser zoom.
- Sunday showed weekly actions without inventing a weekday pre-read recommendation.
- QA, VA, and DI Browse by section results remained in curriculum order: Quant 1–6, Verbal 1–6, and DI 1–5.
- Prior staging verification confirmed that removing the Test Student's enrollment shows the guided no-course state and restoring enrollment returns the dashboard.
- Deactivating the Test Student denied dashboard access without exposing course data; reactivation restored Google sign-in and the enrolled dashboard.
- Product Owner visual sign-off confirmed that Recommended practice sits clearly above a compact This week callout and that academic, orientation, mock, break, and support Timeline variants are understandable.
- PR review follow-up passed on staging: removing the test master recording removed its linked Student action, and Back to Timeline from a non-current item opened the target week with the item visible.
- A newly generated disposable staging cohort inherited its master recording with the correct post-class release timestamp.
- A configured pre-read more than seven days before its class appeared to the Student as unavailable with its future release timing and no clickable action.
- After a temporary future worksheet was configured and synchronized, the Student Timeline showed it as available only after class with no premature open action.
- The Week 0 diagnostic worksheet also remained locked until its item ended, consistent with the signed rule that only Week 0 pre-reads release immediately; Phase 4 already verified that immediate pre-read boundary.
- Blocking the authenticated Notion request produced the actionable pre-read error state; Retry remained available, navigation remained usable, and unblocking followed by Retry restored the content.
- Blocking the protected PDF request on the refreshed Preview produced “We couldn’t open this PDF” with Retry PDF; removing the block and retrying restored the worksheet.

## Defects found

- Student Sign out cleared the session but did not redirect away from the dashboard.
- Recommended practice was absent in Week 2 when no released Week 1 worksheet was available, leaving no explanation for the empty weekly-practice state.
- Admin material sync briefly showed its loading state but no completion message because toast state had no mounted notification viewport.
- The pre-read viewer returned to an intermediate curriculum-item detail page instead of returning directly to the matching Timeline item.
- Timeline/Browse by section and QA/VA/DI filter navigation scrolled the dashboard to the top instead of preserving the Student's reading position.

The sign-out, recommendation, and notification viewport fixes were implemented and confirmed on refreshed Preview deployments on 2 August 2026.

The material-viewer back navigation and dashboard filter scroll-preservation fixes also passed on their refreshed Preview deployments.

- The first Week 0 default-collapse implementation still appeared open because the browser preserved native disclosure state. The explicitly controlled replacement passed on the next Preview.

## Still open

Section browsing, timeline expansion, material states and destinations, direct-URL denial, Admin recording management and explicit cohort synchronization remain to be verified one focused scenario at a time.

## Product-rule revision

The initial prior-week recommendation behavior recorded above was superseded after review. Recommended practice now rotates independently for DI, VA, and QA: a released worksheet appears after its class ends and leaves when the next same-section class begins. This display rule does not remove released worksheets from Timeline or Browse by section. The active DI recommendation and its destination passed on Preview; time-bound transitions are covered deterministically.

Deterministic boundary checks confirmed a maximum of one active worksheet per section, removal at the next same-section class start, replacement after that class ends, and persistence of the final section worksheet. Source review also confirmed that recommendation selection performs no writes and master-link propagation does not update `available_from`.
