import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';

const lit=(value) => `'${String(value).replaceAll("'","''")}'`;
const json=(value) => `${lit(JSON.stringify(value))}::jsonb`;
const admin=randomUUID(), otherAdmin=randomUUID(), student=randomUUID(), inactive=randomUUID();
const url='https://meet.google.com/aaa-bbbb-ccc';
const otherUrl='https://meet.google.com/ddd-eeee-fff';
const migration='20261019110000_add_v2_private_meeting_drafts.sql';
const as=(user,sql,role='authenticated') => `begin; set local role ${role}; set local request.jwt.claim.sub=${lit(user ?? '')}; ${sql}; commit;`;
const saveSql=(request) => `select public.save_v2_meeting_draft(${json(request)})`;

test('private meeting drafts in disposable PostgreSQL',{ timeout: 120000 },async (t) => withDisposablePostgres(async ({ query,rejects,concurrentQuery,apply }) => {
  query(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  for (const file of ['20260731051000_production_baseline.sql','20260731062700_enforce_material_release.sql',
    '20260731110000_require_provisioned_portal_access.sql','20261018090000_add_v2_product_entitlements.sql',
    '20261019090000_add_v2_template_drafts.sql','20261019100000_add_v2_batch_drafts.sql']) apply(file);
  query(`insert into auth.users(id,email) values ('${admin}','admin-one@example.test'),('${otherAdmin}','admin-two@example.test'),
    ('${student}','student@example.test'),('${inactive}','inactive@example.test');
    update public.profiles set role='admin',is_active=true where id in ('${admin}','${otherAdmin}');
    update public.profiles set role='admin',is_active=false where id='${inactive}';
    update public.profiles set role='student',is_active=true where id='${student}';
    insert into public.courses(id,name,is_active) values ('c3000000-0000-4000-8000-000000000001','Synthetic existing batch',false);
    insert into public.enrollments(user_id,course_id) values ('${student}','c3000000-0000-4000-8000-000000000001');
    select public.grant_v2_purchase('${student}',array['quant_crash'],'synthetic-meeting-access',now()-interval '1 day',
      'a1000000-0000-4000-8000-000000000002',1000000,'INR');`);
  const templateId=randomUUID();
  const events=[0,1].map((dayOffset) => ({ key: randomUUID(),title: 'Synthetic lesson',section: 'quant',dayOffset,localStartTime: '19:00',durationMinutes: 60,instructor: '',capacity: 8 }));
  query(as(admin,`select public.save_v2_template_draft('${templateId}','quant',0,'${randomUUID()}',${json({ title: 'Synthetic curriculum',summary: '',durationDays: 7,events })})`));
  const createBatch=() => {
    const input={ id: randomUUID(),templateId,templateRevision: 1,expectedRevision: 0,requestId: randomUUID(),title: 'Synthetic batch',startDate: '2028-01-01',timeZone: 'Asia/Kolkata',events: null };
    const proposal=JSON.parse(query(as(admin,`select public.preview_v2_batch_draft(${json(input)})`)));
    return JSON.parse(query(as(admin,`select public.save_v2_batch_draft(${json(input)},'${proposal.fingerprint}')`))).draft;
  };
  const batch=createBatch(), batchTwo=createBatch();
  const requestFor=(target=batch,expectedRevision=0) => ({ batchId: target.id,batchRevision: target.revision,expectedRevision,requestId: randomUUID(),links: target.events.map((event) => ({ key: event.key,url })) });
  const read=(id=batch.id,user=admin) => JSON.parse(query(as(user,`select public.read_v2_meeting_draft('${id}')`)));
  const save=(request,user=admin) => JSON.parse(query(as(user,saveSql(request))));
  const snapshot=(sql) => query(`select coalesce(jsonb_agg(to_jsonb(s) order by to_jsonb(s)::text),'[]') from (${sql}) s`);
  const oldTables=query("select tablename from pg_tables where schemaname='public' order by tablename").split('\n');
  const names=oldTables.map(lit).join(',');
  const functions=query("select string_agg(oid::text,',') from pg_proc where pronamespace='public'::regnamespace");
  const oldState=() => ({
    rows:Object.fromEntries(oldTables.map((table) => [table,snapshot(`select * from public."${table}"`)])),
    functions:snapshot(`select oid,pg_get_functiondef(oid),proacl from pg_proc where oid in (${functions})`),
    columns:snapshot(`select * from information_schema.columns where table_schema='public' and table_name in (${names})`),
    indexes:snapshot(`select * from pg_indexes where schemaname='public' and tablename in (${names})`),
    policies:snapshot(`select * from pg_policies where schemaname='public' and tablename in (${names})`),
    constraints:snapshot(`select conname,pg_get_constraintdef(oid) from pg_constraint where conrelid in (select oid from pg_class where relnamespace='public'::regnamespace and relname in (${names}))`),
    privileges:snapshot(`select relname,relacl,relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname in (${names})`),
    triggers:snapshot(`select oid,pg_get_triggerdef(oid) from pg_trigger where tgrelid in (select oid from pg_class where relnamespace='public'::regnamespace and relname in (${names})) and not tgisinternal`),
  });
  const before=oldState();
  let firstRequest;
  await t.test('failed migration rolls back; successful application preserves the prior fixture',() => {
    query('create view public.v2_batch_meeting_revisions as select 1 as unexpected');
    assert.throws(() => apply(migration));
    assert.equal(query("select to_regprocedure('public.save_v2_meeting_draft(jsonb)') is null"),'t');
    query('drop view public.v2_batch_meeting_revisions');
    assert.deepEqual(oldState(),before);
    apply(migration); assert.deepEqual(oldState(),before);
  });
  await t.test('a missing draft has empty private slots and reading never creates data',() => {
    const result=read();
    assert.deepEqual(result.batch,batch); assert.equal(result.revision,0);
    assert.deepEqual(result.links,events.map((event) => ({ key:event.key,url:null })));
    assert.equal(query('select count(*) from public.v2_batch_meeting_revisions'),'0');
    rejects(as(admin,`select public.read_v2_meeting_draft('${randomUUID()}')`),/unavailable/);
  });
  await t.test('saves remain private and do not add links to schedule projections or receipts',() => {
    firstRequest=requestFor(); const receipt=save(firstRequest);
    assert.deepEqual(receipt,{ batchId:batch.id,batchRevision:1,revision:1,replayed:false });
    assert.deepEqual(read().links,firstRequest.links);
    assert.equal(read(batchTwo.id).revision,0);
    const schedule=query(as(admin,'select public.list_v2_batch_drafts()'));
    assert(!schedule.includes('meet.google.com')); assert(!schedule.includes('links'));
    assert.deepEqual(JSON.parse(schedule).find((item) => item.id===batch.id),batch);
    assert.deepEqual(oldState(),before);
  });
  await t.test('anonymous, entitled Student, inactive and service-role callers cannot access private details',() => {
    assert.equal(query(as(student,"select public.can_access_v2_product('quant_crash')")),'t');
    for (const [user,role] of [[null,'anon'],[null,'authenticated'],[student,'authenticated'],[inactive,'authenticated'],[admin,'service_role']]) {
      rejects(as(user,`select public.read_v2_meeting_draft('${batch.id}')`,role),/permission denied|Active Admin/);
      rejects(as(user,saveSql(requestFor()),role),/permission denied|Active Admin/);
    }
    for (const user of [student,inactive,null]) assert.equal(query(as(user,'select count(*) from public.v2_batch_meeting_revisions')),'0');
    rejects(as(null,'select * from public.v2_batch_meeting_revisions','anon'),/permission denied/);
    rejects(as(admin,'select * from public.v2_batch_meeting_revisions','service_role'),/permission denied/);
  });
  await t.test('direct mutation and private validation are denied even with permissive platform defaults',() => {
    for (const role of ['anon','authenticated','service_role']) {
      for (const operation of ['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) assert.equal(query(`select has_table_privilege('${role}','public.v2_batch_meeting_revisions','${operation}')`),'f');
      rejects(as(admin,`select public.assert_v2_meeting_request(${json(requestFor())})`,role),/permission denied/);
    }
  });
  await t.test('unsafe URL forms, identity injection and malformed requests fail without writes',() => {
    const original=snapshot('select * from public.v2_batch_meeting_revisions');
    const input=requestFor(batch,1);
    for (const bad of ['',url+'\n',url+' ',url+'?authuser=1',url+'#fragment','http://meet.google.com/aaa-bbbb-ccc',
      'https://user@meet.google.com/aaa-bbbb-ccc','https://meet.google.com.evil.test/aaa-bbbb-ccc','https://meet.google.com:443/aaa-bbbb-ccc',
      'https://meet.google.com/lookup/alias','https://meet.google.com/%61aa-bbbb-ccc','javascript:alert(1)',false,{}]) {
      rejects(as(admin,saveSql({ ...input,links:[{ ...input.links[0],url:bad },input.links[1]] })),/Invalid meeting URL/);
    }
    for (const patch of [{ actorId:admin },{ state:'published' },{ batchId:batch.id+'\n' },{ batchRevision:0 },{ expectedRevision:2147483647 },
      { links:[] },{ links:[null] },{ links:[...input.links,...input.links] },{ links:[{ ...input.links[0],secret:'value' },input.links[1]] }]) {
      rejects(as(admin,saveSql({ ...input,...patch })),/Invalid/);
    }
    for (const bad of [null,[],{}]) rejects(as(admin,saveSql(bad)),/Invalid/);
    assert.equal(snapshot('select * from public.v2_batch_meeting_revisions'),original);
  });
  await t.test('missing batches and foreign, missing or replaced event keys cannot be saved',() => {
    rejects(as(admin,saveSql({ ...requestFor(),batchId:randomUUID() })),/unavailable/);
    const input=requestFor(batch,1);
    for (const links of [input.links.slice(1),[{ key:randomUUID(),url },input.links[1]]]) rejects(as(admin,saveSql({ ...input,links })),/identities changed/);
  });
  await t.test('different batches retain independent meeting drafts and clearing appends history',() => {
    const second=requestFor(batchTwo); second.links=second.links.map((link) => ({ ...link,url:otherUrl })); save(second);
    const clear=requestFor(batch,1); clear.links=clear.links.map((link) => ({ ...link,url:null })); save(clear);
    assert.deepEqual(read().links,clear.links); assert.deepEqual(read(batchTwo.id).links,second.links);
    assert.deepEqual(JSON.parse(query(`select request->'links' from public.v2_batch_meeting_revisions where batch_id='${batch.id}' and revision=1`)),firstRequest.links);
  });
  await t.test('identical retries recover a receipt without replacing newer links',() => {
    assert.equal(save(firstRequest).replayed,true); assert.equal(read().revision,2); assert(read().links.every((link) => link.url===null));
    rejects(as(admin,saveSql({ ...firstRequest,links:firstRequest.links.map((link) => ({ ...link,url:otherUrl })) })),/different submission/);
    rejects(as(admin,saveSql(requestFor(batch,1))),/revision changed/);
  });
  await t.test('concurrent identical submissions create one revision',async () => {
    const input=requestFor(batch,2);
    const results=await Promise.all([1,2,3].map(() => concurrentQuery(as(admin,saveSql(input)))));
    assert.equal(results.map(JSON.parse).filter((result) => !result.replayed).length,1);
    assert.equal(read().revision,3);
  });
  await t.test('concurrent Admin edits have one winner and cannot overwrite silently',async () => {
    const inputs=[requestFor(batch,3),requestFor(batch,3)]; inputs[1].links[0].url=otherUrl;
    const results=await Promise.allSettled(inputs.map((input,index) => concurrentQuery(as(index?otherAdmin:admin,saveSql(input)))));
    assert.equal(results.filter((result) => result.status==='fulfilled').length,1);
    assert.match(results.find((result) => result.status==='rejected').reason.message,/revision changed/);
    assert.equal(read().revision,4);
  });
  await t.test('reusing a request token across batches cannot produce two submissions',async () => {
    const requestId=randomUUID(); const inputs=[{ ...requestFor(batch,4),requestId },{ ...requestFor(batchTwo,1),requestId }];
    const results=await Promise.allSettled(inputs.map((input) => concurrentQuery(as(admin,saveSql(input)))));
    assert.equal(results.filter((result) => result.status==='fulfilled').length,1);
    assert.match(results.find((result) => result.status==='rejected').reason.message,/different submission/);
  });
  await t.test('a late write failure leaves the entire private history unchanged',() => {
    const history=snapshot('select * from public.v2_batch_meeting_revisions');
    query(`create function public.synthetic_meeting_failure() returns trigger language plpgsql as $$ begin raise exception 'Synthetic failure'; end $$;
      create trigger synthetic_meeting_failure before insert on public.v2_batch_meeting_revisions for each row execute function public.synthetic_meeting_failure();`);
    rejects(as(admin,saveSql(requestFor(batch,read().revision))),/Synthetic failure/);
    assert.equal(snapshot('select * from public.v2_batch_meeting_revisions'),history);
    query('drop trigger synthetic_meeting_failure on public.v2_batch_meeting_revisions; drop function public.synthetic_meeting_failure()');
  });
  await t.test('deactivation prevents reading and recovery of old submissions',() => {
    query(`update public.profiles set is_active=false where id='${admin}'`);
    rejects(as(admin,saveSql(firstRequest)),/Active Admin/);
    rejects(as(admin,`select public.read_v2_meeting_draft('${batch.id}')`),/Active Admin/);
    assert.equal(query(as(admin,'select count(*) from public.v2_batch_meeting_revisions')),'0');
    query(`update public.profiles set is_active=true where id='${admin}'`);
  });
  await t.test('reapplying the migration preserves history, prior schema, purchases and existing access',() => {
    const history=snapshot('select * from public.v2_batch_meeting_revisions');
    apply(migration);
    assert.equal(snapshot('select * from public.v2_batch_meeting_revisions'),history);
    assert.deepEqual(oldState(),before);
    assert.equal(query(as(student,"select public.can_access_course('c3000000-0000-4000-8000-000000000001')")),'t');
  });
  await t.test('schedule edits keep meeting links private and invalidate stale meeting confirmations',async () => {
    const privateBefore=read(); const pending=requestFor(batch,privateBefore.revision);
    const update={ id:batch.id,templateId:batch.templateId,templateRevision:1,expectedRevision:1,requestId:randomUUID(),title:'Updated synthetic batch',startDate:batch.startDate,timeZone:batch.timeZone,
      events:batch.events.map(({ key,localDate,localStartTime,durationMinutes,instructor,capacity }) => ({ key,localDate,localStartTime,durationMinutes,instructor,capacity })) };
    const proposal=JSON.parse(query(as(admin,`select public.preview_v2_batch_draft(${json(update)})`)));
    query(`create function public.synthetic_schedule_pause() returns trigger language plpgsql as $$ begin
      perform pg_advisory_xact_lock(7654321); perform pg_sleep(0.3); return new; end $$;
      create trigger synthetic_schedule_pause before insert on public.v2_course_batch_revisions for each row execute function public.synthetic_schedule_pause();`);
    const settled=(promise) => promise.then((value) => ({ status:'fulfilled',value }),(reason) => ({ status:'rejected',reason }));
    const schedule=settled(concurrentQuery(as(admin,`select public.save_v2_batch_draft(${json(update)},'${proposal.fingerprint}')`)));
    let held=false;
    for (let i=0;i<30;i++) {
      if (query("select exists(select 1 from pg_locks where locktype='advisory' and objid=7654321 and granted)")==='t') { held=true; break; }
      await new Promise((resolve) => setTimeout(resolve,5));
    }
    const results=await Promise.all([schedule,settled(concurrentQuery(as(admin,saveSql(pending))))]);
    query('drop trigger synthetic_schedule_pause on public.v2_course_batch_revisions; drop function public.synthetic_schedule_pause()');
    assert(held,'Schedule transaction did not acquire its test lock');
    assert.equal(results[0].status,'fulfilled'); assert.equal(results[1].status,'rejected');
    assert.match(results[1].reason.message,/Batch revision changed/);
    const current=read(); assert.equal(current.batch.revision,2); assert.deepEqual(current.links,privateBefore.links);
    assert.equal(save(firstRequest).replayed,true);
    const fresh={ ...pending,batchRevision:2,requestId:randomUUID() };
    assert.equal(save(fresh).batchRevision,2);
  });
}));
