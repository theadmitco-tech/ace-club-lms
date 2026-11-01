import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
function load(file, deps = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(source, { exports, Date, ...globals, require(name) { assert.ok(Object.hasOwn(deps, name), name); return deps[name]; } });
  return exports;
}
const domain = load('src/lib/v2Products.ts');
const presentation = load('src/lib/v2CoursePresentation.ts', { './v2Products': domain });
const id = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
const row = () => ({ id, student_id: id, amount_paise: 1000000, currency: 'INR', confirmed_at: '2026-10-01T00:00:00Z', expires_at: '2027-04-01T00:00:00Z', revoked_at: null, profiles: { full_name: 'Test Student', is_active: true }, v2_product_grants: [{ product_code: 'quant_crash' }] });
function harness() {
  const state = { enabled: true, identity: { id, role: 'student' }, data: [row()], error: null, calls: [], products: [{ code: 'quant_crash', name: 'Quant', product_kind: 'crash_course', sections: ['quant'] }], quoteFails: false, listFails: false };
  const query = { select(value) { state.calls.push(['select', value]); return this; }, eq(...args) { state.calls.push(['eq', ...args]); return this; }, order(...args) { state.calls.push(['order', ...args]); return this; }, async range(...args) { state.calls.push(['range', ...args]); return { data: state.data, error: state.error }; } };
  const workspace = load('src/lib/server/v2CourseWorkspace.ts', {
    'server-only': {}, '@/lib/v2Products': domain,
    './v2Products': { listV2Products: async () => { if (state.listFails) throw Error('private'); return state.products; }, quoteV2Products: async (codes) => { state.calls.push(['quote', ...codes]); if (state.quoteFails) throw Error('private'); return { amount_paise: 1234500 }; } },
    './portalAuthorization': { getPortalIdentity: async () => state.identity },
    './v2Phase1Feature': { isV2Phase1PreviewEnabled: () => state.enabled },
    '@/utils/supabase/server': { createClient: async () => ({ from(table) { state.calls.push(['from', table]); return query; } }) },
  });
  return { state, ...workspace };
}
test('all eight canonical course selections preserve distinct Full Course identity', () => {
  for (const keys of [['full_course'], ['quant'], ['verbal'], ['di'], ['quant', 'verbal'], ['quant', 'di'], ['verbal', 'di'], ['quant', 'verbal', 'di']]) {
    const codes = presentation.parseCourseSelection(keys); assert.ok(codes); assert.equal(codes.includes('full_batch'), keys.includes('full_course'));
  }
  for (const value of [undefined, [], ['quant', 'quant'], ['full_course', 'quant'], ['full_batch'], ['__proto__'], ['CR'], ['unknown']]) assert.equal(presentation.parseCourseSelection(value), null);
});
test('Preview exposure is denied in Production and unset production builds', () => {
  for (const [env, expected] of [[{VERCEL_ENV:'production',NODE_ENV:'development'},false],[{VERCEL_ENV:'preview',NODE_ENV:'production'},true],[{NODE_ENV:'production'},false],[{NODE_ENV:'development'},true]]) {
    const feature = load('src/lib/server/v2Phase1Feature.ts', {'server-only':{}}, {process:{env}}); assert.equal(feature.isV2Phase1PreviewEnabled(), expected);
  }
});
test('purchase display uses start-inclusive and expiry-exclusive boundaries and preserves revoked history', () => {
  const p = { ...row(), accountActive: true }; const start = Date.parse(p.confirmed_at), end = Date.parse(p.expires_at);
  assert.equal(presentation.purchaseState(p, start-1), 'Not started'); assert.equal(presentation.purchaseState(p,start),'Active'); assert.equal(presentation.purchaseState(p,end-1),'Active'); assert.equal(presentation.purchaseState(p,end),'Expired');
  assert.equal(presentation.purchaseState({...p,revoked_at:p.confirmed_at},start),'Revoked'); assert.equal(presentation.purchaseState({...p,accountActive:false},start),'Account inactive');
});
test('catalogue reads configured prices and fails visibly instead of inventing prices', async () => {
  const app=harness(); assert.equal((await app.loadCourseCatalogue())[0].amountPaise,1234500);
  app.state.quoteFails=true; assert.equal((await app.loadCourseCatalogue())[0].amountPaise,null);
  app.state.listFails=true; assert.equal(await app.loadCourseCatalogue(),null);
  app.state.enabled=false; app.state.calls=[]; assert.equal(await app.loadCourseCatalogue(),null); assert.equal(app.state.calls.length,0);
});
test('history uses caller identity, explicit owner filtering, pagination and minimal columns', async () => {
  const app=harness(); const result=await app.loadPurchaseHistory('student',2); assert.equal(result.status,'ready'); assert.equal(result.items[0].studentName,'Test Student');
  assert.ok(app.state.calls.some(c=>c[0]==='eq'&&c[1]==='student_id'&&c[2]===id)); assert.ok(app.state.calls.some(c=>c[0]==='range'&&c[1]===25&&c[2]===50));
  assert.ok(!app.state.calls.find(c=>c[0]==='select')[1].includes('payment_reference')); assert.ok(!('student_id' in result.items[0]));
});
test('signed-out, wrong-role and disabled requests never query private purchases', async () => {
  for (const identity of [null,{id,role:'student'}]) { const app=harness();app.state.identity=identity;assert.equal((await app.loadPurchaseHistory('admin',1)).status,'unavailable');assert.equal(app.state.calls.length,0); }
  const app=harness();app.state.enabled=false;assert.equal((await app.loadPurchaseHistory('student',1)).status,'unavailable');assert.equal(app.state.calls.length,0);
});
test('Admin history requires an Admin and can review other student purchases', async () => {
  const app=harness();app.state.identity={id:other,role:'admin'};assert.equal((await app.loadPurchaseHistory('admin',1)).status,'ready');assert.ok(!app.state.calls.some(c=>c[0]==='eq'));
});
test('history rejects wrong-owner, malformed and overbroad grant responses', async () => {
  for (const patch of [{student_id:other},{amount_paise:NaN},{currency:'USD'},{expires_at:'bad'},{expires_at:'2026-09-01T00:00:00Z'},{profiles:null},{v2_product_grants:[{product_code:'full_batch'},{product_code:'quant_crash'}]},{v2_product_grants:[]}]) {
    const app=harness();app.state.data=[{...row(),...patch}];assert.equal((await app.loadPurchaseHistory('student',1)).status,'unavailable');
  }
});
test('history distinguishes database failures from genuinely empty results', async () => {
  const app=harness();app.state.error={message:'private diagnostic'};assert.equal((await app.loadPurchaseHistory('student',1)).status,'unavailable');app.state.error=null;app.state.data=[];const result=await app.loadPurchaseHistory('student',1);assert.equal(result.status,'ready');assert.equal(result.items.length,0);
});
test('history uses one lookahead row without dropping records and validates pagination', async () => {
  const app=harness();app.state.data=Array.from({length:26},row);const result=await app.loadPurchaseHistory('student',1);assert.equal(result.items.length,25);assert.equal(result.hasMore,true);
  for(const value of [0,-1,1.1,100000,NaN]) assert.equal((await app.loadPurchaseHistory('student',value)).status,'unavailable');
  for(const value of [undefined,'0','-1','1.5','100000',['2'],'garbage']) assert.equal(app.historyPage(value),1);assert.equal(app.historyPage('2'),2);
});
test('all new pages deny Production before authentication or data access', async () => {
  for(const file of ['src/app/courses/v2/page.tsx','src/app/account/access/page.tsx','src/app/admin/v2/access/page.tsx']) {
    const deps=new Proxy({'react/jsx-runtime':{},'next/navigation':{notFound(){throw Error('NOT_FOUND');}},'@/lib/server/v2Phase1Feature':{isV2Phase1PreviewEnabled:()=>false}}, {getOwnPropertyDescriptor(target,key){return {configurable:true,enumerable:true,value:target[key]??{}};},get(target,key){return target[key]??{};}});
    await assert.rejects(load(file,deps).default({searchParams:Promise.resolve({})}),/NOT_FOUND/);
  }
});
