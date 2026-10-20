import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';

const lit = (value) => `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${lit(JSON.stringify(value))}::jsonb`;
const admin = randomUUID(), otherAdmin = randomUUID(), student = randomUUID(), inactive = randomUUID();
const as = (user, sql, role = 'authenticated') => `begin; set local role ${role}; set local request.jwt.claim.sub=${lit(user ?? '')}; ${sql}; commit;`;
const outlineMigration = '20261020090000_add_v2_outline_schedules.sql';
const publicationMigration = '20261020100000_add_v2_batch_publication.sql';
const outline = (section) => ({ key: randomUUID(), title: '', section, kind: 'outline', dayOffset: null,
  localStartTime: null, durationMinutes: null, capacity: 8, instructor: '' });
const live = (section) => ({ key: randomUUID(), title: 'Synthetic lesson', section, kind: 'live', dayOffset: 0,
  localStartTime: '23:30', durationMinutes: 60, capacity: 5, instructor: '' });
const publicationInput = (batch, expectedRevision = 0, action = 'publish') => ({ batchId: batch.id, batchRevision: batch.revision,
  expectedRevision, requestId: randomUUID(), action });
const previewSql = (input) => `select public.preview_v2_batch_publication(${json(input)})`;
const saveSql = (input,fingerprint) => `select public.save_v2_batch_publication(${json(input)},${lit(fingerprint)})`;

test('approved outlines and Admin publication in disposable PostgreSQL', { timeout: 120000 }, async (t) =>
  withDisposablePostgres(async ({ query,apply,rejects,concurrentQuery }) => {
    query(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
      alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
      alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
    for (const file of ['20260731051000_production_baseline.sql','20260731062700_enforce_material_release.sql',
      '20260731110000_require_provisioned_portal_access.sql','20261018090000_add_v2_product_entitlements.sql',
      '20261019090000_add_v2_template_drafts.sql','20261019100000_add_v2_batch_drafts.sql',
      '20261019110000_add_v2_private_meeting_drafts.sql']) apply(file);
    query(`insert into auth.users(id,email) values ('${admin}','admin@example.test'),('${otherAdmin}','admin-two@example.test'),
      ('${student}','student@example.test'),('${inactive}','inactive@example.test');
      update public.profiles set role='admin',is_active=true where id in ('${admin}','${otherAdmin}');
      update public.profiles set role='admin',is_active=false where id='${inactive}';
      update public.profiles set role='student',is_active=true where id='${student}';
      insert into public.courses(id,name,is_active) values ('c3000000-0000-4000-8000-000000000001','Synthetic legacy course',true);
      insert into public.enrollments(user_id,course_id) values ('${student}','c3000000-0000-4000-8000-000000000001');
      select public.grant_v2_purchase('${student}',array['quant_crash'],'synthetic-approved-access',now()-interval '1 day',
        'a1000000-0000-4000-8000-000000000002',1000000,'INR');`);
    const snapshot = (sql) => query(`select coalesce(jsonb_agg(to_jsonb(s) order by to_jsonb(s)::text),'[]') from (${sql}) s`);
    const existing = () => Object.fromEntries(['profiles','courses','enrollments','v2_purchases','v2_product_grants']
      .map((table) => [table,snapshot(`select * from public.${table}`)]));
    const before = existing();
    const template = (product,events) => {
      const id=randomUUID();
      query(as(admin,`select public.save_v2_template_draft('${id}',${lit(product)},0,'${randomUUID()}',
        ${json({ title:'Synthetic curriculum',summary:'',durationDays:7,events })})`));
      return id;
    };
    const saveBatch = (input) => {
      const proposal=JSON.parse(query(as(admin,`select public.preview_v2_batch_draft(${json(input)})`)));
      return JSON.parse(query(as(admin,`select public.save_v2_batch_draft(${json(input)},${lit(proposal.fingerprint)})`))).draft;
    };
    const createBatch = (templateId,startDate='') => saveBatch({ id:randomUUID(),templateId,templateRevision:1,
      expectedRevision:0,requestId:randomUUID(),title:'Synthetic batch',startDate,timeZone:'Asia/Kolkata',events:null });
    const editBatch = (batch,title=batch.title) => saveBatch({ id:batch.id,templateId:batch.templateId,templateRevision:batch.templateRevision,
      expectedRevision:batch.revision,requestId:randomUUID(),title,startDate:batch.startDate,timeZone:batch.timeZone,
      events:batch.events.map(({ key,kind,localDate,localStartTime,durationMinutes,instructor,capacity }) =>
        ({ key,...(kind ? { kind } : {}),localDate,localStartTime,durationMinutes,instructor,capacity })) });
    const preview = (input) => JSON.parse(query(as(admin,previewSql(input))));
    const save = (input,proposal=preview(input),user=admin) => JSON.parse(query(as(user,saveSql(input,proposal.fingerprint))));
    const legacyEvent=live('quant'); delete legacyEvent.kind;
    const oldBatch=createBatch(template('quant_crash',[legacyEvent]),'2028-02-28');

    await t.test('new migrations are transactional, preserve old snapshots and do not modify existing access', () => {
      const oldSnapshot=snapshot('select * from public.v2_live_batch_revisions');
      apply(outlineMigration);
      query('create view public.v2_batch_publication_revisions as select 1 as unexpected');
      assert.throws(() => apply(publicationMigration));
      assert.equal(query("select to_regprocedure('public.preview_v2_batch_publication(jsonb)') is null"),'t');
      query('drop view public.v2_batch_publication_revisions');
      apply(publicationMigration);
      assert.equal(snapshot('select * from public.v2_live_batch_revisions'),oldSnapshot);
      assert.deepEqual(existing(),before);
      assert.deepEqual(editBatch(oldBatch).events,oldBatch.events);
    });
    let mixed, empty, full;
    await t.test('outlines and empty recording-only schedules need no fake dates; live sessions still require them', () => {
      for (const [product,section] of [['quant_crash','quant'],['verbal_crash','verbal'],['di_crash','di']]) {
        const batch=createBatch(template(product,[outline(section)]));
        assert.equal(batch.startDate,'');
        assert.equal(batch.events[0].startsAt,null);
        assert.equal(batch.events[0].title,'');
        assert.equal(save(publicationInput(batch)).document.liveRegistrationLimit,null);
      }
      empty=createBatch(template('di_crash',[]));
      assert.deepEqual(empty.events,[]);
      assert.deepEqual(save(publicationInput(empty)).document.events,[]);
      full=createBatch(template('full_batch',[outline('quant'),outline('verbal'),outline('di')]));
      assert.deepEqual(save(publicationInput(full)).document.sections,['quant','verbal','di']);
      const mixedTemplate=template('quant_crash',[outline('quant'),live('quant')]);
      assert.throws(() => createBatch(mixedTemplate),/Invalid schedule date/);
      mixed=createBatch(mixedTemplate,'2028-02-29');
      assert.equal(mixed.events[0].startsAt,null);
      assert.equal(mixed.events[1].startsAt,'2028-02-29T18:00:00.000Z');
      assert.equal(mixed.events[1].endsAt,'2028-02-29T19:00:00.000Z');
      for (const patch of [{ localStartTime:'18:00' },{ durationMinutes:60 },{ dayOffset:0 },{ kind:null }]) {
        assert.throws(() => template('quant_crash',[{ ...outline('quant'),...patch }]),/Invalid/);
      }
    });
    await t.test('private meeting drafts accept only live item identities and support no-live batches', () => {
      const initial=JSON.parse(query(as(admin,`select public.read_v2_meeting_draft('${mixed.id}')`)));
      assert.equal(initial.links.length,1);
      assert.equal(initial.links[0].key,mixed.events[1].key);
      const input={ batchId:mixed.id,batchRevision:mixed.revision,expectedRevision:0,requestId:randomUUID(),
        links:[{ key:mixed.events[1].key,url:'https://meet.google.com/aaa-bbbb-ccc' }] };
      query(as(admin,`select public.save_v2_meeting_draft(${json(input)})`));
      rejects(as(admin,`select public.save_v2_meeting_draft(${json({ ...input,requestId:randomUUID(),expectedRevision:1,
        links:[{ key:mixed.events[0].key,url:null }] })})`),/identities/);
      const noLive=JSON.parse(query(as(admin,`select public.read_v2_meeting_draft('${empty.id}')`)));
      assert.deepEqual(noLive.links,[]);
    });
    let initialInput, initialReview, initial;
    await t.test('publication preview is read-only and exposes only the reviewed product scope and schedule', () => {
      initialInput=publicationInput(mixed);
      const old=snapshot('select * from public.v2_batch_publication_revisions');
      initialReview=preview(initialInput);
      assert.equal(snapshot('select * from public.v2_batch_publication_revisions'),old);
      assert.equal(initialReview.document.liveRegistrationLimit,8);
      assert.deepEqual(initialReview.document.sections,['quant']);
      assert.doesNotMatch(JSON.stringify(initialReview),/meet\\.google|capacity|actor_id|request_id/);
      initial=save(initialInput,initialReview);
      assert.equal(initial.document.state,'published');
      assert.equal(initial.replayed,false);
    });
    await t.test('Students, inactive Admins, signed-out and service callers cannot publish or read publication history', () => {
      for (const [role,user] of [['anon',null],['authenticated',student],['authenticated',inactive],['authenticated',null],['service_role',admin]]) {
        for (const sql of [previewSql(initialInput),saveSql(initialInput,initialReview.fingerprint),'select public.list_v2_batch_publications()']) {
          rejects(as(user,sql,role),/permission denied|Active Admin/);
        }
      }
      for (const user of [student,inactive,null]) assert.equal(query(as(user,'select count(*) from public.v2_batch_publication_revisions')),'0');
      for (const role of ['anon','authenticated','service_role']) {
        for (const op of ['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) {
          assert.equal(query(`select has_table_privilege('${role}','public.v2_batch_publication_revisions','${op}')`),'f');
        }
        rejects(as(admin,`select public.build_v2_batch_publication(${json(initialInput)})`,role),/permission denied/);
      }
    });
    await t.test('private edits preserve the published snapshot; a stale review cannot publish newer content', () => {
      const stale=publicationInput(mixed,1); const staleReview=preview(stale);
      mixed=editBatch(mixed,'Updated synthetic batch');
      const current=JSON.parse(query(as(admin,'select public.list_v2_batch_publications()'))).find((item) => item.batchId===mixed.id);
      assert.deepEqual(current,initial.document);
      rejects(as(admin,saveSql(stale,staleReview.fingerprint)),/revision changed/);
      const input=publicationInput(mixed,1); const proposal=preview(input);
      rejects(as(admin,saveSql(input,'0'.repeat(32))),/preview changed/);
      const updated=save(input,proposal);
      assert.equal(updated.document.title,'Updated synthetic batch');
      assert.equal(updated.document.batchRevision,2);
      assert.deepEqual(existing(),before);
    });
    await t.test('unpublish and republish preserve history and do not revoke online access', () => {
      const unpublish=save(publicationInput(mixed,2,'unpublish'));
      assert.equal(unpublish.document.state,'unpublished');
      assert.equal(query(as(student,"select public.can_access_v2_product('quant_crash')")),'t');
      assert.throws(() => preview(publicationInput(mixed,3,'unpublish')),/Only a published/);
      const republish=save(publicationInput(mixed,3));
      assert.equal(republish.document.revision,4);
      assert.equal(query(`select count(*) from public.v2_batch_publication_revisions where batch_id='${mixed.id}'`),'4');
      assert.deepEqual(save(initialInput,initialReview),{ document:initial.document,replayed:true });
      rejects(as(admin,saveSql({ ...initialInput,action:'unpublish' },initialReview.fingerprint)),/different submission/);
    });
    await t.test('concurrent duplicate confirmations write once; conflicting transitions have one winner', async () => {
      const input=publicationInput(mixed,4); const proposal=preview(input);
      const results=await Promise.all([1,2,3].map(() => concurrentQuery(as(admin,saveSql(input,proposal.fingerprint)))));
      assert.equal(results.map(JSON.parse).filter((item) => !item.replayed).length,1);
      const requests=[publicationInput(mixed,5,'publish'),publicationInput(mixed,5,'unpublish')];
      const reviews=requests.map(preview);
      const conflicts=await Promise.allSettled(requests.map((item,index) => concurrentQuery(as(index ? otherAdmin : admin,saveSql(item,reviews[index].fingerprint)))));
      assert.equal(conflicts.filter((item) => item.status==='fulfilled').length,1);
      assert.match(conflicts.find((item) => item.status==='rejected').reason.message,/revision changed/);
    });
    await t.test('shared request tokens cannot publish two batches and failed writes leave no partial publication', async () => {
      const batch=createBatch(template('di_crash',[outline('di')]));
      const batchTwo=createBatch(template('verbal_crash',[outline('verbal')]));
      const token=randomUUID();
      const requests=[batch,batchTwo].map((item) => ({ ...publicationInput(item),requestId:token }));
      const reviews=requests.map(preview);
      const result=await Promise.allSettled(requests.map((item,index) => concurrentQuery(as(admin,saveSql(item,reviews[index].fingerprint)))));
      assert.equal(result.filter((item) => item.status==='fulfilled').length,1);
      assert.match(result.find((item) => item.status==='rejected').reason.message,/different submission/);
      const input=publicationInput(full,1); const proposal=preview(input);
      const old=snapshot('select * from public.v2_batch_publication_revisions');
      query(`create function public.synthetic_publication_failure() returns trigger language plpgsql as $$
        begin raise exception 'Synthetic publication failure'; end $$;
        create trigger synthetic_publication_failure before insert on public.v2_batch_publication_revisions
        for each row execute function public.synthetic_publication_failure();`);
      rejects(as(admin,saveSql(input,proposal.fingerprint)),/Synthetic publication failure/);
      assert.equal(snapshot('select * from public.v2_batch_publication_revisions'),old);
      query('drop trigger synthetic_publication_failure on public.v2_batch_publication_revisions; drop function public.synthetic_publication_failure()');
    });
    await t.test('deactivation blocks retry recovery and malformed direct RPC requests are refused', () => {
      query(`update public.profiles set is_active=false where id='${admin}'`);
      rejects(as(admin,saveSql(initialInput,initialReview.fingerprint)),/Active Admin/);
      query(`update public.profiles set is_active=true where id='${admin}'`);
      for (const input of [null,{}, { ...initialInput,actorId:admin },{ ...initialInput,action:'delete' },
        { ...initialInput,expectedRevision:-1 },{ ...initialInput,batchRevision:0 }]) {
        rejects(as(admin,previewSql(input)),/Invalid/);
      }
    });
    await t.test('migration reapplication preserves publication, draft and meeting history and legacy access', () => {
      const tables=['v2_live_batch_revisions','v2_batch_meeting_revisions','v2_batch_publication_revisions'];
      const snapshots=tables.map((name) => snapshot(`select * from public.${name}`));
      apply(outlineMigration); apply(publicationMigration);
      assert.deepEqual(tables.map((name) => snapshot(`select * from public.${name}`)),snapshots);
      assert.deepEqual(existing(),before);
      assert.equal(query(as(student,"select public.can_access_course('c3000000-0000-4000-8000-000000000001')")),'t');
    });
  }));
