# Release 1 — Course-Selection Staging Acceptance — 1 September 2026

Status: Staging accepted; Production authorization pending
Owner: Product owner and Engineering
Last updated: 1 September 2026

## Objective

Verify the reconciled multi-course selection experience against the approved Staging Supabase project on an immutable Vercel Preview, including active and historical enrollments, without changing Production.

## Accepted source and environment

- GitHub branch: `codex/release-1-course-selection-staging`.
- Accepted source before this evidence commit: `341281b`.
- Vercel project: `prj_2lW0zANcAnI81eURRZrJTMSCxuLr`.
- Accepted Preview: `dpl_7cPfrAu9eyJuaD2vAEaKK2tFzdph`.
- Preview URL: `https://ace-club-9269yusaf-theadmitco-techs-projects.vercel.app`.
- Preview state: `READY`; target is Preview, not Production.
- Staging Supabase: `eyphkkginlgoaxflauog`.

The Vercel build guard printed that required Preview variables were present and environment URLs were correctly separated. The build included `/courses` and completed compilation, TypeScript, page generation, and deployment.

## Preflight database checks

Staging migration ledger contained all required versions:

- `20260830112501_add_template_worksheet_question_count`;
- `20260830133000_add_student_course_selection`;
- `20260830133001_fix_template_worksheet_question_count_trigger_order`.

Read-only schema checks confirmed:

- `student_course_preferences` exists;
- `get_student_course_options()` exists;
- `select_student_course(uuid)` exists;
- `resolve_student_course_id(uuid)` exists.

No migration or ledger correction was required or executed.

## Disposable fixture

The environment-locked fixture workflow created only in Staging:

- one active Student with a random invalid-domain email;
- one active RC crash course;
- one inactive historical CR crash course;
- two enrollments;
- no initial course preference.

The setup probe confirmed two course options, a null initial selection, and an inactive historical option. Credentials were stored only in a mode-`0600` file under `/private/tmp` and were never committed or printed.

## Browser acceptance

Passed on the accepted Preview:

1. Local QA sign-in redirected the fresh multi-course Student to `/courses`.
2. The chooser displayed “Which course would you like to open?”.
3. Both courses appeared and were labelled “Current batch” and “Historical batch”.
4. The inactive historical course could be selected and opened.
5. The historical-course dashboard identified the selected course.
6. Schedule, Resources, Mocks, and Practice log loaded their valid empty states for that historical course.
7. “Switch course” was visible on every checked Student surface.
8. Returning to `/courses` continued to show both active and historical options.
9. Selecting the active course updated the dashboard.
10. Reloading `/dashboard` preserved the active selection.
11. No browser console errors or warnings were observed during the accepted journey.

The post-browser database probe confirmed two enrolled options, the historical option remained selectable, and the persisted preference matched the browser-selected course.

## Runtime and cleanup evidence

- Vercel Preview error/fatal logs for the acceptance window: none.
- QA Student signed out before cleanup.
- The disposable Auth user, profile, enrollments, preference, and both courses were removed.
- The local credential manifest was removed.
- Independent post-cleanup SQL audit: `auth_users=0`, `profiles=0`, `courses=0`, `enrollments=0`, `preferences=0` for the Release 1 fixture namespace.

## Blocked first deployment attempt

Deployment `dpl_CkGk6PTFZzn2AUjJTzHyKqV5p8ME` was blocked before build because the local machine's auto-generated Git committer email was not associated with the Vercel team. It had no runtime and created no fixture.

A non-code commit using the repository's recognized AdmitCo Git identity resolved the source-identity gate. The accepted Preview was then deployed normally. This event is preserved so it is not mistaken for an application failure.

## Rollback boundary

No Production rollback is needed because Production did not change.

For a later Production promotion:

- deploy the exact accepted application source;
- retain current Production deployment `dpl_2xvAbGiqwTfXrn83LM3kQwYF6eEG` as the immediate application rollback;
- do not roll back or reapply the already-live course-selection database objects;
- if smoke testing fails, restore the previous application deployment and investigate on Staging;
- do not use the older `dpl_9zmW6EnnAgUZ1otbvB4a2WSKUB3a` rollback candidate because it predates the final Notion fix.

## Production boundary

This acceptance did not:

- deploy or promote to Production;
- change a Production domain or environment variable;
- apply, repair, or mark any migration;
- read or mutate Production Student data during the acceptance run;
- grant Admin or Super Admin access;
- implement the Admin/Super Admin role split.

Production promotion requires a new explicit Product Owner authorization.
