# Phase 5 Manual Staging Verification — 2 August 2026

Environment: Vercel Preview connected to staging Supabase project `eyphkkginlgoaxflauog`.

No account identifiers, credentials, private Student data or material URLs are recorded here.

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
