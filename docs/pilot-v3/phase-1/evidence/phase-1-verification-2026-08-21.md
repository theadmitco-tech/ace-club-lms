# Pilot V3 Phase 1 verification — 21–22 August 2026

## Local verification

- `npm run test:mock-question-package`: PASS, 7/7.
  - Valid ZIP round-trip for PS, DS, CR, RC, GI, TI, MSR and TPA.
  - Accepted namespace-prefixed OOXML compatibility.
  - Incompatible response declaration blocked.
  - Missing companion asset blocked.
  - Unauthorized namespace blocked without trusting workbook registry values.
  - Exact completed-package retry revalidates against the original package state and remains idempotent.
  - A self-contained TPA question validates without a shared stimulus; linked TPA questions retain their compatible-stimulus validation.
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

## Staging-backed Preview acceptance

The active Admin `theaceclub.tac@gmail.com` was explicitly granted the `UNNATI` namespace membership for this synthetic acceptance run. No identity was inferred from workbook content.

- Text-only XLSX: dry-run passed with one question, zero stimuli and zero errors. A direct pre-confirmation database count showed zero imports, questions, revisions, protected keys and Storage objects, proving dry-run is write-free. Confirmed import created one ready Draft question, one protected answer key and one completed audit row.
- Import transaction failure: the first confirm exposed an unsupported `jsonb_object_length(jsonb)` call in the answer-key check. The transaction rolled back completely (all relevant counts remained zero). Staging migration `20260821105003` corrected the deployed function; repository migration `20260821113000_fix_mock_answer_key_slot_count.sql` preserves the fix for future environments.
- Exact text-only retry: the same package initially exposed conflict checking ahead of completed-package recognition. The parser now recognizes completed package fingerprints before conflict evaluation. Preview returned: `This exact package was already imported; the prior result was returned.` No duplicate import was created.
- Shared-stimulus XLSX: dry-run passed with two RC questions and one shared passage; confirmed Draft import passed.
- Image/GI ZIP: dry-run passed with one GI question, one graphic stimulus and zero errors; confirmed Draft import passed. The package included a private PNG asset.
- Protected answer-key rendering: the first real inventory row exposed an attempted PostgREST read of the non-exposed `private` schema. Staging migration `20260821114500_add_mock_question_key_reader.sql` adds a service-role-only RPC. Verified execute rights: `anon=false`, `authenticated=false`, `service_role=true`. Preview then rendered the complete Admin inventory without an error.
- Lifecycle: a synthetic PS question was edited as a Draft, published as r1, revised into a new ready Draft, and r1 was retired from the Admin Preview. The final inventory retained the immutable history (including Draft revisions) and displayed r1 as `retired`.

The original Preview acceptance branch was `codex/pilot-v3-phase-1` at `6858ca9`. No Production database, deployment, data or configuration was accessed or changed.

## Final validation amendment — 22 August 2026

- A real UNNATI ZIP containing 10 questions, 3 stimuli and 1 asset exposed one false blocker: a self-contained TPA question had no `source_stimulus_id`.
- Commit `ec4631e` changes only the required-stimulus rule: RC, GI, TI and MSR still require a shared stimulus; TPA may be standalone or, when linked, must use the compatible `two_part_context` stimulus type.
- The package parser regression suite passed 7/7, TypeScript passed, and targeted ESLint passed.
- The current Phase 2 Preview deployment containing the amendment is `dpl_3aEnLu3mBn1k2DHpBVco6HXW3qUM` at `https://ace-club-2yy631aug-theadmitco-techs-projects.vercel.app`; the shared Preview alias was verified to point to that deployment at the time of release.
- No package import was performed automatically and no Production system was changed.

## Phase 1 closeout

Phase 1 is closed for the authorized Staging/Preview boundary. The standalone-TPA correction closes the final real-package validation defect. The remaining work belongs to later phases: mock composition/release, Student player/attempts/results, Figma-dependent Student UI and any separately authorized Production release preparation.
