import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewEnvironment } from './local-review.mjs';
const staging = { SUPABASE_URL: 'https://eyphkkginlgoaxflauog.supabase.co', SUPABASE_ANON_KEY: 'synthetic-public', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-server' };
const payment = { V2_RAZORPAY_TEST_KEY_ID: 'rzp_test_synthetic', V2_RAZORPAY_TEST_KEY_SECRET: 'synthetic-secret-value', V2_RAZORPAY_TEST_WEBHOOK_SECRET: 'synthetic-webhook-secret-value-for-testing' };

test('local review rejects Production, deployed runtimes and invalid binding ports', () => {
  assert.throws(() => reviewEnvironment(staging, payment, 3030, { VERCEL_ENV: 'production' }));
  assert.throws(() => reviewEnvironment(staging, payment, 3030, { VERCEL_ENV: 'preview' }));
  assert.throws(() => reviewEnvironment(staging, payment, 3030, { NODE_ENV: 'production' }));
  for (const port of [0, 80, 65536, NaN, 3030.5]) assert.throws(() => reviewEnvironment(staging, payment, port));
  assert.throws(() => reviewEnvironment({ ...staging, SUPABASE_URL: 'https://production.invalid' }, payment, 3030));
});
test('local review permits only Test Mode and does not inherit unrelated credentials', () => {
  assert.throws(() => reviewEnvironment(staging, { ...payment, V2_RAZORPAY_TEST_KEY_ID: 'rzp_live_synthetic' }, 3030));
  assert.throws(() => reviewEnvironment(staging, { ...payment, RAZORPAY_KEY_SECRET: 'unrelated' }, 3030));
  assert.throws(() => reviewEnvironment(staging, { ...payment, V2_RAZORPAY_TEST_WEBHOOK_SECRET: '' }, 3030));
  const env = reviewEnvironment(staging, payment, 3030, { NODE_OPTIONS: '--inspect=0.0.0.0', RAZORPAY_KEY_SECRET: 'unrelated' });
  assert.equal(env.NODE_OPTIONS, undefined);
  assert.equal(env.RAZORPAY_KEY_SECRET, undefined);
  assert.equal(env.NEXT_PUBLIC_SITE_URL, 'http://localhost:3030');
  assert.equal(env.V2_CHECKOUT_TEST_ENABLED, 'true');
  assert.equal(env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY, undefined);
  assert.equal(reviewEnvironment(staging, null, 3030).V2_CHECKOUT_TEST_ENABLED, 'false');
});
