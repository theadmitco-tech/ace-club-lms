# Release 1.1 — Login Course Chooser Staging Acceptance — 1 September 2026

Status: Staging accepted; Production authorization pending
Owner: Product owner and Engineering
Last updated: 1 September 2026

## Objective

For a Student enrolled in more than one course, show the course chooser after every fresh authentication even when a saved course preference already exists. Preserve direct entry for single-course Students, Admin entry to `/admin`, and the in-session “Switch course” control.

## Scope and behavior

The accepted application change introduces `/post-login` as the authentication landing router:

- multi-course Student: `/post-login` redirects to `/courses` after each fresh login;
- single-course Student: `/post-login` redirects to `/dashboard`;
- Admin: `/post-login` redirects to `/admin`;
- the saved Student preference remains selected and is labelled “Continue with this course”;
- normal in-session navigation does not reopen the chooser;
- “Switch course” remains available from the Student experience.

No schema, migration, RLS, role, enrollment, content, or Production data change is required.

## Accepted source and environment

- GitHub branch: `codex/release-1-1-login-course-chooser`.
- Accepted application commit: `682b529`.
- Vercel project: `prj_2lW0zANcAnI81eURRZrJTMSCxuLr`.
- Accepted Preview: `dpl_4NGxkx1JcX3QMLuWQeXaNrSBoka6`.
- Preview URL: `https://ace-club-d4zdlf555-theadmitco-techs-projects.vercel.app`.
- Preview state: `READY`; target is Preview, not Production.
- Staging Supabase: `eyphkkginlgoaxflauog`.

The deployment guard confirmed that required Preview variables were present and environment URLs were correctly separated. Compilation, TypeScript, 54 page generations, `/post-login`, and deployment completed successfully.

## Local verification

Passed before deployment:

- `npm run test:student-course-selection` — 4/4;
- targeted ESLint for the changed authentication and routing files;
- `npx tsc --noEmit`;
- `npm run test:pilot-v2` — 53/53;
- `npx next build --webpack` — 54 pages, including `/post-login`;
- `git diff --check`.

The focused test covers OAuth callback routing, Preview password-login routing, multi-course repeat-login behavior, single-course direct entry, Admin entry, and continued in-session switching.

## Disposable Staging fixture

The environment-locked fixture workflow created only in Staging:

- one disposable Student;
- one active RC crash course;
- one inactive historical CR crash course;
- two enrollments;
- no initial course preference.

Credentials were stored only in the private temporary manifest and were not committed or printed.

## Browser acceptance

Passed on the accepted Preview:

1. First sign-in with no saved preference opened `/courses`.
2. Both the current and historical/inactive enrolled courses appeared.
3. Selecting the current course opened its dashboard.
4. The dashboard displayed “Switch course”.
5. The Student signed out and signed in again with the now-persisted preference.
6. The chooser appeared again instead of bypassing to the dashboard.
7. The saved course was marked “Continue with this course”.
8. The inactive historical course remained selectable.
9. Continuing with the saved historical course opened its dashboard.
10. “Switch course” returned to the chooser and displayed both courses.
11. No browser console errors were observed.

The browser automation allowed authentication state to settle before the final navigation assertion. A faster intermediate automation click raced a pending client-side authentication redirect; the settled repeat-login journey passed and no application or Vercel error was recorded.

The post-browser database verifier confirmed:

- `courseCount=2`;
- the historical course was selectable;
- the browser-selected preference was persisted and matched portal identity.

## Runtime and cleanup evidence

- Vercel Preview error-level logs for the acceptance window: none.
- The disposable Student signed out before cleanup.
- The Auth user, profile, enrollments, preference, and both courses were removed.
- Cleanup audit returned `profileResidue=0` and `courseResidue=0`.
- The private temporary manifest was removed.
- Active disposable fixtures: none.

## Production and rollback boundary

Production was not deployed, promoted, configured, queried for Student acceptance, or mutated during this release gate.

Current Production remains:

- deployment `dpl_53zX3axvpv7WrevwR1YoMt5ddfAC`;
- source `82b5a9109f372ae2357c46ad82cad997da42131f`;
- live domain `https://aceclub.theadmitco.com`.

If Release 1.1 is later authorized for Production, deploy the exact accepted application source and retain `dpl_53zX3axvpv7WrevwR1YoMt5ddfAC` as the immediate application rollback. No database rollback belongs to this application-only change.

## Next gate

Production promotion requires a new explicit Product Owner authorization. After promotion, smoke test a real multi-course Student through sign-in, chooser display, saved-course continuation, and “Switch course”; also verify one Admin entry. If any routing regression appears, restore the prior Production application deployment without changing the database.
