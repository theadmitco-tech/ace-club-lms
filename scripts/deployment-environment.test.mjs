import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('./validate-deployment-env.mjs', import.meta.url), 'utf8');
const preview = { VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: 'https://eyphkkginlgoaxflauog.supabase.co', NEXT_PUBLIC_SITE_URL: 'https://ace-club-fixture.vercel.app', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'synthetic-public-key', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-server-key' };
const production = { ...preview, VERCEL_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: 'https://owmlxsnzogfapotmjrqk.supabase.co', NEXT_PUBLIC_SITE_URL: 'https://aceclub.theadmitco.com' };
const payment = { V2_CHECKOUT_TEST_ENABLED: 'true', V2_RAZORPAY_TEST_KEY_ID: 'rzp_test_synthetic', V2_RAZORPAY_TEST_KEY_SECRET: 'synthetic-api-secret', V2_RAZORPAY_TEST_WEBHOOK_SECRET: 'synthetic-webhook-secret-for-local-tests' };
function run(env) {
  const messages = [], stopped = Symbol('exit'); let status = 0;
  try { runInNewContext(source, { URL, atob, process: { env, exit(code) { status = code; throw stopped; } }, console: { log: s => messages.push(s), error: s => messages.push(s) } }); }
  catch (error) { if (error !== stopped) throw error; }
  return { status, output: messages.join('\n') };
}
test('Preview and existing legacy Production configuration remain separated', () => {
  assert.equal(run(preview).status, 0);
  assert.equal(run({ ...preview, ...payment }).status, 0);
  assert.equal(run({ ...production, RAZORPAY_KEY_ID: 'rzp_live_legacy' }).status, 0);
  assert.equal(run({ ...preview, NEXT_PUBLIC_SUPABASE_URL: production.NEXT_PUBLIC_SUPABASE_URL }).status, 1);
  assert.equal(run({ ...production, NEXT_PUBLIC_SUPABASE_URL: preview.NEXT_PUBLIC_SUPABASE_URL }).status, 1);
});
test('unknown deployment contexts and missing configuration fail closed', () => {
  assert.equal(run({ ...preview, VERCEL_ENV: 'unexpected' }).status, 1);
  for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SITE_URL']) assert.equal(run({ ...preview, [key]: ' ' }).status, 1);
});
test('same-host HTTP, credentials, ports, paths and query fragments are rejected', () => {
  for (const url of ['http://eyphkkginlgoaxflauog.supabase.co', 'https://user:secret@eyphkkginlgoaxflauog.supabase.co', preview.NEXT_PUBLIC_SUPABASE_URL + ':444', preview.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1', preview.NEXT_PUBLIC_SUPABASE_URL + '?secret=value', preview.NEXT_PUBLIC_SUPABASE_URL + '#value']) assert.equal(run({ ...preview, NEXT_PUBLIC_SUPABASE_URL: url }).status, 1);
});
test('site origins reject invalid values and cross-environment routing', () => {
  for (const url of ['not-a-url', 'http://preview.example.invalid', 'https://preview.example.invalid/path', 'https://preview.example.invalid?token=secret', production.NEXT_PUBLIC_SITE_URL]) assert.equal(run({ ...preview, NEXT_PUBLIC_SITE_URL: url }).status, 1);
  assert.equal(run({ ...production, NEXT_PUBLIC_SITE_URL: preview.NEXT_PUBLIC_SITE_URL }).status, 1);
});
test('local development permits loopback HTTP without weakening hosted origins', () => {
  assert.equal(run({}).status, 0);
  assert.equal(run({ ...preview, VERCEL_ENV: 'development', NEXT_PUBLIC_SITE_URL: 'http://localhost:3030' }).status, 0);
  assert.equal(run({ ...preview, VERCEL_ENV: 'development', NEXT_PUBLIC_SITE_URL: 'http://external.example.invalid' }).status, 1);
});
test('Preview refuses Live Mode credentials and misleading release flags', () => {
  for (const change of [{ V2_RAZORPAY_LIVE_KEY_SECRET: 'synthetic-private' }, { V2_RAZORPAY_TEST_KEY_ID: 'rzp_live_synthetic' }, { V2_CHECKOUT_LIVE_ENABLED: 'true' }, { V2_PRODUCTION_RELEASE_ENABLED: 'true' }]) assert.equal(run({ ...preview, ...change }).status, 1);
});
test('checkout requires dedicated complete Test Mode configuration', () => {
  for (const key of ['V2_RAZORPAY_TEST_KEY_ID', 'V2_RAZORPAY_TEST_KEY_SECRET', 'V2_RAZORPAY_TEST_WEBHOOK_SECRET']) assert.equal(run({ ...preview, ...payment, [key]: '' }).status, 1);
  assert.equal(run({ ...preview, ...payment, V2_RAZORPAY_TEST_WEBHOOK_SECRET: 'short' }).status, 1);
});
test('Production enables V2 features only with the master release flag, and never Test or unimplemented Live checkout', () => {
  const features = ['V2_TEMPLATE_AUTHORING_ENABLED', 'V2_BATCH_AUTHORING_ENABLED', 'V2_STUDENT_SCHEDULE_ENABLED', 'V2_LEARNING_DELIVERY_ENABLED', 'V2_CONTENT_PUBLISHING_ENABLED'];
  for (const key of features) assert.equal(run({ ...production, [key]: 'true' }).status, 1);
  const released = { ...production, V2_PRODUCTION_RELEASE_ENABLED: 'true', ...Object.fromEntries(features.map(key => [key, 'true'])) };
  assert.equal(run(released).status, 0);
  assert.equal(run({ ...production, V2_PRODUCTION_RELEASE_ENABLED: 'true' }).status, 0);
  for (const value of ['yes', '1', 'TRUE']) assert.equal(run({ ...production, V2_PRODUCTION_RELEASE_ENABLED: value }).status, 1);
  for (const change of [{ V2_CHECKOUT_TEST_ENABLED: 'true' }, { V2_CHECKOUT_LIVE_ENABLED: 'true' }, { V2_RAZORPAY_TEST_KEY_ID: 'rzp_test_synthetic' }]) assert.equal(run({ ...released, ...change }).status, 1);
  const live = { V2_CHECKOUT_LIVE_ENABLED: 'true', V2_RAZORPAY_LIVE_KEY_ID: 'rzp_live_synthetic', V2_RAZORPAY_LIVE_KEY_SECRET: 'synthetic-live-api-secret', V2_RAZORPAY_LIVE_WEBHOOK_SECRET: 'synthetic-live-webhook-secret-for-tests' };
  assert.equal(run({ ...released, ...live }).status, 0);
  assert.equal(run({ ...released, ...live, V2_CHECKOUT_NEW_ORDERS_PAUSED: 'true' }).status, 0);
  for (const change of [{ V2_PRODUCTION_RELEASE_ENABLED: 'false' }, { V2_RAZORPAY_LIVE_KEY_ID: 'rzp_test_synthetic' }, { V2_RAZORPAY_LIVE_KEY_SECRET: '' },
    { V2_RAZORPAY_LIVE_WEBHOOK_SECRET: 'short' }, { V2_CHECKOUT_TEST_ENABLED: 'true' }, { V2_CHECKOUT_NEW_ORDERS_PAUSED: 'yes' }]) assert.equal(run({ ...released, ...live, ...change }).status, 1, JSON.stringify(change));
});
test('diagnostics do not expose configured credentials or rejected URL values', () => {
  const secret = 'PRIVATE_SENTINEL_VALUE';
  const result = run({ ...preview, NEXT_PUBLIC_SITE_URL: 'https://user:' + secret + '@example.invalid' });
  assert.equal(result.status, 1); assert(!result.output.includes(secret));
});

const jwt = (claims) => ['e30', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'signature'].join('.');
test('Supabase keys must match the configured project and never put a server key in the public slot', () => {
  const stagingKeys = { NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt({ ref: 'eyphkkginlgoaxflauog', role: 'anon' }), SUPABASE_SERVICE_ROLE_KEY: jwt({ ref: 'eyphkkginlgoaxflauog', role: 'service_role' }) };
  const productionKeys = { NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt({ ref: 'owmlxsnzogfapotmjrqk', role: 'anon' }), SUPABASE_SERVICE_ROLE_KEY: jwt({ ref: 'owmlxsnzogfapotmjrqk', role: 'service_role' }) };
  assert.equal(run({ ...preview, ...stagingKeys }).status, 0);
  assert.equal(run({ ...production, ...productionKeys }).status, 0);
  assert.equal(run({ ...preview, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_' + 'x'.repeat(24), SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_' + 'y'.repeat(24) }).status, 0);
  for (const change of [
    { NEXT_PUBLIC_SUPABASE_ANON_KEY: productionKeys.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    { SUPABASE_SERVICE_ROLE_KEY: productionKeys.SUPABASE_SERVICE_ROLE_KEY },
    { NEXT_PUBLIC_SUPABASE_ANON_KEY: stagingKeys.SUPABASE_SERVICE_ROLE_KEY },
    { NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_secret_' + 'x'.repeat(24) },
    { SUPABASE_SERVICE_ROLE_KEY: 'sb_publishable_' + 'x'.repeat(24) },
    { SUPABASE_SERVICE_ROLE_KEY: stagingKeys.NEXT_PUBLIC_SUPABASE_ANON_KEY },
  ]) assert.equal(run({ ...preview, ...stagingKeys, ...change }).status, 1, JSON.stringify(Object.keys(change)));
  assert.equal(run({ ...production, ...stagingKeys }).status, 1);
  const leaked = run({ ...preview, ...stagingKeys, NEXT_PUBLIC_SUPABASE_ANON_KEY: stagingKeys.SUPABASE_SERVICE_ROLE_KEY });
  assert(!leaked.output.includes(stagingKeys.SUPABASE_SERVICE_ROLE_KEY));
});
