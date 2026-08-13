# Pilot V1 Phase 6 — Integrated Verification Evidence

Date: 13 August 2026
Environment: Local checks and staging-backed Vercel Preview
Branch: `codex/pilot-v1`
Tested commit: `1e75935`

## Result

All eight Phase 6 exit criteria pass. Pilot V1 is internally consistent and can transfer to Phase 7 account-dependent staging acceptance. This result does not authorize a Production migration, deployment, merge, or data change.

## Git and scope review

- `origin/main` remained at application baseline `0e7be4d`; it had not moved, so no integration merge was required.
- The full branch diff contains only approved Pilot V1 code, ordered migrations, focused fixtures, evidence and the intentionally carried signed Phase 8 closeout record.
- `git diff --check` passed.
- Changed-file review found no credential, private key, JWT, password assignment, magic-link URL, tokenized private URL, authentication artifact, or private Student data.
- The working branch was pushed through `1e75935` before Preview verification.

## Local automated gates

| Gate | Result |
|---|---|
| Recommendation fixtures | 7/7 pass |
| Protected Session-material path fixtures | 4/4 pass |
| ESLint across every V1-touched TypeScript/TSX file | Pass with zero findings |
| `npx tsc --noEmit` | Pass |
| Next.js 16.2.4 Production build | Pass; all 33 static pages generated and dynamic routes compiled |
| Repository-wide ESLint | Unchanged signed baseline: 22 errors and 3 warnings in untouched legacy files |

The focused Node fixtures emit only the existing module-type performance warning; no test fails. Repository-wide lint is not represented as clean.

## Staging migration and authorization result

The staging project was healthy and its migration ledger contained:

- `20260811170000_add_batch_session_materials`; and
- `20260813081141_revoke_session_material_trigger_rpc_access`.

The second migration was added during Phase 6 after the current Supabase security advisor showed that the trigger-only `enforce_batch_session_material()` helper retained an explicit anonymous `EXECUTE` grant from historical project defaults. PostgreSQL does not allow a trigger function to be invoked as a normal function, so this was not an authorization bypass; the unnecessary Data API surface was nevertheless removed under least privilege.

The post-migration checks confirmed:

- the trigger helper is executable by neither `anon` nor `authenticated`;
- the save and remove RPCs remain executable by `authenticated` but not `anon` and continue to enforce active Admin authorization internally;
- Row Level Security remains enabled on `materials`;
- the Session-material shape constraint, unique private-file-reference index and published-session read policy remain present;
- the committed rollback-only authorization probe passes again; and
- the probe leaves zero probe courses and zero Session-material rows.

The generic advisor warnings for the two intentionally authenticated `SECURITY DEFINER` Admin RPCs remain expected. Their fixed search path, internal active-Admin check, anonymous grant revocation and rollback-only authorization results were reviewed. No V1 critical or high security finding remains.

Both Pilot V1 migrations are applied to staging only. Production was not queried, migrated, deployed or changed.

## Immutable Preview

Vercel completed the immutable Preview deployment for commit `1e75935`:

- URL: `https://ace-club-7x8qjkpkz-theadmitco-techs-projects.vercel.app`
- GitHub deployment environment: `Preview`
- Deployment state: `success`

The repository's Vercel Preview prebuild guard validates the staging Supabase project and environment URL separation before `next build`; the successful deployment therefore confirms the staging configuration without recording variable values. The migration-only hardening commit did not change the application bundle or the previously passed Phase 5 Admin/Student lifecycle.

## Phase 7 fixtures and boundary

The approved staging Admin and enrolled staging Student used in Phase 5 remain the anonymized account-dependent fixtures for Phase 7. No identity, signed URL, private object path, authentication artifact or Student record is included here. Phase 7 must run the manual acceptance journeys and obtain an explicit Product Owner version decision before any Production planning begins.

## Finding

| ID | Severity | Finding | Disposition | Retest |
|---|---|---|---|---|
| P6-01 | Low | Trigger-only Session-material helper retained an unnecessary anonymous execution grant in staging | Added and applied ordered least-privilege migration `20260813081141_revoke_session_material_trigger_rpc_access.sql` to staging only | Pass: effective grants, advisor scope and rollback-only authorization probe rechecked |

## Conclusion

Phase 6 is complete. The exact next action is for the Product Owner, Engineering and QA/Security owners to begin Phase 7 on immutable Preview commit `1e75935` and record the manual Admin, Student, release, cross-batch, tracker and private-file acceptance results without changing Production.
