# Draft reading preview

Admins can open pre-session and post-session readings from the course-session
editor and the batch publication review. The preview shows the current draft
title, session, before/after placement and item position. It uses the same
`NotionReader` and `react-notion-x` rendering as the existing Student reading view.

Changing a reading source clears the previous content immediately. Missing,
empty or failed readings show an error and a retry option. Unsupported sources
are explicitly marked as not previewed. Opening an external link is not counted
as a successful embedded preview.

The supported input is a public HTTPS Notion page URL with one page ID. Arbitrary
websites, iframe markup and `/ebd/` embed links are not accepted by this preview.
The existing Student embed behavior remains available through its existing view.
No Notion credentials are accepted; private pages need a separately reviewed
content-access mechanism.

## Access and data behavior

- The preview endpoint requires an active Admin and an enabled V2 authoring
  feature. Existing feature gates disable it in Vercel Production.
- Every response is private and non-cacheable. The server accepts only a page ID
  and uses the fixed Notion provider, with no caller-supplied host or identity.
- Previewing makes no publication, feedback, progress or content writes.
  Saving or publishing remains a separate explicit action.
- Student requests retain the existing `/api/notion` material-access checks.
  The Admin endpoint does not grant Student access to draft readings.

## Scope and remaining work

This is an Admin reading-body preview, not a full “View as student” mode. It does
not yet demonstrate protected V2 content delivery, the final Student list/card
layout, video rendering, subject feedback locks or universal publication scope.
The draft pins the reading reference; the externally hosted Notion page itself
is fetched at preview time and is not frozen into a versioned content snapshot.

Representative real readings and authenticated hosted behavior remain unverified.
The local [verification record](evidence/reading-preview-2026-10-25.md) uses
synthetic content and a disposable browser application. No shared migration or
existing content import is part of this change. PR #24 remains Draft.
