# Release 1 — Course-Selection Production Rollout — 1 September 2026

Status: Production rollout complete
Owner: Product owner and Engineering
Last updated: 1 September 2026

## Objective

Restore the accepted multi-course chooser and switch navigation in Production while preserving the deployed Notion fix, worksheet-question-count behavior, existing Student content, and current authorization boundaries.

## Authorization and scope

The Product Owner explicitly authorized Production promotion after reviewing the completed Release 1 Staging gate.

This was an application-only release. It did not:

- apply, repair, or mark a migration;
- change Production Supabase configuration;
- create a Production fixture;
- grant Admin or Super Admin access;
- implement the planned role split;
- alter course material or enrollments.

## Released source

- Branch: `codex/release-1-course-selection-staging`.
- Deployed Git commit: `82b5a9109f372ae2357c46ad82cad997da42131f`.
- Application behavior is unchanged from Staging-accepted source `341281b`; the later diff contains only Release 1 evidence and Current State documentation.
- Release tag: `release-1-course-selection-production-2026-09-01` points to the deployed commit.

## Deployment

- Vercel project: `prj_2lW0zANcAnI81eURRZrJTMSCxuLr`.
- Deployment: `dpl_53zX3axvpv7WrevwR1YoMt5ddfAC`.
- Deployment URL: `https://ace-club-5mrof5tsz-theadmitco-techs-projects.vercel.app`.
- Live alias: `https://aceclub.theadmitco.com`.
- Target: Production.
- Final state: `READY`.

The deployment used only project Production variables. No Preview QA override was supplied. The build guard confirmed required Production variables and correct environment separation. Compilation, TypeScript, all 53 page generations, `/courses`, and output deployment passed.

## Rollback

Immediate application rollback:

- deployment `dpl_2xvAbGiqwTfXrn83LM3kQwYF6eEG`;
- previously live source `b5ad0e2`;
- includes the final Notion embedding fix;
- verified `READY` immediately before promotion.

If rollback is required, restore that application deployment. Do not roll back the course-selection database objects: they predated this release, are backward-compatible with the previous application, and were not changed here.

Do not prefer older `dpl_9zmW6EnnAgUZ1otbvB4a2WSKUB3a`, which predates the final Notion fix.

## Production smoke checks

### Signed-out boundary

- Direct `/courses` access redirected to `/login`.
- Production login did not expose the Preview-only local password form.

The signed-out browser contained an expired Supabase refresh cookie, producing one `refresh_token_not_found` error-level log. The application recovered correctly by displaying `/login`. This was not reproduced after authentication and did not require rollback.

### Existing Admin non-regression

- Existing `Test Admin` session loaded Mock reporting.
- Batch, Student, tester, completion, and attempt rows rendered.
- No browser console errors or warnings were observed.

### Real multi-course Student

Authenticated through Google as `ishan.shreyash@gmail.com`:

1. Existing saved selection opened `Reading Comprehension - CC` directly.
2. Student header displayed “Switch course”.
3. `/courses` listed:
   - `Reading Comprehension - CC` — Crash course, Current batch;
   - `Aug 7th Batch` — Full course, Historical batch.
4. Historical `Aug 7th Batch` was selectable despite being inactive.
5. Its dashboard loaded live schedule content, recommended worksheets, Update log links, pre-reads, and Session materials.
6. The Student switched back to `Reading Comprehension - CC`.
7. Reload preserved RC as the selected course.
8. The account finished on the same RC selection it had before smoke testing.
9. No browser console errors or warnings were observed.

## Runtime audit

- Deployment remained `READY` and owned all Production aliases after smoke testing.
- Fatal logs for the deployment: none.
- Error logs: only the deliberate signed-out stale-refresh-cookie request described above.
- No rollback condition was met.

## Data impact

No enrollment, course, role, content, tracker, mock, or access record was created or deleted.

The existing test Student preference was temporarily switched from RC to the historical course through the normal Student UI, then restored to RC and verified after reload. Final functional state matches the pre-smoke state.

## Next gate

Monitor normal use. Start Release 2 with a written Admin/Super Admin capability matrix, schema/RLS design, migration rollback strategy, and exact account confirmation. Planning does not authorize role grants or Production database changes.
