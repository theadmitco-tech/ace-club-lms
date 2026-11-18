# Generated staging account lifecycle

Status: locally verified automation; no hosted account action has been performed by this implementation. The workflow complements the [private SQL fixture lifecycle](HOSTED-QA-PREPARATION.md). It creates no Razorpay orders, payments, refunds or real Google identities.

Hosted account creation, recovery and cleanup are executed by the deployment owner or designated staging operator. Engineering maintains and tests the tooling locally; its availability does not authorize Engineering to change hosted accounts. Genuine Google signup and resource checks follow the separate [preservation plan](OWNER-GOOGLE-RESOURCE-ACCEPTANCE.md).

The commands use only staging project `eyphkkginlgoaxflauog`. The operator supplies an owner-confirmed Phase 3 Preview and exact candidate commit. Account state, passwords, manifests and receipts remain in an owner-only, Git-ignored directory. Only counts and fixed status labels appear in command output.

## Sequence

The account lifecycle requires the existing private staging credentials, a future IST class start date and a working deployed Preview. Arguments below describe input types; they are not literal credentials or deployable values.

```sh
node scripts/phase3/hosted-accounts.mjs --help
```

| Command | Required options | Effect |
| --- | --- | --- |
| `plan` | `--directory`, `--preview`, `--commit`, `--start-date` | Offline creation of one private run and twenty exact synthetic identities/passwords |
| `prepare` | `--directory`, `--staging-env` | Staging Auth creation, exact read-back and inactive-profile verification; private `generated-fixture-manifest.json` output |
| `recover` | `--directory`, `--staging-env` | Read-only reconciliation of the one ambiguous creation; no repeat creation |
| `cleanup` | `--directory`, `--staging-env`, `--qa-state` | Exact generated Auth deletion only after accepted SQL cleanup and fresh absence checks |
| `status` | `--directory` | Offline sanitized progress counts |

The directory must already have mode `700` and be Git-ignored; input credential/state files require mode `600`. The generated manifest is consumed by `hosted-qa.mjs prepare`, then its setup and cleanup receipt sequence. The accepted `hosted-qa-state.json` is supplied as `--qa-state` only after SQL fixture cleanup succeeds.

The lifecycle uses Supabase's documented server-side [account creation](https://supabase.com/docs/reference/javascript/auth-admin-createuser) and [account deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser) operations. Credentials never enter command arguments, repository files or report payloads. Existing users are not updated, adopted by email alone or deleted.

## Identity and recovery rules

Each creation is durably recorded as pending before the request. The returned identity is retained before further verification. Exact email, run marker, creation time and profile identity must match. A request timeout can represent a committed server operation, so creation is never blindly retried. Explicit recovery searches Auth read-only for the exact generated address and validates run ownership before recording its ID. An absent or ambiguous match stops the workflow; it does not justify another creation attempt. Partial preparation never triggers fallback deletion.

The creation request contains explicitly labeled synthetic provider metadata needed by the isolated fixture predicates. That metadata is not Google OAuth evidence. If GoTrue normalizes the provider marker, the workflow stops without changing existing Auth metadata or activating a profile. The SQL setup explicitly seeds missing candidate rows only for these exact fresh synthetic identities. Supabase Admin creation inserts the Auth user before applying custom application metadata, so the normal Google insert trigger cannot be assumed to run for this fixture path. The source ordering is documented in the [provider implementation](https://github.com/supabase/auth/blob/master/internal/api/admin.go); the dedicated local SQL case reproduces that ordering. Synthetic candidate seeding is not evidence of the real signup trigger or Google callback. Real Google callback, email ownership, MFA and automatic activation acceptance remain separate.

The generated profiles must remain inactive Students during preparation. Only the reviewed SQL setup changes the synthetic Admin/seeded-access fixtures. Purchase-only identities remain inactive until verified fulfillment. No profile repair, Admin upgrade or manual activation occurs in the account CLI.

## Exact cleanup

Cleanup requires the accepted application-cleanup lifecycle for the same run, Preview, commit and all twenty recorded identities. Before any deletion, all tracked checkout service reads must be absent, generated profiles must be inactive with expected roles, purchases must be absent, and Auth ownership must match. SQL cleanup remains responsible for the exact application baseline and all fixture relations; a receipt is not represented as an independently executed SQL query.

Deletion records a pending state before each exact Auth request. A lost response can resume only for an identity previously recorded as deletion-pending; unexpected absence stops the run. Fresh Auth and profile reads independently verify removal before the password is discarded. Foreign ownership, reactivation, remaining purchases/checkouts or unexpected identity changes stop cleanup. Database foreign-key restrictions remain active. No wildcard deletion, soft deletion, account-wide setting or Production action occurs.

The local tests use synthetic transports. They demonstrate crash recovery and refusal behavior but do not claim that hosted Auth creation, hosted cleanup, Google login or provider payment acceptance has succeeded.

## Partial preparation abort

A failed preparation is retained for reconciliation; the complete-run `cleanup` command must not be used with an invented SQL receipt. The following manual path applies only before fixture SQL has run and before a complete manifest has been emitted.

1. The operator retains `hosted-account-state.json` and stops preparation. A `request_pending` entry first requires the read-only `recover` command. No identity may be selected using an email address alone. If recovery cannot prove ownership, account deletion remains blocked for investigation.
2. A private SQL Editor query receives only the recorded `created` or `verified` entries, with their exact IDs, synthetic email addresses, run UUID and creation time. The operator verifies the selected staging project. The guarded query below rejects active/non-Student profiles, ownership mismatches and references in every public UUID column except the profile ID and signup-candidate Student ID. It removes only generated signup candidates; it does not delete Auth identities or application content.
3. After the query commits successfully, the operator opens Supabase Authentication → Users, locates each recorded UUID, confirms its exact generated address, and deletes only that identity. Accounts with an unresolved pending creation or changed ownership are excluded from deletion. No wildcard or email-domain deletion is permitted.
4. The same exact identity list is checked again through Auth and profiles. Any remaining identity/profile/candidate means abort cleanup is incomplete. The private run state and SQL result are retained; that run is retired and never resumed. A fresh run requires a new private directory and run UUID.

The private query substitutes the generated list and run fields below; the placeholders are deliberately not executable. A single transaction protects candidate cleanup. The complete application baseline is preserved except the designated synthetic signup-candidate rows. Existing foreign-key restrictions remain enabled during subsequent Auth deletion.

```sql
rollback;
begin;
set local statement_timeout = '60s';
set local lock_timeout = '3s';
create temporary table abort_identities (
  id uuid primary key, email text not null,
  run_id uuid not null, run_started_at timestamptz not null
) on commit drop;
-- The private values contain exact recorded generated identities only.
insert into abort_identities values <PRIVATE_RECORDED_IDENTITY_VALUES>;
do $$
declare c record; found boolean;
begin
  if not exists(select 1 from abort_identities) then
    raise exception 'Recorded partial identities required';
  end if;
  if exists(
    select 1 from abort_identities q
    left join auth.users u on u.id=q.id
    left join public.profiles p on p.id=q.id
    where u.id is null or u.email is distinct from q.email
       or u.raw_user_meta_data->>'phase3_qa_run' is distinct from q.run_id::text
       or u.raw_app_meta_data->>'phase3_fixture_authentication' is distinct from 'true'
       or u.created_at<q.run_started_at
       or q.email not like 'ace-p3-%-'||q.run_id::text||'@example.invalid'
       or p.id is null or p.email is distinct from q.email
       or p.role is distinct from 'student' or p.is_active is distinct from false
  ) then raise exception 'Partial identity ownership or inactive state changed'; end if;
  for c in
    select table_name,column_name from information_schema.columns
    where table_schema='public' and udt_name='uuid'
      and not (table_name='profiles' and column_name='id')
      and not (table_name='v2_signup_candidates' and column_name='student_id')
  loop
    execute format('select exists(select 1 from public.%I r join abort_identities q on r.%I=q.id)',c.table_name,c.column_name) into found;
    if found then raise exception 'Application activity prevents partial abort'; end if;
  end loop;
end $$;
delete from public.v2_signup_candidates
where student_id in (select id from abort_identities);
select jsonb_build_object('check','phase3_partial_preparation_candidate_cleanup',
  'recorded_accounts',(select count(*) from abort_identities),
  'auth_removed',false,'hosted_acceptance',false);
commit;
```

After exact Auth deletion, a private query verifies all three counts are zero, using the same recorded UUID list. Auth identity removal is also independently checked in Authentication → Users; the absence of public profile rows alone is insufficient.

```sql
begin read only;
with ids(id) as (values <PRIVATE_RECORDED_UUID_VALUES>)
select
  (select count(*) from auth.users u join ids q on q.id=u.id) as auth_remaining,
  (select count(*) from public.profiles p join ids q on q.id=p.id) as profiles_remaining,
  (select count(*) from public.v2_signup_candidates c join ids q on q.id=c.student_id) as candidates_remaining;
rollback;
```

This abort path is manual and narrowly scoped. It does not establish a full-run cleanup baseline, genuine Google authentication or payment acceptance. No partial-account abort has been performed on staging by the local verification run.
