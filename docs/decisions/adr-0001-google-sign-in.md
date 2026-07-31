# ADR-0001 — Use Google Sign-In for portal access

Status: Active
Owner: Product owner and Engineering
Last updated: 31 July 2026

## Decision

Ace Club LMS will use Google Sign-In as its only Phase 2 and MVP login method. Admin and Student accounts must be provisioned for a controlled Google-account email before portal access is granted.

Password and magic-link login are excluded. Staging uses controlled Test Admin and Test Student Google accounts in the Google OAuth testing audience. Quick Access controls, shared credentials and staging identities must not appear in Production.

## Consequences

- Google OAuth configuration and secrets remain separate between staging and Production.
- Completing Google authentication must not automatically grant course access to an unknown email.
- The application must exchange the OAuth code server-side, refresh sessions, check active profile state and redirect by role.
- Deactivation preserves historical data while blocking later portal access.
- Phase 2 verification requires controlled Admin, Student, unprovisioned and deactivated-account cases.

## Superseded behaviour

This decision replaces the earlier MVP magic-link requirement in the active Markdown acceptance criteria and roadmap. Signed historical checkpoints remain unchanged.
