import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';
const lit=(value)=>`'${String(value).replaceAll("'","''")}'`;
const json=(value)=>`${lit(JSON.stringify(value))}::jsonb`;
const as=(id,sql,role='authenticated')=>`begin; set local role ${role}; set local request.jwt.claim.sub=${lit(id??'')}; ${sql}; commit;`;
const admin=randomUUID(),student=randomUUID(),other=randomUUID(),unpaid=randomUUID();
const migration='20261102110000_add_v2_student_delivery.sql';

test('protected published course and live operations', {timeout:120000}, async(t)=>withDisposablePostgres(async({query,apply,rejects,concurrentQuery})=>{
  query(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  for(const name of ['20260731051000_production_baseline.sql','20260731062700_enforce_material_release.sql','20260731110000_require_provisioned_portal_access.sql',
    '20261018090000_add_v2_product_entitlements.sql','20261019090000_add_v2_template_drafts.sql','20261019100000_add_v2_batch_drafts.sql',
    '20261019110000_add_v2_private_meeting_drafts.sql','20261020090000_add_v2_outline_schedules.sql','20261020100000_add_v2_batch_publication.sql','20261025100000_add_v2_enrolled_schedules.sql']) apply(name);
  for(const [i,id] of [admin,student,other,unpaid].entries()) query(`insert into auth.users(id,email) values('${id}','qa-${i}@example.test')`);
  query(`update public.profiles set role='student',is_active=true; update public.profiles set role='admin' where id='${admin}'`);
  for(const id of [student,other]) query(`select public.grant_v2_purchase('${id}',array['quant_crash'],'synthetic-${id}',now()-interval '1 day','a1000000-0000-4000-8000-000000000002',1000000,'INR')`);
  query(`select public.grant_v2_purchase('${other}',array['full_batch'],'synthetic-full-${other}',now()-interval '1 day',(public.quote_v2_products(array['full_batch'])->>'price_version_id')::uuid,2500000,'INR')`);
  // Only the tables present in the baseline are fingerprinted; no fixture assumes later phases.
  const base=()=>query(`select jsonb_build_object('purchases',(select jsonb_agg(to_jsonb(p) order by id) from public.v2_purchases p),'grants',(select jsonb_agg(to_jsonb(g) order by purchase_id,product_code) from public.v2_product_grants g),'enrollments',(select count(*) from public.enrollments))`);
  const legacyTables=JSON.parse(query("select coalesce(jsonb_agg(tablename order by tablename),'[]') from pg_tables where schemaname='public' and tablename not like 'v2_%'"));
  const legacySnapshot=()=>legacyTables.map(table=>query(`select coalesce(jsonb_agg(to_jsonb(row) order by to_jsonb(row)::text),'[]') from public."${table}" row`));
  const legacyPreserved=legacySnapshot();
  const preserved=base();
  await t.test('additive migration is repeatable and preserves purchases and legacy enrollments',()=>{apply(migration);apply(migration);assert.equal(base(),preserved);});
  const content=Object.fromEntries(['materials','recordings','preSessionReads','postSessionReads'].map(kind=>[kind,[{key:randomUUID(),title:`Exact ${kind} title`,url:`https://example.test/${kind}`}]]));
  const makeBatch=(product='quant')=>{
    const templateId=randomUUID(),batchId=randomUUID(),eventKey=randomUUID(),sessionKey=randomUUID();
    const section=product==='full_course'?'quant':product;
    const doc={title:'Published curriculum',summary:'',durationDays:1,sessions:[{key:sessionKey,title:'Independent session title',section,content}],events:[{key:eventKey,title:'Live discussion',section,kind:'live',dayOffset:0,localStartTime:'19:00',durationMinutes:60,capacity:8,instructor:''}]};
    query(as(admin,`select public.save_v2_template_draft('${templateId}','${product}',0,'${randomUUID()}',${json(doc)})`));
    const request={id:batchId,templateId,templateRevision:1,expectedRevision:0,requestId:randomUUID(),title:'Published batch',startDate:'2026-11-10',timeZone:'Asia/Kolkata',events:null};
    const proposal=JSON.parse(query(as(admin,`select public.preview_v2_batch_draft(${json(request)})`)));
    const batch=JSON.parse(query(as(admin,`select public.save_v2_batch_draft(${json(request)},${lit(proposal.fingerprint)})`))).draft;
    return {batch,eventKey,sessionKey,request};
  };
  const {batch,eventKey,sessionKey,request}=makeBatch();
  const wrong=makeBatch('di');
  const saveMeeting=(revision,url='https://meet.google.com/abc-defg-hij')=>query(as(admin,`select public.save_v2_meeting_draft(${json({batchId:batch.id,batchRevision:batch.revision,expectedRevision:revision,requestId:randomUUID(),links:[{key:eventKey,url}]})})`));
  const publish=(b,revision=0,action='publish')=>{
    const input={batchId:b.id,batchRevision:b.revision,expectedRevision:revision,requestId:randomUUID(),action};
    const proposal=JSON.parse(query(as(admin,`select public.preview_v2_batch_publication(${json(input)})`)));
    return query(as(admin,`select public.save_v2_batch_publication(${json(input)},${lit(proposal.fingerprint)})`));
  };
  const enroll=(b,id)=>query(as(admin,`select public.set_v2_batch_enrollment('${b.id}','${id}',true,0)`));
  const registerSql=(id=student,active=true,revision=0)=>`select public.set_v2_live_registration('${batch.id}','${id}',${active},${revision})`;
  const meeting=(id=student,b=batch.id,key=eventKey)=>JSON.parse(query(as(id,`select coalesce(public.get_my_v2_meeting('${b}','${key}'),'null'::jsonb)`)));
  const course=(id=student,b=batch.id)=>JSON.parse(query(as(id,`select coalesce(public.get_my_v2_published_course('${b}'),'null'::jsonb)`)));
  await t.test('unpublished course content is unavailable even after enrollment',()=>{
    enroll(batch,student);enroll(batch,other);assert.equal(course(),null);assert.equal(meeting(),null);
    rejects(as(admin,registerSql()),/Published live batch required/);saveMeeting(0);publish(batch);publish(wrong.batch);
  });
  await t.test('published content retains exact ordered session titles and references',()=>{
    const result=course();assert.equal(result.batchRevision,1);assert.equal(result.publicationRevision,1);
    assert.deepEqual(result.sessions,[{key:sessionKey,title:'Independent session title',section:'quant',content}]);
    assert.equal(course(unpaid),null);assert.equal(course(admin),null);assert.equal(course(student,wrong.batch.id),null);
    assert.doesNotMatch(JSON.stringify(result),/meet.google|requestId|actor_id|fingerprint/);
  });
  await t.test('programme content is limited to an enrolled Full Course entitlement',()=>{
    const full=makeBatch('full_course');
    const programme={key:randomUUID(),title:'Programme introduction',section:'programme',content};
    query(`update public.v2_course_batch_revisions set document=jsonb_set(document,'{sessions}',(document->'sessions')||${json([programme])}) where batch_id='${full.batch.id}'`);
    publish(full.batch);enroll(full.batch,other);
    assert.equal(course(other,full.batch.id).sessions.length,2);assert.equal(course(other,full.batch.id).sessions[1].section,'programme');
    assert.equal(course(student,full.batch.id),null);
    const result=JSON.parse(query(`begin;update public.v2_course_batch_revisions set document=jsonb_set(document,'{sessions}',(document->'sessions')||${json([programme])}) where batch_id='${batch.id}' and revision=1;set local role authenticated;set local request.jwt.claim.sub='${student}';select public.get_my_v2_published_course('${batch.id}');rollback;`));
    assert.equal(result.sessions.length,1);
  });
  await t.test('schedule enrollment alone never grants a private meeting',()=>{
    assert.equal(meeting(),null);assert.equal(meeting(other),null);
    rejects(as(student,registerSql()),/Admin access required/);rejects(as(admin,registerSql(unpaid)),/product access and enrollment/);
    query(as(admin,registerSql()));assert.equal(meeting().url,'https://meet.google.com/abc-defg-hij');assert.equal(meeting(other),null);
    assert.equal(meeting(student,wrong.batch.id,wrong.eventKey),null);assert.equal(meeting(student,batch.id,randomUUID()),null);
  });
  await t.test('private meeting publication pins a reviewed revision while draft edits remain hidden',()=>{
    saveMeeting(1,'https://meet.google.com/klm-nopq-rst');assert.equal(meeting().url,'https://meet.google.com/abc-defg-hij');
    publish(batch,1);assert.equal(meeting().url,'https://meet.google.com/klm-nopq-rst');
    const text=query(as(student,'select public.get_my_v2_batch_schedules()'));assert.doesNotMatch(text,/meet.google|request_id|actor_id/);
  });
  await t.test('expiry, revocation, inactivity, role change and missing enrollment override live registration',()=>{
    for(const mutation of [`update public.profiles set is_active=false where id='${student}'`,`update public.profiles set role='admin' where id='${student}'`,
      `update public.v2_purchases set revoked_at=now() where student_id='${student}'`,`update public.v2_purchases set confirmed_at=now()-interval '7 months' where student_id='${student}'`,`update public.v2_purchases set confirmed_at=now()+interval '1 day' where student_id='${student}'`,
      `update public.v2_batch_enrollments set active=false where student_id='${student}'`]) {
      const result=JSON.parse(query(`begin;${mutation};set local role authenticated;set local request.jwt.claim.sub='${student}';select jsonb_build_array(public.get_my_v2_meeting('${batch.id}','${eventKey}'),public.get_my_v2_published_course('${batch.id}'));rollback;`));
      assert.deepEqual(result,[null,null]);
    }
  });
  await t.test('a wrong subject in a published event remains inaccessible',()=>{
    const result=JSON.parse(query(`begin;update public.v2_batch_publication_revisions set document=jsonb_set(document,'{events,0,section}','"di"'::jsonb) where batch_id='${batch.id}' and revision=2;set local role authenticated;set local request.jwt.claim.sub='${student}';select coalesce(public.get_my_v2_meeting('${batch.id}','${eventKey}'),'null'::jsonb);rollback;`));
    assert.equal(result,null);
  });
  await t.test('explicit removal and stale registration retries cannot restore access',()=>{
    query(as(admin,registerSql(student,false,1)));assert.equal(meeting(),null);
    rejects(as(admin,registerSql(student,true,1)),/Registration changed/);
    query(as(admin,registerSql(student,true,2)));assert.ok(meeting());
    assert.equal(query(`select count(*) from public.v2_live_registration_audit`),'3');
  });
  await t.test('concurrent registration changes have exactly one winner',async()=>{
    const results=await Promise.allSettled([concurrentQuery(as(admin,registerSql(student,false,3))),concurrentQuery(as(admin,registerSql(student,true,3)))]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.match(results.find(r=>r.status==='rejected').reason.message,/Registration changed/);
    query(as(admin,registerSql(student,true,4)));
  });
  await t.test('latest unpublished state suppresses content and joins without resurrecting older publication',()=>{
    publish(batch,2,'unpublish');assert.equal(course(),null);assert.equal(meeting(),null);publish(batch,3);assert.ok(course());assert.ok(meeting());
  });
  await t.test('course drafts remain pinned until republished',()=>{
    const edited={...request,expectedRevision:1,requestId:randomUUID(),events:batch.events.map(({key,kind,localDate,localStartTime,durationMinutes,instructor,capacity})=>({key,kind,localDate,localStartTime,durationMinutes,instructor,capacity})),sessions:[{key:sessionKey,title:'Unpublished replacement',section:'quant',content}]};
    const proposal=JSON.parse(query(as(admin,`select public.preview_v2_batch_draft(${json(edited)})`)));
    query(as(admin,`select public.save_v2_batch_draft(${json(edited)},${lit(proposal.fingerprint)})`));
    assert.equal(course().sessions[0].title,'Independent session title');
  });
  await t.test('completion requires exact published live class and remains idempotent under concurrency',async()=>{
    const sql=`select public.complete_v2_live_class('${batch.id}','${eventKey}',4)`;
    rejects(as(student,sql),/Admin access required/);
    rejects(as(admin,`select public.complete_v2_live_class('${batch.id}','${eventKey}',3)`),/Publication changed/);
    rejects(as(admin,`select public.complete_v2_live_class('${batch.id}','${sessionKey}',4)`),/Published live class required/);
    const results=await Promise.all([concurrentQuery(as(admin,sql)),concurrentQuery(as(admin,sql))]);
    assert.deepEqual(results.map(r=>JSON.parse(r).replayed).sort(),[false,true]);
    assert.equal(query('select count(*) from public.v2_live_class_completions'),'1');assert.equal(meeting(),null);assert.ok(course());
    assert.equal(base(),preserved);assert.deepEqual(legacySnapshot(),legacyPreserved);
  });
  await t.test('direct tables and privileged operations remain inaccessible to Students and anonymous roles',()=>{
    for(const table of ['v2_published_meetings','v2_live_registrations','v2_live_registration_audit','v2_live_class_completions']) {
      assert.equal(query(as(student,`select count(*) from public.${table}`)),'0');
      rejects(as(student,`delete from public.${table}`),/permission denied/);
      rejects(as(admin,`delete from public.${table}`),/permission denied/);
    }
    rejects(as(student,`select public.list_v2_live_registration_options('${batch.id}')`),/Admin access required/);
    rejects(as(student,`select public.list_v2_live_class_status('${batch.id}')`),/Admin access required/);
    for(const role of ['anon','service_role']) {
      rejects(as(student,`select public.get_my_v2_meeting('${batch.id}','${eventKey}')`,role),/permission denied/);
      rejects(as(student,`select public.get_my_v2_published_course('${batch.id}')`,role),/permission denied/);
    }
    assert.equal(course(null),null);assert.equal(meeting(null),null);
  });
}));
