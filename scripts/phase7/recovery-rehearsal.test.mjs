import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {withDisposablePostgres} from '../helpers/disposable-postgres.mjs';
import {preparePhase3Database,as,literal,json} from '../helpers/v2-phase3-fixture.mjs';

const migrations=['20261113090000_add_v2_sales_catalogue.sql','20261113100000_add_v2_checkout_ledger.sql','20261113110000_add_v2_payment_fulfillment.sql'];
const report={check:'phase7_synthetic_database_recovery_rehearsal',recordedAt:new Date().toISOString(),scope:'Disposable Unix-socket PostgreSQL only. Synthetic public/Auth/Storage metadata and migration ledger are dumped and restored into another database in the same isolated cluster. Existing cluster roles are reused. No hosted database, Production backup, object bytes, provider event, deployed artifact or real Supabase Auth service is involved.',status:'running',checks:[],productionRecoveryVerified:false,previousDeploymentCompatibilityVerified:false};
const record=(id,condition)=>{report.checks.push({id,status:condition?'pass':'fail'});assert(condition,id);};
const fingerprint=`create or replace function pg_temp.recovery_fingerprint() returns jsonb language plpgsql as $$
declare rel record; row_hash text; rows jsonb:='{}'; definition_hash text;
begin
 for rel in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in('public','auth','storage','supabase_migrations') and c.relkind='r' order by n.nspname,c.relname loop
  execute format('select md5(coalesce(string_agg(md5(to_jsonb(r)::text),'''' order by md5(to_jsonb(r)::text)),'''')) from %I.%I r',rel.nspname,rel.relname) into row_hash;
  rows:=rows||jsonb_build_object(rel.nspname||'.'||rel.relname,row_hash);
 end loop;
 select md5(jsonb_build_object(
  'functions',(select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'body',p.prosrc,'language',l.lanname,'security',p.prosecdef,'volatility',p.provolatile,'settings',p.proconfig,'acl',(select jsonb_agg(to_jsonb(a) order by a.grantee,a.privilege_type,a.grantor,a.is_grantable) from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a)) order by p.oid::regprocedure::text) from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname in('public','auth') and p.probin is null),
  'tables',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,'acl',(select jsonb_agg(to_jsonb(a) order by a.grantee,a.privilege_type,a.grantor,a.is_grantable) from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a)) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','auth','storage','supabase_migrations') and c.relkind='r'),
  'policies',(select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_policies p where schemaname in('public','auth','storage')),
  'triggers',(select jsonb_agg(pg_get_triggerdef(t.oid) order by n.nspname,c.relname,t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in('public','auth','storage'))
 )::text) into definition_hash;
 return jsonb_build_object('rows',rows,'securityAndDefinitionMd5',definition_hash);
end $$;select pg_temp.recovery_fingerprint();`;

test('synthetic combined database dump restores payment, learning and authorization state',{timeout:120000},async()=>{
 try{await withDisposablePostgres(async db=>{
  const {admin,batch,publish}=preparePhase3Database(db);migrations.forEach(db.apply);
  db.query('create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[])');
  const inventory=JSON.parse(readFileSync('deliverables/phase7-release-preparation/migration-inventory.json','utf8'));
  for(const entry of inventory.migrations){
   const source=readFileSync(entry.path,'utf8');assert.equal(createHash('sha256').update(source).digest('hex'),entry.sourceSha256);
   db.query(`insert into supabase_migrations.schema_migrations values(${literal(entry.version)},${literal(entry.path.split('/').at(-1))},array[${literal(source)}])`);
  }
  const student=randomUUID(),foreign=randomUUID();
  for(const id of [student,foreign])db.query(`insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values('${id}','${id}@example.invalid',now(),'{"provider":"google"}')`);
  const quant=batch('quant',true),verbal=batch('verbal');publish(quant);publish(verbal);
  const rpc=(query,identity,name,args,role='authenticated')=>JSON.parse(query(as(identity,`select public.${name}(${args})`,role))||'null');
  const purchased=[];
  for(const upgrade of [false,true]){
   const id=randomUUID(),codes=upgrade?['quant_crash','verbal_crash']:['quant_crash'],batches=upgrade?[quant.id,verbal.id]:[quant.id];
   const prepared=rpc(db.query,student,'prepare_v2_checkout',`'${id}',array[${codes.map(literal)}],array[${batches.map(literal)}]::uuid[],array['${quant.id}']::uuid[],'Synthetic Student','+919000000000',${upgrade}`);
   const order='order_'+id.replaceAll('-',''),payment='pay_'+id.replaceAll('-',''),args=`'${id}','${order}','${payment}',${prepared.amountPaise},'INR'`;
   db.query(as(null,`select public.claim_v2_checkout_order('${id}');select public.attach_v2_checkout_order('${id}','${order}')`,'service_role'));
   assert.equal(rpc(db.query,null,'fulfill_v2_checkout',args,'service_role').state,'fulfilled');
   db.query(as(null,`select public.record_v2_payment_event('evt_${id}','${'a'.repeat(64)}','${id}')`,'service_role'));
   purchased.push({id,args});
  }
  const obligation=rpc(db.query,student,'report_v2_recording_watched',`'${quant.id}','${quant.sessionKey}','${quant.document.sessions[0].content.recordings[0].key}',1`);
  rpc(db.query,student,'submit_v2_session_feedback',`'${obligation.obligationId}','${randomUUID()}',${json({usefulness:4,clarity:5,comment:'Synthetic recovery fixture',attendance:'recording'})}`);
  const item=randomUUID(),content={title:'Synthetic recovery reading',kind:'preSessionReads',url:'https://example.invalid/recovery/reading',targets:[{batchId:quant.id,sessionKey:quant.sessionKey,publicationRevision:1,placement:'session',anchorKey:null,replaceKey:null,order:10}]};
  rpc(db.query,admin,'save_v2_content_item',`'${item}',0,'${randomUUID()}',${json(content)}`);
  const review=rpc(db.query,admin,'v2_content_scope',`'${item}',1,'publish'`);
  rpc(db.query,admin,'publish_v2_content_item',`'${item}',1,'publish','${randomUUID()}',${literal(review.fingerprint)}`);
  const socket=db.query("show unix_socket_directories").replace(/^'|'$/g,''),port=db.query('show port'),owner=db.query('select current_user');
  const info=lstatSync(socket);
  assert(socket.startsWith('/tmp/ace-v2-template-')&&info.isDirectory()&&!info.isSymbolicLink()&&info.uid===process.getuid()&&(info.mode&0o077)===0);
  assert.equal(port,'55440');assert.equal(owner,'ace_template_test');
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('PG')));
  Object.assign(env,{PGHOST:socket,PGPORT:port,PGUSER:owner,PGDATABASE:'postgres'});
  const command=(name,args)=>execFileSync(name,args,{env,encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}).trim();
  const before=JSON.parse(db.query(fingerprint));
  const archive=join(socket,'synthetic-recovery.dump'),started=Date.now();
  command('pg_dump',['--format=custom','--file',archive,'--dbname=postgres']);
  report.archiveSha256=createHash('sha256').update(readFileSync(archive)).digest('hex');
  record('custom-format-archive-created',lstatSync(archive).size>0);
  db.query('create database phase7_restored');
  command('pg_restore',['--exit-on-error','--single-transaction','--dbname=phase7_restored',archive]);
  report.syntheticRestoreDurationMs=Date.now()-started;
  const restoredQuery=sql=>command('psql',['-X','-qAt','-v','ON_ERROR_STOP=1','--dbname=phase7_restored','-c',sql]);
  const after=JSON.parse(restoredQuery(fingerprint));
  record('all-synthetic-application-auth-storage-and-ledger-rows-restored',JSON.stringify(after.rows)===JSON.stringify(before.rows));
  record('functions-permissions-policies-and-triggers-restored',after.securityAndDefinitionMd5===before.securityAndDefinitionMd5);
  record('twenty-source-ledger-rows-retained',restoredQuery('select count(*) from supabase_migrations.schema_migrations')==='20');
  record('purchase-upgrade-and-event-history-retained',restoredQuery("select jsonb_build_array((select count(*) from public.v2_purchases),(select count(*) from public.v2_purchase_upgrades),(select count(*) from public.v2_payment_events))")==='[1, 1, 2]');
  const access=rpc(restoredQuery,student,'get_my_v2_access','');
  record('paid-subjects-and-original-expiry-restored',access.length===2&&access.map(a=>a.product_code).sort().join(',')==='quant_crash,verbal_crash'&&new Set(access.map(a=>a.expires_at)).size===1);
  const learning=rpc(restoredQuery,student,'get_my_v2_learning_state',`'${quant.id}'`);
  record('live-registration-and-completed-feedback-restored',learning.liveRegistered===true&&learning.obligations.length===0);
  record('independently-published-reading-restored',rpc(restoredQuery,student,'get_my_v2_published_course',`'${quant.id}'`).sessions[0].content.preSessionReads.some(r=>r.title===content.title));
  record('foreign-student-remains-denied',rpc(restoredQuery,foreign,'get_my_v2_published_course',`'${quant.id}'`)===null&&rpc(restoredQuery,foreign,'get_my_v2_access','').length===0);
  const privileges=restoredQuery("select jsonb_build_object('browser_fulfillment',has_function_privilege('authenticated','public.fulfill_v2_checkout(uuid,text,text,integer,text)','EXECUTE'),'service_fulfillment',has_function_privilege('service_role','public.fulfill_v2_checkout(uuid,text,text,integer,text)','EXECUTE'),'browser_events',has_table_privilege('authenticated','public.v2_payment_events','SELECT'),'storage_public',(select public from storage.buckets where id='v2-course-content'))");
  const grants=JSON.parse(privileges);
  record('service-only-payments-and-private-storage-remain-enforced',!grants.browser_fulfillment&&grants.service_fulfillment&&!grants.browser_events&&!grants.storage_public);
  const replayBefore=JSON.parse(restoredQuery(fingerprint));
  record('captured-fulfillment-replay-remains-idempotent',purchased.every(p=>rpc(restoredQuery,null,'fulfill_v2_checkout',p.args,'service_role').replayed===true));
  record('replayed-payment-does-not-change-restored-rows',JSON.stringify(JSON.parse(restoredQuery(fingerprint)).rows)===JSON.stringify(replayBefore.rows));
  db.query(`update public.profiles set full_name='Synthetic later write' where id='${student}'`);
  record('backup-point-does-not-include-later-source-write',restoredQuery(`select full_name from public.profiles where id='${student}'`)!=='Synthetic later write');
  report.restoredRelationCount=Object.keys(after.rows).length;
  report.oldRuntimeCompatibility='Not established: the actual previous Production artifact and its complete database are unavailable; restored database invariants are not application rollback evidence.';
 });report.status='passed';}catch(error){report.status='failed';throw error;}finally{
  report.testSourceSha256=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');
  writeFileSync(join(process.env.PHASE7_REPORT_DIRECTORY??'deliverables/phase7-release-preparation','local-recovery-results.json'),JSON.stringify(report,null,2)+'\n');
 }
});
