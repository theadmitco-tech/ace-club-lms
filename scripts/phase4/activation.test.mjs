import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {copyFileSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {withDisposablePostgres} from '../helpers/disposable-postgres.mjs';
import {literal} from '../phase1-hosted-closeout-config.mjs';
const migration='20261102170000_add_v2_learning_feedback.sql';
const prerequisites=['20260731051000_production_baseline.sql','20260731062700_enforce_material_release.sql','20260731110000_require_provisioned_portal_access.sql','20261018090000_add_v2_product_entitlements.sql','20261019090000_add_v2_template_drafts.sql','20261019100000_add_v2_batch_drafts.sql','20261019110000_add_v2_private_meeting_drafts.sql','20261020090000_add_v2_outline_schedules.sql','20261020100000_add_v2_batch_publication.sql','20261025100000_add_v2_enrolled_schedules.sql','20261102100000_add_v2_programme_content.sql','20261102110000_add_v2_student_delivery.sql','20261102120000_add_v2_content_imports.sql','20261102130000_add_v2_publication_scopes.sql'];
test('activation packet rejects stale recovery and replay while preserving rows and enforcing exact ACLs',{timeout:120000},()=>withDisposablePostgres(async({query,apply,rejects})=>{
 const directory=mkdtempSync(join(tmpdir(),'phase4-activation-check-'));
 try{
  query(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;
   create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
   alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
   alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;
   create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,statements text[],name text);`);
  for(const file of prerequisites){apply(file);const version=file.split('_')[0];query(`insert into supabase_migrations.schema_migrations values(${literal(version)},array[${literal(readFileSync(`supabase/migrations/${file}`,'utf8'))}],${literal(file.slice(version.length+1,-4))})`);}
  query(`create table public.activation_existing_row(id integer primary key,value text);insert into public.activation_existing_row values(1,'Existing application value');`);
  const report=JSON.parse(query(`create function pg_temp.recovery_tables() returns jsonb language plpgsql as $$declare t record;v jsonb;result jsonb:='[]';begin
   for t in select tablename from pg_tables where schemaname='public' order by tablename loop
    execute format('select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text collate "C"),''[]'') from public.%I r',t.tablename) into v;
    result:=result||jsonb_build_array(jsonb_build_object('table',t.tablename,'rows',jsonb_array_length(v),'md5',md5(v::text),'matches',true));
   end loop;return result;end;$$;
   select jsonb_build_object('tables',pg_temp.recovery_tables(),'ledgerMd5',(select md5(coalesce(jsonb_agg(to_jsonb(m) order by version),'[]')::text) from supabase_migrations.schema_migrations m),
    'routineGuards',(select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'sourceMd5',md5(p.prosrc),'securityDefiner',p.prosecdef,'configuration',to_jsonb(p.proconfig))) from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in ('get_my_v2_published_course','get_my_v2_meeting','get_my_v2_batch_schedules')));`));
  report.status='application-rows-restored';report.ledgerMatches=true;report.snapshotSha256=createHash('sha256').update(JSON.stringify(report)).digest('hex');
  for(const path of ['scripts/phase4','supabase/migrations','deliverables/phase4-preview-activation'])mkdirSync(join(directory,path),{recursive:true});
  copyFileSync('scripts/phase4/prepare-activation.py',join(directory,'scripts/phase4/prepare-activation.py'));
  for(const file of [migration,'20261018090000_add_v2_product_entitlements.sql'])copyFileSync(`supabase/migrations/${file}`,join(directory,'supabase/migrations',file));
  writeFileSync(join(directory,'deliverables/phase4-preview-activation/application-recovery-report.json'),JSON.stringify(report));
  const generated=spawnSync('python3',[join(directory,'scripts/phase4/prepare-activation.py')],{encoding:'utf8',timeout:30000});assert.equal(generated.status,0,generated.stderr);
  const packet=readFileSync(join(directory,'deliverables/phase4-preview-activation/RUN-ACTIVATION.sql'),'utf8');
  const absent=()=>{assert.equal(query("select to_regclass('public.v2_feedback_obligations') is null"),'t');assert.equal(query("select count(*) from supabase_migrations.schema_migrations where version='20261102170000'"),'0');};
  query("update public.activation_existing_row set value='Changed since recovery' where id=1");rejects(packet,/Existing application data differs/);absent();assert.equal(query('select value from public.activation_existing_row'),'Changed since recovery');query("update public.activation_existing_row set value='Existing application value' where id=1");
  query("update supabase_migrations.schema_migrations set name='changed' where version='20261018090000'");rejects(packet,/Migration ledger differs/);absent();query("update supabase_migrations.schema_migrations set name='add_v2_product_entitlements' where version='20261018090000'");
  const originalFunction=query("select pg_get_functiondef('public.get_my_v2_published_course(uuid)'::regprocedure)");
  query("create or replace function public.get_my_v2_published_course(p_batch_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin return null;end;$$");rejects(packet,/Existing delivery function changed/);absent();query(originalFunction);
  const result=JSON.parse(query(packet));assert.equal(result.check,'phase4_activation');assert.equal(result.existingRowsPreserved,true);assert.equal(result.phase1LedgerPreserved,true);assert.equal(result.newPrivateTables,7);assert.equal(result.phase3Activated,false);assert.equal(result.sourceSha256,createHash('sha256').update(readFileSync(`supabase/migrations/${migration}`)).digest('hex'));
  assert.equal(query('select value from public.activation_existing_row'),'Existing application value');
  for(const signature of ['get_my_v2_published_course(uuid)','get_my_v2_meeting(uuid,uuid)','get_my_v2_batch_schedules()']){
   const roles=JSON.parse(query(`select jsonb_agg(role_name order by role_name) from unnest(array['anon','authenticated','service_role']) role_name where has_function_privilege(role_name,${literal('public.'+signature)},'EXECUTE')`));assert.deepEqual(roles,['authenticated']);
  }
  const ledgerAfter=query('select md5(jsonb_agg(to_jsonb(m) order by version)::text) from supabase_migrations.schema_migrations m');
  rejects(packet,/Phase 4 already recorded/);assert.equal(query('select md5(jsonb_agg(to_jsonb(m) order by version)::text) from supabase_migrations.schema_migrations m'),ledgerAfter);assert.equal(query('select count(*) from public.v2_feedback_obligations'),'0');
 }finally{rmSync(directory,{recursive:true,force:true});}
}));
