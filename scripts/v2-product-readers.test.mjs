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
  app.state.result = { data: { amount_paise: 1234567, currency: 'INR', price_version_id: 'synthetic-revision', product_codes: ['di_crash'] }, error: null };
  assert.equal((await app.quoteV2Products(['di_crash'])).amount_paise, 1234567);
  assert.equal(app.state.calls.at(-1).name, 'quote_v2_products');
  app.state.result = { data: null, error: { message: 'Synthetic private database details' } };
  await assert.rejects(app.listV2Products(), /^Error: Unable to load the V2 catalogue\.$/);
  await assert.rejects(app.quoteV2Products(['di_crash']), /^Error: Unable to quote the selected V2 products\.$/);
});
