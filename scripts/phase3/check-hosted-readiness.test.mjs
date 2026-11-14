import assert from 'node:assert/strict';
import test from 'node:test';
import { previewOrigin, checkHostedReadiness } from './check-hosted-readiness.mjs';
const origin = 'https://ace-club-synthetic-preview.vercel.app';
const html = '<h1>Choose your course. Start learning.</h1><p>Test checkout</p><button>Continue with Google</button>';
function page(text = html) { return new Response(text, { headers: { 'content-type': 'text/html' } }); }
test('readiness accepts only an explicit Preview-shaped origin without secret parameters', () => {
  assert.equal(previewOrigin(origin), origin);
  for (const url of ['http://localhost:3000', 'https://ace-club-lms.vercel.app', origin + '/admin', origin + '?token=private', origin + '#secret', 'https://user:secret@ace-club-synthetic-preview.vercel.app', 'https://other.vercel.app', origin + '.invalid']) assert.throws(() => previewOrigin(url));
});
test('readiness uses only unauthenticated GETs and does not equate route reachability with acceptance', async () => {
  const calls = [];
  const report = await checkHostedReadiness(origin, async (url, options) => {
    calls.push({ url, options });
    return url.endsWith('/webhook') ? new Response(null, { status: 405 }) : page();
  });
  assert.equal(report.overall, 'public_routes_reachable');
  assert.equal(report.checks.length, 4);
  assert.ok(calls.every(call => call.options.method === 'GET' && call.options.redirect === 'manual' && call.options.credentials === 'omit' && !call.options.headers));
  assert.equal(report.credentialsUsed, false);
  assert.match(report.limitations.join(' '), /not hosted acceptance/);
});
test('protection redirects and HTML challenges remain blocked without exposing response content', async () => {
  for (const response of [() => new Response(null, { status: 307, headers: { location: 'https://vercel.com/login?token=private' } }), () => page('<h1>Request Sent</h1>private record')]) {
    const report = await checkHostedReadiness(origin, async () => response());
    assert.equal(report.overall, 'blocked');
    assert.doesNotMatch(JSON.stringify(report), /token=private|private record/);
  }
});
test('checkout fallback, missing webhook and request failure cannot pass readiness', async () => {
  for (const fetcher of [async () => page('<h1>Registration is temporarily unavailable</h1>'), async () => new Response(null, { status: 404 }), async () => { throw Error('private network details'); }]) {
    const report = await checkHostedReadiness(origin, fetcher);
    assert.equal(report.overall, 'blocked');
    assert.doesNotMatch(JSON.stringify(report), /private network details/);
  }
});
