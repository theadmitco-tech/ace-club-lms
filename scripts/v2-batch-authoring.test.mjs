import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load(path, dependencies = {}, globals = {}) {
  const exports = {};
  const compiled = ts.transpileModule(readFileSync(new URL(`../${path}`,import.meta.url),'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(compiled, { exports, ...globals, require: (name) => {
    assert(Object.hasOwn(dependencies,name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}
const templates = load('src/lib/v2Templates.ts');
const domain = load('src/lib/v2Batches.ts',{ './v2Templates': templates });
const clone = (value) => JSON.parse(JSON.stringify(value));
const request = () => ({ id: randomUUID(),templateId: randomUUID(),templateRevision: 1,expectedRevision: 0,requestId: randomUUID(),
  title: 'Synthetic batch',startDate: '2028-02-29',timeZone: 'Asia/Kolkata',events: null });
const event = () => ({ key: randomUUID(),localDate: '2028-02-29',localStartTime: '00:15',durationMinutes: 60,instructor: '',capacity: 8 });
const draftFor = (input) => {
  const planned = event();
  return { id: input.id,productCode: 'quant_crash',templateId: input.templateId,templateRevision: input.templateRevision,
    revision: input.expectedRevision+1,state: 'draft',title: input.title,startDate: input.startDate,timeZone: input.timeZone,
    events: [{ ...planned,title: 'Synthetic lesson',section: 'quant',...domain.v2BatchEventInstants(planned) }] };
};
const fingerprint = 'a'.repeat(32);

test('calendar dates reject rollover and ambiguous formats while accepting leap days', () => {
  for (const value of ['2000-02-29','2028-02-29','2099-12-31']) assert.equal(domain.isV2BatchDate(value),true);
  for (const value of ['2027-02-29','2028-04-31','2028-13-01','2028-00-01','2028-2-01','01/02/2028','2028-02-29T00:00:00Z','1999-12-31','2100-01-01','infinity','',null]) assert.equal(domain.isV2BatchDate(value),false);
});
test('IST conversion crosses UTC and local calendar boundaries without using the browser zone', () => {
  const input = event();
  assert.deepEqual(clone(domain.v2BatchEventInstants(input)), { startsAt: '2028-02-28T18:45:00.000Z',endsAt: '2028-02-28T19:45:00.000Z' });
  assert.deepEqual(clone(domain.v2BatchEventInstants({ ...input,localDate: '2028-12-31',localStartTime: '23:45' })),
    { startsAt: '2028-12-31T18:15:00.000Z',endsAt: '2028-12-31T19:15:00.000Z' });
});
test('new batch requests accept template identity but no caller-defined schedule or product', () => {
  const input = request();
  assert.equal(domain.validateV2BatchInput(input),null);
  for (const patch of [{ events: [] },{ events: [event()] },{ productCode: 'full_batch' },{ state: 'published' },{ actorId: randomUUID() },
    { timeZone: 'UTC' },{ templateRevision: 0 },{ expectedRevision: 2147483647 },{ title: ' ' },{ title: 'bad\0title' },{ requestId: null }]) {
    assert.equal(typeof domain.validateV2BatchInput({ ...input,...patch }),'string');
  }
  for (const value of [null,[],{},true]) assert.equal(typeof domain.validateV2BatchInput(value),'string');
});
test('editable schedules enforce bounds, canonical times and distinct event identities', () => {
  const input = { ...request(),expectedRevision: 1,events: [event()] };
  assert.equal(domain.validateV2BatchInput(input),null);
  for (const patch of [{ localDate: '2027-02-29' },{ localStartTime: '24:00' },{ localStartTime: '8:00' },{ durationMinutes: 14 },
    { durationMinutes: 721 },{ capacity: 0 },{ capacity: 1001 },{ capacity: '8' },{ instructor: null },{ section: 'di' },{ key: 'id' }]) {
    assert.equal(typeof domain.validateV2BatchInput({ ...input,events: [{ ...input.events[0],...patch }] }),'string');
  }
  for (const events of [null,[null],[input.events[0],input.events[0]],Array.from({ length: 101 },event)]) {
    assert.equal(typeof domain.validateV2BatchInput({ ...input,events }),'string');
  }
  assert.equal(domain.validateV2BatchInput({ ...input,events: Array.from({ length: 100 },event) }),null);
});
test('read DTOs enforce scope, exact instants and minimal fields before reaching the client', () => {
  const input = request();
  const draft = draftFor(input);
  assert.equal(domain.isV2BatchDraft(draft),true);
  assert.equal(domain.isV2BatchProposal({ draft,fingerprint }),true);
  for (const patch of [{ productCode: 'unknown' },{ actor_id: 'private' },{ state: 'published' },{ revision: 0 },{ events: [null] }]) assert.equal(domain.isV2BatchDraft({ ...draft,...patch }),false);
  for (const patch of [{ section: 'di' },{ startsAt: '2028-02-28T18:46:00.000Z' },{ endsAt: '2028-02-28T19:46:00.000Z' },{ meetUrl: 'https://example.test' }]) {
    assert.equal(domain.isV2BatchDraft({ ...draft,events: [{ ...draft.events[0],...patch }] }),false);
  }
  for (const value of [null,{}, { draft,fingerprint: 'bad' },{ draft,fingerprint,private: 'value' }]) assert.equal(domain.isV2BatchProposal(value),false);
  const edits = domain.editableV2BatchEvents(draft.events);
  assert.deepEqual(Object.keys(edits[0]).sort(),['capacity','durationMinutes','instructor','key','localDate','localStartTime']);
  edits[0].capacity=1;
  assert.equal(draft.events[0].capacity,8);
});
test('batch authoring needs both explicit flags and remains disabled on Vercel Production', () => {
  for (const env of [{}, { V2_BATCH_AUTHORING_ENABLED: 'true' },{ V2_TEMPLATE_AUTHORING_ENABLED: 'true' },
    { V2_BATCH_AUTHORING_ENABLED: 'TRUE',V2_TEMPLATE_AUTHORING_ENABLED: 'true' },
    { V2_BATCH_AUTHORING_ENABLED: 'true',V2_TEMPLATE_AUTHORING_ENABLED: 'true',VERCEL_ENV: 'production' }]) {
    const base = load('src/lib/server/v2TemplateFeature.ts',{ 'server-only': {} },{ process: { env } });
    const feature = load('src/lib/server/v2BatchFeature.ts',{ 'server-only': {},'./v2TemplateFeature': base },{ process: { env } });
    assert.equal(feature.isV2BatchAuthoringEnabled(),false);
  }
  const env = { V2_BATCH_AUTHORING_ENABLED: 'true',V2_TEMPLATE_AUTHORING_ENABLED: 'true',VERCEL_ENV: 'preview' };
  const base = load('src/lib/server/v2TemplateFeature.ts',{ 'server-only': {} },{ process: { env } });
  assert.equal(load('src/lib/server/v2BatchFeature.ts',{ 'server-only': {},'./v2TemplateFeature': base },{ process: { env } }).isV2BatchAuthoringEnabled(),true);
});

function harness() {
  const state = { enabled: true,identity: { role: 'admin' },identityCalls: 0,clients: 0,calls: [],fault: '',result: { data: [],error: null } };
  const api = load('src/lib/server/v2Batches.ts', {
    'server-only': {},'@/lib/v2Batches': domain,
    '@/lib/server/v2BatchFeature': { isV2BatchAuthoringEnabled: () => state.enabled },
    '@/lib/server/portalAuthorization': { getPortalIdentity: async () => {
      state.identityCalls++;
      if (state.fault === 'identity') throw new Error('Synthetic private details');
      return state.identity;
    } },
    '@/utils/supabase/server': { createClient: async () => {
      state.clients++;
      if (state.fault === 'client') throw new Error('Synthetic private details');
      return { rpc: async (name,args) => {
        state.calls.push({ name,args });
        if (state.fault === 'rpc') throw new Error('Synthetic private details');
        return state.result;
      } };
    } },
  });
  return { state,...api };
}
test('disabled routes cannot authenticate or query any V2 batch operation', async () => {
  const app = harness();
  app.state.enabled = false;
  assert.equal((await app.listV2BatchDrafts()).status,'disabled');
  assert.equal((await app.previewV2BatchDraft(request())).status,'error');
  assert.equal((await app.saveV2BatchDraft(request(),fingerprint)).status,'error');
  assert.equal(app.state.identityCalls,0);
  assert.equal(app.state.clients,0);
});
test('signed-out and Student callers fail before a database client is created', async () => {
  for (const identity of [null,{ role: 'student' }]) {
    const app = harness();
    app.state.identity=identity;
    assert.equal((await app.listV2BatchDrafts()).status,'forbidden');
    assert.equal((await app.previewV2BatchDraft(request())).status,'error');
    assert.equal((await app.saveV2BatchDraft(request(),fingerprint)).status,'error');
    assert.equal(app.state.clients,0);
  }
});
test('validation stops malformed requests before RPC and confirmation needs a review fingerprint', async () => {
  const app = harness();
  assert.equal((await app.previewV2BatchDraft({})).status,'error');
  assert.equal((await app.saveV2BatchDraft({},fingerprint)).status,'error');
  assert.equal((await app.saveV2BatchDraft(request(),null)).status,'error');
  assert.equal(app.state.clients,0);
});
test('preview and confirmation use separate RPCs and list only validated draft DTOs', async () => {
  const app = harness();
  const input = request();
  const draft = draftFor(input);
  app.state.result = { data: { draft,fingerprint },error: null };
  assert.equal((await app.previewV2BatchDraft(input)).status,'success');
  assert.deepEqual(clone(app.state.calls[0]),{ name: 'preview_v2_batch_draft',args: { p_request: input } });
  app.state.result = { data: { draft,replayed: true },error: null };
  assert.deepEqual(clone(await app.saveV2BatchDraft(input,fingerprint)),{ status: 'success',draft,replayed: true });
  assert.deepEqual(clone(app.state.calls[1]),{ name: 'save_v2_batch_draft',args: { p_request: input,p_fingerprint: fingerprint } });
  app.state.result = { data: [draft],error: null };
  assert.deepEqual(clone(await app.listV2BatchDrafts()),{ status: 'ready',drafts: [draft] });
  assert.equal(app.state.calls[2].args,undefined);
});
test('mismatched projections and malformed responses never become successful confirmations', async () => {
  const app = harness();
  const input = request();
  const draft = draftFor(input);
  for (const patch of [{ id: randomUUID() },{ templateId: randomUUID() },{ templateRevision: 2 },{ revision: 2 },{ title: 'Other title' },{ startDate: '2028-03-01' }]) {
    app.state.result = { data: { draft: { ...draft,...patch },fingerprint },error: null };
    assert.equal((await app.previewV2BatchDraft(input)).status,'error');
    app.state.result = { data: { draft: { ...draft,...patch },replayed: false },error: null };
    assert.equal((await app.saveV2BatchDraft(input,fingerprint)).status,'error');
  }
  for (const data of [null,{},[null],{ draft,replayed: 'true' }]) {
    app.state.result = { data,error: null };
    assert.equal((await app.listV2BatchDrafts()).status,'unavailable');
    assert.equal((await app.previewV2BatchDraft(input)).status,'error');
    assert.equal((await app.saveV2BatchDraft(input,fingerprint)).status,'error');
  }
});
test('missing schema, transport failures and database errors return controlled retry messages', async () => {
  const app = harness();
  for (const fault of ['identity','client','rpc']) {
    app.state.fault=fault;
    assert.equal((await app.listV2BatchDrafts()).status,'unavailable');
    for (const result of [await app.previewV2BatchDraft(request()),await app.saveV2BatchDraft(request(),fingerprint)]) {
      assert.equal(result.status,'error');
      assert.doesNotMatch(result.message,/Synthetic|private/);
    }
  }
  app.state.fault='';
  for (const [code,pattern] of [['40001',/changed/],['22023',/Review/],['PGRST202',/could not be confirmed/],['42501',/could not be confirmed/]]) {
    app.state.result={ data: null,error: { code,message: 'Synthetic private details' } };
    assert.equal((await app.listV2BatchDrafts()).status,'unavailable');
    assert.match((await app.previewV2BatchDraft(request())).message,pattern);
    assert.match((await app.saveV2BatchDraft(request(),fingerprint)).message,pattern);
  }
});

test('edited schedule receipts must contain exactly the reviewed dates, instructors and capacities', async () => {
  const app = harness();
  const input = { ...request(), expectedRevision: 1, events: [event(), event()] };
  const draft = { ...draftFor(input), events: input.events.map((planned) => ({
    ...planned, title: 'Synthetic lesson', section: 'quant', ...domain.v2BatchEventInstants(planned),
  })) };
  for (const patch of [{ localDate: '2028-03-01' }, { localStartTime: '01:15' }, { durationMinutes: 90 },
    { capacity: 9 }, { instructor: 'Synthetic instructor' }, { key: randomUUID() }]) {
    const changed = { ...draft.events[0], ...patch };
    const returned = { ...draft, events: [{ ...changed, ...domain.v2BatchEventInstants(changed) }, draft.events[1]] };
    app.state.result = { data: { draft: returned, fingerprint }, error: null };
    assert.equal((await app.previewV2BatchDraft(input)).status, 'error');
    app.state.result = { data: { draft: returned, replayed: false }, error: null };
    assert.equal((await app.saveV2BatchDraft(input, fingerprint)).status, 'error');
  }
  // SQL preserves source order and matches edited events by identity.
  app.state.result = { data: { draft: { ...draft, events: [...draft.events].reverse() }, replayed: true }, error: null };
  assert.equal((await app.saveV2BatchDraft(input, fingerprint)).status, 'success');
});
test('a changed Admin session is checked again before saving', async () => {
  const app=harness();
  const input=request();
  app.state.result={ data: { draft: draftFor(input),fingerprint },error: null };
  assert.equal((await app.previewV2BatchDraft(input)).status,'success');
  app.state.identity=null;
  assert.equal((await app.saveV2BatchDraft(input,fingerprint)).status,'error');
  assert.equal(app.state.calls.length,1);
});
test('Server Actions do not refresh on preview or failure and refresh only the batch route after saving', async () => {
  const calls=[];
  let result={ status: 'error',message: 'Denied' };
  const actions=load('src/app/admin/v2/batches/actions.ts',{
    'next/cache': { revalidatePath: (path) => calls.push(path) },
    '@/lib/server/v2Publications': {},
    '@/lib/server/v2Batches': {
      previewV2BatchDraft: async (value) => { calls.push(['preview',value]); return result; },
      saveV2BatchDraft: async (value,proof) => { calls.push(['save',value,proof]); return result; },
    },
  });
  const input=request();
  await actions.previewBatchDraftAction(input);
  await actions.saveBatchDraftAction(input,fingerprint);
  assert.equal(calls.length,2);
  result={ status: 'success',draft: {},replayed: false };
  await actions.saveBatchDraftAction(input,fingerprint);
  assert.equal(calls.at(-1),'/admin/v2/batches');
});
test('the batch page authorizes before loading either templates or batches and hides when disabled', async () => {
  let enabled=false;
  let deny=false;
  const calls=[];
  const page=load('src/app/admin/v2/batches/page.tsx',{
    '../templates/templates.module.css': { default: {} },
    'react/jsx-runtime': { jsx: () => ({}),jsxs: () => ({}) },'@/components/AdminDraftNavigation': {},'./BatchDraftEditor': {}, './PublicationPanel': {},
    'next/navigation': { notFound: () => { throw new Error('Not found'); } },
    '@/lib/server/v2BatchFeature': { isV2BatchAuthoringEnabled: () => enabled },
    '@/lib/server/v2StudentScheduleFeature': { isV2StudentScheduleEnabled: () => true },
    '@/lib/server/portalAuthorization': { requirePortalRole: async (role) => { calls.push(role); if (deny) throw new Error('Denied'); return { id: 'synthetic-admin', role }; } },
    '@/lib/server/v2Publications': { listV2BatchPublications: async () => { calls.push('publications'); return { status: 'ready',publications: [] }; } },
    '@/lib/server/v2Templates': { listV2TemplateDrafts: async () => { calls.push('templates'); return { status: 'ready',templates: [] }; } },
    '@/lib/server/v2Batches': { listV2BatchDrafts: async () => { calls.push('batches'); return { status: 'ready',drafts: [] }; } },
  });
  await assert.rejects(page.default(),/Not found/);
  assert.equal(calls.length,0);
  enabled=true; deny=true;
  await assert.rejects(page.default(),/Denied/);
  assert.deepEqual(calls,['admin']);
  calls.length=0; deny=false;
  await page.default();
  assert.deepEqual(calls,['admin','batches','templates','publications']);
});
