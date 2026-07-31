# Phase 4 — Manual Verification Checklist

Status: Signed off
Owner: QA and Engineering
Last updated: 31 July 2026

- [x] Phase 4 migration applies successfully to staging.
- [x] Two different Week 0 Fridays each generate exactly 31 ordered items.
- [x] Friday items start 8:00 PM IST; Saturday/Sunday items start 10:00 AM IST.
- [x] Orientation ends after one hour; other items end after two hours.
- [x] Week 0 pre-reads are immediately available.
- [x] Later pre-reads release exactly seven days before their item.
- [x] Worksheets release exactly at item end.
- [x] Locked Notion and worksheet direct URLs are denied.
- [x] New cohorts inherit all current master materials and worksheet counts.
- [x] Admin material sync adds only missing items and a second sync adds zero.
- [x] Production legacy master rows remain stored but hidden after coordinated rollout.
- [x] Production `/` and `/login` return HTTP 200.
- [x] Signed-out Production Admin and Student routes redirect to login.
- [x] Production Admin sees exactly 31 current master items and existing batches remain readable.
- [x] Production migration ledger records all applied migrations through Phase 4.
- [x] TypeScript passes locally.
- [x] Targeted touched-file lint passes locally.
- [x] Production build passes locally.
