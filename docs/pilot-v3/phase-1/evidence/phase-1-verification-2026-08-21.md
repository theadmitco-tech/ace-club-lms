# Pilot V3 Phase 1 verification — 21 August 2026

## Local verification

- `npm run test:mock-question-package`: PASS, 5/5.
  - Valid ZIP round-trip for PS, DS, CR, RC, GI, TI, MSR and TPA.
  - Accepted namespace-prefixed OOXML compatibility.
  - Incompatible response declaration blocked.
  - Missing companion asset blocked.
  - Unauthorized namespace blocked without trusting workbook registry values.
- `npx tsc --noEmit`: PASS.
- ESLint across every Phase 1 TS/TSX/test file: PASS.
- `npm run build`: PASS on Next.js 16.2.4; all new Admin and API routes compiled.
- `git diff --check`: PASS.

The accepted Phase 0 template and all three founder-personalized workbooks were parsed read-only through the production parser. Their prefixed OOXML is supported. The empty personalized workbooks each return only the two expected blockers: placeholder `package_id` and no question rows. No records or objects were written.

## Staging verification

- Exact repair migration `20260820114212`: present in the migration ledger; repaired inactive-batch function no longer requires `course.is_active`.
- Phase 1 migration `20260821093017`: rollback-only validation PASS, then atomic application PASS.
- The excluded `20260803120000`, `20260803160000` and `20260804120000` migrations remain absent.
- 13 `public.mock_*` tables have RLS enabled and forced.
- `anon`/`authenticated` direct table grants across the Phase 1 public/private tables: 0.
- Private answer-key relation: present.
- Immutable question and stimulus revision triggers: present.
- Founder namespaces: 3; taxonomy rows: 16.
- `mock-media`: private, 10,485,760-byte limit, PNG/JPEG/WebP only.

No Production system was queried or changed.

## Advisor classification

Supabase security advisories increased from the inherited 69 warnings to 74 warnings. The five new warnings are the intentionally authenticated, security-definer Question Bank RPCs. Each RPC performs an active Admin check and namespace-membership check internally; direct table access remains denied. Fourteen new INFO notices report forced-RLS tables with no policies, which is the deliberate deny-all posture because access is mediated by the checked RPCs/server. See the [security-definer lint reference](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) and [RLS-without-policy reference](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Performance advisories contain 177 warnings, unchanged from the inherited baseline. New Phase 1 entries are INFO-only: unused fresh indexes and seven unindexed creator/current-revision foreign keys. These do not block the small pilot; index usage should be re-evaluated with real import volume. See the [unindexed foreign-key reference](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).

## Dependency audit

New direct dependencies are pinned (`exceljs` 4.4.0 and `jszip` 3.10.1), and transitive overrides remove the ExcelJS-path advisories found during implementation. `npm audit --omit=dev` still reports three inherited high-severity dependency families through Next.js 16.2.4 (`next`, `postcss`, `sharp`). The registry recommends Next.js 16.3.2. Upgrading the application framework is intentionally not folded into the Phase 1 Question Bank boundary and needs its own upgrade/compatibility pass before release.

## Remaining manual acceptance

- Grant the intended active Admin accounts founder namespace membership; do not infer identity from workbook text.
- On a Staging-backed Preview, validate one text-only, one shared-stimulus and one image/GI founder package, review the rendered answer/stimulus preview, then confirm the Draft import.
- Verify exact-package retry returns the original result and creates no duplicate rows or objects.
- Exercise Draft edit, publish, revise and retire from the Admin page and confirm Student-facing routes expose neither Drafts nor answer keys.
- Download and retain the final JSON import reports.
