import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { PROJECT, literal, validateConfig, ORIGIN } from './phase1-hosted-closeout-config.mjs';
import { CASES, buildSetupSql, buildCleanupSql } from './phase1-sql-editor-fixtures.mjs';
import {buildLegacyEditorRepair} from './phase1-legacy-editor-repair.mjs';
const runId=randomUUID();
const state={project:PROJECT,runId,users:CASES.map(c=>({label:c.label,id:randomUUID(),email:`ace-p1-${c.label}-${runId}@example.invalid`}))};
test('SQL generation refuses foreign projects, missing users and mismatched ownership',()=>{
  for(const bad of [{...state,project:'other'},{...state,users:state.users.slice(1)},{...state,users:state.users.map((u,i)=>i?u:{...u,email:'real@example.com'})}]) {
    assert.throws(()=>buildSetupSql(bad));assert.throws(()=>buildCleanupSql(bad));
  }
});
test('passwordless configuration still enforces staging and key roles',()=>{
  const key=role=>'header.'+Buffer.from(JSON.stringify({role,ref:PROJECT})).toString('base64url')+'.signature';
  const config={SUPABASE_URL:ORIGIN,SUPABASE_ANON_KEY:key('anon'),SUPABASE_SERVICE_ROLE_KEY:key('service_role')};
  assert.equal(validateConfig(config,{database:false}).SUPABASE_URL,ORIGIN);
  assert.throws(()=>validateConfig({...config,SUPABASE_SERVICE_ROLE_KEY:key('anon')},{database:false}));
});
test('cleanup plus additive editor repair preserves original data and rolls back baseline mismatch',()=>{
  const dir=mkdtempSync(join(tmpdir(),'ace-p1-passwordless-sql-'));
  const env={PATH:process.env.PATH,PGHOST:dir,PGPORT:'55449',PGUSER:'qa_sql',PGDATABASE:'postgres'};
  const run=(bin,args,input)=>spawnSync(bin,args,{env,input,encoding:'utf8',timeout:20000});
  const checked=(bin,args,input)=>{const result=run(bin,args,input);assert.equal(result.status,0,result.stderr||result.error?.message);return result.stdout.trim();};
  const sql=q=>checked('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],q);
  let started=false;
  try {
    checked('initdb',['-D',join(dir,'data'),'-U','qa_sql','-A','trust','--no-locale','--encoding=UTF8','--no-sync']);
    checked('pg_ctl',['-D',join(dir,'data'),'-l',join(dir,'postgres.log'),'-o',`-h '' -k '${dir}' -p 55449 -F -c unix_socket_permissions=0700`,'-w','start']);started=true;
    sql("create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb); create function auth.uid() returns uuid language sql stable as $$select null::uuid$$; grant usage on schema public,auth to anon,authenticated,service_role; create table public.profiles(id uuid primary key,email text,role text,is_active boolean); create function public.is_portal_admin() returns boolean language sql stable as $$select false$$; create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text); insert into supabase_migrations.schema_migrations values('20261018090000');");
    checked('psql',['-X','-q','-v','ON_ERROR_STOP=1','-f','supabase/migrations/20261018090000_add_v2_product_entitlements.sql']);
    for(const user of state.users)sql(`insert into auth.users values(${literal(user.id)},${literal(user.email)},jsonb_build_object('phase1_qa_run',${literal(runId)})); insert into public.profiles values(${literal(user.id)},${literal(user.email)},${literal(user.label==='admin'?'admin':'student')},${user.label!=='inactive'});`);
    const unrelated=randomUUID();
    sql(`insert into public.profiles values(${literal(unrelated)},'existing@example.invalid','student',true); select public.grant_v2_purchase(${literal(unrelated)},array['quant_crash'],'unrelated-existing-purchase',statement_timestamp()-interval '1 second',(public.quote_v2_products(array['quant_crash'])->>'price_version_id')::uuid,1000000,'INR');`);
    sql("create table public.master_practice_questions(id uuid primary key,master_practice_set_id uuid,question_text text,correct_answer text,updated_at timestamptz);insert into public.master_practice_questions values(gen_random_uuid(),gen_random_uuid(),'Existing question with (1) and (2)','A','2026-01-01');");
    const original=sql('select md5(string_agg(to_jsonb(t)::text,\'\' order by id)) from public.v2_purchases t;');
    const setup=JSON.parse(sql(buildSetupSql(state)));assert.equal(setup.purchase_count,15);
    assert.equal(sql("select count(*) from public.v2_purchases where expires_at<statement_timestamp();"),'2');
    assert.equal(sql('select count(*) from public.v2_purchases where revoked_at is not null;'),'1');
    const repeated=run('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],buildSetupSql(state));assert.notEqual(repeated.status,0);assert.match(repeated.stderr,/already has purchases/);
    assert.equal(sql('select count(*) from public.v2_purchases;'),'16');
    const bad=run('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],buildLegacyEditorRepair(state,{...setup.baseline_before_purchases,md5:'0'.repeat(32)}));
    assert.notEqual(bad.status,0);assert.match(bad.stderr,/baseline differs/);assert.equal(sql('select count(*) from public.v2_purchases;'),'16');
    const repair=JSON.parse(sql(buildLegacyEditorRepair(state,setup.baseline_before_purchases)));
    assert.equal(repair.remaining_fixture_purchases,0);assert.equal(repair.existing_column_values_preserved,true);
    assert.deepEqual(repair.after_purchase_cleanup,setup.baseline_before_purchases);assert.equal(repair.added_columns.length,9);
    assert.equal(sql("select question_type||':'||question_text||':'||correct_answer from public.master_practice_questions;"),'problem_solving:Existing question with (1) and (2):A');
    assert.equal(sql("select count(*) from supabase_migrations.schema_migrations where version='20261018090000';"),'1');
    assert.equal(sql('select md5(string_agg(to_jsonb(t)::text,\'\' order by id)) from public.v2_purchases t;'),original);
    const repeat=JSON.parse(sql(buildLegacyEditorRepair(state,repair.after_additive_schema_repair)));assert.deepEqual(repeat.added_columns,[]);assert.equal(repeat.existing_column_values_preserved,true);

  }finally{if(started)run('pg_ctl',['-D',join(dir,'data'),'-m','immediate','-w','stop']);rmSync(dir,{recursive:true,force:true});}
});
