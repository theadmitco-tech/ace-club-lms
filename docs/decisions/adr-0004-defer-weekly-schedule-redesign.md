# ADR-0004 — Defer Weekly Schedule Redesign

Status: Approved
Date: 13 August 2026
Owner: Product owner
Supersedes: Production rollout portion of [ADR-0003](adr-0003-weekly-course-schedule.md)

## Decision

Do not apply, mark as applied, or otherwise include `20260804120000_realign_weekly_course_schedule.sql` in Pilot V1 or another general Production migration run.

The weekly schedule, Orientation treatment, class-day alignment and any related changes to existing cohort dates or release timestamps will be designed and delivered differently under a separate future scope. That later work requires its own approved requirements, migration/data plan, staging evidence and Production authorization.

Pilot V1 must not change Production curriculum structure, course dates, session dates, release timestamps or existing running-batch schedules. Its recommendation behavior reads the sessions and release boundaries that already exist in Production.

## Release consequence

Pilot V1 must not use a command that applies every pending repository migration. Release operators use a temporary detached checkout in which the excluded weekly file is outside the migrations folder, require a dry run that lists only the two approved Pilot V1 files, and then use the tracked migration push so only those two versions are applied and recorded.

ADR-0003 remains historical evidence of the earlier decision. This ADR supersedes its pending Production rollout direction without defining the replacement weekly schedule.
