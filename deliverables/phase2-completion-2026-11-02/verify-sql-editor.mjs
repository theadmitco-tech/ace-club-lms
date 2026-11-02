// Disposable local PostgreSQL only; no shared connection is accepted.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withDisposablePostgres } from '../../scripts/helpers/disposable-postgres.mjs';

const directory = fileURLToPath(new URL('./sql-editor/', import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), 'ace-sql-editor-check-'));
const original = readFileSync(join(directory, '02-apply-all-ten-if-absent.sql'), 'utf8');
const reconciliation = readFileSync(join(directory, '../RECONCILE-ACTIVATION.sql'), 'utf8');
const exclusionJson = reconciliation.match(/expected_profile_exclusions as \(select \* from jsonb_to_recordset\('((?:[^']|'')*)'::jsonb\)/)?.[1].replaceAll("''", "'");
assert.ok(exclusionJson, 'Exact reconciliation exclusion identities are required');
const exclusionLiteral = "'" + exclusionJson.replaceAll("'", "''") + "'::jsonb";
let acknowledged = original.replace('REPLACE_WITH_VERIFIED_PROJECT_REF', 'eyphkkginlgoaxflauog')
  .replace('REPLACE_WITH_BACKUP_RESTORE_EVIDENCE', 'DISPOSABLE LOCAL TEST ONLY, NOT STAGING RECOVERY EVIDENCE');
let sequence = 0;
function command(sql) {
  const path = join(scratch, `${sequence++}.sql`);
  writeFileSync(path, sql);
  return `\\i ${path}`;
}
const passed = [];
try {
  await withDisposablePostgres(async ({ query, rejects, apply }) => {
    query(`create role anon nologin; create role authenticated nologin;
      create role service_role nologin bypassrls; create schema auth;
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;
      create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),raw_user_meta_data jsonb default '{}');
      alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
      alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
    for (const file of ['20260731051000_production_baseline.sql',
      '20260731062700_enforce_material_release.sql', '20260731110000_require_provisioned_portal_access.sql',
      '20261018090000_add_v2_product_entitlements.sql']) apply(file);
    query(`create schema supabase_migrations;
      create table supabase_migrations.schema_migrations(version text primary key, statements text[], name text);
      insert into supabase_migrations.schema_migrations values
        ('20260731051000',array['synthetic prior ledger'],'production_baseline'),
        ('20261018090000',array['synthetic Phase 1 ledger'],'add_v2_product_entitlements');
      create table public.packet_preservation_fixture(id integer primary key,label text);
      insert into public.packet_preservation_fixture values(1,'Synthetic existing row');
      create view public.worksheet_question_catalog as select id,label from public.packet_preservation_fixture;
      create view public.worksheet_question_log_catalog as select id,label from public.packet_preservation_fixture where id>0;`);
    const syntheticViewHashes = query(`select jsonb_object_agg(relname,md5(pg_get_viewdef(oid,true)))
      from pg_class where relnamespace='public'::regnamespace and relkind='v'`);
    const fixtureViewHashes = (sql) => sql.replaceAll(/expected_views jsonb := '[^']+'::jsonb;/g,
      `expected_views jsonb := '${syntheticViewHashes.replaceAll("'", "''")}'::jsonb;`);
    const oldTables = query("select tablename from pg_tables where schemaname='public' order by tablename").split('\n');
    const snapshot = () => Object.fromEntries(oldTables.map(table => [table,
      query(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') from public."${table}" t`)]));
    const before = snapshot();
    const assertAbsent = () => {
      assert.equal(query("select to_regclass('public.v2_course_offerings') is null"), 't');
      assert.equal(query('select count(*) from supabase_migrations.schema_migrations'), '2');
      assert.deepEqual(snapshot(), before);
    };
    for (const name of ['00-schema-preflight.sql','01-ledger-and-definitions.sql','04-view-and-sequence-metadata.sql']) {
      JSON.parse(query(`\\i ${join(directory,name)}`));
    }
    passed.push('read-only preflight and ledger/definition inventory execute before Phase 2');
    const missingActivation = JSON.parse(query(`\\i ${join(directory,'../RECONCILE-ACTIVATION.sql')}`));
    assert.equal(missingActivation.read_only, 'on');
    assert.equal(missingActivation.present_version_count, 0);
    assert.equal(missingActivation.all_ten_ledger_bodies_match, false);
    assert.equal(missingActivation.all_routine_guards_match, false);
    passed.push('read-only reconciliation reports missing activation without aborting or changing data');
    rejects(command(original), /Verify staging dashboard identity/); assertAbsent();
    rejects(command(original.replace('REPLACE_WITH_VERIFIED_PROJECT_REF','eyphkkginlgoaxflauog')),
      /backup and successful disposable restore/); assertAbsent();
    passed.push('unacknowledged target and recovery gates fail without changes');
    rejects(command(acknowledged), /Current public view definitions differ/); assertAbsent();
    passed.push('unmodified archive-reference view hashes reject the synthetic database before migration writes');
    // Only the disposable fixture substitutes its own two view hashes. The
    // published packet retains the recovered archive reference hashes unchanged.
    acknowledged = fixtureViewHashes(acknowledged);
    query('create view public.unexpected_recovery_view as select 1 as unexpected');
    rejects(command(acknowledged), /Current public view definitions differ/);
    query('drop view public.unexpected_recovery_view');
    query('create sequence public.unexpected_recovery_sequence');
    rejects(command(acknowledged), /Unexpected public sequence/);
    query('drop sequence public.unexpected_recovery_sequence');
    query('create materialized view public.unexpected_recovery_view as select 1 as unexpected');
    rejects(command(acknowledged), /Unexpected public materialized view/);
    query('drop materialized view public.unexpected_recovery_view');
    assertAbsent(); passed.push('additional views, materialized views and sequences each stop before migration writes');
    query("create or replace view public.worksheet_question_catalog as select id,label||' changed' as label from public.packet_preservation_fixture");
    rejects(command(acknowledged), /Current public view definitions differ/);
    query('create or replace view public.worksheet_question_catalog as select id,label from public.packet_preservation_fixture');
    assertAbsent(); passed.push('a changed definition of an expected view stops before migration writes');
    query("delete from supabase_migrations.schema_migrations where version='20261018090000'");
    rejects(command(acknowledged), /Phase 1 ledger entry missing/);
    query("insert into supabase_migrations.schema_migrations values ('20261018090000',array['synthetic Phase 1 ledger'],'add_v2_product_entitlements')");
    assertAbsent(); passed.push('missing Phase 1 ledger stops without replaying Phase 1');
    query("insert into supabase_migrations.schema_migrations values ('20261019090000',array['unexpected partial state'],'partial')");
    rejects(command(acknowledged), /already recorded/);
    query("delete from supabase_migrations.schema_migrations where version='20261019090000'");
    query('create view public.v2_course_offerings as select 1 as unexpected');
    rejects(command(acknowledged), /Existing Phase 2 object/);
    query('drop view public.v2_course_offerings');
    query('create function public.v2_batch_date(text) returns date language sql as $$ select null::date $$');
    rejects(command(acknowledged), /Existing Phase 2 routine/);
    query('drop function public.v2_batch_date(text)');
    assertAbsent(); passed.push('partial ledger, orphan relation and orphan routine each stop safely');
    rejects(command(acknowledged.replace("notify pgrst, 'reload schema';", 'select 1/0;')), /division by zero/);
    assertAbsent(); passed.push('failure after all ten migrations rolls back schema, ledger and data');
    for (const mutation of [
      "update public.v2_products set name=name||' unexpected';",
      "update supabase_migrations.schema_migrations set name='unexpected' where version='20260731051000';",
    ]) {
      rejects(command(acknowledged.replace('do $ace_preservation$', mutation+'\ndo $ace_preservation$')),
        /Phase 1 or earlier migration ledger changed/);
      assertAbsent();
    }
    passed.push('Phase 1 data and prior ledger tampering both abort and roll back the transaction');
    rejects(command(acknowledged.replace('do $ace_existing_preservation$',
      "update public.packet_preservation_fixture set label='Unexpected mutation';\ndo $ace_existing_preservation$")),
      /Existing application data changed/);
    assertAbsent(); passed.push('unrelated existing application data mutations abort and roll back');
    rejects(command(acknowledged.replace('do $ace_recovery_schema_preservation$',
      'revoke all on public.worksheet_question_catalog from authenticated;\ndo $ace_recovery_schema_preservation$')),
      /Existing view definitions or privileges changed/);
    assertAbsent(); passed.push('existing view privilege drift aborts and rolls back the transaction');
    assert.match(query(command(acknowledged)), /transaction committed/);
    assert.equal(query('select count(*) from supabase_migrations.schema_migrations'), '12');
    assert.deepEqual(snapshot(), before);
    passed.push('successful atomic application records exactly ten versions and preserves all existing application rows');
    const installedActivation = JSON.parse(query(`\\i ${join(directory,'../RECONCILE-ACTIVATION.sql')}`));
    assert.equal(installedActivation.present_version_count, 10);
    assert.equal(installedActivation.all_ten_ledger_bodies_match, true);
    assert.equal(installedActivation.all_private_table_guards_match, true);
    assert.equal(installedActivation.all_routine_guards_match, true);
    passed.push('read-only reconciliation verifies exact ten source bodies, eighteen table guards and final routine implementations');
    query(`insert into auth.users(id,email,created_at)
      select id,email,'2099-01-01'::timestamptz from jsonb_to_recordset(${exclusionLiteral}) as x(id uuid,email text);
      insert into public.profiles(id,email,full_name,created_at)
      select id,email,'Synthetic designated fixture','2099-01-01'::timestamptz from jsonb_to_recordset(${exclusionLiteral}) as x(id uuid,email text)
      on conflict(id) do update set email=excluded.email,full_name=excluded.full_name,created_at=excluded.created_at;`);
    const verifiedExclusions = JSON.parse(query(command(reconciliation)));
    assert.equal(verifiedExclusions.verified_profile_exclusion_count, 10);
    assert.equal(verifiedExclusions.original_application_tables.find(table => table.name === 'profiles').actual_count, 0);
    query(`update public.profiles set email='different-identity@example.invalid'
      where id=((${exclusionLiteral})->0->>'id')::uuid;`);
    const rejectedExclusion = JSON.parse(query(command(reconciliation)));
    assert.equal(rejectedExclusion.verified_profile_exclusion_count, 9);
    assert.equal(rejectedExclusion.original_application_tables.find(table => table.name === 'profiles').actual_count, 1);
    query(`delete from public.profiles where id in(select id from jsonb_to_recordset(${exclusionLiteral}) as x(id uuid));
      delete from auth.users where id in(select id from jsonb_to_recordset(${exclusionLiteral}) as x(id uuid));`);
    assert.deepEqual(snapshot(), before);
    passed.push('only exact designated new Auth/profile identities are excluded; an email mismatch restores that row to the comparison');
    assert.match(query(command(fixtureViewHashes(readFileSync(join(directory,'03-postflight.sql'),'utf8')))), /checks passed/);
    JSON.parse(query(`\\i ${join(directory,'00-schema-preflight.sql')}`));
    const catalogue = JSON.parse(query(`\\i ${join(directory,'01-ledger-and-definitions.sql')}`));
    writeFileSync(join(directory,'local-reference-catalogue.json'), JSON.stringify(catalogue,null,2)+'\n');
    passed.push('postflight validates eighteen private tables, RLS, role grants, RPCs and canonical mapping');
    rejects(command(acknowledged), /already recorded/);
    assert.equal(query('select count(*) from supabase_migrations.schema_migrations'), '12');
    assert.deepEqual(snapshot(), before);
    passed.push('repeat application stops without changing installed state');
  });
  writeFileSync(join(directory, 'local-verification.json'), JSON.stringify({
    verified_at: new Date().toISOString(), scope: 'Disposable local PostgreSQL with synthetic ledger and explicit fixture-only view-hash substitution; not staging backup/restore or acceptance', passed,
  },null,2)+'\n');
  console.log(`${passed.length} SQL packet checks passed. No hosted database was accessed.`);
} finally {
  rmSync(scratch, {recursive:true,force:true});
}
