import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';

const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const actor = randomUUID();
const secondAdmin = randomUUID();
const student = randomUUID();
const inactive = randomUUID();
const migration = '20261019090000_add_v2_template_drafts.sql';
const doc = (section = 'quant') => ({ title: 'Synthetic teaching plan', summary: '', durationDays: 7, events: [{
  key: randomUUID(), title: 'Synthetic lesson', section, dayOffset: 0, localStartTime: '18:00', durationMinutes: 60, capacity: 8, instructor: '',
}] });
const request = (overrides = {}) => ({ id: randomUUID(), product: 'quant', revision: 0, token: randomUUID(), document: doc(), ...overrides });
const save = (input) => `select public.save_v2_template_draft(${literal(input.id)}, ${literal(input.product)}, ${input.revision}, ${literal(input.token)}, ${literal(JSON.stringify(input.document))}::jsonb)`;
const as = (user, sql, role = 'authenticated') => `begin; set local role ${role}; set local request.jwt.claim.sub = ${literal(user ?? '')}; ${sql}; commit;`;

test('V2 draft authoring database behavior', { timeout: 120000 }, async (t) => withDisposablePostgres(async ({ query, rejects, concurrentQuery, apply }) => {
  query(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  `);
  for (const file of ['20260731051000_production_baseline.sql', '20260731062700_enforce_material_release.sql',
    '20260731110000_require_provisioned_portal_access.sql', '20260731160000_align_master_course.sql',
    '20260817090845_add_versioned_course_templates.sql',
    '20261018090000_add_v2_product_entitlements.sql']) apply(file);
  query(`
    update public.master_sessions set instructor='Synthetic instructor' where instructor is not null;
    update public.course_template_events set instructor='Synthetic instructor' where instructor is not null;
    insert into auth.users (id,email) values ('${actor}','admin-one@example.test'), ('${secondAdmin}','admin-two@example.test'),
      ('${student}','student@example.test'), ('${inactive}','inactive@example.test');
    update public.profiles set role='admin', is_active=true where id in ('${actor}','${secondAdmin}');
    update public.profiles set role='student', is_active=true where id='${student}';
    update public.profiles set role='admin', is_active=false where id='${inactive}';
    insert into public.courses(id,name,is_active) values ('c2000000-0000-4000-8000-000000000001','Synthetic legacy batch',false);
    insert into public.enrollments(user_id,course_id) values ('${student}','c2000000-0000-4000-8000-000000000001');
    select public.grant_v2_purchase('${student}', array['quant_crash'], 'synthetic-before-template', now()-interval '1 day',
      'a1000000-0000-4000-8000-000000000002',1000000,'INR');
  `);
  const oldTables = query("select tablename from pg_tables where schemaname='public' order by tablename").split('\n');
  const oldFunctions = query("select string_agg(oid::text, ',') from pg_proc where pronamespace='public'::regnamespace");
  const snapshot = (sql) => query(`select coalesce(jsonb_agg(to_jsonb(s) order by to_jsonb(s)::text),'[]') from (${sql}) s`);
  const names = oldTables.map(literal).join(',');
  const beforeState = () => ({
    rows: Object.fromEntries(oldTables.map((table) => [table, snapshot(`select * from public."${table}"`)])),
    functions: snapshot(`select oid,pg_get_functiondef(oid),proacl from pg_proc where oid in (${oldFunctions})`),
    policies: snapshot(`select * from pg_policies where schemaname='public' and tablename in (${names})`),
    columns: snapshot(`select * from information_schema.columns where table_schema='public' and table_name in (${names})`),
    indexes: snapshot(`select * from pg_indexes where schemaname='public' and tablename in (${names})`),
    constraints: snapshot(`select conname,pg_get_constraintdef(oid) from pg_constraint where conrelid in (select oid from pg_class where relnamespace='public'::regnamespace and relname in (${names}))`),
    tables: snapshot(`select oid,relname,relacl,relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname in (${names})`),
    triggers: snapshot(`select oid,pg_get_triggerdef(oid) from pg_trigger where tgrelid in (select oid from pg_class where relnamespace='public'::regnamespace and relname in (${names})) and not tgisinternal`),
  });
  const before = beforeState();

  await t.test('migration failures are atomic and leave all earlier schema/data unchanged', () => {
    query('create view public.v2_course_template_revisions as select 1 as unexpected');
    assert.throws(() => apply(migration));
    assert.equal(query("select to_regclass('public.v2_course_templates') is null"), 't');
    query('drop view public.v2_course_template_revisions');
    assert.deepEqual(beforeState(), before);
  });
  apply(migration);
  await t.test('new migration neither changes legacy/Phase 1 records nor invents curriculum', () => {
    assert.deepEqual(beforeState(), before);
    assert.equal(query('select count(*) from public.v2_course_templates'), '0');
    assert.equal(query(as(student, "select public.can_access_course('c2000000-0000-4000-8000-000000000001')")), 't');
    assert.equal(query(as(student, "select public.can_access_v2_product('quant_crash')")), 't');
  });
  await t.test('all browser roles lose direct mutation privileges despite broad defaults', () => {
    for (const role of ['anon', 'authenticated', 'service_role']) {
      for (const table of ['v2_course_templates', 'v2_course_template_revisions']) {
        for (const operation of ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) {
          assert.equal(query(`select has_table_privilege('${role}','public.${table}','${operation}')`), 'f');
        }
      }
      rejects(as(actor, `select public.v2_template_document_valid('{}',array['quant'])`, role), /permission denied/);
    }
  });
  await t.test('signed-out, inactive, Student and service-role calls cannot author', () => {
    for (const [user, role] of [[null, 'anon'], [null, 'authenticated'], [student, 'authenticated'], [inactive, 'authenticated'], [actor, 'service_role']]) {
      rejects(as(user, save(request()), role), /permission denied|Active Admin/);
      rejects(as(user, 'select public.list_v2_template_drafts()', role), /permission denied|Active Admin/);
    }
  });
  const first = request();
  await t.test('Admin saves an immutable draft with stable product identity and no batch', () => {
    const result = JSON.parse(query(as(actor, save(first))));
    assert.equal(result.replayed, false);
    assert.deepEqual(result.template, { id: first.id, productCode: 'quant', revision: 1, document: first.document });
    assert.equal(query(as(student, 'select count(*) from public.v2_course_templates')), '0');
    assert.equal(query(as(student, 'select count(*) from public.v2_course_template_revisions')), '0');
    assert.equal(query(as(inactive, 'select count(*) from public.v2_course_template_revisions')), '0');
    rejects(as(null, 'select * from public.v2_course_templates', 'anon'), /permission denied/);
    assert.deepEqual(beforeState(), before);
  });
  await t.test('each product accepts only its own sections; Full Course permits all three', () => {
    for (const [product, sections] of Object.entries({ full_course: ['quant','verbal','di'], quant: ['quant'], verbal: ['verbal'], di: ['di'] })) {
      for (const section of ['quant','verbal','di']) {
        const sql = as(actor, save(request({ product, document: doc(section) })));
        if (sections.includes(section)) query(sql); else rejects(sql, /Invalid template/);
      }
    }
    rejects(as(actor, save(request({ product: 'full-course' }))), /Invalid template/);
  });
  await t.test('empty drafts are allowed; arbitrary fields, sections, times and limits are rejected atomically', () => {
    query(as(actor, save(request({ document: { ...doc(), events: [] } }))));
    const good = doc();
    const invalid = [null, [], {}, { ...good, status: 'published' }, { ...good, title: '' }, { ...good, durationDays: 0 },
      { ...good, durationDays: 367 }, { ...good, durationDays: 1.5 }, { ...good, events: null },
      { ...good, events: [null] }, { ...good, events: [good.events[0], good.events[0]] }];
    for (const patch of [{ section: 'va' }, { dayOffset: -1 }, { dayOffset: 7 }, { localStartTime: '24:00' },
      { localStartTime: '08:60' }, { durationMinutes: 14 }, { durationMinutes: 721 }, { durationMinutes: null },
      { capacity: 0 }, { capacity: 1001 }, { capacity: '8' }, { title: null }, { key: 'event-1' }, { instructor: {} },
      { dayOffset: 6, localStartTime: '23:50', durationMinutes: 60 }, { meetUrl: 'https://example.test' }]) {
      invalid.push({ ...good, events: [{ ...good.events[0], ...patch }] });
    }
    const beforeCount = query('select count(*) from public.v2_course_template_revisions');
    for (const document of invalid) rejects(as(actor, save(request({ document }))), /Invalid template/);
    assert.equal(query('select count(*) from public.v2_course_template_revisions'), beforeCount);
    assert.equal(query('select count(*) from public.v2_course_templates where latest_revision=0'), '0');
  });
  await t.test('identical retries return the original revision; changed retries are refused', () => {
    assert.equal(JSON.parse(query(as(actor, save(first)))).replayed, true);
    for (const changed of [request({ ...first, id: randomUUID() }), request({ ...first, revision: 1 }), request({ ...first, document: doc() })]) {
      rejects(as(actor, save(changed)), /different submission/);
    }
    assert.equal(query(`select count(*) from public.v2_course_template_revisions where template_id='${first.id}'`), '1');
  });
  await t.test('edits append history and stale edits cannot overwrite it', () => {
    const second = request({ id: first.id, revision: 1, document: { ...first.document, title: 'Revised synthetic title' } });
    const result = JSON.parse(query(as(actor, save(second))));
    assert.equal(result.template.revision, 2);
    assert.deepEqual(JSON.parse(query(`select document from public.v2_course_template_revisions where template_id='${first.id}' and revision=1`)), first.document);
    rejects(as(actor, save(request({ ...second, token: randomUUID() }))), /revision changed/);
    rejects(as(actor, save(request({ id: first.id, revision: 2, product: 'full_course' }))), /product cannot change/);
    assert.equal(JSON.parse(query(as(actor, save(first)))).template.revision, 1);
    const list = JSON.parse(query(as(actor, 'select public.list_v2_template_drafts()')));
    assert.equal(list.find((item) => item.id === first.id).revision, 2);
    assert.deepEqual(Object.keys(list[0]).sort(), ['document','id','productCode','revision']);
  });
  await t.test('concurrent retries create exactly one revision', async () => {
    const input = request();
    const results = await Promise.all([1,2,3].map(() => concurrentQuery(as(actor, save(input)))));
    assert.equal(results.map(JSON.parse).filter((item) => !item.replayed).length, 1);
    assert.equal(query(`select count(*) from public.v2_course_template_revisions where template_id='${input.id}'`), '1');
  });
  await t.test('concurrent conflicting editors have one winner; the loser must reload', async () => {
    const results = await Promise.allSettled([actor, secondAdmin].map((user) => concurrentQuery(as(user,
      save(request({ id: first.id, revision: 2 }))))));
    assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1);
    assert.match(results.find((item) => item.status === 'rejected').reason.message, /revision changed/);
    assert.equal(query(`select latest_revision from public.v2_course_templates where id='${first.id}'`), '3');
  });
  await t.test('reordering events preserves identities and the earlier immutable revision', () => {
    const input = request();
    input.document.events.push({ ...input.document.events[0], key: randomUUID(), title: 'Second synthetic lesson', dayOffset: 1 });
    query(as(actor, save(input)));
    const reordered = { ...input, revision: 1, token: randomUUID(), document: { ...input.document, events: [...input.document.events].reverse() } };
    const result = JSON.parse(query(as(actor, save(reordered))));
    assert.deepEqual(result.template.document.events, reordered.document.events);
    assert.deepEqual(JSON.parse(query(`select document from public.v2_course_template_revisions where template_id='${input.id}' and revision=1`)), input.document);
  });
  await t.test('concurrent token reuse for different templates cannot create partial drafts', async () => {
    const token = randomUUID();
    const inputs = [request({ token }), request({ token })];
    const results = await Promise.allSettled(inputs.map((input) => concurrentQuery(as(actor, save(input)))));
    assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1);
    assert.match(results.find((item) => item.status === 'rejected').reason.message, /different submission/);
    assert.equal(query(`select count(*) from public.v2_course_templates where id in (${inputs.map((item) => literal(item.id)).join(',')})`), '1');
  });
  await t.test('a deactivated Admin cannot replay an earlier successful submission', () => {
    query(`update public.profiles set is_active=false where id='${actor}'`);
    rejects(as(actor, save(first)), /Active Admin/);
    assert.equal(query(as(actor, 'select count(*) from public.v2_course_template_revisions')), '0');
    query(`update public.profiles set is_active=true where id='${actor}'`);
  });
  await t.test('repeat migration preserves drafts, purchase expiry, and the entire earlier schema', () => {
    const revisions = snapshot('select * from public.v2_course_template_revisions');
    apply(migration);
    assert.equal(snapshot('select * from public.v2_course_template_revisions'), revisions);
    assert.deepEqual(beforeState(), before);
  });
}));
