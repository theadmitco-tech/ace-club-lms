# Phase 8 — Manual Verification Checklist

Status: Closed with explicit evidence exceptions
Owner: Product owner, Engineering, QA and pilot operations
Last updated: 10 August 2026

Phase 8 was closed by Product Owner operational acceptance after confirmation that the MVP is live with real Students. Checked items below were verified or explicitly confirmed at closeout. Unchecked items were not independently evidenced in the repository and must not be represented as passed.

## Launch cleanliness

- [ ] Repository-wide lint passes with zero errors and warnings without suppression.
- [x] TypeScript and local Next.js Production build pass.
- [ ] Broken package scripts and unsafe/stale setup guidance are corrected or removed.
- [ ] MVP-excluded analytics and editing controls remain absent from reachable launch UI.
- [ ] Product Owner records the public-registration/payment decision.
- [x] Closeout includes no database cleanup or Production mutation.

## Controlled rehearsal

- [ ] Test Admin and Test Student complete Google sign-in, correct role routing and logout.
- [ ] Unknown, inactive, cross-student, unenrolled and signed-out access is denied.
- [ ] Week 0 is immediate; later pre-read and post-class worksheet releases obey programme time zone.
- [ ] Direct unreleased/unpublished URLs remain protected.
- [ ] Notion, PDF and recording paths work; failure states remain recoverable and isolated.
- [ ] Batch-specific recordings remain isolated through create/edit/remove/generate/sync behavior.
- [ ] Student tracker individual/bulk updates, persistence and retry behavior pass.
- [ ] Admin totals and question detail match the same Student rows and remain read-only.
- [ ] Supported laptop/desktop widths, 200% text zoom and keyboard navigation pass.

## First-time pilot

- [ ] At least five and no more than ten first-time Students participate; Test identities are not counted.
- [ ] All pilot accounts are controlled, pre-provisioned and assigned to the intended cohort.
- [ ] Each participant completes first sign-in and reaches only their own course.
- [ ] Each participant can find Week 0, a scheduled pre-read, class/recording and released worksheet.
- [ ] Each participant can use the canonical tracker and return after refresh/re-entry.
- [ ] Confusion, support requests, blockers and browser details are recorded anonymously.
- [ ] No screenshot, evidence or log stores private Student data or authentication artifacts.

## Stabilization and launch

- [ ] Every pilot finding has a severity, owner and disposition.
- [ ] No critical/high defect or cross-student exposure remains open.
- [ ] Every critical/high fix passes its focused test plus authorization/release regression.
- [ ] Mandatory Vercel Production/Preview environment preflight passes.
- [ ] Production migration/deployment plan is reviewed; live `/` and `/login` probes pass.
- [x] Anonymous read-only Production `/` and `/login` probes return HTTP 200 on 10 August 2026.
- [ ] Production Student/Admin smoke tests pass without unnecessary data seeding.
- [x] Product Owner confirms the MVP is live with real Students and approves operational Phase 8 closure.
- [ ] Monitoring covers authentication, content, release, tracker, Admin parity and privacy failures.
- [ ] First live cycle completes with incidents resolved or explicitly owned.

## Exit gate

- [ ] End-to-end acceptance passes with no critical defects or cross-student data exposure.

The original evidence-based exit gate remains unchecked because its complete evidence set is absent. The Product Owner accepted live operation as the closeout basis with the exceptions recorded in [operational closeout evidence](evidence/operational-closeout-2026-08-10.md).
