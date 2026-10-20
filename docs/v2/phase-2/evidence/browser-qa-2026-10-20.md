# Phase 2 local browser QA — 20 October 2026

Branch: `intern/v2-phase-2-browser-qa`.
Base: `c8978a107dc209de4eff6e03b1a2773442b44d49` on `intern/v2-phase-2-review`.
Verified code and harness commit: `171efd26606b2ed2cb334a333843e4f098771b53`.
Delivery: local commits only; no push, PR mutation, hosted migration or deployment.

## Findings and fixes

| Finding | Fix | Verification |
|---|---|---|
| A private-meeting link could leave an unfinished publication review without warning when the batch form was clean. | Use the shared draft-navigation link so every mounted editor's guard participates. Retain the busy-save check. | Browser cancellation preserves the review; canceling the review restores normal navigation. The existing handler regression also checks another mounted guard. |
| A 120-character unbroken title expanded the batch page to 2,068 pixels at mobile widths. | Permit grid cards and controls to shrink; wrap long titles and links. | No horizontal page overflow at 320, 390 or 768 pixels, including long template options and publication titles. |
| The mobile menu used a symbol without a descriptive accessible name or expanded-state metadata. The closed sidebar was translated offscreen but remained keyboard-focusable. | Label the toggle, connect it to the sidebar, expose expanded state, hide the closed mobile sidebar from focus, and close on Escape with focus returned to the toggle. | Keyboard opening/closing, expanded-state assertions and traversal past the hidden sidebar pass. |

The sidebar change also applies to existing Admin pages. Desktop navigation,
clean-page sign-out and unconditional role redirects retain their existing
behavior. No entitlement, publication, auth, feature-flag or database rule changed.

## Browser method and isolation

The runner builds a disposable Next.js application under the system temporary
directory. Actual Admin pages, editors, navigation components, Server Action
wrappers, domain helpers and styles are copied from the candidate. Only the
authentication and data-access dependencies are replaced with synthetic adapters.
No fixture routes, synthetic identity or auth bypass enter `src/app`.

Both fixture services bind to `127.0.0.1`. The app subprocess receives only
`PATH`, `NODE_ENV=production` and `NEXT_TELEMETRY_DISABLED=1`. Project `.env`
files are not copied or loaded. The fixture stylesheet omits external font
imports; screenshots use fallback fonts. Browser page requests outside the
fixture origin are blocked. The final run recorded zero attempted external
page origins and zero browser runtime errors.

Server responses simulate saved records, stale errors, delayed writes and lost
confirmations. Assertions check the UI's request identity and state transitions.
They do **not** establish database concurrency, real login, RLS or hosted access
control. The separate disposable-PostgreSQL regression suites cover database
contracts locally; staging verification remains required.

Tools: Node 26.11.1, Next.js 16.2.4, existing Playwright Core 1.61.1 and Chromium
149.0.7827.55. No dependency installation or lockfile change was needed.
Desktop viewport: 1440 × 1000. Responsive viewports: 320, 390 and 768 × 844.

## Executed checks

| Check | Result |
|---|---|
| Isolated browser suite | 13 passed; zero failures |
| `npm run test:v2:phase1` | 102 passed across 11 suite files |
| `npm run test:v2:phase2` | 127 passed across 10 suite files |
| `npm run lint -- --max-warnings=0` | Passed |
| `./node_modules/.bin/tsc --noEmit --incremental false` | Passed |
| Clean-environment `npm run build` | Passed |
| Git whitespace and changed-content name/credential checks | Passed |
| Copied-source checksums compared with the candidate | Matched, with the documented font-import removal |

The 229 regression tests had no failures, skips or cancellations. The browser
suite separately exercises:

- Empty lists, disabled creation without templates and recoverable list errors.
- All four product forms, section choices, required-field validation, live and
  undated items, and keyboard submission.
- Template saving, busy controls, interrupted confirmation and unchanged retry IDs.
- Batch review invalidation after edits, save, publish, edit, republish, unpublish
  and republish again; exact displayed IST schedule and independent snapshots.
- Batch and publication stale-error responses and interrupted confirmations.
- Meeting-link validation, private draft review, interrupted recovery and reload.
- Cancellation of sidebar, sign-out, reload and editor-link navigation.
- Publication-review navigation protection, narrow layouts and mobile menu access.

During harness setup, a mock signature and test selectors needed correction.
The baseline run then exposed the navigation, layout and menu-accessibility
defects above. Final results were captured after the fixes and stable screenshot
waits. No failed baseline check is represented as a final pass.

## Evidence

- [Machine-readable results and copied-source checksums](browser-qa-2026-10-20/results.json).
- [Template editor — desktop](browser-qa-2026-10-20/templates-desktop.png).
- [Publication review — desktop](browser-qa-2026-10-20/publication-desktop.png).
- [Private meeting editor — desktop](browser-qa-2026-10-20/meeting-desktop.png).
- [Batch editor with long titles — 320 pixels](browser-qa-2026-10-20/batch-320.png).
- [Mobile navigation — 390 pixels](browser-qa-2026-10-20/mobile-navigation.png).

All depicted records and identities are synthetic. The JSON `baseCommit` records
the starting HEAD before the verified changes were committed; its source hashes
identify the tested copies. The code commit above contains those changes.

## Reproduction

Use an existing Playwright Core installation and compatible Chromium executable.
The runner does not download tools, install dependencies or connect to Supabase.
Set the two tool paths for the local machine:

```bash
env -i PATH="$PATH" \
  PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core/index.mjs \
  CHROMIUM_EXECUTABLE=/absolute/path/to/chrome \
  V2_BROWSER_OUTPUT=/tmp/ace-v2-browser-results \
  node scripts/browser/v2-phase2/verify.mjs
```

Loopback-listening and browser-process permissions are required. Results,
screenshots and the fixture-only server log are written to the output directory.
The runner stops its services and removes its disposable app after completion.
The suite is optional local tooling; it has not been added to hosted CI.

## Files changed

Application and regression changes:

- `src/app/admin/AdminShell.tsx`
- `src/app/admin/admin.css`
- `src/app/admin/v2/batches/BatchDraftEditor.tsx`
- `src/app/admin/v2/templates/templates.module.css`
- `scripts/admin-draft-navigation.test.mjs`
- `scripts/browser/v2-phase2/fixture-app.mjs`
- `scripts/browser/v2-phase2/fixtures.mjs`
- `scripts/browser/v2-phase2/verify.mjs`

Documentation changes:

- `docs/v2/phase-2/README.md`
- `docs/v2/phase-2/review-and-release.md`
- `docs/v2/phase-2/approved-delivery-report.md`
- This evidence file and its six linked JSON/image artifacts.

## Submitted review status and next action

Supplied GitHub screenshots show draft [PR #24](https://github.com/theadmitco-tech/ace-club-lms/pull/24)
targeting `intern/v2-onboarding`, with three commits ending at `c8978a1`.
They show passing push/PR lint and tests/build, a successful LMS deployment,
successful Preview Comments, and a failed `ace-club-flexible-mocks` deployment.
This is screenshot evidence of the submitted candidate, not a fresh hosted query
or verification of the local fixes. The older branch-publication record predates
PR creation and remains unchanged.

Keep the submitted PRs in draft. Review these local fixes before adding them to
the submitted Phase 2 branch; then rerun hosted checks and verify the resulting
exact Preview. The separately linked deployment failure still needs investigation.

Remaining limits: real staging auth/DAL behavior, real-browser OAuth, actual
database setup, Safari/Firefox, touch hardware, downloaded brand fonts, full
screen-reader auditing and Student delivery remain unverified. Browser
Back/Forward is still outside the custom draft guard. Mobile process termination
can bypass unload warnings. These checks do not guarantee lossless editing.

Next product decision: all eligible published batches versus one assigned batch.
Next operational step: approved staging inspection/setup, Phase 1 verification,
then Phase 2 verification through the [coordinated handoff](../review-and-release.md).
No new product decision is required for these narrowly scoped UI fixes.
