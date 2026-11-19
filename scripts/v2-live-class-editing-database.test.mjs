import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';
import { preparePhase3Database, as, json, literal } from './helpers/v2-phase3-fixture.mjs';

const migration = '20261120100000_add_v2_live_class_editing.sql';
const edit = draft => ({ id: draft.id, templateId: draft.templateId, templateRevision: draft.templateRevision,
  expectedRevision: draft.revision, requestId: randomUUID(), title: draft.title, startDate: draft.startDate,
  timeZone: draft.timeZone, events: draft.events.map(({ key, kind, localDate, localStartTime, durationMinutes, instructor, capacity }) =>
    ({ key, ...(kind ? { kind } : {}), localDate, localStartTime, durationMinutes, instructor, capacity })) });
const newClass = (section = 'quant') => ({ key: randomUUID(), kind: 'live', title: 'Extra live class', section,
  localDate: '2027-01-12', localStartTime: '20:00', durationMinutes: 60, instructor: '', capacity: 8 });

test('live class draft edits preserve authorization, publication and completed history', { timeout: 120000 }, async t => withDisposablePostgres(async db => {
  const { query, apply, rejects, concurrentQuery } = db;
  const f = preparePhase3Database(db);
  for (const file of ['20261113090000_add_v2_sales_catalogue.sql', '20261113100000_add_v2_checkout_ledger.sql', '20261113110000_add_v2_payment_fulfillment.sql']) apply(file);
  const previewSql = input => `select public.preview_v2_batch_draft(${json(input)})`;
  const saveSql = (input, fingerprint) => `select public.save_v2_batch_draft(${json(input)},${literal(fingerprint)})`;
  const preview = input => JSON.parse(query(as(f.admin, previewSql(input))));
  const save = (input, proposal = preview(input)) => JSON.parse(query(as(f.admin, saveSql(input, proposal.fingerprint))));
  const latest = b => JSON.parse(query(`select document from public.v2_course_batch_revisions where batch_id='${b.id}' order by revision desc limit 1`));
  const snapshot = table => query(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') from public.${table} t`);
  const b = f.batch('full_course', true), standalone = f.batch('quant', true);
  query(as(f.admin, `select public.save_v2_meeting_draft(${json({ batchId: b.id, batchRevision: 1, expectedRevision: 0, requestId: randomUUID(), links: [{ key: b.eventKey, url: 'https://meet.google.com/abc-defg-hij' }] })})`));
  f.publish(b);
  query(as(f.admin, `select public.set_v2_live_session_mapping('${b.id}','${b.eventKey}','${b.sessionKey}',1)`));
  const student = randomUUID();
  query(`insert into auth.users(id,email) values('${student}','live-class-student@example.invalid');update public.profiles set is_active=true where id='${student}';
    select public.grant_v2_purchase('${student}',array['full_batch'],'live-class-synthetic-purchase',now(), 'a1000000-0000-4000-8000-000000000001',2500000,'INR');`);
  query(as(f.admin, `select public.set_v2_batch_enrollment('${b.id}','${student}',true,0);select public.set_v2_live_registration('${b.id}','${student}',true,0)`));
  const preservedTables = ['v2_course_templates', 'v2_course_template_revisions', 'v2_batch_publication_revisions', 'v2_batch_meeting_revisions', 'v2_published_meetings', 'v2_live_session_mappings', 'v2_purchases', 'v2_batch_enrollments', 'v2_live_registrations'];
  const baseline = Object.fromEntries(preservedTables.map(table => [table, snapshot(table)]));
  const original = latest(b);
  const legacy = edit(original);
  const legacyProjection = preview(legacy);

  await t.test('additive installation preserves prior rows and legacy preview fingerprints', () => {
    apply(migration);
    assert.deepEqual(preview(legacy), legacyProjection);
    assert.deepEqual(Object.fromEntries(preservedTables.map(table => [table, snapshot(table)])), baseline);
    for (const role of ['anon', 'authenticated', 'service_role']) {
      assert.equal(query(`select has_function_privilege('${role}','public.assert_v2_completed_class_preservation(uuid,jsonb)','execute')`), 'f');
    }
    rejects(as(student, previewSql(legacy)), /Active Admin/);
    rejects(as(null, saveSql(legacy, legacyProjection.fingerprint), 'anon'), /permission denied/);
  });

  let revised;
  const added = newClass('verbal');
  await t.test('rename, addition and reorder save only the exact reviewed draft and retry once', async () => {
    const input = edit(original);
    input.events[0].title = 'Renamed Quant class';
    input.events[0].section = 'quant';
    input.events.unshift(added);
    const review = preview(input);
    assert.equal(review.draft.events[0].key, added.key);
    assert.equal(review.draft.events[1].title, 'Renamed Quant class');
    assert.deepEqual(latest(b), original);
    rejects(as(f.admin, saveSql({ ...input, events: [{ ...added, title: 'Unreviewed title' }, input.events[1]] }, review.fingerprint)), /reviewed schedule changed/);
    const sql = as(f.admin, saveSql(input, review.fingerprint));
    const responses = await Promise.all([concurrentQuery(sql), concurrentQuery(sql)]);
    assert.deepEqual(responses.map(result => JSON.parse(result).replayed).sort(), [false, true]);
    revised = latest(b);
    assert.deepEqual(revised, review.draft);
    rejects(as(f.admin, saveSql({ ...input, title: 'Reused token' }, review.fingerprint)), /different submission/);
    rejects(as(f.admin, saveSql({ ...input, requestId: randomUUID() }, review.fingerprint)), /revision changed/);
    assert.deepEqual(Object.fromEntries(preservedTables.map(table => [table, snapshot(table)])), baseline);
  });

  await t.test('subjects, metadata, event identities and session identifiers remain constrained', () => {
    const input = edit(revised);
    const rejectEvents = (events, pattern) => rejects(as(f.admin, previewSql({ ...input, events })), pattern);
    rejectEvents(input.events.map(e => e.key === b.eventKey ? { ...e, section: 'di' } : e), /subject must be preserved/);
    rejectEvents([...input.events, { ...newClass(), section: 'programme' }], /Invalid class subject/);
    rejectEvents([...input.events, { ...newClass(), title: '' }], /Invalid class title/);
    rejectEvents([...input.events, { ...newClass(), title: null }], /Invalid class title/);
    rejectEvents([...input.events, { ...newClass(), key: b.sessionKey }], /identifiers must be distinct/);
    rejects(as(f.admin, previewSql({ ...input, sessions: [], events: [...input.events, { ...newClass(), key: b.sessionKey }] })), /identifiers must be distinct/);
    const missing = newClass(); delete missing.title;
    rejectEvents([...input.events, missing], /require a title/);
    rejectEvents([...input.events, input.events[0]], /Invalid batch event values/);
    rejectEvents(input.events.map(e => e.key === b.eventKey ? { ...e, kind: 'outline', localDate: null, localStartTime: null, durationMinutes: null } : e), /kind must be preserved/);
    const single = edit(latest(standalone));
    rejects(as(f.admin, previewSql({ ...single, events: [...single.events, newClass('di')] })), /included subject/);
    rejects(as(f.admin, previewSql({ ...input, productCode: 'quant' })), /Invalid batch fields/);
    rejects(as(f.admin, previewSql({ ...input, startDate: '2027-01-11' })), /anchor date cannot change/);
  });

  await t.test('removal changes only the new revision and removed identifiers cannot be recycled', () => {
    const input = edit(revised); input.events = input.events.filter(e => e.key !== added.key);
    const result = save(input);
    assert.equal(result.draft.events.length, 1);
    assert.equal(query(`select count(*) from public.v2_course_batch_revisions where batch_id='${b.id}' and document->'events' @> ${json([{ key: added.key }])}`), '1');
    rejects(as(f.admin, previewSql({ ...edit(result.draft), events: [...edit(result.draft).events, added] })), /cannot be reused/);
    revised = result.draft;
    assert.deepEqual(Object.fromEntries(preservedTables.map(table => [table, snapshot(table)])), baseline);
    const allRemoved = save({ ...edit(latest(standalone)), events: [] });
    assert.deepEqual(allRemoved.draft.events, []);
  });

  await t.test('completion after draft review rejects stale edits and publication of an earlier changed draft', () => {
    const pending = edit(revised); pending.events[0].localStartTime = '21:00';
    const review = preview(pending);
    const publication = { batchId: b.id, batchRevision: revised.revision, expectedRevision: 1, requestId: randomUUID(), action: 'publish' };
    const publicationReview = JSON.parse(query(as(f.admin, `select public.preview_v2_batch_publication(${json(publication)})`)));
    query(as(f.admin, `select public.complete_v2_learning_live_class('${b.id}','${b.eventKey}',1)`));
    rejects(as(f.admin, saveSql(pending, review.fingerprint)), /Completed live classes/);
    rejects(as(f.admin, `select public.save_v2_batch_publication(${json(publication)},${literal(publicationReview.fingerprint)})`), /Completed live classes/);
    rejects(as(f.admin, `select public.preview_v2_batch_publication(${json(publication)})`), /Completed live classes/);
    const restore = edit(revised); restore.events[0].title = original.events[0].title;
    revised = save(restore).draft;
    for (const patch of [{ title: 'Changed completed class' }, { localDate: '2027-01-13' }, { localStartTime: '18:00' }, { durationMinutes: 75 }, { instructor: 'Other instructor' }]) {
      rejects(as(f.admin, previewSql({ ...edit(revised), events: [{ ...edit(revised).events[0], ...patch }] })), /Completed live classes/);
    }
    rejects(as(f.admin, previewSql({ ...edit(revised), events: [] })), /Completed live classes/);
    assert.equal(query(`select count(*) from public.v2_live_class_completions where batch_id='${b.id}'`), '1');
    const other = newClass('di');
    revised = save({ ...edit(revised), events: [...edit(revised).events, other] }).draft;
    assert.equal(revised.events.length, 2);
    assert.deepEqual(Object.fromEntries(preservedTables.map(table => [table, snapshot(table)])), baseline);
  });

  await t.test('outline records cannot be added, removed, renamed or converted', () => {
    const templateId = randomUUID(), outlineKey = randomUUID();
    const document = { title: 'Outline fixture', summary: '', durationDays: 1, events: [{ key: outlineKey, kind: 'outline', title: '', section: 'quant', dayOffset: null, localStartTime: null, durationMinutes: null, instructor: '', capacity: 8 }] };
    query(as(f.admin, `select public.save_v2_template_draft('${templateId}','quant',0,'${randomUUID()}',${json(document)})`));
    const created = save({ id: randomUUID(), templateId, templateRevision: 1, expectedRevision: 0, requestId: randomUUID(), title: 'Undated outline', startDate: '', timeZone: 'Asia/Kolkata', events: null }).draft;
    const input = edit(created);
    rejects(as(f.admin, previewSql({ ...input, events: [] })), /Outline events must be preserved/);
    rejects(as(f.admin, previewSql({ ...input, events: [{ ...input.events[0], title: 'Changed' }] })), /Outline title/);
    rejects(as(f.admin, previewSql({ ...input, events: [...input.events, { ...input.events[0], key: randomUUID() }] })), /New live classes/);
    rejects(as(f.admin, previewSql({ ...input, events: [{ ...input.events[0], kind: 'live', localDate: '2027-01-12', localStartTime: '19:00', durationMinutes: 60 }] })), /kind must be preserved/);
    assert.deepEqual(preview(input).draft.events, created.events);
  });

  await t.test('reapplying the additive migration does not change saved history or retry behavior', () => {
    const tables = [...preservedTables, 'v2_course_batch_revisions', 'v2_live_class_completions'];
    const before = Object.fromEntries(tables.map(table => [table, snapshot(table)]));
    apply(migration);
    assert.deepEqual(Object.fromEntries(tables.map(table => [table, snapshot(table)])), before);
    assert.deepEqual(preview(edit(revised)).draft.events, revised.events);
  });
}));
