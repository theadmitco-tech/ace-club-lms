# ADR-0003 — Weekly Course Schedule

Status: Approved  
Date: 4 August 2026  
Owner: Product owner

## Decision

- Retire Orientation from the active curriculum without deleting its historical master record.
- Preserve every approved VA, QA, and DI class title and its linked master content.
- Schedule VA on Friday, QA and mocks on Saturday, and DI on Sunday.
- Week 3 has VA 3 on Friday and QA 3 on Saturday, with no Sunday class.
- Keep all other Week 0, break, mock, and support events in their approved slots.
- Continue releasing configured pre-reads exactly seven days before class.
- Recommend the next class pre-read one day before: Thursday VA, Friday QA, and Saturday DI.

## Data and rollout

Migration `20260804120000_realign_weekly_course_schedule.sql` preserves master IDs and linked content, updates existing cohort dates and release timestamps, hides existing Orientation sessions, and changes future cohort generation from 31 to 30 active items.

The migration is transactional and aborts if the expected active curriculum cannot be mapped exactly.
