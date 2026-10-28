# V2 desktop journey wireframes — 28 October 2026

Open **[index.html](index.html)** in a browser. Everything runs offline; no install,
server, credentials or network connection is required. Use the scenario selector
inside **Design preview** for 23 review states, or follow the buttons through each journey.
The default screen is My learning. On course/session screens, **Focus mode** hides
surrounding navigation and support panels; Escape restores them. **Larger text**
increases reading copy from 18px to 21px without changing progress or access. **Screen map**
provides the route overview. **Reset prototype** restores fictional starting data.

The prototype uses the incorporated current rules in
`/home/prem/Downloads/V2-student-and-admin-journeys.md`, plus the approved
[course model correction](../decisions/course-model-correction-2026-10-25.md)
and [enrolled-batch access decision](../decisions/enrolled-batch-access-2026-10-25.md).
Historical conflicting journey annotations are not the current design source.

This is a **design deliverable**, not a claim that these flows are implemented in
PR #24. All identities, assets, dates and state transitions are illustrative.
No real purchase, enrollment, course content, progress, attendance or feedback is
read or written. Reloading the page discards the simulated changes.

## Five-minute review

1. **Recordings:** Browse the four offerings → explore an offering → simulate
   sign-in/purchase → open Quant 4 directly → open the pre-read. Other sessions
   stay open. Simulate the watched trigger → send feedback → verify the pending
   state → simulate the verified notification → return to learning.
2. **Subject lock:** Select **Quant feedback due**. Other Quant sessions,
   including previously opened sessions, are locked. Quant 4 and the outline
   stay open. Switch to Verbal or DI to see entitled subjects remain accessible.
3. **Live:** Select **Registered live student**. Only the enrolled live batch
   has a Meet action. Select **Recording unavailable**, submit **I didn't attend**,
   then simulate confirmation. Unlocking does not require watching a recording.
4. **Admin:** Select **Admin · complete course content**. Edit the pre/post-read
   titles, preview either selected draft and change reading placement. Reorder
   the pre-session item. Review shared recording reuse and student simulation.
5. **Publication and support:** Select **Admin · universal publishing scope**.
   Confirm the representative placement and scope to publish, unpublish or
   republish. In **Feedback support**, provide a reason and confirm the affected
   student/session/subject to record a separate override audit entry.

Choose **Screen map → Open printable review pack** (or append `?print=1` to
`index.html`) for all 23 deterministic review states. Use browser Print → Save as
PDF with background graphics enabled. The print layout targets A3 landscape.
The exported [24-page review PDF](ace-v2-wireframes-2026-10-28.pdf) includes a
cover and one page for each scenario.

## Screen and state coverage

| Area | Included |
| --- | --- |
| Catalogue | Full Course (Quant + Verbal + DI), individual Quant, Verbal and DI; separate recordings/live routes; individual scopes |
| Offering detail | Outline highlights, available session example, sample quote, six months from payment, live dates and capacity closed at 8 |
| Learning | Full session list, Quant 4 first, current session remains open, subject-wide lock, other entitled subjects available |
| Readings | Meaningful pre/post titles, separate placement, illustrative formatting/image/link, draft label, render failure and retry path, visual-only opening state |
| Session | Pre-read, material, one shared recording and post-read; recordings access does not expose Meet; registered live course details |
| Feedback | One general session-referenced form, live attendance question, valid non-attendance, pending confirmation, confirmed unlock, duplicate notification |
| Access | Unpaid and expired denial, retained history, feedback completion/override does not grant paid access |
| Admin content | Undated course session, editable pre/post titles, all five approved reading placements, pre-session reorder, shared recording references |
| Publication | Selected item, single/universal scope, representative placement, explicit confirm, draft edit, unpublish/republish, automatic broad outline explanation |
| Live Admin | Independent batch dates, private Meet editor, completion separate from attendance and recording, no Meet requirement to complete |
| Support | Student/session/subject confirmation, required override reason, separate audit timestamp/reason, preserved submissions, correction review request |
| Mocks | Existing entry point explicitly unchanged by V2 feedback locks |

The five reading placements are before the course area, at the top of a subject
area, before the video, after the video, and after the course area. Universal
publication previews the same shared item in relevant Quant placements; it does
not grant new entitlements or create feedback obligations by itself.

## Explicit design limits and open decisions

- **Recording watched:** feedback is due after watching. The exact 80% or 90%
  player threshold is undecided. The prototype's simulation button is a review
  control, not a proposed manual completion rule.
- **Multiple obligations:** the worked feedback example is Quant 4 only.
  Simultaneous pending obligations within a subject need a defined rule. Other
  sessions remain navigable but direct the reviewer to the Quant 4 example
  instead of attributing their feedback to the wrong session.
- **Completion reversal:** the correction workflow captures a class and reason
  for review while preserving submissions. Its effect on existing locks remains
  unresolved, so the prototype does not automatically reverse locks or change
  completed-class state.
- Feedback question wording is illustrative; the owner supplies final questions.
  Form callbacks alone must not unlock production content. Secure verification
  is simulated with an explicit review control.
- Rendered reading content is a local illustration, not a fetched Notion page or
  the production reader. App-level draft preview has separate test evidence.
- Catalogue prices are illustrative snapshots of the reviewed amounts, not live
  quotes. No new live/recordings price difference, upgrade expiry policy or
  Full Course live seat allocation rule is invented.
- Desktop is the review deliverable. Responsive fallback styling is convenience,
  not a separate mobile wireframe or mobile acceptance claim.

## Files

- `index.html`: offline entry point and review navigation.
- `styles.css`: base layout and printable review pack.
- `calm.css`: quieter visual system, reading typography, focus mode and responsive refinements.
- `DESIGN.md`: design rules and implementation notes for a future Stitch pass.
- `prototype.js`: scenario data, isolated simulated state and interactions.
- `README.md`: source rules, review walkthrough, coverage and limits.
- `ace-v2-wireframes-2026-10-28.pdf`: ready-to-share review pack.
- `verify.mjs`: repeatable local interaction checks.
- `verification-2026-10-28.json`: rendering, interaction and export evidence.

No new dependency or external service is used. PR #24 stays Draft; this delivery
applies no migrations and changes no shared environment or student/course data.

## Local verification

`node docs/v2/wireframes/verify.mjs` uses the repository's existing
`playwright-core` and local Chromium (`CHROMIUM_EXECUTABLE` may override its path).
It opens only local files and tests all 23 scenario renders plus the key
click-through flows, including denied access, individual offering scope,
pre/post-read independence, publication confirmation and reasoned overrides.

Recorded on 28 October 2026: **23 scenarios passed; zero assertion failures or
browser page errors**. Focus/large-text controls, Escape exit, required feedback
from focus mode, 1366/1024px layouts and a reading text-spacing override also passed.
Sample normal-text pairs measured at least 4.5:1 contrast; this is not a complete
accessibility audit or a clinical eye-strain assessment. `node --check` and ESLint also passed. These tests verify
the wireframe interactions, not production payment, authorization or feedback
integrations. Screenshot/PDF export checks are recorded separately by the main
handoff.

## Stitch connection

The calmer revision was implemented locally. The available plugin search returned
no Stitch integration, so no Stitch generation or project edit is claimed.
Use DESIGN.md and the reference screenshots as context when a Stitch project is
available. Keep business rules, access gates and unresolved decisions unchanged.
