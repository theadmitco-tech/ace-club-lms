import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const exports = {};
  const compiled = ts.transpileModule(readFileSync(new URL(`../${path}`,import.meta.url),'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(compiled, { exports, require: (name) => {
    assert(Object.hasOwn(dependencies,name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}
const templates = load('src/lib/v2Templates.ts');
const batches = load('src/lib/v2Batches.ts',{ './v2Templates': templates });
const domain = load('src/lib/v2Meetings.ts',{ './v2Batches': batches });
const clone = (value) => JSON.parse(JSON.stringify(value));
const url = 'https://meet.google.com/aaa-bbbb-ccc';
const input = () => ({ batchId: randomUUID(),batchRevision: 1,expectedRevision: 0,requestId: randomUUID(),links: [{ key: randomUUID(),url }] });
function draftFor(request) {
  const event = { key: request.links[0].key,localDate: '2028-01-01',localStartTime: '19:00',durationMinutes: 60,instructor: '',capacity: 8 };
  return { batch: { id: request.batchId,productCode: 'quant',templateId: randomUUID(),templateRevision: 1,revision: 1,
    state: 'draft',title: 'Synthetic batch',startDate: '2028-01-01',timeZone: 'Asia/Kolkata',
    events: [{ ...event,title: 'Synthetic event',section: 'quant',...batches.v2BatchEventInstants(event) }] },revision: 1,links: request.links };
}
const receiptFor = (request) => ({ batchId: request.batchId,batchRevision: request.batchRevision,revision: request.expectedRevision+1,replayed: false });

test('meeting URLs accept only canonical Google Meet codes or an empty draft slot', () => {
  for (const value of [null,url]) assert.equal(domain.isV2MeetingUrl(value),true);
  for (const value of ['',url+'\n',url+' ',url+'?authuser=1',url+'#fragment',' '+url,
    'http://meet.google.com/aaa-bbbb-ccc','https://meet.google.com.evil.test/aaa-bbbb-ccc',
    'https://user@meet.google.com/aaa-bbbb-ccc','https://meet.google.com:443/aaa-bbbb-ccc',
    'https://meet.google.com/lookup/alias','https://meet.google.com/%61aa-bbbb-ccc','javascript:alert(1)',false,{}]) {
    assert.equal(domain.isV2MeetingUrl(value),false);
  }
});
test('requests reject injected identity, publication fields, invalid versions and duplicate events', () => {
  const request=input();
  assert.equal(domain.validateV2MeetingInput(request),null);
  for (const patch of [{ batchId: request.batchId+'\n' },{ actorId: randomUUID() },{ state: 'published' },{ expectedRevision: -1 },
    { expectedRevision: 2147483647 },{ batchRevision: 0 },{ batchRevision: '1' },{ links: [null] },
    { links: [...request.links,...request.links] },{ links: [{ ...request.links[0],private: 'field' }] }]) {
    assert.equal(typeof domain.validateV2MeetingInput({ ...request,...patch }),'string');
  }
  for (const value of [null,[],{},true]) assert.equal(typeof domain.validateV2MeetingInput(value),'string');
  assert.equal(domain.validateV2MeetingInput({ ...request,links: Array.from({ length: 100 },() => ({ key: randomUUID(),url: null })) }),null);
  assert.equal(typeof domain.validateV2MeetingInput({ ...request,links: Array.from({ length: 101 },() => ({ key: randomUUID(),url: null })) }),'string');
});
test('read DTOs bind links to the batch and receipts exclude private values', () => {
  const request=input();
  const draft=draftFor(request);
  assert.equal(domain.isV2MeetingDraft(draft),true);
  assert.equal(domain.isV2MeetingDraft({ ...draft,revision: 0,links: [{ key: request.links[0].key,url: null }] }),true);
  for (const patch of [{ revision: 0 },{ links: [] },{ actor_id: randomUUID() },{ links: [{ key: randomUUID(),url }] }]) {
    assert.equal(domain.isV2MeetingDraft({ ...draft,...patch }),false);
  }
  const receipt=receiptFor(request);
  assert.equal(domain.isV2MeetingReceipt(receipt),true);
  for (const patch of [{ url },{ links: request.links },{ revision: 0 },{ replayed: 'true' }]) assert.equal(domain.isV2MeetingReceipt({ ...receipt,...patch }),false);
});
function harness() {
  const state={ enabled: true,identity: { role: 'admin' },identityCalls: 0,clients: 0,calls: [],fault: '',result: { data: null,error: null } };
  const api=load('src/lib/server/v2Meetings.ts',{
    'server-only': {},'@/lib/v2Meetings': domain,
    '@/lib/server/v2BatchFeature': { isV2BatchAuthoringEnabled: () => state.enabled },
    '@/lib/server/portalAuthorization': { getPortalIdentity: async () => {
      state.identityCalls++;
      if (state.fault==='identity') throw new Error('Synthetic private diagnostics');
      return state.identity;
    } },
    '@/utils/supabase/server': { createClient: async () => {
      state.clients++;
      if (state.fault==='client') throw new Error('Synthetic private diagnostics');
      return { rpc: async (name,args) => {
        state.calls.push({ name,args });
        if (state.fault==='rpc') throw new Error('Synthetic private diagnostics');
        return state.result;
      } };
    } },
  });
  return { state,...api };
}
test('disabled meeting authoring never authenticates or opens a database client',async () => {
  const app=harness(); app.state.enabled=false;
  assert.equal((await app.readV2MeetingDraft(randomUUID())).status,'disabled');
  assert.equal((await app.saveV2MeetingDraft(input())).status,'error');
  assert.equal(app.state.identityCalls,0); assert.equal(app.state.clients,0);
});
test('signed-out and Student identities cannot read or save private drafts',async () => {
  for (const identity of [null,{ role: 'student' }]) {
    const app=harness(); app.state.identity=identity;
    assert.equal((await app.readV2MeetingDraft(randomUUID())).status,'forbidden');
    assert.equal((await app.saveV2MeetingDraft(input())).status,'error');
    assert.equal(app.state.clients,0);
  }
});
test('malformed inputs are rejected before the database client is created',async () => {
  const app=harness();
  for (const id of [null,'../other',randomUUID()+'\n']) assert.equal((await app.readV2MeetingDraft(id)).status,'unavailable');
  assert.equal((await app.saveV2MeetingDraft({})).status,'error');
  assert.equal(app.state.clients,0);
});
test('authorized reads and saves use caller-session RPCs with validated minimal responses',async () => {
  const app=harness(); const request=input(); const draft=draftFor(request);
  app.state.result={ data: draft,error: null };
  assert.deepEqual(clone(await app.readV2MeetingDraft(request.batchId)),{ status: 'ready',draft });
  assert.deepEqual(clone(app.state.calls[0]),{ name: 'read_v2_meeting_draft',args: { p_batch_id: request.batchId } });
  const receipt=receiptFor(request);
  app.state.result={ data: receipt,error: null };
  assert.deepEqual(clone(await app.saveV2MeetingDraft(request)),{ status: 'success',receipt });
  assert.deepEqual(clone(app.state.calls[1]),{ name: 'save_v2_meeting_draft',args: { p_request: request } });
});
test('wrong-batch reads and forged or mismatched save receipts fail closed',async () => {
  const app=harness(); const request=input();
  app.state.result={ data: draftFor(input()),error: null };
  assert.equal((await app.readV2MeetingDraft(request.batchId)).status,'unavailable');
  for (const patch of [{ batchId: randomUUID() },{ batchRevision: 2 },{ revision: 5 },{ links: request.links }]) {
    app.state.result={ data: { ...receiptFor(request),...patch },error: null };
    assert.equal((await app.saveV2MeetingDraft(request)).status,'error');
  }
});
test('errors and revoked identity do not disclose private values or recover old saves',async () => {
  const app=harness(); const request=input();
  for (const code of ['40001','22023','42501','42P01']) {
    app.state.result={ data: draftFor(request),error: { code,message: url } };
    assert.equal((await app.readV2MeetingDraft(request.batchId)).status,'unavailable');
    const result=await app.saveV2MeetingDraft(request);
    assert.equal(result.status,'error'); assert(!JSON.stringify(result).includes(url));
  }
  for (const fault of ['identity','client','rpc']) {
    app.state.fault=fault;
    assert.equal((await app.readV2MeetingDraft(request.batchId)).status,'unavailable');
    assert(!JSON.stringify(await app.saveV2MeetingDraft(request)).includes('diagnostics'));
  }
  app.state.fault=''; app.state.identity=null; app.state.calls=[];
  app.state.result={ data: { ...receiptFor(request),replayed: true },error: null };
  assert.equal((await app.saveV2MeetingDraft(request)).status,'error'); assert.equal(app.state.calls.length,0);
});
test('server action revalidates only the saved private draft route after success',async () => {
  const paths=[]; const request=input(); let result={ status: 'error',message: 'Denied' };
  const action=load('src/app/admin/v2/batches/[batchId]/meeting/actions.ts',{
    'next/cache': { revalidatePath: (path) => paths.push(path) },
    '@/lib/server/v2Meetings': { saveV2MeetingDraft: async (value) => { assert.equal(value,request); return result; } },
  });
  await action.saveMeetingDraftAction(request); assert.equal(paths.length,0);
  result={ status: 'success',receipt: receiptFor(request) };
  await action.saveMeetingDraftAction(request);
  assert.deepEqual(paths,[`/admin/v2/batches/${request.batchId}/meeting`]);
});
test('private page gates role and batch identity before loading meeting details',async () => {
  let enabled=false; let deny=false; const calls=[];
  const page=load('src/app/admin/v2/batches/[batchId]/meeting/page.tsx',{
    'react/jsx-runtime': { jsx: () => ({}),jsxs: () => ({}) },'next/link': {},'./MeetingDraftEditor': {},
    'next/navigation': { notFound: () => { throw new Error('Not found'); } },'@/lib/v2Meetings': domain,
    '@/lib/server/v2BatchFeature': { isV2BatchAuthoringEnabled: () => enabled },
    '@/lib/server/portalAuthorization': { requirePortalRole: async (role) => { calls.push(role); if (deny) throw new Error('Denied'); return { id: 'synthetic-admin', role }; } },
    '@/lib/server/v2Meetings': { readV2MeetingDraft: async (id) => { calls.push(id); return { status: 'unavailable' }; } },
  });
  const params=Promise.resolve({ batchId: randomUUID() });
  await assert.rejects(page.default({ params }),/Not found/); assert.equal(calls.length,0);
  enabled=true; deny=true;
  await assert.rejects(page.default({ params }),/Denied/); assert.deepEqual(calls,['admin']);
  calls.length=0; deny=false;
  await assert.rejects(page.default({ params: Promise.resolve({ batchId: '../bad' }) }),/Not found/); assert.deepEqual(calls,['admin']);
  calls.length=0;
  await page.default({ params }); assert.deepEqual(calls,['admin',(await params).batchId]);
});
