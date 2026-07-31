# Phase 2 Manual Verification Checklist

Status: Active
Owner: Product owner and QA
Last updated: 31 July 2026

Record only `Present`, `Missing`, `Pass` or `Fail` plus sanitised notes. Never record OAuth secrets, tokens, credentials or private student data.

## 1. Staging provider inventory

- [x] Existing Google Cloud project inspected: `Ace Club Portal` (`ace-club-portal-504012`).
- [x] Google OAuth Web client: Present — `Ace Club Portal Web`.
- [x] Consent audience and publication state recorded: External, Testing.
- [x] Two controlled Google accounts are allowed as test users.
- [x] Supabase staging Google provider enabled.
- [x] Client ID and client secret each recorded as Present; downloaded credential JSON removed after configuration.
- [x] Staging Google client redirect URI exactly matches the callback shown by staging Supabase.
- [x] Supabase staging Site URL is the stable Phase 2 Preview URL.
- [x] Supabase staging redirects allow both the stable Preview callback and `http://localhost:3000/auth/callback`.

## 2. Production separation

- [x] Existing `Ace Club Portal Web` client identified as Production-only from its Supabase callback.
- [x] Staging uses a separate Google OAuth Web client: `Ace Club Portal Staging`.
- [x] Vercel Production and Preview Supabase variables use separate environment scopes and project credentials.
- [x] Production Supabase Google provider contains only Production credentials.
- [x] Production Site URL is `https://aceclub.theadmitco.com`.
- [x] Production redirect allowlist contains only approved Production paths.
- [x] Inactive-by-default OAuth profile migration applied to Production.
- [ ] No staging identity or Quick Access control appears in Production.

Production redirect note: the custom-domain and Production Vercel callbacks are present, no staging Preview callback appears, and the obsolete localhost callback was removed with Product Owner approval.

## 3. Staging journey matrix

| Test | Result | Sanitised note |
|---|---|---|
| Test Admin Google Sign-In reaches `/admin` | Pass | Preview Admin dashboard loaded and survived refresh |
| Test Student Google Sign-In reaches `/dashboard` | Pass | Preview Student dashboard loaded |
| Student cannot open `/admin` | Pass | Preview `/admin` redirected to `/dashboard` |
| Admin is not sent to the Student journey | Pass | Preview `/dashboard` redirected to `/admin` |
| Unprovisioned Google account receives no access | Pass | OAuth completed; generic inactive-access page shown |
| Logout invalidates protected access | Pass | Signed-out Preview `/admin` and `/dashboard` redirected to `/login` |
| Deactivated Student is blocked | Pass | Admin UI deactivation caused Preview Google callback to show inactive access |
| Reactivated Student regains access | Pass | Admin UI reactivation restored Preview `/dashboard` access |
| Admin can provision a Student | Pass | Existing controlled Student was provisioned, activated and enrolled through the staging Preview Admin UI |
| Admin can deactivate/reactivate a Student | Pass | Completed through the staging Preview Admin UI |
