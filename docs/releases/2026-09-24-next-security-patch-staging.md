# Next.js security patch — Staging/Preview acceptance

Status: Preview accepted; awaiting review and explicit merge approval
Date: 24 September 2026
Branch: `codex/next-security-patch`
Base: `codex/template-worksheet-tracker` at `096f5b3`
Application commit: `9437533c8ced217b02c9b9d5d0fa1846dd391457`
Pull request: [#21](https://github.com/theadmitco-tech/ace-club-lms/pull/21)
Production state: Unchanged

## Scope

Patch the framework dependencies on top of the accepted Release 1.2 lineage without changing application behavior or data:

- `next`: `16.2.4` to `16.3.6`;
- `eslint-config-next`: `16.2.4` to `16.3.6`;
- lockfile-only refreshes required by those packages.

Only `package.json` and `package-lock.json` changed in the application commit. There is no source-code, migration, Supabase, role, enrollment, course-material, or Student-data change.

## Accepted Preview

- Deployment: `dpl_5KmtqCLpqPMk6WnrwHk7u1YnQFez`
- URL: `https://ace-club-3d0r47j07-theadmitco-techs-projects.vercel.app`
- Target: Preview
- Status: Ready
- Build source: branch `codex/next-security-patch`, commit `9437533`
- Detected framework: Next.js `16.3.6`
- Environment validator: required Preview variables present and Preview/Production URLs correctly separated
- Build result: compile, TypeScript validation, and all 54 static pages passed
- Runtime error scan: no error-level logs found

## Verification

- Production dependency audit: zero vulnerabilities (`npm audit --omit=dev`).
- Template tracker suite: 5 passed.
- Pilot V2 suite: 53 passed.
- Pilot V3 suite: 38 passed.
- Documentation checks before this record: 119 Markdown files and 146 tracked artifacts passed.
- `git diff --check`: passed.
- Repository-wide lint retains the known baseline of 14 errors and 2 warnings in untouched registration and worksheet-curriculum files; this patch adds no lint finding and the Vercel TypeScript/build gate passed.

Preview route smoke checks returned HTTP 200:

- `/`, `/login`, `/register`, and `/payment/success` rendered directly;
- `/dashboard`, `/practice`, and `/admin` redirected an unauthenticated request to `/login` as designed.

This dependency-only patch did not require disposable database fixtures. The accepted Preview uses the existing Staging-backed environment boundary, and no Production acceptance was attempted.

## Rollback

Before merge, close pull request #21 and delete the patch branch if the candidate is rejected. After merge into the release branch, revert commit `9437533` and rebuild a Preview. No database rollback or data cleanup is required.

Production promotion is a separate operation requiring explicit Product Owner approval, a Production build from the approved source, smoke checks, runtime-log review, and a dated Production release record.
