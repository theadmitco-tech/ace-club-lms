# Ace Club revised wireframes — 1 November 2026

Open **[index.html](index.html)** directly in a browser. The prototype works offline,
without credentials, installation or a server. Select one of 18 screens in the
Design review toolbar, or follow the buttons between screens.

**[Open the 19-page review PDF](ace-v2-wireframes-2026-11-01.pdf)** for the cover and
18 deterministic review states. Calendar and upgrade pop-ups have their own PDF
pages; they are not hidden behind an interactive control in the exported pack.

This is the background **design workstream** requested alongside the Phase 1 audit.
It changes no LMS application code, deployment, environment, migration, real
student/course data or PR status. Prices, users, content, dates and state changes
are fictional illustrations; they are not live quotes or saved records. The
previous October 28 wireframes are preserved.

## What changed

- More prominent Recordings / Live courses choices and three selectable individual
  package tiers: one subject ₹10,000, two ₹18,000, three ₹25,000. Subject checkboxes
  match the selected tier. Full Course remains a distinct ₹25,000 offering.
- Public live schedules appear alongside pricing, without private Meet details.
  Detailed outlines and a four-resource sample session appear before checkout.
- A green **Pick up where you left off** treatment includes explicit “Last opened”
  text; it is a visual reminder, not a completion metric or prerequisite.
- Quant feedback locks mute other Quant sessions and show a prominent feedback
  action. Quant 4 resources and other purchased subjects remain accessible.
- Session content is ordered **pre-class read → recording → post-class read →
  worksheet**, with meaningful titles. Redundant step tabs and the right rail are
  removed to give reading content more space.
- Student Live classes shows only the enrolled Quant batch in the worked example.
  Private joining is separated from public schedule browsing.
- Locked individual sections open an upgrade pop-up. The example quotes the
  ₹8,000 difference from a one-subject to a two-subject package, and retains that
  difference on its review screen. This is a proposed UX, not an implemented
  server upgrade quote.
- Membership expiry has a quiet notice, retained history and no purchase/renew CTA.
- Admin course publishing has two sidebar destinations: **Session configuration**
  and **Batch publishing**. Resource editing uses four accordions; publication
  scope is a final review step. Dates live in the batch workflow, not course content.
- The live-event calendar pop-up supports selecting a November date and start time,
  an optional private Meet field, Save and Cancel. Cancel discards the modal draft.
  Undated content and other batches remain independent.

## Five-minute review

1. On screen 01, select two subjects, choose Quant and Verbal, then review the
   ₹18,000 package. Switch to Live courses to see the public schedule.
2. On screen 06, inspect paused Quant rows, open the current session, and switch to
   Verbal. Only Quant is feedback-gated.
3. On screen 07, inspect the ₹8,000 upgrade difference. Review upgrade retains that
   amount; Keep learning / Escape close the dialog without granting anything.
4. On screens 09–10, open the four ordered resources and compare the reading space.
5. On screen 14, edit a reading title and Preview as student. On screen 16 choose a
   calendar date and cancel; reopen to confirm the batch date stayed unchanged.
   Save changes only the local draft. Screen 17 requires scope confirmation.

## Decisions and phase boundaries

See [COMMENT-COVERAGE.md](COMMENT-COVERAGE.md) for the annotated PDF/page references,
all discussion action items, and the decisions that remain provisional.

The presentation is **confirmed by the user on 1 November 2026**: “Yes—three tiers,
Full Course separate.” The design uses three individual-subject package tiers
(₹10,000 / ₹18,000 / ₹25,000), plus a separate Full Course offering. This resolves
the PDF's “just 3 offering” note while preserving the four entitlement identities.
This confirmation does not close the other Phase 1 exit-gate findings.

The handwritten 80% watched threshold and claim that simultaneous feedback
obligations cannot occur are recorded as proposals. They are not silently applied
as backend rules; asynchronous live events and delayed notifications still need
an explicit concurrency decision. Completion reversal consequences remain open.

Phase 1 catalogue/access implementation is separate. Batch publication/scheduling
belongs to Phase 2; payment to Phase 3; resume and feedback-gated delivery to Phase
4. Backend eligibility, trusted payment verification, upgrade expiry treatment,
Tally callbacks, real Notion rendering and imported materials are not implemented
by this offline prototype.

## Verification and export

Run from the repository root:

```sh
node deliverables/ace-v2-wireframes-2026-11-01/verify.mjs
```

Final run: **63 checks passed across 18 scenarios; zero failures or browser errors**.
The 19-page PDF was exported successfully, with no print-page overflow.

The verifier uses existing `playwright-core` and `/usr/bin/chromium` (override with
`CHROMIUM_EXECUTABLE`). It checks every scenario, key interaction boundaries,
390/768/1024px overflow, print fit, and exports the PDF. Results and selected
screenshots are in [verification/](verification/). These are design checks, not
hosted application acceptance or a complete accessibility audit.

Keyboard users can tab through controls. Native dialogs support Escape and focus
containment; labels supplement color. Printing uses A3 landscape with background
graphics. Three dense review pages use a smaller print scale to avoid clipping.

The live calendar is a fixed November 2026 design sample, not a complete calendar
component. Clicking simulated payment, worksheet, meeting or publication actions
never invokes an external service. Reloading resets state. The PDF source had
flattened green handwriting; structured extraction found only hyperlink
annotations, so review comments were transcribed from page images.

## Files

- `index.html`, `styles.css`, `prototype.js`: self-contained clickable wireframes.
- `ace-v2-wireframes-2026-11-01.pdf`: printable review pack.
- `COMMENT-COVERAGE.md`: annotated comments, decisions and phase mapping.
- `source-annotations.json`: PDF annotation extraction metadata (22 links, no text comments).
- `source-manifest.json`: source hashes, visual review coverage and evidence scope.
- `verify.mjs`, `verification/`: repeatable checks and sanitized design screenshots.
- `PREVIOUS-DESIGN.md`: preserved October visual-system notes; historical, not the current interaction specification.
