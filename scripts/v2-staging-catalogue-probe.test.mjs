import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./v2-staging-catalogue-probe.browser.js', import.meta.url), 'utf8');
const preview = 'https://ace-club-1vr3qxhtk-theadmitco-techs-projects.vercel.app';
const ref = 'eyphkkginlgoaxflauog';
const staging = `https://${ref}.supabase.co`;
const syntheticKey = (role = 'anon', project = ref) => [
  Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url'),
  Buffer.from(JSON.stringify({ role, ref: project })).toString('base64url'),
  'synthetic_signature',
].join('.');
const rows = [
  { code: 'di_crash', product_kind: 'crash_course', sections: ['di'] },
  { code: 'full_batch', product_kind: 'full_batch', sections: ['quant', 'verbal', 'di'] },
  { code: 'quant_crash', product_kind: 'crash_course', sections: ['quant'] },
  { code: 'verbal_crash', product_kind: 'crash_course', sections: ['verbal'] },
];

async function probe(options = {}) {
  const requests = [];
  const outputs = [];
  const chunk = `${preview}/_next/static/chunks/test.js`;
  const document = { querySelectorAll: () => [{ src: chunk }, { src: 'https://example.invalid/tracker.js' }] };
  Object.defineProperty(document, 'cookie', { get() { assert.fail('Cookie access is forbidden'); } });
  const context = {
    location: { origin: options.origin ?? preview }, document,
    performance: { getEntriesByType: () => (options.resources ?? [`${staging}/rest/v1/profiles`]).map((name) => ({ name })) },
    URL, URLSearchParams, AbortSignal, atob,
    console: { info: (value) => outputs.push(JSON.parse(value)) },
    fetch: async (input, init) => {
      requests.push({ url: input, init });
      assert.equal(init.method, 'GET');
      assert.equal(init.redirect, 'error');
      assert.equal(init.body, undefined);
      if (input === chunk) {
        assert.equal(init.headers, undefined);
        return { ok: true, text: async () => options.bundle ?? JSON.stringify({ key: syntheticKey() }) };
      }
      const url = new URL(input);
      assert.equal(url.origin, staging);
      assert.equal(init.credentials, 'omit');
      assert.equal(init.referrerPolicy, 'no-referrer');
      const expectedKey = options.expectedKey ?? syntheticKey();
      const headerNames = expectedKey.startsWith('eyJ') ? ['Accept', 'Authorization', 'apikey'] : ['Accept', 'apikey'];
      assert.deepEqual(Object.keys(init.headers).sort(), headerNames);
      if (expectedKey.startsWith('eyJ')) assert.equal(init.headers.Authorization, `Bearer ${expectedKey}`);
      assert.equal(url.searchParams.has('apikey'), false);
      assert.equal(init.headers.apikey, expectedKey);
      const isQuote = url.pathname === '/rest/v1/rpc/quote_v2_products';
      if (isQuote) {
        assert.equal(url.searchParams.get('p_product_codes'), '{full_batch}');
      } else {
        assert.equal(url.pathname, '/rest/v1/v2_products');
        assert.equal(url.searchParams.get('select'), 'code,product_kind,sections');
        assert.equal(url.searchParams.get('limit'), '5');
      }
      if (options.networkFailure) throw new Error(`Private transport detail ${syntheticKey()}`);
      const status = isQuote ? options.quoteStatus ?? 200 : options.catalogueStatus ?? 200;
      const data = isQuote
        ? options.quote ?? { currency: 'INR', amount_paise: 2_500_000, product_codes: ['full_batch'] }
        : options.catalogue ?? rows;
      return { ok: status === 200, status, json: async () => data };
    },
  };
  Object.defineProperty(context, 'localStorage', { get() { assert.fail('Storage access is forbidden'); } });
  await vm.runInNewContext(source, context);
  assert.equal(outputs.length, 1);
  assert.equal(JSON.stringify(outputs).includes(syntheticKey()), false);
  return { result: outputs[0], requests };
}

test('reads only the public catalogue and a GET quote, without session data or credential output', async () => {
  const { result, requests } = await probe();
  assert.equal(result.result, 'PUBLIC_CHECKS_PASSED');
  assert.equal(requests.length, 3);
});

test('refuses any other Preview or Production origin before network access', async () => {
  const { result, requests } = await probe({ origin: 'https://example.invalid' });
  assert.equal(result.result, 'WRONG_PREVIEW');
  assert.equal(requests.length, 0);
});

test('requires observed staging traffic and rejects mixed backend targets', async () => {
  for (const resources of [[], ['https://other.supabase.co/rest/v1/profiles'], [staging, 'https://other.supabase.co']]) {
    const { result, requests } = await probe({ resources });
    assert.equal(result.result, 'STAGING_CONNECTION_NOT_OBSERVED_RELOAD_AND_RETRY');
    assert.equal(requests.length, 0);
  }
});

test('does not use service-role, user-session or another project JWTs', async () => {
  for (const key of [syntheticKey('service_role'), syntheticKey('authenticated'), syntheticKey('anon', 'other')]) {
    const { result, requests } = await probe({ bundle: JSON.stringify({ key }) });
    assert.equal(result.result, 'PUBLIC_CONFIGURATION_NOT_FOUND');
    assert.equal(requests.length, 1);
  }
});

test('accepts a public publishable key only alongside the expected staging URL', async () => {
  const key = 'sb_publishable_synthetic_fixture_key_only';
  const { result } = await probe({ bundle: JSON.stringify({ url: staging, key }), expectedKey: key });
  assert.equal(result.result, 'PUBLIC_CHECKS_PASSED');
  const missing = await probe({ bundle: JSON.stringify({ key }) });
  assert.equal(missing.result.result, 'PUBLIC_CONFIGURATION_NOT_FOUND');
});

test('rejects ambiguous public configuration before database access', async () => {
  const { result, requests } = await probe({ bundle: JSON.stringify({ url: staging, keys: [syntheticKey(), 'sb_publishable_synthetic_fixture_key_only'] }) });
  assert.equal(result.result, 'AMBIGUOUS_PUBLIC_CONFIGURATION');
  assert.equal(requests.length, 1);
});

test('reports a missing table without exposing the raw database message', async () => {
  const { result, requests } = await probe({ catalogueStatus: 404, catalogue: { code: 'PGRST205', message: 'private diagnostic text' } });
  assert.equal(result.result, 'CATALOGUE_UNAVAILABLE');
  assert.equal(result.catalogue, 'PGRST205');
  assert.equal(requests.length, 2);
  assert.equal(JSON.stringify(result).includes('private diagnostic text'), false);
});

test('detects an incomplete catalogue or a wrong section scope', async () => {
  for (const catalogue of [[], rows.slice(0, 3), rows.map((row) => ({ ...row, sections: ['quant'] }))]) {
    const { result } = await probe({ catalogue });
    assert.equal(result.result, 'REVIEW_CATALOGUE_CONFIGURATION');
  }
});

test('distinguishes a missing quote function from a wrong price', async () => {
  const unavailable = await probe({ quoteStatus: 404, quote: { code: 'PGRST202' } });
  assert.equal(unavailable.result.result, 'QUOTE_UNAVAILABLE');
  const incorrect = await probe({ quote: { currency: 'INR', amount_paise: 1, product_codes: ['full_batch'] } });
  assert.equal(incorrect.result.result, 'REVIEW_PRICE_CONFIGURATION');
});

test('does not print credentials or transport details on a failed request', async () => {
  const { result } = await probe({ networkFailure: true });
  assert.equal(result.result, 'READ_FAILED');
  assert.equal(JSON.stringify(result).includes('Private transport detail'), false);
});
