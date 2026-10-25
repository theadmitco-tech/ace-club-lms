import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';

const lit = (v) => `'${String(v).replaceAll("'", "''")}'`;
const json = (v) => `${lit(JSON.stringify(v))}::jsonb`;
const admin = randomUUID(), student = randomUUID(), other = randomUUID(), unpaid = randomUUID();
const as = (id, sql, role = 'authenticated') => `begin; set local role ${role}; set local request.jwt.claim.sub=${lit(id ?? '')}; ${sql}; commit;`;
const migration = '20261025100000_add_v2_enrolled_schedules.sql';

test('enrolled schedules in isolated PostgreSQL', { timeout: 120000 }, async (t) => withDisposablePostgres(async ({ query, apply, rejects, concurrentQuery }) => {
  query(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  for (const file of ['20260731051000_production_baseline.sql','20260731062700_enforce_material_release.sql',
    '20260731110000_require_provisioned_portal_access.sql','20261018090000_add_v2_product_entitlements.sql',
    '20261019090000_add_v2_template_drafts.sql','20261019100000_add_v2_batch_drafts.sql',
    '20261019110000_add_v2_private_meeting_drafts.sql','20261020090000_add_v2_outline_schedules.sql',
    '20261020100000_add_v2_batch_publication.sql']) apply(file);
  for (const [index,id] of [admin,student,other,unpaid].entries()) query(`insert into auth.users(id,email) values ('${id}','person-${index}@example.test');`);
  query(`update public.profiles set is_active=true,role='student'; update public.profiles set role='admin' where id='${admin}';`);
  for (const id of [student,other]) query(`select public.grant_v2_purchase('${id}',array['quant_crash'],'synthetic-${id}',now()-interval '1 day','a1000000-0000-4000-8000-000000000002',1000000,'INR');`);
  const snapshot = () => query(`select jsonb_build_object('profiles',(select jsonb_agg(to_jsonb(p) order by id) from public.profiles p),
    'purchases',(select jsonb_agg(to_jsonb(p) order by id) from public.v2_purchases p),
    'grants',(select jsonb_agg(to_jsonb(g) order by purchase_id,product_code) from public.v2_product_grants g),
    'legacy',(select count(*) from public.enrollments))`);
  const preserved = snapshot();
  await t.test('migration is additive, repeatable and transactional', () => {
    query('create view public.v2_batch_enrollments as select 1 as unexpected');
    assert.throws(() => apply(migration));
    assert.equal(query("select to_regprocedure('public.get_my_v2_batch_schedules()') is null"),'t');
    query('drop view public.v2_batch_enrollments');
    apply(migration); apply(migration);
    assert.equal(snapshot(),preserved);
  });
  const completeContent=Object.fromEntries(['materials','recordings','preSessionReads','postSessionReads'].map((kind)=>[kind,[{key:randomUUID(),title:kind,url:`https://private.example.test/${kind}`}]]));
  const makeBatch = (product='quant') => {
    const templateId=randomUUID(), batchId=randomUUID();
    const event={key:randomUUID(),title:'Published topic',section:product==='di'?'di':'quant',kind:'outline',dayOffset:null,localStartTime:null,durationMinutes:null,capacity:8,instructor:'',content:completeContent};
    query(as(admin,`select public.save_v2_template_draft('${templateId}',${lit(product)},0,'${randomUUID()}',${json({title:'Synthetic curriculum',summary:'',durationDays:null,events:[event]})})`));
    const request={id:batchId,templateId,templateRevision:1,expectedRevision:0,requestId:randomUUID(),title:'Synthetic batch',startDate:'',timeZone:'Asia/Kolkata',events:null};
    const proposal=JSON.parse(query(as(admin,`select public.preview_v2_batch_draft(${json(request)})`)));
    return JSON.parse(query(as(admin,`select public.save_v2_batch_draft(${json(request)},${lit(proposal.fingerprint)})`))).draft;
  };
  const publish=(batch,expectedRevision=0,action='publish') => {
    const request={batchId:batch.id,batchRevision:batch.revision,expectedRevision,requestId:randomUUID(),action};
    const preview=JSON.parse(query(as(admin,`select public.preview_v2_batch_publication(${json(request)})`)));
    return JSON.parse(query(as(admin,`select public.save_v2_batch_publication(${json(request)},${lit(preview.fingerprint)})`))).document;
  };
  const enrollSql=(batch,id=student,active=true,revision=0) => `select public.set_v2_batch_enrollment('${batch.id}','${id}',${active},${revision})`;
  const read=(id=student) => JSON.parse(query(as(id,'select public.get_my_v2_batch_schedules()')));
  const batch=makeBatch(), hidden=makeBatch(), wrong=makeBatch('di');
  publish(batch); publish(hidden); publish(wrong);
  await t.test('canonical offerings bridge existing purchases without rewriting the Phase 1 ledger', () => {
    assert.deepEqual(JSON.parse(query("select jsonb_agg(code order by code) from public.v2_course_offerings")),['di','full_course','quant','verbal']);
    assert.equal(query("select public.v2_entitlement_product_code('quant')"),'quant_crash');
    assert.equal(snapshot(),preserved);
    rejects(as(student,"select public.v2_entitlement_product_code('quant')"),/permission denied/);
    rejects(as(admin,"update public.v2_course_offerings set name='Changed' where code='quant'"),/permission denied/);
  });
  await t.test('unscheduled course content survives batch snapshots and scheduling edits; publication omits private URLs', () => {
    assert.deepEqual(batch.events[0].content,completeContent);
    const request={id:batch.id,templateId:batch.templateId,templateRevision:batch.templateRevision,
      expectedRevision:1,requestId:randomUUID(),title:batch.title,startDate:'',timeZone:'Asia/Kolkata',
      events:batch.events.map(({key,kind,localDate,localStartTime,durationMinutes,instructor,capacity})=>({key,kind,localDate,localStartTime,durationMinutes,instructor,capacity}))};
    const proposal=JSON.parse(query(as(admin,`select public.preview_v2_batch_draft(${json(request)})`)));
    assert.deepEqual(proposal.draft.events[0].content,completeContent);
    assert.equal(proposal.draft.events[0].startsAt,null);
    const publication=JSON.parse(query(`select document from public.v2_batch_publication_revisions where batch_id='${batch.id}'`));
    assert.doesNotMatch(JSON.stringify(publication),/private.example|preSessionReads|recordings/);
    for(const url of ['javascript:alert(1)','http://example.test','https://user:pass@example.test']) {
      const invalid=structuredClone(completeContent);invalid.recordings[0].url=url;
      assert.equal(query(`select public.v2_session_content_valid(${json(invalid)})`),'f');
    }
  });

  await t.test('purchase alone exposes no batch; enrollment is explicit and scoped', () => {
    assert.deepEqual(read(),[]);
    query(as(admin,enrollSql(batch)));
    assert.deepEqual(read().map((row)=>row.batchId),[batch.id]);
    assert.deepEqual(read(other),[]);
    assert.deepEqual(read(unpaid),[]);
    rejects(as(admin,enrollSql(wrong)),/product access required/);
    rejects(as(admin,enrollSql(batch,unpaid)),/product access required/);
    rejects(as(admin,enrollSql(batch,admin)),/product access required/);
    assert.equal(snapshot(),preserved);
  });
  await t.test('Students cannot enumerate rosters, self-enroll or directly read private tables', () => {
    rejects(as(student,`select public.list_v2_batch_enrollment_options('${batch.id}')`),/Admin access required/);
    rejects(as(student,enrollSql(hidden)),/Admin access required/);
    rejects(as(student,`select public.v2_student_has_product('${other}','quant')`),/permission denied/);
    for (const table of ['v2_batch_enrollments','v2_batch_publication_revisions','v2_course_batches','v2_course_batch_revisions']) {
      assert.equal(query(as(student,`select count(*) from public.${table}`)),'0');
      rejects(as(student,`delete from public.${table}`),/permission denied/);
    }
    for (const role of ['anon','service_role']) {
      rejects(as(student,'select public.get_my_v2_batch_schedules()',role),/permission denied/);
      rejects(as(admin,enrollSql(hidden),role),/permission denied/);
    }
    assert.deepEqual(read(admin),[]); assert.deepEqual(read(null),[]);
  });
  await t.test('removal is immediate; stale enrollment retries cannot undo removal', () => {
    query(as(admin,enrollSql(batch,student,false,1))); assert.deepEqual(read(),[]);
    rejects(as(admin,enrollSql(batch,student,true,0)),/Enrollment changed/);
    rejects(as(admin,enrollSql(batch,student,true,1)),/Enrollment changed/);
    query(as(admin,enrollSql(batch,student,true,2)));
    assert.equal(read().length,1);
  });
  await t.test('concurrent conflicting roster edits have one winner', async () => {
    const results=await Promise.allSettled([concurrentQuery(as(admin,enrollSql(batch,student,false,3))),concurrentQuery(as(admin,enrollSql(batch,student,true,3)))]);
    assert.equal(results.filter((r)=>r.status==='fulfilled').length,1);
    assert.match(results.find((r)=>r.status==='rejected').reason.message,/Enrollment changed/);
    query(as(admin,enrollSql(batch,student,true,4)));
  });
  await t.test('deactivation, revocation and expiry override a retained enrollment', () => {
    const check=(mutation) => JSON.parse(query(`begin; ${mutation}; set local role authenticated; set local request.jwt.claim.sub='${student}'; select public.get_my_v2_batch_schedules(); rollback;`));
    assert.deepEqual(check(`update public.profiles set is_active=false where id='${student}'`),[]);
    assert.deepEqual(check(`update public.profiles set role='admin' where id='${student}'`),[]);
    assert.deepEqual(check(`update public.v2_purchases set revoked_at=now() where student_id='${student}'`),[]);
    assert.deepEqual(check(`update public.v2_purchases set confirmed_at=now()-interval '7 months' where student_id='${student}'`),[]);
    assert.deepEqual(check(`update public.v2_purchases set confirmed_at=now()+interval '1 day' where student_id='${student}'`),[]);
    assert.equal(read().length,1);
  });
  await t.test('only the latest published snapshot is visible; drafts and private extras never leak', () => {
    const original=read()[0];
    const request={id:batch.id,templateId:batch.templateId,templateRevision:1,expectedRevision:1,requestId:randomUUID(),title:'Unpublished edit',startDate:'',timeZone:'Asia/Kolkata',events:batch.events.map(({key,kind,localDate,localStartTime,durationMinutes,instructor,capacity})=>({key,kind,localDate,localStartTime,durationMinutes,instructor,capacity}))};
    const preview=JSON.parse(query(as(admin,`select public.preview_v2_batch_draft(${json(request)})`)));
    const edited=JSON.parse(query(as(admin,`select public.save_v2_batch_draft(${json(request)},${lit(preview.fingerprint)})`))).draft;
    assert.deepEqual(read()[0],original);
    publish(edited,1,'unpublish'); assert.deepEqual(read(),[]);
    publish(edited,2); assert.equal(read()[0].title,'Unpublished edit');
    query(`update public.v2_batch_publication_revisions set document=jsonb_set(document||'{"private":"secret"}'::jsonb,'{events,0}',(document#>'{events,0}')||'{"url":"private-meet"}'::jsonb) where batch_id='${batch.id}' and revision=3;`);
    assert.doesNotMatch(JSON.stringify(read()),/secret|private-meet|student_id|request_id|actor_id/);
    assert.equal(read()[0].events[0].startsAt,null);
  });
  await t.test('legacy enrollment and another product never substitute for a V2 enrollment or grant', () => {
    query(`insert into public.courses(id,name,is_active) values ('${randomUUID()}','Legacy',true);
      insert into public.enrollments(user_id,course_id) select '${unpaid}',id from public.courses;`);
    assert.deepEqual(read(unpaid),[]);
    query(`insert into public.v2_batch_enrollments(batch_id,student_id,active,revision,actor_id) values ('${wrong.id}','${student}',true,1,'${admin}')`);
    assert.deepEqual(read().map((row)=>row.batchId),[batch.id]);
  });
  await t.test('roster includes inactive enrollments for removal; inactive Admins cannot read or change it', () => {
    query(`update public.profiles set is_active=false where id='${student}'`);
    const rows=JSON.parse(query(as(admin,`select public.list_v2_batch_enrollment_options('${batch.id}')`)));
    assert.equal(rows.find((row)=>row.studentId===student).eligible,false);
    assert.equal(rows.find((row)=>row.studentId===student).active,true);
    assert.doesNotMatch(JSON.stringify(rows),/@|payment|reference/);
    query(as(admin,enrollSql(batch,student,false,5)));
    query(`update public.profiles set is_active=false where id='${admin}'`);
    rejects(as(admin,`select public.list_v2_batch_enrollment_options('${batch.id}')`),/Admin access required/);
    rejects(as(admin,enrollSql(batch,student,true,6)),/Admin access required/);
  });
}));
