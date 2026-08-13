# Pilot V1 Phase 7 — Staging Acceptance Evidence

Date: 13 August 2026  
Environment: staging Supabase and immutable Vercel Preview  
Branch: `codex/pilot-v1`  
Application commit: `8fb7cf6`  
Preview: `https://ace-club-2w3ekxg2n-theadmitco-techs-projects.vercel.app`

## Result

Engineering and QA/Security acceptance is complete. Every Phase 7 criterion has a pass or a documented evidence carry-forward, no critical or high finding is open, and Production remains untouched. The Product Owner accepted Pilot V1 for Production planning on 13 August 2026.

This record contains no account identifier, private object path, signed URL, authentication artifact or private Student data.

## Account and visual journeys

- The approved active staging Admin and enrolled staging Student both authenticated through the Google-only flow and reached their role-correct landing pages.
- An enrolled Student attempting `/admin` was routed back to the Student course and saw no Admin controls.
- A signed-out caller attempting a released worksheet route was returned to Login and received no PDF viewer.
- Public/Login visual acceptance was carried forward from the Phase 6 logo evidence and the Product Owner's accepted P7-01/P7-03 retests.
- The current Student header and Admin sidebar render the accepted transparent wordmark with usable navigation, account and sign-out controls. At a 720 CSS-pixel effective width, representing the 1440px desktop layout under 200% enlargement, both shells and the Student course have document width equal to viewport width. The narrow Admin menu opens with the wordmark and all controls visible.
- The tab exposes the Ace Club spade icon and the course loading state uses the Ace Club wordmark.

## Admin Session-resource journey

- The current Preview exposes one coherent Session resources surface with a batch selector and per-session recording plus titled private-PDF controls.
- The Phase 5 lifecycle already passed create, rename, replacement, confirmation-based removal, released/locked Student views, protected opening and zero-residue cleanup on the same staging project.
- A diff from the Phase 5 tested application commit `538fa86` through `8fb7cf6` confirms no recording, Session-material API, protected-path or Session-material migration implementation changed. Later changes are documentation, presentation, Student recommendation/identity work and the least-privilege trigger grant migration.
- The current browser session rechecked the batch/session controls and blank-upload validation. Exact binary upload replay was unavailable because the local Chrome extension did not have file-URL access; this is a reviewer-tool permission, not an application failure. The unchanged Phase 5 lifecycle and Phase 6 integrated gate are the accepted evidence carry-forward for create/rename/replace/remove and cross-batch isolation.

## Student resource and tracker journey

- The dashboard has no standalone `This week` section. The automatically opened current-week Timeline retains the full scheduled session/resource journey.
- Recommended reading contains only the one-day-before pre-read prompt plus latest released Session reading; Recommended practice remains separate. The current date correctly produced the empty reading state rather than an ineligible recommendation.
- One released VA class displayed both sibling worksheets exactly once. Each title had its own distinct canonical material route; the first opened its own PDF workspace and 30-row log, while the second retained its distinct route and log entry.
- The same worksheet appears in Timeline and Practice log with consistent totals. Admin progress contains no editable controls.
- On desktop, the PDF and tracker are side by side. The tracker region has its own vertical scrolling (`clientHeight` 484 versus `scrollHeight` 2448), while the PDF viewer remains independent.
- At the 720 CSS-pixel effective-width check, the PDF and tracker stack vertically, the tracker retains a keyboard-focusable horizontal scroll region, and document width equals viewport width.
- Individual status, optional time and comment changes saved and survived refresh. A confirmed selected-only bulk update changed only the selected row, reported one saved record, cleared the selection and preserved the neighboring row. The existing failure/retry fixture remains the regression evidence for partial failure isolation.

## Release, authorization and privacy

- Recommendation fixtures pass 7/7, covering seven-day pre-read availability, Thursday-to-Friday VA, Friday-to-Saturday QA, Saturday-to-Sunday DI, calendar boundaries in `Asia/Kolkata`, complete sibling sets and missing/locked/later replacement behavior.
- Protected Session-material path fixtures pass 4/4, covering namespace separation plus cross-session, traversal, non-PDF, non-UUID, external, duplicated and decorated reference rejection.
- The rollback-only staging authorization probe passed again. It covers active Admin writes, Student and signed-out write denial, active enrolled released read, future/unpublished/inactive/signed-out/cross-batch read denial, authoritative after-session release and removal. It left zero probe courses and zero probe materials.
- Both Pilot V1 migrations remain ledgered on staging only. The trigger helper is executable by neither `anon` nor `authenticated`; save/remove RPCs remain unavailable to `anon` and retain their internal active-Admin check. The `course-materials` bucket is private.
- Current Supabase advisor output contains the pre-existing repository-wide warning baseline recorded by Phase 8/Phase 6; no new V1 critical or high issue was introduced. The V1-specific least-privilege item P6-01 remains closed.

## Automated gates

| Gate | Result |
|---|---|
| Recommendation fixtures | Pass, 7/7 |
| Protected Session-material path fixtures | Pass, 4/4 |
| Targeted ESLint | Pass with zero findings |
| `npx tsc --noEmit` | Pass |
| Next.js 16.2.4 Production build | Pass; 33 static pages generated and all dynamic routes compiled |
| Rollback-only staging authorization probe | Pass; zero residue |
| Repository-wide ESLint | Signed unrelated baseline: 22 errors and 2 warnings; no V1-touched-file finding |

## Findings

| ID | Severity | Finding | Owner | Disposition | Retest |
|---|---|---|---|---|---|
| P7-04 | Low, verification tooling | Chrome file upload replay was blocked because the browser extension lacks file-URL access | QA/Security environment owner | Use the unchanged, sanitized Phase 5 upload lifecycle plus Phase 6 diff/integration evidence for this gate; enable the extension permission only if a same-commit binary replay is desired | Current Preview controls and blank-upload validation pass; prior full lifecycle passes and the implementation diff is empty |

No critical or high defect, privacy exposure, cross-batch propagation or unreleased-file exposure remains open.

## Product Owner decision

Decision: **Accept Pilot V1 for Production planning.**

Recorded: 13 August 2026.

Phase 7 is complete. This decision authorizes preparation and review of a separate Production release plan only. It does not authorize a Git merge, Production migration, Production deployment or live-batch mutation.
