import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load(path, dependencies = {}, globals = {}) {
  const exports = {};
  const compiled = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(compiled, { exports, ...globals, require: (name) => {
    assert(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}
const domain = load('src/lib/v2Templates.ts');
const input = () => ({ id: randomUUID(), productCode: 'quant_crash', expectedRevision: 0, requestId: randomUUID(), document: {
  title: 'Synthetic template', summary: '', durationDays: 7,
  events: [{ key: randomUUID(), title: 'Synthetic event', section: 'quant', dayOffset: 0,
    localStartTime: '18:00', durationMinutes: 60, capacity: 8, instructor: '' }],
} });
const clone = (value) => JSON.parse(JSON.stringify(value));

test('supported products derive fixed sections and independent suggested durations', () => {
  assert.deepEqual(clone(domain.V2_TEMPLATE_PRODUCTS.full_batch.sections), ['quant','verbal','di']);
  for (const section of ['quant','verbal','di']) {
    const code = `${section}_crash`;
    assert.deepEqual(clone(domain.V2_TEMPLATE_PRODUCTS[code].sections), [section]);
    assert.equal(domain.V2_TEMPLATE_PRODUCTS[code].suggestedDays, 7);
    const value = input();
    value.productCode = code;
    value.document.events[0].section = section;
    assert.equal(domain.validateV2TemplateSave(value), null);
  }
  assert.equal(domain.V2_TEMPLATE_PRODUCTS.full_batch.suggestedDays, 56);
  for (const value of ['full-course','cr-crash-course','rc-crash-course','__proto__','constructor',null]) assert.equal(domain.isV2TemplateProduct(value), false);
});

test('drafts permit empty event lists and do not require a live date or purchase', () => {
  const value = input();
  value.document.events = [];
  assert.equal(domain.validateV2TemplateSave(value), null);
  assert.equal(domain.validateV2TemplateSave({ ...value, document: { ...value.document, title: 'Full Batch' } }), null);
  value.document.events = [input().document.events[0]];
  value.document.events[0].section = 'verbal';
  assert.match(domain.validateV2TemplateSave(value), /section/);
});

test('untrusted input rejects unknown fields, malformed metadata, nulls and duplicate keys', () => {
  const valid = input();
  for (const value of [null, [], {}, { ...valid, actorId: randomUUID() }, { ...valid, id: 'id' },
    { ...valid, expectedRevision: -1 }, { ...valid, expectedRevision: 1.5 }, { ...valid, expectedRevision: 2147483647 },
    { ...valid, productCode: '__proto__' }, { ...valid, requestId: null }, { ...valid, document: null }]) {
    assert.equal(typeof domain.validateV2TemplateSave(value), 'string');
  }
  for (const patch of [{ title: '' }, { title: ' leading' }, { title: 'trailing\t' }, { title: 'x'.repeat(121) },
    { summary: 'x'.repeat(2001) }, { durationDays: 0 }, { durationDays: 367 }, { durationDays: '7' },
    { events: null }, { events: [null] }, { events: [valid.document.events[0], valid.document.events[0]] },
    { meetUrl: 'https://example.test' }, { state: 'published' }]) {
    assert.equal(typeof domain.validateV2TemplateSave({ ...valid, document: { ...valid.document, ...patch } }), 'string');
  }
});

test('event boundaries enforce exact time, days, capacity, duration, and product scope', () => {
  const valid = input();
  const withEvent = (patch) => ({ ...valid, document: { ...valid.document, events: [{ ...valid.document.events[0], ...patch }] } });
  for (const patch of [{ dayOffset: -1 }, { dayOffset: 7 }, { dayOffset: 0.5 }, { capacity: 0 }, { capacity: 1001 },
    { durationMinutes: 14 }, { durationMinutes: 721 }, { localStartTime: '24:00' }, { localStartTime: '9:30' },
    { localStartTime: '00:60' }, { title: null }, { instructor: false }, { section: 'qa' }, { capacity: '8' },
    { key: 'arbitrary' }, { dayOffset: 6, localStartTime: '23:46', durationMinutes: 15 }]) {
    assert.equal(typeof domain.validateV2TemplateSave(withEvent(patch)), 'string', JSON.stringify(patch));
  }
  for (const patch of [{ capacity: 1 }, { capacity: 1000 }, { durationMinutes: 15 },
    { localStartTime: '00:00', durationMinutes: 720 }, { dayOffset: 6, localStartTime: '23:45', durationMinutes: 15 },
    { dayOffset: 5, localStartTime: '23:45', durationMinutes: 60 }, { title: '📚'.repeat(120) }]) {
    assert.equal(domain.validateV2TemplateSave(withEvent(patch)), null, JSON.stringify(patch));
  }
});

test('bounded event lists support 100 distinct planned events and reject 101', () => {
  const value = input();
  value.document.events = Array.from({ length: 100 }, () => input().document.events[0]);
  assert.equal(domain.validateV2TemplateSave(value), null);
  value.document.events.push(input().document.events[0]);
  assert.match(domain.validateV2TemplateSave(value), /100/);
});

test('the feature defaults off and cannot be enabled on a Vercel Production deployment', () => {
  for (const env of [{}, { V2_TEMPLATE_AUTHORING_ENABLED: 'false' }, { V2_TEMPLATE_AUTHORING_ENABLED: 'TRUE' },
    { V2_TEMPLATE_AUTHORING_ENABLED: 'true', VERCEL_ENV: 'production' }]) {
    const feature = load('src/lib/server/v2TemplateFeature.ts', { 'server-only': {} }, { process: { env } });
    assert.equal(feature.isV2TemplateAuthoringEnabled(), false);
  }
  for (const VERCEL_ENV of ['preview', undefined]) {
    const feature = load('src/lib/server/v2TemplateFeature.ts', { 'server-only': {} }, { process: { env: { V2_TEMPLATE_AUTHORING_ENABLED: 'true', VERCEL_ENV } } });
    assert.equal(feature.isV2TemplateAuthoringEnabled(), true);
  }
});

function harness() {
  const state = { enabled: true, identity: { role: 'admin' }, identityCalls: 0, clients: 0, calls: [],
    result: { data: [], error: null }, fault: '' };
  const api = load('src/lib/server/v2Templates.ts', {
    'server-only': {}, '@/lib/v2Templates': domain,
    '@/lib/server/v2TemplateFeature': { isV2TemplateAuthoringEnabled: () => state.enabled },
    '@/lib/server/portalAuthorization': { getPortalIdentity: async () => {
      state.identityCalls++;
      if (state.fault === 'identity') throw new Error('Synthetic private error');
      return state.identity;
    } },
    '@/utils/supabase/server': { createClient: async () => {
      state.clients++;
      if (state.fault === 'client') throw new Error('Synthetic private error');
      return { rpc: async (name, args) => {
        state.calls.push({ name, args });
        if (state.fault === 'rpc') throw new Error('Synthetic private error');
        return state.result;
      } };
    } },
  });
  return { state, ...api };
}

test('disabled authoring performs no authentication or database calls, including direct saves', async () => {
  const app = harness();
  app.state.enabled = false;
  assert.equal((await app.listV2TemplateDrafts()).status, 'disabled');
  assert.equal((await app.saveV2TemplateDraft(input())).status, 'error');
  assert.equal(app.state.identityCalls, 0);
  assert.equal(app.state.clients, 0);
});

test('signed-out and Student callers never reach the authoring database client', async () => {
  for (const identity of [null, { role: 'student' }]) {
    const app = harness();
    app.state.identity = identity;
    assert.equal((await app.listV2TemplateDrafts()).status, 'forbidden');
    assert.equal((await app.saveV2TemplateDraft(input())).status, 'error');
    assert.equal(app.state.clients, 0);
  }
});

test('invalid submissions are stopped before RPC and successful calls contain no supplied actor', async () => {
  const app = harness();
  assert.equal((await app.saveV2TemplateDraft({})).status, 'error');
  assert.equal(app.state.clients, 0);
  const value = input();
  const template = { id: value.id, productCode: value.productCode, revision: 1, document: value.document };
  app.state.result = { data: { template, replayed: false }, error: null };
  assert.deepEqual(clone(await app.saveV2TemplateDraft(value)), { status: 'success', template, replayed: false });
  assert.deepEqual(clone(app.state.calls[0]), { name: 'save_v2_template_draft', args: {
    p_id: value.id, p_product_code: value.productCode, p_expected_revision: 0, p_request_id: value.requestId, p_document: value.document,
  } });
  app.state.result = { data: [template], error: null };
  assert.equal((await app.listV2TemplateDrafts()).templates.length, 1);
  assert.equal(app.state.calls[1].name, 'list_v2_template_drafts');
  assert.equal(app.state.calls[1].args, undefined);
});

test('unavailable schema, malformed replies and transport faults fail without disclosing details', async () => {
  const app = harness();
  for (const data of [null, {}, [null], [{ actor_id: 'private', id: randomUUID() }]]) {
    app.state.result = { data, error: null };
    assert.equal((await app.listV2TemplateDrafts()).status, 'unavailable');
    assert.equal((await app.saveV2TemplateDraft(input())).status, 'error');
  }
  for (const fault of ['identity','client','rpc']) {
    app.state.fault = fault;
    assert.equal((await app.listV2TemplateDrafts()).status, 'unavailable');
    const result = await app.saveV2TemplateDraft(input());
    assert.equal(result.status, 'error');
    assert.doesNotMatch(result.message, /Synthetic|private/);
  }
  app.state.fault = '';
  for (const [code, pattern] of [['40001', /newer revision/], ['22023', /does not match/], ['PGRST202', /could not be saved/], ['42501', /could not be saved/]]) {
    app.state.result = { data: null, error: { code, message: 'Synthetic private details' } };
    assert.match((await app.saveV2TemplateDraft(input())).message, pattern);
    assert.equal((await app.listV2TemplateDrafts()).status, 'unavailable');
  }
});

test('access is rechecked on every call after an Admin session changes', async () => {
  const app = harness();
  assert.equal((await app.listV2TemplateDrafts()).status, 'ready');
  app.state.identity = null;
  assert.equal((await app.listV2TemplateDrafts()).status, 'forbidden');
  assert.equal((await app.saveV2TemplateDraft(input())).status, 'error');
  assert.equal(app.state.calls.length, 1);
});

test('a save receipt must match every submitted template field and event order', async () => {
  const app = harness();
  const value = input();
  value.document.events.push({ ...input().document.events[0], dayOffset: 1 });
  const template = { id: value.id, productCode: value.productCode, revision: 1, document: value.document };
  for (const patch of [{ title: 'Different title' }, { summary: 'Changed summary' }, { durationDays: 8 },
    { events: [...value.document.events].reverse() },
    ...[{ title: 'Changed lesson' }, { dayOffset: 2 }, { localStartTime: '19:00' },
      { durationMinutes: 90 }, { capacity: 9 }, { instructor: 'Synthetic instructor' }, { key: randomUUID() }]
      .map((eventPatch) => ({ events: [{ ...value.document.events[0], ...eventPatch }, value.document.events[1]] }))]) {
    app.state.result = { data: { template: { ...template, document: { ...value.document, ...patch } }, replayed: false }, error: null };
    assert.equal((await app.saveV2TemplateDraft(value)).status, 'error');
  }
  // JSON object key order is irrelevant; the event sequence remains significant.
  const reordered = { ...template, document: { events: value.document.events, durationDays: 7, summary: '', title: value.document.title } };
  app.state.result = { data: { template: reordered, replayed: true }, error: null };
  assert.equal((await app.saveV2TemplateDraft(value)).status, 'success');
});

test('the Server Action delegates authorization and refreshes only the new route after success', async () => {
  const calls = [];
  let result = { status: 'error', message: 'Denied' };
  const action = load('src/app/admin/v2/templates/actions.ts', {
    'next/cache': { revalidatePath: (path) => calls.push(path) },
    '@/lib/server/v2Templates': { saveV2TemplateDraft: async (value) => { calls.push(value); return result; } },
  });
  const value = input();
  assert.equal((await action.saveTemplateDraftAction(value)).status, 'error');
  assert.deepEqual(calls, [value]);
  result = { status: 'success', template: {}, replayed: false };
  await action.saveTemplateDraftAction(value);
  assert.deepEqual(calls, [value, value, '/admin/v2/templates']);
});

test('the new page hides when disabled and requires Admin authorization before loading', async () => {
  let enabled = false;
  const calls = [];
  const page = load('src/app/admin/v2/templates/page.tsx', {
    'react/jsx-runtime': { jsx: () => ({}), jsxs: () => ({}) }, '@/components/AdminDraftNavigation': {}, './TemplateEditor': {},
    'next/navigation': { notFound: () => { throw new Error('Not found'); } },
    '@/lib/server/v2TemplateFeature': { isV2TemplateAuthoringEnabled: () => enabled },
    '@/lib/server/v2BatchFeature': { isV2BatchAuthoringEnabled: () => false },
    '@/lib/server/portalAuthorization': { requirePortalRole: async (role) => { calls.push(role); } },
    '@/lib/server/v2Templates': { listV2TemplateDrafts: async () => { calls.push('load'); return { status: 'ready', templates: [] }; } },
  });
  await assert.rejects(page.default(), /Not found/);
  assert.equal(calls.length, 0);
  enabled = true;
  await page.default();
  assert.deepEqual(calls, ['admin','load']);
});
