import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const exports = {};
  const compiled = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(compiled, { exports, require: (name) => {
    assert(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}
const products = load('src/lib/v2Products.ts');
const templates = load('src/lib/v2Templates.ts');
const batches = load('src/lib/v2Batches.ts', { './v2Templates': templates });
const meetings = load('src/lib/v2Meetings.ts', { './v2Batches': batches });
const publication = load('src/lib/v2Publications.ts', { './v2Products': products, './v2Templates': templates, './v2Meetings': meetings });
const clone = (value) => JSON.parse(JSON.stringify(value));
const outline = () => ({ key: randomUUID(), title: '', section: 'quant', kind: 'outline',
  dayOffset: null, localStartTime: null, durationMinutes: null, capacity: 8, instructor: '' });
const templateInput = () => ({ id: randomUUID(), productCode: 'quant', expectedRevision: 0, requestId: randomUUID(),
  document: { title: 'Synthetic outline', summary: '', durationDays: 7, events: [outline()] } });
const request = () => ({ batchId: randomUUID(), batchRevision: 1, expectedRevision: 0, requestId: randomUUID(), action: 'publish' });
const document = (input) => ({ batchId: input.batchId, batchRevision: input.batchRevision, revision: input.expectedRevision + 1,
  state: input.action === 'publish' ? 'published' : 'unpublished', title: 'Synthetic schedule', productCode: 'quant',
  sections: ['quant'], timeZone: 'Asia/Kolkata', liveRegistrationLimit: null, events: [] });
const fingerprint = 'a'.repeat(32);

test('outline templates permit blank placeholders and no timing but do not weaken live validation or section scope', () => {
  const input = templateInput();
  assert.equal(templates.validateV2TemplateSave(input), null);
  for (const patch of [{ dayOffset: 0 },{ localStartTime: '18:00' },{ durationMinutes: 60 },{ section: 'di' },
    { kind: 'other' },{ kind: null },{ kind: 'live' },{ meetUrl: 'private' }]) {
    assert.equal(typeof templates.validateV2TemplateSave({ ...input, document: { ...input.document, events: [{ ...input.document.events[0], ...patch }] } }), 'string');
  }
});
test('empty and undated batch DTOs preserve null instants and reject private fields or fabricated dates', () => {
  const event = { key: randomUUID(), kind: 'outline', localDate: null, localStartTime: null, durationMinutes: null, instructor: '', capacity: 8 };
  const input = { id: randomUUID(), templateId: randomUUID(), templateRevision: 1, expectedRevision: 1,
    requestId: randomUUID(), title: 'Synthetic outline', startDate: '', timeZone: 'Asia/Kolkata', events: [event] };
  assert.equal(batches.validateV2BatchInput(input), null);
  assert.equal(batches.validateV2BatchInput({ ...input, events: [] }), null);
  const draft = { id: input.id, templateId: input.templateId, templateRevision: 1, revision: 1, state: 'draft',
    productCode: 'quant', title: input.title, startDate: '', timeZone: 'Asia/Kolkata',
    events: [{ ...event, title: '', section: 'quant', startsAt: null, endsAt: null }] };
  assert.equal(batches.isV2BatchDraft(draft), true);
  assert.deepEqual(clone(batches.editableV2BatchEvents(draft.events)), [event]);
  assert.equal(meetings.isV2MeetingDraft({ batch: draft, revision: 0, links: [] }), true);
  assert.equal(meetings.isV2MeetingDraft({ batch: draft, revision: 0, links: [{ key: event.key, url: null }] }), false);
  for (const patch of [{ startsAt: '2028-01-01T00:00:00.000Z' },{ kind: 'live' },{ meetUrl: 'private' }]) {
    assert.equal(batches.isV2BatchDraft({ ...draft, events: [{ ...draft.events[0], ...patch }] }), false);
  }
});
test('publication DTOs enforce exact scope, minimal fields and approved registration capacity', () => {
  const input = request();
  const published = document(input);
  assert.equal(publication.isV2Publication(published), true);
  for (const patch of [{ liveRegistrationLimit: 8 },{ sections: ['di'] },{ state: 'draft' },{ actorId: randomUUID() },
    { meetUrl: 'private' },{ productCode: 'unknown' },{ revision: 0 },{ timeZone: 'UTC' }]) {
    assert.equal(publication.isV2Publication({ ...published, ...patch }), false);
  }
  const live = { key: randomUUID(), title: 'Synthetic live class', section: 'quant', kind: 'live', instructor: '',
    startsAt: '2028-02-28T18:45:00.000Z', endsAt: '2028-02-28T19:45:00.000Z' };
  assert.equal(publication.isV2Publication({ ...published, liveRegistrationLimit: 8, events: [live] }), true);
  for (const patch of [{ title: '' },{ section: 'di' },{ startsAt: null },{ startsAt: '2028-02-30T18:45:00.000Z' },
    { endsAt: live.startsAt },{ capacity: 8 },{ url: 'private' }]) {
    assert.equal(publication.isV2Publication({ ...published, liveRegistrationLimit: 8, events: [{ ...live, ...patch }] }), false);
  }
  assert.equal(publication.isV2Publication({ ...published, liveRegistrationLimit: 8, events: [live,live] }), false);
});
function harness() {
  const state = { enabled: true, identity: { role: 'admin' }, clients: 0, calls: [], fault: '', result: { data: null, error: null } };
  const api = load('src/lib/server/v2Publications.ts', {
    'server-only': {}, '@/lib/v2Publications': publication,
    '@/lib/server/v2BatchFeature': { isV2BatchAuthoringEnabled: () => state.enabled },
    '@/lib/server/portalAuthorization': { getPortalIdentity: async () => {
      if (state.fault === 'identity') throw new Error('synthetic-private-detail');
      return state.identity;
    } },
    '@/utils/supabase/server': { createClient: async () => {
      state.clients++;
      if (state.fault === 'client') throw new Error('synthetic-private-detail');
      return { rpc: async (name,args) => {
        state.calls.push({ name,args });
        if (state.fault === 'rpc') throw new Error('synthetic-private-detail');
        return state.result;
      } };
    } },
  });
  return { api, state };
}
test('disabled, signed-out and Student callers cannot reach publication data or mutations', async () => {
  for (const patch of [{ enabled: false },{ identity: null },{ identity: { role: 'student' } }]) {
    const { api,state } = harness(); Object.assign(state,patch);
    assert.equal((await api.listV2BatchPublications()).status, 'unavailable');
    assert.equal((await api.previewV2BatchPublication(request())).status, 'error');
    assert.equal((await api.saveV2BatchPublication(request(),fingerprint)).status, 'error');
    assert.equal(state.clients, 0);
  }
});
test('invalid publication inputs cannot call RPCs', async () => {
  const { api,state } = harness();
  for (const input of [null,{}, { ...request(), action: 'delete' },{ ...request(), actorId: randomUUID() },
    { ...request(), expectedRevision: -1 },{ ...request(), batchRevision: 0 }]) {
    assert.equal((await api.previewV2BatchPublication(input)).status, 'error');
    assert.equal((await api.saveV2BatchPublication(input,fingerprint)).status, 'error');
  }
  assert.equal((await api.saveV2BatchPublication(request(),'bad')).status, 'error');
  assert.equal(state.calls.length,0);
});
test('publication replies must match the reviewed batch, version and requested transition', async () => {
  const { api,state } = harness(); const input = request(); const published = document(input);
  for (const patch of [{ batchId: randomUUID() },{ batchRevision: 2 },{ revision: 2 },{ state: 'unpublished' },{ meetUrl: 'private' }]) {
    state.result = { data: { document: { ...published,...patch },fingerprint,replayed: false },error: null };
    assert.equal((await api.previewV2BatchPublication(input)).status,'error');
    assert.equal((await api.saveV2BatchPublication(input,fingerprint)).status,'error');
  }
  state.result = { data: { document: published,fingerprint,replayed: false,privateDiagnostics: 'must-not-escape' },error: null };
  assert.equal((await api.previewV2BatchPublication(input)).status,'success');
  const result = await api.saveV2BatchPublication(input,fingerprint);
  assert.equal(result.status,'success');
  assert.doesNotMatch(JSON.stringify(result), /must-not-escape/);
  assert.deepEqual(clone(state.calls.at(-1).args), { p_request: input,p_fingerprint: fingerprint });
});
test('publication errors are controlled and malformed lists cannot expose private data', async () => {
  for (const fault of ['identity','client','rpc']) {
    const { api,state } = harness(); state.fault=fault;
    for (const result of [await api.previewV2BatchPublication(request()),await api.saveV2BatchPublication(request(),fingerprint),await api.listV2BatchPublications()]) {
      assert.notEqual(result.status,'success'); assert.doesNotMatch(JSON.stringify(result),/synthetic-private-detail/);
    }
  }
  const { api,state } = harness(); const published=document(request());
  for (const data of [null,[published,published],[{ ...published,private: 'private-value' }]]) {
    state.result={ data,error: null }; assert.equal((await api.listV2BatchPublications()).status,'unavailable');
  }
  state.result={ data:[published],error:null };
  assert.equal((await api.listV2BatchPublications()).status,'ready');
  for (const code of ['40001','22023','XX000']) {
    state.result={ data:null,error:{ code,message:'private-value' } };
    const result=await api.saveV2BatchPublication(request(),fingerprint);
    assert.equal(result.status,'error'); assert.doesNotMatch(result.message,/private-value/);
  }
});
