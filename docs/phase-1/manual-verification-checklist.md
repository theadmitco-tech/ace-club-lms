# Phase 1 Manual Verification Checklist

Complete only the items that require account access. Do not paste secret values, private keys, passwords, magic-link URLs, or student data into the results.

## Verified so far — 31 July 2026

- [x] Editable source and Git history recovered.
- [x] Local `HEAD` matched `origin/main` before the audit commit.
- [x] Node.js/npm installed and dependencies installed with `npm ci`.
- [x] Development server started successfully on localhost.
- [x] Separate Supabase project `ace-club-lms-staging` created.
- [x] Local `.env.local` points to staging using public values only.
- [x] Production Supabase project identified and kept separate.
- [x] Production build passes.
- [x] Lint disposition approved — credential-bearing scratch scripts were removed; the remaining 41 errors and 10 warnings are scoped legacy deferrals and no new findings are permitted.
- [x] Staging database inventory captured; public LMS schema is empty.
- [x] Production database inventory captured and reconciled.
- [ ] Authentication test matrix passes.
- [ ] Release and privacy probes pass.

## 1. Deployment baseline

Record:

- Staging URL:
- Production URL:
- Staging deployed commit SHA:
- Production deployed commit SHA:
- Are both deployments connected to the expected Git repository? Yes/No

For each environment, record only **Present**, **Missing**, or **Not applicable**:

| Variable | Local | Staging | Production |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` |  |  |  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` |  |  |  |
| `SUPABASE_SERVICE_ROLE_KEY` |  |  |  |
| `NEXT_PUBLIC_SITE_URL` |  |  |  |
| Razorpay variables |  |  |  |

## 2. Supabase inventory

1. Open the staging Supabase SQL editor.
2. Run `supabase-inventory.sql`.
3. Save or paste its JSON result.
4. Repeat for production if it is a different Supabase project.
5. Do not modify any policies or tables during this check.

## 2a. Clean project validation

From a fresh clone, or after installing dependencies locally, run:

```bash
npm ci
npm run lint
npm run build
```

Record:

- `npm ci`: Pass/Fail
- `npm run lint`: Pass/Fail
- `npm run build`: Pass/Fail
- Sanitised error output, if any:

## 3. Supabase authentication configuration

Record:

- Site URL:
- Allowed redirect URL hostnames/paths:
- Email provider configured: Yes/No
- Magic-link email delivery succeeds: Yes/No
- Magic-link expiry setting:
- Staging and production use separate projects or identities: Yes/No

Do not paste an actual magic-link URL.

## 4. Authentication test matrix

Use controlled staging Test Admin and Test Student identities.

| Test | Result | Notes |
|---|---|---|
| Admin requests and receives magic link | Pass/Fail |  |
| Admin link redirects to `/admin` | Pass/Fail |  |
| Student requests and receives magic link | Pass/Fail |  |
| Student link redirects to `/dashboard` | Pass/Fail |  |
| Used/expired link can be replaced | Pass/Fail |  |
| Unknown email response does not disclose registration | Pass/Fail |  |
| Student cannot open `/admin` | Pass/Fail |  |
| Admin is not sent to the Student journey | Pass/Fail |  |
| Logout invalidates protected access | Pass/Fail |  |
| Deactivated Student cannot sign in | Pass/Fail/Unsupported |  |
| Reactivated Student can request a new link | Pass/Fail/Unsupported |  |
| Quick Access is absent in production | Pass/Fail |  |
| Password login is absent in production | Pass/Fail |  |

## 5. Release and privacy probes

Use staging test data only.

| Test | Result | Notes |
|---|---|---|
| Student A cannot read Student B's profile details beyond approved fields | Pass/Fail |  |
| Student A cannot read Student B's enrollment/tracker rows | Pass/Fail |  |
| Student cannot call admin enrolment endpoint successfully | Pass/Fail |  |
| Student cannot call delete-user endpoint successfully | Pass/Fail |  |
| Signed-out caller cannot call either admin endpoint | Pass/Fail |  |
| Signed-out caller cannot fetch arbitrary Notion pages through the API | Pass/Fail |  |
| Locked material cannot be fetched by direct URL | Pass/Fail |  |
| Storage bucket serving worksheets is private | Pass/Fail |  |

Stop testing and record a failure if a probe could alter real production data. Do destructive and cross-user probes only in staging with disposable accounts.

## 6. Return to Codex

Return:

- This completed checklist.
- The inventory JSON.
- Any build/deployment error text with secrets removed.

Codex can then reconcile the live state, close the Phase 1 exit gate, and finalise the estimate.
