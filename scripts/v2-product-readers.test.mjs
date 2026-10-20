import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Execute the actual server module with only its network/session dependency
// replaced. No Next server, Supabase project, credential, or extra test library.
const sourceUrl = new URL('../src/lib/server/v2Products.ts', import.meta.url);
const compiled = ts.transpileModule(readFileSync(sourceUrl, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const domain = {};
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/v2Products.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: domain });

function harness() {
  const state = {
    auth: { data: { user: { id: 'synthetic-student' } }, error: null },
    result: { data: null, error: null },
    clientFailure: false,
    authFailure: false,
    rpcFailure: false,
    calls: [],
    clients: 0,
  };
  const moduleExports = {};
  const client = {
    auth: { getUser: async () => {
      if (state.authFailure) throw new Error('Synthetic auth transport failure');
      return state.auth;
    } },
    rpc: async (name, args) => {
      state.calls.push({ name, args });
      if (state.rpcFailure) throw new Error('Synthetic database transport failure');
      return state.result;
    },
    from: (table) => ({ select: (columns) => ({ eq: (column, value) => ({ order: async (sort) => {
      state.calls.push({ table, columns, column, value, sort });
      return state.result;
    } }) }) }),
  };
  runInNewContext(compiled, {
    exports: moduleExports,
    require: (name) => {
      if (name === 'server-only') return {};
      if (name === '@/lib/v2Products') return domain;
      assert.equal(name, '@/utils/supabase/server', `Unexpected server dependency: ${name}`);
      return { createClient: async () => {
        state.clients += 1;
        if (state.clientFailure) throw new Error('Synthetic missing client configuration');
        return client;
      } };
    },
  }, { filename: sourceUrl.pathname });
  return { state, ...moduleExports };
}

test('signed-out or failed authentication never queries product authorization', async () => {
  for (const auth of [
    { data: { user: null }, error: null },
    { data: { user: { id: 'untrusted-user' } }, error: { message: 'Invalid session' } },
  ]) {
    const app = harness();
    app.state.auth = auth;
    assert.equal(await app.canAccessV2Product('full_batch'), false);
    assert.equal((await app.getMyV2Access()).length, 0);
    assert.equal(app.state.calls.length, 0);
  }
});

test('only an explicit successful database boolean can authorize access', async () => {
  for (const data of [null, false, 1, 'true', {}, [true]]) {
    const app = harness();
    app.state.result = { data, error: null };
    assert.equal(await app.canAccessV2Product('full_batch'), false);
  }
  const app = harness();
  app.state.result = { data: true, error: { code: 'PGRST202', message: 'Function is absent' } };
  assert.equal(await app.canAccessV2Product('full_batch'), false);
  app.state.result = { data: true, error: null };
  assert.equal(await app.canAccessV2Product('quant_crash', 'quant'), true);
  assert.equal(app.state.calls.at(-1).name, 'can_access_v2_product');
  assert.deepEqual(JSON.parse(JSON.stringify(app.state.calls.at(-1).args)), {
    p_product_code: 'quant_crash', p_section: 'quant',
  });
});

test('configuration, authentication transport, and database transport failures fail closed', async () => {
  for (const fault of ['clientFailure', 'authFailure', 'rpcFailure']) {
    const app = harness();
    app.state[fault] = true;
    assert.equal(await app.canAccessV2Product('full_batch'), false, fault);
  }
});

test('access is rechecked on later calls rather than cached after a grant or revocation', async () => {
  const app = harness();
  app.state.result = { data: true, error: null };
  assert.equal(await app.canAccessV2Product('full_batch'), true);
  app.state.result = { data: false, error: null };
  assert.equal(await app.canAccessV2Product('full_batch'), false);
  app.state.auth = { data: { user: null }, error: null };
  assert.equal(await app.canAccessV2Product('full_batch'), false);
  assert.equal(app.state.clients, 3);
  assert.equal(app.state.calls.length, 2);
});

test('purchase history is not requested by caller-supplied identity', async () => {
  const app = harness();
  app.state.result = { data: [{ product_code: 'quant_crash', sections: ['quant'], expires_at: '2027-04-18T00:00:00Z' }], error: null };
  const access = await app.getMyV2Access();
  assert.equal(access[0].product_code, 'quant_crash');
  assert.equal(app.state.calls[0].name, 'get_my_v2_access');
  assert.equal(app.state.calls[0].args, undefined);
  app.state.result = { data: null, error: { message: 'Synthetic private database details' } };
  await assert.rejects(app.getMyV2Access(), /^Error: Unable to verify V2 access\.$/);
});

test('catalogue selects public fields and available products; prices come from the database', async () => {
  const app = harness();
  app.state.result = { data: [], error: null };
  assert.equal((await app.listV2Products()).length, 0);
  assert.deepEqual(app.state.calls[0], {
    table: 'v2_products', columns: 'code, name, product_kind, sections',
    column: 'available_for_purchase', value: true, sort: 'code',
  });
  app.state.result = { data: { amount_paise: 1234567, currency: 'INR', price_version_id: 'a1000000-0000-4000-8000-000000000002', product_codes: ['di_crash'] }, error: null };
  assert.equal((await app.quoteV2Products(['di_crash'])).amount_paise, 1234567);
  assert.equal(app.state.calls.at(-1).name, 'quote_v2_products');
  app.state.result = { data: null, error: { message: 'Synthetic private database details' } };
  await assert.rejects(app.listV2Products(), /^Error: Unable to load the V2 catalogue\.$/);
  await assert.rejects(app.quoteV2Products(['di_crash']), /^Error: Unable to quote the selected V2 products\.$/);
});

test('malformed or overbroad catalogue and access replies fail closed', async () => {
  const app = harness();
  const product = { code: 'quant_crash', name: 'Synthetic product', product_kind: 'crash_course', sections: ['quant'] };
  const access = { product_code: 'quant_crash', sections: ['quant'], expires_at: '2027-04-18T00:00:00+00:00' };
  for (const data of [null, {}, [null], [product, product], [{ ...product, sections: ['quant', 'di'] }],
    [{ ...product, product_kind: 'full_batch' }], [{ ...product, code: '__proto__' }],
    [{ ...product, name: '' }], [{ ...product, private_field: 'Synthetic private details' }]]) {
    app.state.result = { data, error: null };
    await assert.rejects(app.listV2Products(), /^Error: Unable to load the V2 catalogue\.$/);
  }
  for (const data of [null, {}, [null], [access, access], [{ ...access, sections: ['verbal'] }],
    [{ ...access, expires_at: 'infinity' }], [{ ...access, expires_at: '2027-04-18' }],
    [{ ...access, student_id: 'another-student' }]]) {
    app.state.result = { data, error: null };
    await assert.rejects(app.getMyV2Access(), /^Error: Unable to verify V2 access\.$/);
  }
  app.state.result = { data: [product], error: null };
  assert.equal((await app.listV2Products())[0].code, 'quant_crash');
  app.state.result = { data: [access], error: null };
  assert.equal((await app.getMyV2Access())[0].product_code, 'quant_crash');
  app.state.result = { data: [], error: null };
  assert.equal((await app.getMyV2Access()).length, 0);
});

test('quotes must match the exact selection, valid configured amount and price revision', async () => {
  const app = harness();
  const quote = { product_codes: ['di_crash', 'quant_crash'], price_version_id: 'a1000000-0000-4000-8000-000000000003', amount_paise: 1800000, currency: 'INR' };
  for (const patch of [{ product_codes: ['full_batch'] }, { product_codes: ['di_crash'] },
    { product_codes: ['di_crash', 'verbal_crash'] }, { product_codes: ['di_crash', 'di_crash'] },
    { amount_paise: 0 }, { amount_paise: -1 }, { amount_paise: 1.5 }, { amount_paise: '1800000' },
    { amount_paise: Infinity }, { amount_paise: 2147483648 }, { currency: 'USD' },
    { price_version_id: 'unknown' }, { private_field: 'Synthetic private details' }]) {
    app.state.result = { data: { ...quote, ...patch }, error: null };
    await assert.rejects(app.quoteV2Products(['quant_crash', 'di_crash']), /^Error: Unable to quote the selected V2 products\.$/);
  }
  app.state.result = { data: quote, error: null };
  assert.equal((await app.quoteV2Products(['quant_crash', 'di_crash'])).amount_paise, 1800000);
});

test('invalid product selections and cross-section checks never reach the database', async () => {
  const app = harness();
  app.state.result = { data: true, error: null };
  for (const selection of [null, [], ['unknown'], ['__proto__'], ['quant_crash', 'quant_crash'], ['full_batch', 'quant_crash']]) {
    await assert.rejects(app.quoteV2Products(selection), /Unable to quote/);
  }
  for (const [product, section] of [['unknown', null], ['__proto__', null], ['quant_crash', 'verbal'], ['full_batch', 'qa']]) {
    assert.equal(await app.canAccessV2Product(product, section), false);
  }
  assert.equal(app.state.clients, 0);
});

test('configuration and transport failures never expose private diagnostics through readers', async () => {
  for (const fault of ['clientFailure', 'rpcFailure']) {
    const app = harness();
    app.state[fault] = true;
    await assert.rejects(app.quoteV2Products(['quant_crash']), /^Error: Unable to quote the selected V2 products\.$/);
    await assert.rejects(app.getMyV2Access(), /^Error: Unable to verify V2 access\.$/);
  }
  const app = harness();
  app.state.clientFailure = true;
  await assert.rejects(app.listV2Products(), /^Error: Unable to load the V2 catalogue\.$/);
  app.state.clientFailure = false;
  app.state.authFailure = true;
  await assert.rejects(app.getMyV2Access(), /^Error: Unable to verify V2 access\.$/);
});
