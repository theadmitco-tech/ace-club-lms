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
- [x] Supabase Site URL is `http://localhost:3000` and local callback redirect is `http://localhost:3000/auth/callback`.

## 2. Production separation

- [x] Existing `Ace Club Portal Web` client identified as Production-only from its Supabase callback.
- [x] Staging uses a separate Google OAuth Web client: `Ace Club Portal Staging`.
- [x] Vercel Production and Preview Supabase variables use separate environment scopes and project credentials.
- [ ] Production Supabase Google provider contains only Production credentials.
- [ ] Production Site URL is `https://aceclub.theadmitco.com`.
- [ ] Production redirect allowlist contains only approved Production paths.
- [ ] No staging identity or Quick Access control appears in Production.

## 3. Staging journey matrix

| Test | Result | Sanitised note |
|---|---|---|
| Test Admin Google Sign-In reaches `/admin` | Pass | Admin dashboard loaded |
| Test Student Google Sign-In reaches `/dashboard` | Pass | Student dashboard loaded |
| Student cannot open `/admin` | Pass | Opening `/admin` redirected to `/dashboard` |
| Admin is not sent to the Student journey | Pass | Opening `/dashboard` redirected to `/admin` |
| Unprovisioned Google account receives no access | Pass | OAuth completed; generic inactive-access page shown |
| Logout invalidates protected access | Pass | Signed-out `/admin` request redirected to `/login` |
| Deactivated Student is blocked | Pass | Google callback showed the inactive-access page |
| Reactivated Student regains access | Pass | Google Sign-In returned to `/dashboard` |
| Admin can provision a Student |  |  |
| Admin can deactivate/reactivate a Student |  |  |
