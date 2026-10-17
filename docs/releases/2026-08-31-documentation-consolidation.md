# Release — Documentation Consolidation — 31 August 2026

Status: GitHub branch published; Product Owner review pending
Owner: Product owner and Engineering
Last updated: 31 August 2026

## Objective

Replace the expanding prerequisite-reading chain with one Project Manual and one Current State document, while preserving signed product authority, decisions, phase history, and evidence.

## Included scope

- Project Manual.
- Current State populated from verified Git, Vercel, Supabase, database, source, and browser findings.
- Engineering Handbook and mandatory future-handoff standard.
- Documentation consolidation project plan.
- Inventory/disposition map for documentation and instruction artifacts.
- Simplified documentation and instruction routers.
- Archived-continuation banners for the primary running handoffs and Pilot V2 bootstrap.
- Consolidation of reusable coding/document conventions into the handbook.
- Documentation validation script and package command.
- Changelog entry.

## Explicit exclusions

- application code or behavior;
- Supabase migrations or data mutations;
- Vercel deployments or configuration;
- role/access grants;
- Staging or Production fixtures;
- deletion or physical relocation of signed evidence;
- course-selection or Admin/Super Admin implementation.

## Risk classification

Low runtime risk; medium documentation-navigation risk.

The work does not affect deployed systems. The primary risk is breaking repository links or accidentally presenting historical instructions as current.

## Source

- Branch: `codex/engineering-handbook`
- Initial handbook commit: `0ea118f`
- Consolidation-plan commit: `aa1523e`
- Consolidation implementation commit: `704c411`
- GitHub branch: `codex/engineering-handbook`
- Authoritative GitHub publication: complete
- Merge to `main`: intentionally not performed because `main` is not the current Production lineage

The working repository's configured `origin` points to another local repository, so publication used the authoritative GitHub URL explicitly. The published branch is backed up and reviewable without changing `main` or Vercel.

## Database and environment impact

None.

Read-only verification identified the exact Production and Staging migration boundaries and recorded their differences in Current State. No migration, ledger repair, SQL mutation, fixture, or environment change was executed.

## Verification

### Live facts

- Vercel Production deployment and source commit verified through the connected Vercel project.
- Production and Staging migration ledgers read through Supabase.
- GitHub `main` and Production branch commits verified from repository refs.
- Course-selection regression and `/courses` 404 were already verified through Production database/source/browser evidence and recorded in Current State.

### Documentation checks

- `npm run test:docs`
- `git diff --check`
- inventory coverage for all tracked documentation/instruction artifacts in scope
- required headers for living documents
- required Current State sections
- archived status and Current State links for competing continuation documents
- relative-link validation

## User-visible documentation result

Normal continuation now begins with:

1. [Project Manual](../PROJECT_MANUAL.md)
2. [Current State](../CURRENT_STATE.md)

Historical handoffs remain available but explicitly direct current work to those documents.

## Rollback

Rollback is a Git revert of the focused documentation consolidation commits.

Because no runtime or remote system changed, there is no application, database, access, or environment rollback.

## Remaining work

- Product Owner review of the Project Manual, Current State, and Draft Engineering Handbook.
- Product Owner review and any focused documentation corrections.
- Reconcile the documentation branch with the authoritative Production source lineage before merge.
- Enable branch protection/CI only during approved Release 0 source-governance work.
- Use the new Current State handoff for the course-selection and role releases.
