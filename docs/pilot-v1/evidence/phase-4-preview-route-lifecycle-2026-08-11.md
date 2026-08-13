# Pilot V1 Phase 4 — Preview Route Lifecycle Evidence

Date: 11 August 2026
Environment: Staging-backed Vercel Preview only
Application commit: `1a746ae`
Preview verification deployment: `652343b`

## Result

The signed-in staging Admin completed one temporary private-PDF lifecycle through the deployed Phase 4 Route Handlers. The verifier exposed only sanitized status and boolean results; it did not display or record the signed upload token or short-lived download URL.

| Check | Result |
|---|---|
| Admin signed-upload authorization | `200` |
| Private PDF upload | Passed |
| Session-material attach | `200` |
| Protected JSON read | `200` |
| `Cache-Control` contains `private, no-store` | Passed |
| Signed download URL present in response | Passed; value not recorded |
| Session-material removal | `200` |
| Private-file cleanup pending | `false` |
| Read after removal | `404` |

The temporary row and private file were removed by the same authorized lifecycle. The `404` after cleanup confirms the removed database reference was no longer deliverable, while `cleanupPending: false` confirms private-file removal completed.

## Failure-safety and local gates

Static review confirmed that failed creates remove an otherwise-unused newly uploaded file, failed replacements retain the prior saved reference, replacement cleanup occurs only after the database save succeeds, and remove responses surface private-file cleanup state. The rollback-only staging authorization probe separately covered invalid Master, cross-session, non-Admin, pre-release, unpublished, inactive, signed-out and cross-batch cases.

The Phase 4 implementation passed:

- targeted ESLint;
- `npx tsc --noEmit`;
- guarded Production build;
- four focused Session-material file/path fixtures;
- five recommendation regression fixtures;
- ordered migration review and staging application; and
- the rollback-only staging authorization probe.

Repository-wide lint remained at the accepted unrelated baseline of 22 errors and 3 warnings. Phase 4 introduced no new lint finding.

## Cleanup and environment boundary

The temporary Admin-protected verification page was removed immediately after the lifecycle and is not part of the Phase 4 final application state. Production was not opened, queried, migrated or changed. No secret, authentication artifact, unrestricted private URL or Student data is recorded here.
