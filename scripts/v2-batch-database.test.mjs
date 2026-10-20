import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';

const lit = (value) => `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${lit(JSON.stringify(value))}::jsonb`;
const admin = randomUUID();
const adminTwo = randomUUID();
const student = randomUUID();
const inactive = randomUUID();
const migration = '20261019100000_add_v2_batch_drafts.sql';
const as = (user, sql, role = 'authenticated') => `begin; set local role ${role}; set local request.jwt.claim.sub=${lit(user ?? '')}; ${sql}; commit;`;
const previewSql = (input) => `select public.preview_v2_batch_draft(${json(input)})`;
const saveSql = (input, fingerprint) => `select public.save_v2_batch_draft(${json(input)},${lit(fingerprint)})`;
const templateDocument = (sections) => ({ title: 'Synthetic curriculum', summary: '', durationDays: 7, events: sections.map((section, index) => ({
  key: randomUUID(), title: `Synthetic ${section}`, section, dayOffset: index, localStartTime: index ? '23:30' : '00:15',
  durationMinutes: 60, instructor: '', capacity: 8,
})) });
const inputFor = (templateId, overrides = {}) => ({ id: randomUUID(), templateId, templateRevision: 1, expectedRevision: 0,
  requestId: randomUUID(), title: 'Synthetic live batch', startDate: '2028-02-28', timeZone: 'Asia/Kolkata', events: null, ...overrides });
const edit = (batch, overrides = {}) => ({ id: batch.id, templateId: batch.templateId, templateRevision: batch.templateRevision,
  expectedRevision: batch.revision, requestId: randomUUID(), title: batch.title, startDate: batch.startDate, timeZone: batch.timeZone,
  events: batch.events.map(({ key, localDate, localStartTime, durationMinutes, instructor, capacity }) =>
    ({ key, localDate, localStartTime, durationMinutes, instructor, capacity })), ...overrides });

test('independent V2 batch drafts in disposable PostgreSQL', { timeout: 120000 }, async (t) => withDisposablePostgres(async ({ query, rejects, concurrentQuery, apply }) => {
  query(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth, public to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  for (const file of ['20260731051000_production_baseline.sql','20260731062700_enforce_material_release.sql',
    '20260731110000_require_provisioned_portal_access.sql','20261018090000_add_v2_product_entitlements.sql',
    '20261019090000_add_v2_template_drafts.sql']) apply(file);
  query(`insert into auth.users(id,email) values ('${admin}','admin-one@example.test'),('${adminTwo}','admin-two@example.test'),
    ('${student}','student@example.test'),('${inactive}','inactive@example.test');
    update public.profiles set role='admin',is_active=true where id in ('${admin}','${adminTwo}');
    update public.profiles set role='admin',is_active=false where id='${inactive}';
    update public.profiles set role='student',is_active=true where id='${student}';
    insert into public.courses(id,name,is_active) values ('c3000000-0000-4000-8000-000000000001','Synthetic existing batch',false);
    insert into public.enrollments(user_id,course_id) values ('${student}','c3000000-0000-4000-8000-000000000001');
    select public.grant_v2_purchase('${student}',array['quant_crash'],'synthetic-batch-access',now()-interval '1 day',
      'a1000000-0000-4000-8000-000000000002',1000000,'INR');`);
  const templates = {};
  const documents = {};
  for (const [product, sections] of Object.entries({ full_batch: ['quant','verbal','di'], quant_crash: ['quant'], verbal_crash: ['verbal'], di_crash: ['di'] })) {
    templates[product] = randomUUID();
    documents[product] = templateDocument(sections);
    query(as(admin, `select public.save_v2_template_draft('${templates[product]}','${product}',0,'${randomUUID()}',${json(documents[product])})`));
  }
  const oldTables = query("select tablename from pg_tables where schemaname='public' order by tablename").split('\n');
  const oldFunctionIds = query("select string_agg(oid::text,',') from pg_proc where pronamespace='public'::regnamespace");
  const snapshot = (sql) => query(`select coalesce(jsonb_agg(to_jsonb(s) order by to_jsonb(s)::text),'[]') from (${sql}) s`);
  const names = oldTables.map(lit).join(',');
  const priorState = () => ({
    rows: Object.fromEntries(oldTables.map((table) => [table, snapshot(`select * from public."${table}"`)])),
    functions: snapshot(`select oid,pg_get_functiondef(oid),proacl from pg_proc where oid in (${oldFunctionIds})`),
    policies: snapshot(`select * from pg_policies where schemaname='public' and tablename in (${names})`),
    columns: snapshot(`select * from information_schema.columns where table_schema='public' and table_name in (${names})`),
    indexes: snapshot(`select * from pg_indexes where schemaname='public' and tablename in (${names})`),
    constraints: snapshot(`select conname,pg_get_constraintdef(oid) from pg_constraint where conrelid in (select oid from pg_class where relnamespace='public'::regnamespace and relname in (${names}))`),
    tables: snapshot(`select oid,relname,relacl,relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname in (${names})`),
    triggers: snapshot(`select oid,pg_get_triggerdef(oid) from pg_trigger where tgrelid in (select oid from pg_class where relnamespace='public'::regnamespace and relname in (${names})) and not tgisinternal`),
  });
  const before = priorState();
  const preview = (input, user = admin) => JSON.parse(query(as(user, previewSql(input))));
  const save = (input, proposal = preview(input), user = admin) => JSON.parse(query(as(user, saveSql(input, proposal.fingerprint))));
  const input = inputFor(templates.full_batch);
  let initial;
  let batch;
  let initialReview;

  await t.test('failed DDL rolls back and successful migration preserves all prior records and schema', () => {
    query('create view public.v2_live_batch_revisions as select 1 as unexpected');
    assert.throws(() => apply(migration));
    assert.equal(query("select to_regclass('public.v2_live_batches') is null"), 't');
    query('drop view public.v2_live_batch_revisions');
    assert.deepEqual(priorState(), before);
    apply(migration);
    assert.deepEqual(priorState(), before);
  });
  await t.test('preview writes nothing and converts midnight, leap-day and overnight events correctly', () => {
    initialReview = preview(input);
    assert.deepEqual(preview(input), initialReview);
    assert.equal(query('select count(*) from public.v2_live_batches'), '0');
    assert.equal(query('select count(*) from public.v2_live_batch_revisions'), '0');
    assert.deepEqual(priorState(), before);
    const events = initialReview.draft.events;
    assert.equal(events[0].startsAt, '2028-02-27T18:45:00.000Z');
    assert.equal(events[1].localDate, '2028-02-29');
    assert.equal(events[1].endsAt, '2028-02-29T19:00:00.000Z');
    assert.equal(events[2].localDate, '2028-03-01');
    const otherZone = JSON.parse(query(as(admin, `set local timezone='America/Los_Angeles'; ${previewSql(input)}`)));
    assert.deepEqual(otherZone, initialReview);
    const yearEnd = preview({ ...input, startDate: '2028-12-31' });
    assert.equal(yearEnd.draft.events[1].localDate, '2029-01-01');
  });
  await t.test('the reviewed projection must match confirmation and failed confirmation saves nothing', () => {
    rejects(as(admin, saveSql(input, '0'.repeat(32))), /reviewed schedule changed/);
    rejects(as(admin, saveSql({ ...input, startDate: '2028-03-01' }, initialReview.fingerprint)), /reviewed schedule changed/);
    rejects(as(admin, saveSql({ ...input, title: 'Changed after review' }, initialReview.fingerprint)), /reviewed schedule changed/);
    assert.equal(query('select count(*) from public.v2_live_batches'), '0');
    initial = save(input, initialReview).draft;
    batch = initial;
    assert.deepEqual(initial, initialReview.draft);
  });
  await t.test('anonymous, Student, inactive and service-role callers cannot read or author drafts', () => {
    for (const [user, role] of [[null,'anon'],[null,'authenticated'],[student,'authenticated'],[inactive,'authenticated'],[admin,'service_role']]) {
      for (const sql of [previewSql(inputFor(templates.quant_crash)), saveSql(input, initialReview.fingerprint), 'select public.list_v2_batch_drafts()']) {
        rejects(as(user, sql, role), /permission denied|Active Admin/);
      }
    }
    for (const user of [student,inactive]) {
      for (const table of ['v2_live_batches','v2_live_batch_revisions']) assert.equal(query(as(user, `select count(*) from public.${table}`)), '0');
    }
    rejects(as(null,'select * from public.v2_live_batches','anon'), /permission denied/);
  });
  await t.test('table mutations and private projection helpers are unavailable even under broad platform defaults', () => {
    for (const role of ['anon','authenticated','service_role']) {
      for (const table of ['v2_live_batches','v2_live_batch_revisions']) {
        for (const operation of ['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) {
          assert.equal(query(`select has_table_privilege('${role}','public.${table}','${operation}')`), 'f');
        }
      }
      for (const sql of ["select public.v2_batch_date('2028-01-01')", `select public.assert_v2_batch_request(${json(input)})`, `select public.build_v2_batch_draft(${json(input)})`]) rejects(as(admin,sql,role), /permission denied/);
    }
  });
  const others = [];
  await t.test('all four products and multiple batches of one product remain separate', () => {
    for (const [product, templateId] of Object.entries(templates)) {
      const created = save(inputFor(templateId, { startDate: '2029-01-02', title: 'A display name does not grant Full Batch access' })).draft;
      assert.equal(created.productCode, product);
      assert.deepEqual(created.events.map((event) => event.section), documents[product].events.map((event) => event.section));
      others.push(created);
    }
    const changed = edit(batch);
    changed.events[0] = { ...changed.events[0], localDate: '2028-03-07', localStartTime: '19:15', durationMinutes: 90, instructor: 'Synthetic instructor', capacity: 5 };
    batch = save(changed).draft;
    assert.equal(batch.events[0].startsAt, '2028-03-07T13:45:00.000Z');
    assert.equal(batch.events[0].endsAt, '2028-03-07T15:15:00.000Z');
    assert.deepEqual(batch.events.slice(1), initial.events.slice(1));
    const all = JSON.parse(query(as(admin,'select public.list_v2_batch_drafts()')));
    for (const other of others) assert.deepEqual(all.find((item) => item.id === other.id), other);
    assert.deepEqual(priorState(), before);
    assert.deepEqual(JSON.parse(query(`select document from public.v2_live_batch_revisions where batch_id='${input.id}' and revision=1`)), initial);
  });
  await t.test('dates, zone, bounds and extra caller-controlled fields are rejected before writes', () => {
    for (const patch of [{ startDate: '2027-02-29' },{ startDate: '2028-04-31' },{ startDate: '2028-13-01' },{ startDate: '2028-2-01' },
      { startDate: 'infinity' },{ startDate: '1999-12-31' },{ startDate: '2100-01-01' },{ timeZone: 'UTC' },
      { productCode: 'full_batch' },{ state: 'published' },{ actorId: admin },{ title: '' },{ expectedRevision: 9999999999 },{ events: [] }]) {
      rejects(as(admin,previewSql(inputFor(templates.quant_crash,patch))), /Invalid|must come/);
    }
    const changed = edit(batch);
    for (const patch of [{ localDate: '2027-02-29' },{ localStartTime: '24:00' },{ durationMinutes: 0 },{ durationMinutes: 721 },
      { capacity: 0 },{ capacity: 1001 },{ capacity: '8' },{ section: 'di' },{ title: 'Injected content' },{ instructor: null },{ meetUrl: 'https://example.test' }]) {
      const bad = { ...changed, events: [{ ...changed.events[0], ...patch }, ...changed.events.slice(1)] };
      rejects(as(admin,previewSql(bad)), /Invalid/);
    }
    for (const bad of [null,[],{}, { ...changed, events: null }, { ...changed, events: [null] }]) rejects(as(admin,previewSql(bad)), /Invalid/);
  });
  await t.test('edits cannot replace event identities, source template or original anchor date', () => {
    const changed = edit(batch);
    for (const events of [changed.events.slice(1), [...changed.events, changed.events[0]],
      [{ ...changed.events[0], key: randomUUID() }, ...changed.events.slice(1)]]) rejects(as(admin,previewSql({ ...changed, events })), /identities|Invalid/);
    rejects(as(admin,previewSql({ ...changed, templateId: templates.quant_crash })), /identity cannot change/);
    rejects(as(admin,previewSql({ ...changed, templateRevision: 2 })), /identity cannot change/);
    rejects(as(admin,previewSql({ ...changed, startDate: '2028-03-01' })), /anchor date cannot change/);
  });
  await t.test('retries recover original snapshots even after a later edit; changed retries are refused', () => {
    const recovered = save(input, initialReview);
    assert.equal(recovered.replayed, true);
    assert.deepEqual(recovered.draft, initial);
    rejects(as(admin,saveSql({ ...input, title: 'Changed retry' }, initialReview.fingerprint)), /different submission/);
    rejects(as(admin,saveSql(input, '0'.repeat(32))), /different submission/);
    assert.equal(query(`select latest_revision from public.v2_live_batches where id='${batch.id}'`), '2');
  });
  await t.test('concurrent duplicate confirmation produces one batch and revision', async () => {
    const concurrent = inputFor(templates.quant_crash);
    const proposal = preview(concurrent);
    const results = await Promise.all([1,2,3].map(() => concurrentQuery(as(admin,saveSql(concurrent,proposal.fingerprint)))));
    assert.equal(results.map(JSON.parse).filter((result) => !result.replayed).length, 1);
    assert.equal(query(`select count(*) from public.v2_live_batch_revisions where batch_id='${concurrent.id}'`), '1');
  });
  await t.test('concurrent creation with one batch id and different requests has one winner', async () => {
    const id = randomUUID();
    const inputs = [inputFor(templates.quant_crash,{ id }), inputFor(templates.verbal_crash,{ id })];
    const proposals = inputs.map((item) => preview(item));
    const results = await Promise.allSettled(inputs.map((item,index) => concurrentQuery(as(admin,saveSql(item,proposals[index].fingerprint)))));
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.match(results.find((result) => result.status === 'rejected').reason.message, /revision changed/);
  });
  await t.test('concurrent reuse of a request token cannot create two different batches', async () => {
    const requestId = randomUUID();
    const inputs = [inputFor(templates.quant_crash,{ requestId }),inputFor(templates.di_crash,{ requestId })];
    const proposals = inputs.map((item) => preview(item));
    const results = await Promise.allSettled(inputs.map((item,index) => concurrentQuery(as(admin,saveSql(item,proposals[index].fingerprint)))));
    assert.equal(results.filter((result) => result.status === 'fulfilled').length,1);
    assert.match(results.find((result) => result.status === 'rejected').reason.message,/different submission/);
    assert.equal(query(`select count(*) from public.v2_live_batches where id in (${inputs.map((item) => lit(item.id)).join(',')})`),'1');
  });
  await t.test('two Admins editing the same version cannot overwrite each other', async () => {
    const requests = [edit(batch,{ title: 'Synthetic edit A' }),edit(batch,{ title: 'Synthetic edit B' })];
    const proposals = requests.map((item) => preview(item));
    const results = await Promise.allSettled(requests.map((item,index) => concurrentQuery(as(index ? adminTwo : admin,saveSql(item,proposals[index].fingerprint)))));
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.match(results.find((result) => result.status === 'rejected').reason.message, /revision changed/);
    batch = JSON.parse(results.find((result) => result.status === 'fulfilled').value).draft;
    rejects(as(admin,saveSql(edit(initial), initialReview.fingerprint)), /revision changed/);
  });
  await t.test('a late write failure rolls back the new batch and its version pointer', () => {
    const rejected = inputFor(templates.di_crash,{ title: 'Synthetic failure injection' });
    const proposal = preview(rejected);
    query(`create function public.synthetic_batch_failure() returns trigger language plpgsql as $$ begin
      if new.document->>'title'='Synthetic failure injection' then raise exception 'Synthetic failure'; end if; return new; end $$;
      create trigger synthetic_batch_failure before insert on public.v2_live_batch_revisions for each row execute function public.synthetic_batch_failure();`);
    rejects(as(admin,saveSql(rejected,proposal.fingerprint)), /Synthetic failure/);
    assert.equal(query(`select count(*) from public.v2_live_batches where id='${rejected.id}'`), '0');
    assert.equal(query('select count(*) from public.v2_live_batches where latest_revision=0'), '0');
    const rejectedEdit = edit(batch,{ title: 'Synthetic failure injection' });
    const editProposal = preview(rejectedEdit);
    const history = snapshot(`select * from public.v2_live_batch_revisions where batch_id='${batch.id}'`);
    rejects(as(admin,saveSql(rejectedEdit,editProposal.fingerprint)),/Synthetic failure/);
    assert.equal(snapshot(`select * from public.v2_live_batch_revisions where batch_id='${batch.id}'`),history);
    assert.equal(query(`select latest_revision from public.v2_live_batches where id='${batch.id}'`),String(batch.revision));
    query('drop trigger synthetic_batch_failure on public.v2_live_batch_revisions; drop function public.synthetic_batch_failure()');
  });
  await t.test('deactivated Admins cannot recover a previously saved draft', () => {
    query(`update public.profiles set is_active=false where id='${admin}'`);
    rejects(as(admin,saveSql(input,initialReview.fingerprint)), /Active Admin/);
    assert.equal(query(as(admin,'select count(*) from public.v2_live_batch_revisions')), '0');
    query(`update public.profiles set is_active=true where id='${admin}'`);
  });
  await t.test('reapplication preserves all batches, earlier templates, legacy enrollment and purchase expiry', () => {
    const current = snapshot('select * from public.v2_live_batch_revisions');
    apply(migration);
    assert.equal(snapshot('select * from public.v2_live_batch_revisions'), current);
    assert.deepEqual(priorState(), before);
    assert.equal(query(as(student,"select public.can_access_course('c3000000-0000-4000-8000-000000000001')")), 't');
    assert.equal(query(as(student,"select public.can_access_v2_product('quant_crash')")), 't');
  });
  await t.test('template updates invalidate new confirmations but never replace existing batch snapshots', () => {
    const pending = inputFor(templates.full_batch);
    const proposal = preview(pending);
    const revised = { ...documents.full_batch, title: 'Revised template', events: documents.full_batch.events.map((event) => ({ ...event, localStartTime: '10:00', capacity: 6 })) };
    query(as(admin,`select public.save_v2_template_draft('${templates.full_batch}','full_batch',1,'${randomUUID()}',${json(revised)})`));
    rejects(as(admin,saveSql(pending,proposal.fingerprint)), /Template revision changed/);
    assert.equal(query(`select count(*) from public.v2_live_batches where id='${pending.id}'`), '0');
    assert.deepEqual(preview(edit(batch)).draft.events, batch.events);
    const current = save(edit(batch,{ title: 'Title edit after template update' })).draft;
    assert.equal(current.templateRevision, 1);
    assert.deepEqual(current.events, batch.events);
    const fresh = save(inputFor(templates.full_batch,{ templateRevision: 2 })).draft;
    assert.equal(fresh.templateRevision, 2);
    assert.equal(fresh.events[0].localStartTime, '10:00');
    assert.deepEqual(save(input,initialReview).draft, initial);
  });
  await t.test('an empty template remains a template draft without inventing a live batch', () => {
    const emptyId=randomUUID();
    const document={ ...templateDocument(['quant']),events: [] };
    query(as(admin,`select public.save_v2_template_draft('${emptyId}','quant_crash',0,'${randomUUID()}',${json(document)})`));
    const emptyInput=inputFor(emptyId);
    rejects(as(admin,previewSql(emptyInput)),/requires a template with planned events/);
    assert.equal(query(`select count(*) from public.v2_live_batches where id='${emptyInput.id}'`),'0');
  });
}));
