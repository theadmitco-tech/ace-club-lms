import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { NextResponse } from 'next/server.js';
import ts from 'typescript';

// Exercise the actual modules. Only external I/O is replaced; no app server,
// credentials, provider calls, or shared database is involved.
function loadModule(path, dependencies = {}) {
  const url = new URL(`../${path}`, import.meta.url);
  const compiled = ts.transpileModule(readFileSync(url, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, {
    exports,
    console: { error() {}, info() {} },
    require: (name) => {
      assert(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: url.pathname });
  return exports;
}

const errors = loadModule('src/lib/errorMessage.ts');
const { loadMasterWorksheet } = loadModule('src/lib/masterWorksheet.ts');
const request = (body = {}) => ({ json: async () => body });
const verification = { razorpay_order_id: 'order_fixture', razorpay_payment_id: 'pay_fixture', razorpay_signature: 'synthetic_signature' };
const webhookRequest = () => ({ text: async () => '{}', headers: new Headers({ 'x-razorpay-signature': 'synthetic_signature' }) });
const loadRoute = (path, registration) => loadModule(`src/app/api/${path}/route.ts`, {
  'next/server': { NextResponse }, '@/lib/registration': registration, '@/lib/errorMessage': errors,
});

const failureRoutes = [
  ['create-order', 'POST', 'createRazorpayOrder', () => request({ amount: 100 }), 'Failed to create Razorpay order.'],
  ['verify-payment', 'POST', 'verifyRazorpaySignature', () => request(verification), 'Failed to verify payment.'],
  ['register/batches', 'GET', 'getPublicBatches', () => undefined, 'Failed to load batches.'],
  ['register/create-order', 'POST', 'validateRegistrationInput', () => request(), 'Failed to create payment order.'],
  ['register/verify-payment', 'POST', 'verifyRazorpaySignature', () => request(verification), 'Failed to verify payment.'],
  ['register/webhook', 'POST', 'verifyWebhookSignature', webhookRequest, 'Webhook failed.'],
];

for (const [path, method, failingCall, buildRequest, fallback] of failureRoutes) {
  test(`${path} returns a controlled error for Error, database objects, and non-error rejections`, async () => {
    for (const fault of [new Error('Synthetic failure'), { message: 'Synthetic failure', details: 'not for response' }, null, undefined, 'failure', { message: 42 }, { message: '' }]) {
      const route = loadRoute(path, { [failingCall]: () => { throw fault; } });
      const response = await route[method](buildRequest());
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), { error: typeof fault?.message === 'string' && fault.message ? fault.message : fallback });
    }
  });
}

test('standard checkout preserves order success and rejects invalid amounts before contacting the provider', async () => {
  const calls = [];
  const route = loadRoute('create-order', { createRazorpayOrder: async (...args) => {
    calls.push(args);
    return { id: 'order_fixture', amount: 25000, currency: 'INR' };
  } });
  const response = await route.POST(request({ amount: 25000, receipt: 'fixture_receipt' }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { order_id: 'order_fixture', amount: 25000, currency: 'INR' });
  assert.deepEqual(calls[0].slice(0, 3), [25000, 'INR', 'fixture_receipt']);
  for (const amount of [0, -1, 99, 100.5, 'invalid']) {
    assert.equal((await route.POST(request({ amount }))).status, 400);
  }
  assert.equal(calls.length, 1);
});

test('standard checkout keeps provider-authentication errors at 401', async () => {
  const route = loadRoute('create-order', { createRazorpayOrder: () => { throw { message: 'Authentication failed' }; } });
  assert.equal((await route.POST(request({ amount: 100 }))).status, 401);
});

test('standard payment verification accepts both existing field formats and rejects invalid signatures', async () => {
  let valid = true;
  const calls = [];
  const route = loadRoute('verify-payment', { verifyRazorpaySignature: (...args) => { calls.push(args); return valid; } });
  for (const body of [verification, { order_id: 'order_fixture', payment_id: 'pay_fixture', signature: 'synthetic_signature' }]) {
    const response = await route.POST(request(body));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, order_id: 'order_fixture', payment_id: 'pay_fixture' });
    assert.deepEqual(calls.at(-1), ['order_fixture', 'pay_fixture', 'synthetic_signature']);
  }
  valid = false;
  assert.equal((await route.POST(request(verification))).status, 400);
  const count = calls.length;
  assert.equal((await route.POST(request({}))).status, 400);
  assert.equal(calls.length, count);
});

test('registration verification and webhook reject invalid signatures before any database access', async () => {
  const dependencies = {
    verifyRazorpaySignature: () => false,
    verifyWebhookSignature: () => false,
    getSupabaseAdmin: () => assert.fail('Invalid signature reached database'),
    enrollPaidRegistration: () => assert.fail('Invalid signature reached enrollment'),
  };
  assert.equal((await loadRoute('register/verify-payment', dependencies).POST(request(verification))).status, 400);
  assert.equal((await loadRoute('register/webhook', dependencies).POST(webhookRequest())).status, 400);
});

test('public batches preserve their successful response', async () => {
  const batches = [{ id: 'course_fixture', seats_available: 3 }];
  const response = await loadRoute('register/batches', { getPublicBatches: async (limit) => {
    assert.equal(limit, 3);
    return batches;
  } }).GET();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { batches });
});

function worksheetClient(results) {
  const calls = [];
  const client = { from: (table) => {
    const call = { table, filters: [] };
    calls.push(call);
    const result = () => {
      assert(Object.hasOwn(results, table), `Unexpected query: ${table}`);
      const value = results[table];
      return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
    };
    const builder = {
      select: () => builder,
      eq: (field, value) => { call.filters.push([field, value]); return builder; },
      order: () => builder,
      single: result,
      limit: result,
      then: (resolve, reject) => result().then(resolve, reject),
    };
    return builder;
  } };
  return { client, calls };
}

const session = { id: 'session_fixture', title: 'Synthetic worksheet', session_number: 1 };
const practiceSet = { id: 'set_fixture', master_session_id: session.id };
const ok = (data) => ({ data, error: null });

test('worksheet loading preserves scoped questions and normalizes legacy null options', async () => {
  const { client, calls } = worksheetClient({
    master_sessions: ok(session), master_practice_sets: ok([practiceSet]),
    master_practice_questions: ok([{ id: 'q1', options: null }, { id: 'q2', options: ['A', 'B'] }]),
  });
  const result = await loadMasterWorksheet(client, session.id);
  assert.equal(result.status, 'ready');
  assert.equal(result.questions.length, 2);
  assert.equal(result.questions[0].options.length, 0);
  assert.deepEqual(result.questions[1].options, ['A', 'B']);
  assert.deepEqual(calls.map((call) => call.filters), [
    [['id', session.id]], [['master_session_id', session.id]], [['master_practice_set_id', practiceSet.id]],
  ]);
});

test('a worksheet without a question set returns an empty editable worksheet', async () => {
  const { client, calls } = worksheetClient({ master_sessions: ok(session), master_practice_sets: ok([]) });
  const result = await loadMasterWorksheet(client, session.id);
  assert.equal(result.status, 'ready');
  assert.equal(result.practiceSet, null);
  assert.equal(result.questions.length, 0);
  assert.equal(calls.length, 2);
});

test('missing sessions and session network failures stop loading without querying questions', async () => {
  for (const failure of [ok(null), { data: null, error: { message: 'Denied' } }, new Error('Network unavailable')]) {
    const { client, calls } = worksheetClient({ master_sessions: failure });
    assert.equal((await loadMasterWorksheet(client, session.id)).status, 'session-error');
    assert.equal(calls.length, 1);
  }
});

test('worksheet table errors and transport failures resolve to a recoverable result', async () => {
  for (const table of ['master_practice_sets', 'master_practice_questions']) {
    for (const failure of [{ data: null, error: { message: 'Unavailable' } }, new Error('Network unavailable')]) {
      const results = { master_sessions: ok(session), master_practice_sets: ok([practiceSet]), master_practice_questions: ok([]), [table]: failure };
      const { client } = worksheetClient(results);
      const failed = await loadMasterWorksheet(client, session.id);
      assert.equal(failed.status, 'tables-error');
      assert.equal(failed.session.id, session.id);
      results[table] = ok(table === 'master_practice_sets' ? [practiceSet] : []);
      assert.equal((await loadMasterWorksheet(client, session.id)).status, 'ready');
    }
  }
});
