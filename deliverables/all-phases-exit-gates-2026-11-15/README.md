# Phases 1–7 exit-gate review

Review date: 15 November 2026. Phase 0 is excluded.

**Local implementation and verification are distinct from final hosted acceptance.** Phases 1, 2, 4 and 5 retain their original staging acceptance. Phase 3 requires actual Google/Razorpay acceptance on the combined Preview; Phase 6 requires that combined acceptance and a Product Owner decision; Phase 7 still requires Production enablement engineering and an authorized release. No unfinished gate is converted to a pass by a local test, commit or push.

## Phase checklists

| Phase | Current result | Checklist |
| --- | --- | --- |
| 1 — Products and access | Original staging gates passed; fresh local regressions passed. | [13 gates](PHASE-1.md) |
| 2 — Courses and batch publishing | Original staging gates passed; fresh local regressions passed. | [17 gates](PHASE-2.md) |
| 3 — Registration and payments | Staging schema reconciled; local implementation covered. Actual sign-in, Test Mode payment and webhook acceptance remain open. | [11 gates](PHASE-3.md) |
| 4 — Student learning | Original staging gates passed with the approved temporary feedback form; fresh local regressions passed. | [12 gates](PHASE-4.md) |
| 5 — Content publishing | Original staging gates passed; fresh local regressions passed. | [9 functional gates](PHASE-5.md) |
| 6 — Combined acceptance | Local integration coverage passed. Final hosted candidate, cleanup and Product Owner acceptance remain open. | [10 gates](PHASE-6.md) |
| 7 — Release | Local preflight and synthetic database restore passed. Production enablement, reconciliation, recovery and authorized release remain open. | [Release gates](PHASE-7.md) |

The individual checklists preserve exact boundaries between historical hosted evidence, fresh local evidence and outstanding external requirements. Historical reports remain unchanged and are indexed in [inherited-evidence-index.json](inherited-evidence-index.json).

## Work completed during this review

- [x] Parallel reviews cover payment preparation, combined regressions and release recovery.
- [x] Phase 1/2/4/5/6 database and unit regressions pass: 62 suite runs and 495 tests.
- [x] Generated payment-test account preparation, interrupted-request recovery and exact cleanup have guarded tooling and local coverage.
- [x] Generated fixture setup handles Supabase Admin creation ordering without claiming genuine Google authentication.
- [x] Build validation rejects malformed origins, cross-environment configuration and accidental V2 Live Mode settings.
- [x] A real local database dump/restore retains synthetic payment, upgrade, access, feedback, publication and security state.
- [x] GitHub verification includes the new payment preparation, deployment environment and recovery checks. No deployment step is added.
- [x] Full lint, TypeScript and the application build pass locally.
- [x] Payment and acceptance-tool coverage passes 62 tests; 25 additional deployment, Admin, recovery and readiness tests pass.
- [x] Release preflight and actual local database restore pass 24 named assertions across two suites.
- [x] All 141 synthetic browser cases pass across catalogue, authoring, checkout, learning, publishing and Admin workflows.
- [x] Published wording, private-data exclusion, evidence links and changed-source attribution are reviewed.
- [ ] Git publication requires successful remote branch confirmation.

## Remaining completion sequence

1. **Engineering:** review published content and commit/push the locally verified candidate.
2. **Deployment owner:** deploy the pushed combined branch as Preview using staging project `eyphkkginlgoaxflauog`; configure the exact Google callback and reachable Razorpay Test Mode webhook. The current connected Vercel read still returns HTTP 403, and no final Phase 3 Preview has been verified.
3. **Deployment owner / staging operator:** execute hosted fixture preparation and acceptance on that Preview: real Google sign-in, captured Test Mode payments, failure/retry/duplicate/delay handling, upgrades, eight-place contention and the combined Admin/Student walkthrough. Restore the exact fixture baseline and independently verify account absence. Engineering provides locally verified tools and reviews sanitized evidence; hosted configuration, database operations and fixtures remain owner-operated. The [Google signup and resource preservation plan](../phase3-preview-activation/OWNER-GOOGLE-RESOURCE-ACCEPTANCE.md) covers cases outside the generated-account inventory.
4. **Product Owner:** record acceptance or rejection of that exact tested candidate. Earlier phase walkthroughs do not substitute for this decision.
5. **Engineering / release owner:** implement and test the [Production enablement specification](../phase7-release-preparation/RELEASE-ENABLEMENT-SPEC.md), including environment-specific private assets and a payment-mode-bound ledger. Reconcile the actual Production schema, rehearse recovery and previous-artifact compatibility, then obtain authorization for the exact release and smoke scope.

Production remains unchanged. No real charge, account-wide provider setting, merge, PR readiness change, Production migration or domain operation is performed by this review. The current V2 runtime remains staging-only; the release gate is not merely waiting for a deployment button.

## Evidence and reproduction

- [Final local build, support tests and 141 browser cases](final-local-verification.json)
- [Phase 3 current local verification](phase3-local-verification.json)
- [Current local regression results](local-regressions.json)
- [Integrated access assertions](local-integrated-results.json)
- [Paid database-to-learning assertions](local-paid-integration-results.json)
- [Conflict repair preservation](local-conflict-repair-results.json)
- [Release metadata preflight](local-preflight-results.json)
- [Synthetic database recovery](local-recovery-results.json)
- [Payment account lifecycle and exact cleanup procedure](../phase3-preview-activation/HOSTED-ACCOUNT-LIFECYCLE.md)

All authored records use role-based attribution. Secrets, recovery snapshots, account manifests and private sessions remain outside Git. Existing applied migrations and historical evidence are preserved.
