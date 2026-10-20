# Admin draft navigation verification — 20 October 2026

Branch: `intern/v2-phase-2-drafts`.
Starting commit: `cf1adab`.
Candidate: the local commit containing this evidence and the navigation fix.

## Defect and change

Source inspection found that V2 editors warned on page unload and selected
editor actions, but the Admin sidebar, sign-out and links between template/batch
pages could discard edits without warning.

[`AdminDraftNavigation.tsx`](../../../../src/components/AdminDraftNavigation.tsx)
tracks active dirty/pending editors within the Admin shell. Shared navigation
asks for confirmation; cancellation leaves the action unexecuted. Saving or
unmounting removes the editor's registration and unload listener. Registration
is per editor so one cleanup cannot clear another mounted editor's warning.

The three V2 editors register their unsaved/pending state. Existing automatic
authentication/role redirects remain unconditional. Existing clean Admin routes
have no registered draft and continue without a confirmation. Meeting links now
use the supported Next.js `onNavigate` handler instead of intercepting clicks.

No migration, authorization policy, feature flag or publication rule changed.

## Executed checks

| Command | Observed result |
|---|---|
| `env -u NODE_TEST_CONTEXT node scripts/admin-draft-navigation.test.mjs` | Eight focused tests passed |
| `npm run test:v2:all` | 205 tests passed across 19 files; zero failures, skips or cancellations |
| `npm run lint -- --max-warnings=0` | Passed |
| `./node_modules/.bin/tsc --noEmit --incremental false` | Passed |
| `NEXT_TELEMETRY_DISABLED=1 npm run build` | Passed; 42 generated entries |

The new suite executes the actual component handlers with deterministic hook,
effect, navigation and window adapters. It covers cancellation and confirmation,
clean-state behavior, independent editor cleanup, sidebar/sign-out, unconditional
role redirects, template failure/retry/success and all three editors registering
field changes. The initial harness run failed because its CSS-module adapter
lacked a default export; the corrected harness and full suite passed.

The existing database suites use disposable PostgreSQL clusters with private
Unix sockets, TCP disabled and synthetic fixtures. No hosted application or
database was accessed. Local Node was 26.11.1; Node 24 CI remains pending after
an authorized push. Build environment validation was skipped outside Vercel.

## Limits

These tests do not run a browser, React scheduling or the Next.js client router.
New-tab behavior relies on the documented `onNavigate` contract and still needs
browser verification. Refresh/close prompts depend on browser support; mobile
tab termination may not deliver `beforeunload`.

Browser Back/Forward and unrelated programmatic redirects are not intercepted.
This fix is not autosave or a guarantee against all unsaved-data loss. The
[manual browser checks](../preparation-checklist.md#draft-navigation-browser-checks)
remain pending, including the unchanged legacy Admin journey.

The consolidated staging and product-decision blockers remain unchanged.
This is local work only; no push, remote PR update, shared migration, deployment
or Production change was performed.
