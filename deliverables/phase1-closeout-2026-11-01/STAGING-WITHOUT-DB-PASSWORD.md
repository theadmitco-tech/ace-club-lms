# Complete staging checks without a database password

Use only project `eyphkkginlgoaxflauog`. No database-password reset is needed.
Supabase Dashboard's SQL Editor supplies the database connection. The direct-DB
runner in the isolated review checkout remains unexecuted and must not be run
with a placeholder password.

## Update — 2 November 2026, 12:01 AM IST

The corrected local keys now pass both read-only checks: public catalogue quote
HTTP 200 and Auth admin read HTTP 200. No database password was used and no records
were changed. [Recheck evidence](verification/passwordless-access-recheck-2026-11-02.json).
The key-copy step below is complete; the SQL Editor preflight result is still pending.
This verifies the local key, not the value of Vercel's existing secret.

## Initial access check (superseded for local key validity)

On 1 November 2026 the local credential file was inspected without printing its
values. The project URL matched staging. A read-only public Quant quote passed.
An Auth admin read using the supplied server key failed; a direct request to the
same Auth admin endpoint returned HTTP 401, classified as **Invalid API key**.
No users, purchases or other records were created or modified. This tests the
locally supplied key; it does not prove what value Vercel's withheld secret holds.

## Operator steps

1. Open [the staging API settings](https://supabase.com/dashboard/project/eyphkkginlgoaxflauog/settings/api-keys).
   In **Legacy API Keys**, copy the complete `service_role` value again into
   `SUPABASE_SERVICE_ROLE_KEY` in `/tmp/ace-phase1-staging.env`. Keep the key in
   that local file, not in chat. There is no need to rotate keys or reset passwords.
2. Open [the staging SQL Editor](https://supabase.com/dashboard/project/eyphkkginlgoaxflauog/sql/new).
   Paste the complete [Phase 1 read-only schema preflight](../../scripts/v2-phase-1-schema-preflight.sql)
   into a new query and run it. Return its JSON report. The script inspects object
   presence and role privileges, ends with ROLLBACK, and performs no migration or
   fixture write. Verify the selected project in the dashboard before running;
   the SQL report itself cannot establish project identity.
3. After API access passes, prepare the named synthetic-account manifest and
   corresponding SQL Editor fixture setup/cleanup for the remaining tests. Do not
   run the Phase 2 activation SQL or rerun the original Phase 1 migration.

The API keys will support normal QA sign-in and browser/API checks; any privileged
fixture preparation or cleanup that needs SQL will be supplied as scoped SQL Editor
files. An absent database password is not a reason to change Production or relax
permissions. The accepted empty-account and grant-denial reports remain valid;
they do not need to be repeated merely because this connection method changed.
