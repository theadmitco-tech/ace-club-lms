# ADR-0002 — Cohort schedule and material synchronization

Status: Active
Owner: Product owner and Engineering
Last updated: 31 July 2026

## Decision

- A cohort start date means the Friday of Week 0.
- Friday timeline items start at 8:00 PM IST. Saturday and Sunday items start at 10:00 AM IST.
- Items last two hours by default; Orientation lasts one hour.
- Week 0 pre-reads release when the cohort schedule is created. Later pre-reads release exactly seven days before their item. Worksheets release at the item end time.
- New cohorts copy the current master materials automatically.
- Existing Phase 4 cohorts receive materials added later only when an Admin runs **Sync materials**. Sync adds missing master-linked materials and does not overwrite cohort rows.
- The linked Production legacy template is archived, not deleted, and is excluded from current master-course and new-cohort workflows.

## Consequences

Schedule and release timestamps are generated in one database transaction using `Asia/Kolkata`. Cohort sessions retain stable links to master sessions, and copied materials retain stable links to master materials. Legacy cohorts remain readable but cannot use the new material-sync action.

