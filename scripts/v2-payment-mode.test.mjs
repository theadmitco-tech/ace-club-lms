import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Synthetic environments only: no credentials, provider calls or databases.
function load(path, deps = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, URL, atob, require: name => { assert.ok(Object.hasOwn(deps, name), name); return deps[name]; } });
  return exports;
}
const environment = load('src/lib/v2Environment.ts');
const checkout = load('src/lib/v2Checkout.ts');
const mode = load('src/lib/v2PaymentMode.ts', { './v2Checkout': checkout, './v2Environment': environment });

const preview = { VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: 'https://eyphkkginlgoaxflauog.supabase.co', V2_CHECKOUT_TEST_ENABLED: 'true',
  V2_RAZORPAY_TEST_KEY_ID: 'rzp_test_synthetic', V2_RAZORPAY_TEST_KEY_SECRET: 'synthetic-api-secret', V2_RAZORPAY_TEST_WEBHOOK_SECRET: 'synthetic-webhook-secret-for-tests' };
const production = { VERCEL_ENV: 'production', V2_PRODUCTION_RELEASE_ENABLED: 'true', NEXT_PUBLIC_SUPABASE_URL: 'https://owmlxsnzogfapotmjrqk.supabase.co',
  NEXT_PUBLIC_SITE_URL: 'https://aceclub.theadmitco.com', V2_CHECKOUT_LIVE_ENABLED: 'true',
  V2_RAZORPAY_LIVE_KEY_ID: 'rzp_live_synthetic', V2_RAZORPAY_LIVE_KEY_SECRET: 'synthetic-live-secret', V2_RAZORPAY_LIVE_WEBHOOK_SECRET: 'synthetic-live-webhook-secret-for-tests' };

test('Test Mode runs in Preview with its own keys; Live Mode only in approved Production with its own keys', () => {
  assert.deepEqual({ ...mode.v2PaymentConfig(preview) }, { mode: 'test', keyId: 'rzp_test_synthetic', keySecret: 'synthetic-api-secret', webhookSecret: 'synthetic-webhook-secret-for-tests' });
  assert.deepEqual({ ...mode.v2PaymentConfig(production) }, { mode: 'live', keyId: 'rzp_live_synthetic', keySecret: 'synthetic-live-secret', webhookSecret: 'synthetic-live-webhook-secret-for-tests' });
});

test('mixed, opposite-mode, partial or unapproved configuration turns checkout off', () => {
  const { V2_PRODUCTION_RELEASE_ENABLED, ...unreleased } = production; void V2_PRODUCTION_RELEASE_ENABLED;
  for (const env of [
    {}, { ...preview, V2_CHECKOUT_TEST_ENABLED: 'false' },
    { ...preview, V2_CHECKOUT_LIVE_ENABLED: 'true' },
    { ...preview, V2_RAZORPAY_LIVE_KEY_ID: 'rzp_live_synthetic' },
    { ...preview, V2_RAZORPAY_TEST_KEY_ID: 'rzp_live_synthetic' },
    { ...preview, V2_RAZORPAY_TEST_KEY_SECRET: '' }, { ...preview, V2_RAZORPAY_TEST_WEBHOOK_SECRET: 'short' },
    { ...preview, VERCEL_ENV: 'production' },
    { ...preview, NEXT_PUBLIC_SUPABASE_URL: 'https://owmlxsnzogfapotmjrqk.supabase.co' },
    unreleased,
    { ...production, V2_CHECKOUT_TEST_ENABLED: 'true' },
    { ...production, V2_RAZORPAY_TEST_KEY_ID: 'rzp_test_synthetic' },
    { ...production, V2_RAZORPAY_LIVE_KEY_ID: 'rzp_test_synthetic' },
    { ...production, V2_RAZORPAY_LIVE_WEBHOOK_SECRET: '' },
    { ...production, VERCEL_ENV: 'preview' },
    { ...production, NEXT_PUBLIC_SUPABASE_URL: 'https://eyphkkginlgoaxflauog.supabase.co' },
    { ...production, V2_CHECKOUT_LIVE_ENABLED: undefined, RAZORPAY_KEY_ID: 'rzp_live_legacy', RAZORPAY_KEY_SECRET: 'legacy-secret' },
  ]) assert.equal(mode.v2PaymentConfig(env), null, JSON.stringify(env));
});

test('the pause switch is explicit', () => {
  assert.equal(mode.v2NewCheckoutsPaused(preview), false);
  assert.equal(mode.v2NewCheckoutsPaused({ ...preview, V2_CHECKOUT_NEW_ORDERS_PAUSED: 'true' }), true);
  assert.equal(mode.v2NewCheckoutsPaused({ ...preview, V2_CHECKOUT_NEW_ORDERS_PAUSED: 'yes' }), false);
});
