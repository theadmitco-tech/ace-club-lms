# Phase 2 — Repair and Simplify Accounts

Status: Complete
Owner: Product owner and Engineering
Last updated: 31 July 2026

## Objective

Deliver controlled Google Sign-In for Admin and Student accounts with consistent server-side session and role enforcement.

## Scope

- Inventory existing Google Cloud and Supabase provider configuration without exposing secrets.
- Use Google Sign-In as the only login path.
- Require pre-provisioned, active Admin or Student access.
- Remove password, magic-link, Quick Access, demo credentials and Super Admin presentation.
- Establish OAuth callback, session refresh and server-side page authorization.
- Verify controlled staging Admin and Student journeys plus denial and logout cases.

## Exit gate

- [x] Controlled Test Admin signs in with Google and reaches `/admin`.
- [x] Controlled Test Student signs in with Google and reaches `/dashboard`.
- [x] Each role is denied the other role's protected pages.
- [x] An unprovisioned Google account receives no portal or course access.
- [x] A deactivated Student is blocked; reactivation restores Google Sign-In access.
- [x] Logout invalidates protected-page access.
- [x] Positive Admin provisioning and enrolment operations pass in staging.
- [x] Admin deactivation/reactivation operations pass in staging Preview.
- [x] Password, magic-link, Quick Access, demo credentials and Super Admin presentation are absent.
- [x] Staging and Production OAuth clients, callbacks and secrets are separated.
- [x] Touched authentication files pass lint and the Production build passes.

## Manual dependency

The product owner completes one console-dependent configuration or identity task at a time using [the Phase 2 checklist](manual-verification-checklist.md). No OAuth secret, private identity data or token is recorded in Git.

Current evidence: [staging Google provider inventory](evidence/staging-google-provider-inventory-2026-07-31.json).

Staging access-control migration: [application result](evidence/staging-access-control-migration-2026-07-31.json).

Vercel environment separation: [sanitised configuration evidence](evidence/vercel-environment-separation-2026-07-31.json).

Deployed Preview verification: [staging Preview Google authentication tests](evidence/staging-preview-google-auth-tests-2026-07-31.json).

Production read-only verification: [Production Google authentication inventory](evidence/production-google-auth-inventory-2026-07-31.json).

Production access-control migration: [application result](evidence/production-access-control-migration-2026-07-31.json).

Production deployment and Google Sign-In: [final verification](evidence/production-google-auth-tests-2026-07-31.json).

## Sign-off

Phase 2 is accepted as complete. Google Sign-In is the only Production portal login method; controlled Admin and Student journeys, inactive access, role boundaries, provisioning, enrolment, deactivation/reactivation and logout pass; staging and Production are separated; and deployment environment validation now fails safely before an invalid release can replace Production.
