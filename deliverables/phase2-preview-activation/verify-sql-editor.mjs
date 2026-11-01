// Disposable local PostgreSQL only; no shared connection is accepted.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withDisposablePostgres } from '../../scripts/helpers/disposable-postgres.mjs';

const directory = fileURLToPath(new URL('./sql-editor/', import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), 'ace-sql-editor-check-'));
const original = readFileSync(join(directory, '02-apply-all-six-if-absent.sql'), 'utf8');
const acknowledged = original.replace('REPLACE_WITH_VERIFIED_PROJECT_REF', 'eyphkkginlgoaxflauog')
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
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
      alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
      alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
    for (const file of ['20260731051000_production_baseline.sql',
      '20260731062700_enforce_material_release.sql', '20260731110000_require_provisioned_portal_access.sql',
      '20261018090000_add_v2_product_entitlements.sql']) apply(file);
    query(`create schema supabase_migrations;
      create table supabase_migrations.schema_migrations(version text primary key, statements text[], name text);
      insert into supabase_migrations.schema_migrations values
        ('20260731051000',array['synthetic prior ledger'],'production_baseline'),
        ('20261018090000',array['synthetic Phase 1 ledger'],'add_v2_product_entitlements');`);
    const oldTables = query("select tablename from pg_tables where schemaname='public' order by tablename").split('\n');
    const snapshot = () => Object.fromEntries(oldTables.map(table => [table,
      query(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') from public."${table}" t`)]));
    const before = snapshot();
    const assertAbsent = () => {
      assert.equal(query("select to_regclass('public.v2_course_offerings') is null"), 't');
      assert.equal(query('select count(*) from supabase_migrations.schema_migrations'), '2');
      assert.deepEqual(snapshot(), before);
    };
    for (const name of ['00-schema-preflight.sql','01-ledger-and-definitions.sql']) {
      JSON.parse(query(`\\i ${join(directory,name)}`));
    }
    passed.push('read-only preflight and ledger/definition inventory execute before Phase 2');
    rejects(command(original), /Verify staging dashboard identity/); assertAbsent();
    rejects(command(original.replace('REPLACE_WITH_VERIFIED_PROJECT_REF','eyphkkginlgoaxflauog')),
      /backup and successful disposable restore/); assertAbsent();
    passed.push('unacknowledged target and recovery gates fail without changes');
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
    assertAbsent(); passed.push('failure after all six migrations rolls back schema, ledger and data');
    for (const mutation of [
      "update public.v2_products set name=name||' unexpected';",
      "update supabase_migrations.schema_migrations set name='unexpected' where version='20260731051000';",
    ]) {
      rejects(command(acknowledged.replace('do $ace_preservation$', mutation+'\ndo $ace_preservation$')),
        /Phase 1 or earlier migration ledger changed/);
      assertAbsent();
    }
    passed.push('Phase 1 data and prior ledger tampering both abort and roll back the transaction');
    assert.match(query(command(acknowledged)), /transaction committed/);
    assert.equal(query('select count(*) from supabase_migrations.schema_migrations'), '8');
    assert.deepEqual(snapshot(), before);
    passed.push('successful atomic application records exactly six versions and preserves all existing application rows');
    assert.match(query(`\\i ${join(directory,'03-postflight.sql')}`), /checks passed/);
    JSON.parse(query(`\\i ${join(directory,'00-schema-preflight.sql')}`));
    const catalogue = JSON.parse(query(`\\i ${join(directory,'01-ledger-and-definitions.sql')}`));
    writeFileSync(join(directory,'local-reference-catalogue.json'), JSON.stringify(catalogue,null,2)+'\n');
    passed.push('postflight validates eight private tables, RLS, role grants, RPCs and canonical mapping');
    rejects(command(acknowledged), /already recorded/);
    assert.equal(query('select count(*) from supabase_migrations.schema_migrations'), '8');
    assert.deepEqual(snapshot(), before);
    passed.push('repeat application stops without changing installed state');
  });
  writeFileSync(join(directory, 'local-verification.json'), JSON.stringify({
    verified_at: new Date().toISOString(), scope: 'Disposable local PostgreSQL with synthetic ledger; not staging backup/restore or acceptance', passed,
  },null,2)+'\n');
  console.log(`${passed.length} SQL packet checks passed. No hosted database was accessed.`);
} finally {
  rmSync(scratch, {recursive:true,force:true});
}
