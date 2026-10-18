# Ace Club LMS V2 — Planning Review

Status: Draft
Owner: Product owner and Engineering
Last updated: 1 October 2026

This folder contains planning material for the next major product version after the MVP. It is separate from `docs/pilot-v2/`, which describes the unrelated Version 1.2 initiative.

## Review entry point

Start with [Product and Business Decisions](review/product-and-business-decisions.md). It is intentionally formatted for inline comments and decision-by-decision sign-off.

The implementation contract is [Acceptance Criteria](review/acceptance-criteria.md). It converts the reviewed product direction into testable outcomes for the intern and engineering review.

The delivery sequence is [Product Roadmap](review/product-roadmap.md). It divides the work into reviewable phases with explicit exit gates.

## Current engineering work

[Phase 1 — Product catalogue and access](phase-1/README.md) records the local
implementation scope, the requested Phase 0 sequencing exception, compatibility
boundaries, and outstanding verification. It does not authorize migration
application or release.

## Confirmed direction so far

- V2 is online-first with two product types: Full Batch and Crash Course.
- Full Batch includes Quant, Verbal, and DI together.
- Crash Courses are available for Quant, Verbal, and DI individually.
- Access lasts six months.
- Recordings are mandatory; students may attend live Google Meet classes, watch recordings, or mix both.
- Crash Courses are approximately one week; Full Batch is approximately eight weeks.
- Crash Course live batches and schedules are published by Admins when available; students can use recordings when no live batch is available.
- The LMS publishes the live schedule; it does not manage live attendance.
- One shared recording set serves all eligible students.
- Admins can publish reading material at the top of a topic course, before a video, or after a video.
- Admins can publish or update that material whenever needed, with an Admin preview before publishing.
- Website registration and payment should require minimal Admin intervention.
- Existing MVP Admin and Student login separation remains.

## Reference

The pre-read direction is informed by the separate Maths Simplified project, especially its Notion-to-frontend contract: Notion is an authoring source, while the student experience is a controlled, structured frontend.
