import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load(file, deps = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(source, { exports, Date, URL, ...globals, require(name) {
    assert.ok(Object.hasOwn(deps, name), name); return deps[name];
  } });
  return exports;
}
const products = load('src/lib/v2Products.ts');
const domain = load('src/lib/v2UpgradeQuotes.ts', { './v2Products': products });
const own = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
const now = Date.parse('2026-11-01T12:00:00Z');
class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
const subjects = ['quant_crash', 'verbal_crash', 'di_crash'];
const quote = codes => ({ product_codes: [...codes].sort(), price_version_id: `20000000-0000-4000-8000-00000000000${codes.length}`,
  amount_paise: { 1: 1000000, 2: 1800000, 3: 2500000 }[codes.length], currency: 'INR' });
const row = codes => ({ id: other, student_id: own, amount_paise: 1000000, currency: 'INR',
  confirmed_at: '2026-10-01T00:00:00Z', expires_at: '2027-04-01T00:00:00Z', revoked_at: null,
  v2_product_grants: codes.map(product_code => ({ product_code })) });
function harness(codes = ['quant_crash']) {
  const state = { enabled: true, env: { V2_INDIVIDUAL_UPGRADE_POLICY: domain.INDIVIDUAL_UPGRADE_POLICY,
    NEXT_PUBLIC_SUPABASE_URL: 'https://eyphkkginlgoaxflauog.supabase.co' },
  identity: { id: own, role: 'student' }, rows: [row(codes)], error: null, calls: [], quoteCalls: [],
  access: codes.map(product_code => ({ product_code, expires_at: '2027-04-01T00:00:00Z' })),
  quoteFn: async codes => quote(codes), accessError: false };
  const query = {};
  for (const key of ['select', 'eq', 'is', 'lte', 'gt', 'order']) query[key] = (...args) => { state.calls.push([key, ...args]); return query; };
  query.limit = async (...args) => { state.calls.push(['limit', ...args]); return { data: state.rows, error: state.error }; };
  const app = load('src/lib/server/v2UpgradeQuotes.ts', {
    'server-only': {}, '@/lib/v2UpgradeQuotes': domain,
    './portalAuthorization': { getPortalIdentity: async () => state.identity },
    './v2Phase1Feature': { isV2Phase1PreviewEnabled: () => state.enabled },
    '@/utils/supabase/server': { createClient: async () => ({ from(table) { state.calls.push(['from', table]); return query; } }) },
    './v2Products': { getMyV2Access: async () => { if (state.accessError) throw Error('private provider error'); return state.access; },
      quoteV2Products: async codes => { state.quoteCalls.push([...codes]); return state.quoteFn(codes); } },
  }, { Date: Clock, process: { env: state.env } });
  return { state, ...app };
}

test('all individual strict-superset upgrades use configured package differences', async () => {
  const packages = subjects.flatMap((code, i) => [[code], ...subjects.slice(i + 1).map(second => [code, second])]);
  const targets = [...packages, subjects];
  let count = 0;
  for (const current of packages) for (const target of targets) {
    if (target.length <= current.length || !current.every(code => target.includes(code))) continue;
    const app = harness(current);
    const result = await app.loadIndividualUpgrade([...target].reverse());
    assert.equal(result.status, 'ready'); assert.equal(result.invalidSelection, false);
    assert.equal(result.quote.differencePaise, quote(target).amount_paise - quote(current).amount_paise);
    assert.equal(result.quote.expiresAt, app.state.rows[0].expires_at);
    assert.equal(result.quote.currency, 'INR'); count++;
  }
  assert.equal(count, 12);
});
test('the policy is off by default and strictly confined to staging Preview', async () => {
  for (const patch of [{ V2_INDIVIDUAL_UPGRADE_POLICY: undefined }, { V2_INDIVIDUAL_UPGRADE_POLICY: 'other' },
    { NEXT_PUBLIC_SUPABASE_URL: 'https://production.supabase.co' }, { NEXT_PUBLIC_SUPABASE_URL: 'http://eyphkkginlgoaxflauog.supabase.co' },
    { NEXT_PUBLIC_SUPABASE_URL: 'https://eyphkkginlgoaxflauog.supabase.co.evil.test' },
    { NEXT_PUBLIC_SUPABASE_URL: 'https://person@eyphkkginlgoaxflauog.supabase.co' },
    { NEXT_PUBLIC_SUPABASE_URL: 'https://eyphkkginlgoaxflauog.supabase.co/rest/v1' },
    { NEXT_PUBLIC_SUPABASE_URL: 'https://eyphkkginlgoaxflauog.supabase.co?override=true' }]) {
    const app = harness(); Object.assign(app.state.env, patch);
    assert.equal((await app.loadIndividualUpgrade(subjects)).status, 'policy_pending'); assert.equal(app.state.calls.length, 0);
  }
  const app = harness(); app.state.enabled = false;
  assert.equal((await app.loadIndividualUpgrade(subjects)).status, 'policy_pending'); assert.equal(app.state.calls.length, 0);
});
test('signed-out, inactive-resolved-null and Admin identities never query purchase data', async () => {
  for (const identity of [null, { id: own, role: 'admin' }, { id: own, role: 'unknown' }]) {
    const app = harness(); app.state.identity = identity;
    assert.equal((await app.loadIndividualUpgrade(subjects)).status, 'unauthorized'); assert.equal(app.state.calls.length, 0);
  }
});
test('purchase reads are caller-filtered, active-only, bounded and exclude payment references', async () => {
  const app = harness(); const result = await app.loadIndividualUpgrade(); assert.equal(result.status, 'ready'); assert.equal(result.quote, null);
  for (const [method, column, value] of [['eq', 'student_id', own], ['is', 'revoked_at', null]]) {
    assert.ok(app.state.calls.some(call => call[0] === method && call[1] === column && call[2] === value));
  }
  assert.ok(app.state.calls.some(call => call[0] === 'lte' && call[1] === 'confirmed_at'));
  assert.ok(app.state.calls.some(call => call[0] === 'gt' && call[1] === 'expires_at'));
  assert.ok(app.state.calls.some(call => call[0] === 'limit' && call[1] === 2));
  assert.doesNotMatch(app.state.calls.find(call => call[0] === 'select')[1], /payment_reference|full_name|email/);
  assert.doesNotMatch(JSON.stringify(result), /student_id|price_version_id|10000000/);
});
test('no purchases, multiple purchases, Full Course and already-three-subject packages are not eligible', async () => {
  const empty = harness(); empty.state.rows = [];
  assert.equal((await empty.loadIndividualUpgrade()).reason, 'no_active_package');
  const multiple = harness(); multiple.state.rows.push({ ...row(['verbal_crash']), id: '10000000-0000-4000-8000-000000000003' });
  assert.equal((await multiple.loadIndividualUpgrade()).reason, 'multiple_packages');
  assert.equal((await harness(['full_batch']).loadIndividualUpgrade()).reason, 'full_course');
  assert.equal((await harness(subjects).loadIndividualUpgrade()).reason, 'all_subjects');
});
test('replacements, duplicates, empty selections and Full Course upgrades are rejected', async () => {
  for (const selection of [null, [], ['quant_crash'], ['verbal_crash'], ['verbal_crash', 'di_crash'],
    ['quant_crash', 'quant_crash'], ['full_batch'], ['quant_crash', 'full_batch'], ['CR'], ['quant'], 'quant_crash']) {
    const app = harness(); const result = await app.loadIndividualUpgrade(selection);
    assert.equal(result.status, 'ready'); assert.equal(result.invalidSelection, true); assert.equal(result.quote, null);
    assert.equal(app.state.quoteCalls.length, 0);
  }
});
test('wrong owner, malformed, revoked, expired and not-yet-started data fail closed', async () => {
  for (const patch of [{ student_id: other }, { id: 'bad' }, { amount_paise: -1 }, { amount_paise: 1.1 }, { currency: 'USD' },
    { confirmed_at: '2026-11-01T12:00:01Z' }, { expires_at: '2026-11-01T12:00:00Z' }, { expires_at: 'bad' },
    { revoked_at: '2026-10-31T12:00:00Z' }, { v2_product_grants: [] }, { v2_product_grants: [{ product_code: 'unknown' }] },
    { v2_product_grants: [{ product_code: 'quant_crash' }, { product_code: 'quant_crash' }] },
    { v2_product_grants: [{ product_code: 'full_batch' }, { product_code: 'quant_crash' }] }]) {
    const app = harness(); Object.assign(app.state.rows[0], patch);
    assert.equal((await app.loadIndividualUpgrade(subjects)).status, 'unavailable'); assert.equal(app.state.quoteCalls.length, 0);
  }
});
test('database-time access must agree with the active purchase scope and expiry', async () => {
  for (const access of [[], [{ product_code: 'verbal_crash', expires_at: '2027-04-01T00:00:00Z' }],
    [{ product_code: 'quant_crash', expires_at: '2027-05-01T00:00:00Z' }],
    [{ product_code: 'quant_crash', expires_at: '2027-04-01T00:00:00Z' }, { product_code: 'di_crash', expires_at: '2027-04-01T00:00:00Z' }]]) {
    const app = harness(); app.state.access = access; assert.equal((await app.loadIndividualUpgrade(subjects)).status, 'unavailable');
  }
});
test('prices come from configuration, not historical paid amounts or hardcoded launch values', async () => {
  const app = harness(); app.state.rows[0].amount_paise = 900000;
  app.state.quoteFn = async codes => ({ ...quote(codes), amount_paise: codes.length === 1 ? 1200000 : 2700000 });
  const result = await app.loadIndividualUpgrade(subjects);
  assert.equal(result.quote.differencePaise, 1500000); assert.equal(result.quote.currentPricePaise, 1200000);
});
test('changed price revisions during a request reject the estimate', async () => {
  const app = harness(); let count = 0;
  app.state.quoteFn = async codes => ({ ...quote(codes), price_version_id: ++count > 2 ? '30000000-0000-4000-8000-000000000001' : quote(codes).price_version_id });
  assert.equal((await app.loadIndividualUpgrade(subjects)).status, 'unavailable');
});
test('invalid price data and non-positive differences never produce an upgrade estimate', async () => {
  for (const patch of [{ amount_paise: 0 }, { amount_paise: 999999 }, { amount_paise: 1000000 },
    { amount_paise: NaN }, { amount_paise: 2147483648 }, { currency: 'USD' }, { product_codes: ['full_batch'] },
    { price_version_id: 'bad' }, { price_version_id: quote(['quant_crash']).price_version_id }]) {
    const app = harness(); app.state.quoteFn = async codes => codes.length === 1 ? quote(codes) : { ...quote(codes), ...patch };
    assert.equal((await app.loadIndividualUpgrade(subjects)).status, 'unavailable');
  }
});
test('provider failures and unexpected row counts remain unavailable without private errors', async () => {
  for (const configure of [state => { state.error = { message: 'secret diagnostic' }; }, state => { state.rows = null; },
    state => { state.rows = [row(subjects), row(subjects), row(subjects)]; }, state => { state.accessError = true; },
    state => { state.quoteFn = async () => { throw Error('secret diagnostic'); }; }]) {
    const app = harness(); configure(app.state);
    assert.equal(JSON.stringify(await app.loadIndividualUpgrade(subjects)), '{"status":"unavailable"}');
  }
});
