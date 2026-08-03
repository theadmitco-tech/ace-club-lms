# Ace Club LMS — Supabase Migrations

Status: Active
Owner: Engineering
Last updated: 3 August 2026

## Current baseline

`migrations/20260731051000_production_baseline.sql` reconstructs the inventoried production schema without copying production row data.

It was generated from the immutable Phase 1 production inventory and schema-definition evidence. It includes 19 public tables, 77 constraints, 40 indexes, 15 functions, 43 policies, and 5 triggers.

Ordered migrations after the baseline preserve the signed Phase 1–5 database state. The Phase 6 tracker migration is `20260803120000_add_student_practice_log.sql`; it is implemented locally and must be applied and verified in staging before any Production rollout.

## Safety

- Apply migrations to staging first.
- Do not apply this baseline to production.
- Do not run the overlapping root `schema.sql` or `supabase_*.sql` files.
- Do not add production credentials or database URLs to the repository.
- Record staging validation under `docs/phase-1/evidence/`.
