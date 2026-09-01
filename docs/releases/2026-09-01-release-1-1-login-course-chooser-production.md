# Release 1.1 — Login Course Chooser Production Rollout — 1 September 2026

Status: Production rollout complete
Owner: Product owner and Engineering
Last updated: 1 September 2026

## Objective

Promote the Staging-accepted login-time chooser so every multi-course Student chooses a course after fresh authentication, while preserving single-course direct entry, Admin routing, saved preferences, historical enrollment access, and the in-session “Switch course” control.

## Authorization and scope

The Product Owner explicitly authorized the application-only Production promotion after reviewing the completed Release 1.1 Staging gate.

This release did not:

- apply, repair, or mark a migration;
- change Production Supabase or Vercel configuration;
- create a Production fixture;
- change roles, grants, enrollments, content, tracker data, or mock data;
- implement the planned Admin/Super Admin separation.

## Released source

- Branch: `codex/release-1-1-login-course-chooser`.
- Deployed Git commit: `9117d40286b12c51c450125e55644400a79ab132`.
- Staging-accepted application commit: `682b529`.
- The later commit adds only Release 1.1 evidence and Current State documentation; application behavior is unchanged from the accepted source.
- Release tag: `release-1-1-login-course-chooser-production-2026-09-01` points to the deployed commit.

## Deployment

- Vercel project: `prj_2lW0zANcAnI81eURRZrJTMSCxuLr`.
- Deployment: `dpl_5YJZJx6zM5bxNJfZgr5Us8fMHvo7`.
- Deployment URL: `https://ace-club-3pgibajbt-theadmitco-techs-projects.vercel.app`.
- Live alias: `https://aceclub.theadmitco.com`.
- Target: Production.
- Final state: `READY`.

The deployment used only project Production variables. The build guard confirmed required Production variables and environment separation. Compilation, TypeScript, 54 page generations, `/post-login`, and deployment passed.

## Rollback

Immediate application rollback:

- deployment `dpl_53zX3axvpv7WrevwR1YoMt5ddfAC`;
- source `82b5a9109f372ae2357c46ad82cad997da42131f`;
- previous Release 1 application with the Notion fix, worksheet counts, chooser, and “Switch course”;
- verified `READY` immediately before promotion.

If rollback is required, restore that deployment. Do not change or roll back the database because Release 1.1 made no database release.

## Production smoke checks

### Signed-out boundary

- Direct `/post-login` access redirected to `/login`.
- Production login exposed Google authentication only; the Preview-only local QA form was absent.

### Real multi-course Student

Authenticated through Google as `ishan.shreyash@gmail.com`:

1. Fresh authentication landed on `/courses`, not directly on the saved dashboard.
2. `Reading Comprehension - CC` appeared as the current crash course.
3. `Aug 7th Batch` appeared as a historical full course.
4. The saved RC preference was marked “Continue with this course”.
5. Continuing opened the RC dashboard.
6. “Switch course” was visible.
7. The account remained on its original RC preference; no course switch was performed.

### Existing Admin non-regression

Authenticated through Google using the Product Owner-corrected Admin identity `theaceclub.tac@gmail.com`:

- `/admin` opened directly;
- the Admin dashboard, navigation, session summary, Student summary, batch summary, and enrollment summary rendered;
- no Student chooser intercepted Admin entry.

Both smoke sessions signed out. No browser console errors were observed.

An initial Student OAuth state expired while the browser waited for the required action-time account-selection approval. A fresh OAuth flow completed normally. This was not an application or deployment failure.

## Runtime audit

- The live alias resolves to `dpl_5YJZJx6zM5bxNJfZgr5Us8fMHvo7`.
- Deployment status remained `READY` after smoke testing.
- Production deployment error-level logs for the acceptance window: none.
- No rollback condition was met.

## Data impact

No role, access grant, enrollment, course, content, tracker, worksheet, or mock record was created, deleted, or changed.

The Student continued with the already-selected RC course. The normal “Continue with this course” action rewrote the same RC preference and may therefore have refreshed only that preference row's `updated_at`; `selected_course_id` remained RC before and after smoke testing. Authentication sessions were created only for smoke testing and both were signed out.

## Next gate

Monitor normal use. Begin Release 2 with a written Admin/Super Admin capability matrix, schema and RLS design, migration rollback strategy, and exact account confirmation. Planning does not authorize role grants or Production database changes.
