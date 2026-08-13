# Pilot V1 Phase 7 — Manual Verification Checklist

Status: Active
Owner: Product Owner, Engineering and QA/Security
Last updated: 13 August 2026

## Purpose

Use this checklist against one immutable staging-backed Vercel Preview after Phase 6 and its approved logo amendment pass. Record every result as pass, accepted exception or finding. This checklist does not authorize Production changes.

## Preconditions

- [ ] Branch, commit and immutable Preview URL are recorded.
- [ ] Preview is Ready and its build passed the staging environment guard.
- [ ] Both Pilot V1 migrations are ledgered on staging only.
- [ ] Approved staging Admin and enrolled staging Student sessions are available.
- [ ] No real Production Student data or authentication artifact will enter evidence.

## A. Brand identity amendment

- [ ] Public navigation shows the transparent green `6.svg` artwork without a visible square canvas; its home link has a clear accessible name and visible keyboard focus.
- [ ] Login composes the transparent green artwork, platform subtitle and sign-in card as one balanced treatment without duplicate visible `Ace Club` wording; the page retains a semantic level-one heading.
- [ ] Student header shows a legible transparent green wordmark, links to the Student home, and leaves Course, Practice log, account and sign-out controls usable.
- [ ] Admin sidebar shows the transparent green wordmark without crowding the Admin badge, navigation, account or sign-out controls.
- [ ] All four surfaces preserve the logo aspect ratio with no visible canvas, clipping, stretching, horizontal overflow or unreadable contrast at supported desktop widths and 200% text zoom.

## B. Admin Session resources and batch isolation

- [ ] Admin selects a batch and session and manages a recording plus multiple titled Session-material PDFs from one coherent surface.
- [ ] Create, rename, replace, remove-confirmation, validation, failure and retry states are clear and recoverable.
- [ ] Another batch remains unchanged after recording and Session-material create, edit, replace, remove, generation and Sync materials actions.
- [ ] Invalid type, oversized PDF, blank title, invalid session and failed upload do not damage an existing material.

## C. Student titled resources and recommendations

- [ ] No standalone `This week` section remains; the automatically opened current-week Timeline retains the complete schedule and session-resource journey.
- [ ] Tomorrow's academic pre-read appears only under Recommended reading one calendar day before class in `Asia/Kolkata`, without changing its release or access.
- [ ] Two worksheets from one VA class both appear once and open their own canonical PDFs and logs.
- [ ] Released Session materials appear independently under Recommended reading and on every intended Student surface.
- [ ] Locked resources show accurate availability without an active or exposed private URL.

## D. Worksheet workspace and tracker

- [ ] PDF and tracker scroll independently in the supported desktop side-by-side layout.
- [ ] Narrow and 200% text-zoom layouts stack without page-level horizontal overflow or scroll trapping.
- [ ] Tracker selection, selected-only bulk updates, optional time/comment, autosave, retry and refresh persistence remain correct.
- [ ] Timeline, Browse by section, Practice log and recommendations reach the same Student-owned worksheet records.

## E. Release and recommendation boundaries

- [ ] Pre-read unlock remains seven days before class and one-day-before recommendation does not grant access.
- [ ] Thursday recommends Friday VA, Friday recommends Saturday QA and Saturday recommends Sunday DI in `Asia/Kolkata`.
- [ ] Latest released worksheet and Session-reading sets include every sibling once, remain through missing/locked replacements and change only after a later same-section set releases.
- [ ] Worksheets, recordings and Session materials release only after the selected batch session ends.

## F. Authorization, privacy and regression

- [ ] Admin-only writes deny Student, signed-out and inactive callers.
- [ ] Signed-out, inactive, unenrolled, cross-batch, unpublished and pre-release reads are denied without leaking storage URLs.
- [ ] Released private PDFs open only for an active enrolled Student through protected delivery with no-store behavior.
- [ ] Student tracker ownership and read-only Admin progress remain consistent and operational.
- [ ] Role routing, Google-only controlled access, Master material sync and batch-specific recording behavior remain intact.
- [ ] Course loading uses the Ace Club wordmark and the browser tab uses the Ace Club spade icon instead of the legacy `A`.

## G. Findings and decision

- [ ] Every finding has severity, owner, disposition and retest result.
- [ ] No critical or high defect, privacy exposure, cross-batch propagation or unreleased-file exposure remains open.
- [ ] Product Owner records one explicit decision: accept for Production planning, defer, reject or request changes.
- [ ] Production remains untouched unless a later separately reviewed instruction authorizes promotion.
