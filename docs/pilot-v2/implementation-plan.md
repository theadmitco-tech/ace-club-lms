# Pilot V2 — Implementation Plan

Status: Phase 4 and Phase 5 accepted; Phase 6 not started
Owner: Engineering, QA/Security and Product owner
Last updated: 17 August 2026

## Delivery rule

The Product Owner approved this plan set and the exact [template/interface specification](template-interface-specification.md) on 17 August 2026. Work on `codex/pilot-v2` locally. Phase 1 may create code and one additive migration file, but no migration may be applied to staging or Production without a separate instruction. Each phase must finish its focused automated checks and staging evidence before the next phase changes shared behavior.

## Phase 1 — Template foundation

1. Add the approved versioned template, Section, event and reusable-resource schema through one additive migration.
2. Seed exactly Full Course, CR Crash Course, RC Crash Course and DI Crash Course using stable keys and approved rows.
3. Add a server-only template data-access layer with Admin authorization and input validation.
4. Build the template list, structured editor and read-only consequence preview as narrow Client Components over Server Components/authorized mutations.
5. Prove editing a template creates a new revision and leaves every existing batch snapshot unchanged.

Exit: four approved templates render exactly, valid edits save, invalid edits fail actionably and an existing batch is unchanged.

## Phase 2 — Batch creation and schedule editing

1. Add the approved compatibility columns and atomic/idempotent batch-generation function.
2. Build a no-write proposal preview from one immutable template revision, start date and publication choice in `Asia/Kolkata`.
3. Confirm through one authorized transaction keyed by an idempotency token and expected template revision.
4. Add server-owned schedule eligibility and revision checks.
5. Implement individual edit, extra class, arbitrary eligible reorder/Section move, cancellation and shift-subsequent actions.
6. Return before/after event and unreleased-material consequences before confirmation.

Exit: Full Course and crash-course creation, retry, extra class, two-day shift, reorder and running-batch protections pass without cross-batch/template changes.

## Phase 3 — Flexible resources

1. Add approved batch, Section, event and standalone resource scopes while retaining current session-linked compatibility.
2. Support the controlled categories and approved Notion/PDF/YouTube/text formats.
3. Preserve protected PDF upload/delivery and no-store behavior.
4. Generate/sync only reusable starter packs, pre-reads and worksheets.
5. Continue prohibiting template/Master recordings and Session materials.
6. Preserve the deployed section-wise Recommended Reading implementation and unchanged Recommended Practice.

Exit: standalone starter packs, scoped resources, protected PDFs and YouTube journeys pass; two batches prove recording/Session-material isolation.

## Phase 4 — Student Home, Schedule and Resources

1. Introduce the three approved primary destinations using Server Components and server-authorized projections.
2. Build compact Home with next event and the two recommendation areas; mocks remain first-class in Schedule without a separate Home callout.
3. Add Full Course Week and crash-course Day Schedule views; keep Section browsing in Resources.
4. Add resource browsing in Sections, a selected-Section-relevant Topic dropdown and contextual Category choices; keep Starter Packs/standalone resources discoverable without either association.
5. Show released Starter Packs in Recommended Reading before the batch start date, then keep them available through Resources.
5. Present mocks as first-class events with reporting and venue details.

Exit: Full Course Week, crash-course Day, Section-filtered resource and mock journeys pass with no empty structural placeholders.

## Phase 5 — Integrated safety

1. Run role, active-account, enrollment, publication, release, cross-student and cross-batch denial suites.
2. Verify private file access, cache/no-store behavior and signed URL lifetime.
3. Verify tracker ownership and read-only Admin progress after schedule/resource changes.
4. Compare existing-batch aggregates and stable relationships before/after staging work.
5. Complete keyboard, 200% zoom, supported desktop, loading, empty, validation, failure and retry checks.
6. Run focused tests, targeted lint, TypeScript, guarded Production build, `git diff --check`, documentation links and changed-file secret/privacy review.

Exit: no critical/high security finding; compatibility and quality gates pass.

## Phase 6 — Product Owner staging acceptance

Freeze one exact commit and staging-backed Preview. Run the complete checklist in `manual-verification-checklist.md`. Record acceptance or rejection against that commit and Preview.

## Phase 7 — Conditional Production release

Prepare a separate dated release plan. Do not merge, migrate or deploy until a new Product Owner instruction names every exact action and migration. Production preflight and smoke checks remain read-only unless explicitly authorized.

## Commit boundaries

Keep these separate where applicable:

1. schema and RLS;
2. seed/data compatibility;
3. server authorization/data-access layer;
4. Admin interfaces;
5. Student interfaces;
6. focused tests and evidence; and
7. documentation/release planning.

## Quality gates for every implementation phase

- acceptance criterion traceability;
- touched-file lint clean;
- focused automated checks;
- `npx tsc --noEmit`;
- guarded `npm run build`;
- `git diff --check`;
- no secret/private-data additions; and
- staging evidence for database, authorization or account-dependent behavior.
