import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Synthetic secrets and payloads only; no Tally account, database or network is contacted.
function load(file, deps = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, { exports, Buffer, URLSearchParams, Date, TextDecoder, Request, Response, process: { env: {} }, ...globals, require(name) { assert.ok(Object.hasOwn(deps, name), name); return deps[name]; } });
  return exports;
}
const env = { V2_TALLY_FEEDBACK_FORM_ID: 'wAbc12', V2_TALLY_SIGNING_SECRET: 'synthetic-tally-signing-secret', V2_FEEDBACK_LINK_SECRET: 'synthetic-feedback-link-secret-of-32+chars' };
const tally = load('src/lib/server/v2TallyFeedback.ts', { 'server-only': {}, 'node:crypto': crypto });
const config = tally.tallyFeedbackConfig(env);
const student = '10000000-0000-4000-8000-000000000001', obligation = '20000000-0000-4000-8000-000000000002';
const now = Date.parse('2026-11-25T10:00:00Z');

test('Tally is used only with a valid form, webhook secret and link secret', () => {
  assert.deepEqual({ ...config }, { formId: 'wAbc12', signingSecret: env.V2_TALLY_SIGNING_SECRET, linkSecret: env.V2_FEEDBACK_LINK_SECRET });
  for (const change of [{ V2_TALLY_FEEDBACK_FORM_ID: '' }, { V2_TALLY_FEEDBACK_FORM_ID: 'bad/id' }, { V2_TALLY_SIGNING_SECRET: 'short' }, { V2_FEEDBACK_LINK_SECRET: 'too-short' }])
    assert.equal(tally.tallyFeedbackConfig({ ...env, ...change }), null);
});

test('signed links name exactly one student and obligation and cannot be altered or reused after expiry', () => {
  const token = tally.feedbackLinkToken(config, student, obligation, now);
  assert.deepEqual({ ...tally.verifyFeedbackLinkToken(config, token, now) }, { obligationId: obligation, studentId: student });
  const parts = token.split('.');
  const swapped = [parts[0], parts[1], '10000000-0000-4000-8000-000000000099', parts[3], parts[4]].join('.');
  for (const bad of [swapped, token.slice(0, -2) + 'xx', token.replace('v1.', 'v2.'), '', null, 42, 'v1.a.b.c.d'])
    assert.equal(tally.verifyFeedbackLinkToken(config, bad, now), null);
  assert.equal(tally.verifyFeedbackLinkToken(config, token, now + 31 * 86400000), null);
  assert.equal(tally.verifyFeedbackLinkToken({ ...config, linkSecret: 'another-feedback-link-secret-of-32+chars' }, token, now), null);
  assert.throws(() => tally.feedbackLinkToken(config, 'not-a-uuid', obligation));
  const url = new URL(tally.tallyFormUrl(config, token, 'Quant 4'));
  assert.equal(url.origin + url.pathname, 'https://tally.so/embed/wAbc12'); assert.equal(url.searchParams.get('ref'), token);
});

const payload = (ref, extra = {}) => ({ eventId: 'evt_1', eventType: 'FORM_RESPONSE', data: { submissionId: 'sub_123', formId: 'wAbc12', fields: [
  { key: 'q1', label: 'How useful was this session?', type: 'RATING', value: 4 },
  { key: 'h1', label: 'ref', type: 'HIDDEN_FIELDS', value: ref },
  { key: 'h2', label: 'session', type: 'HIDDEN_FIELDS', value: 'Quant 4' },
], ...extra } });
const signed = body => crypto.createHmac('sha256', env.V2_TALLY_SIGNING_SECRET).update(body).digest('base64');

test('Tally signatures and payloads are checked before the ref is trusted', () => {
  const body = JSON.stringify(payload('ref'));
  assert.equal(tally.validTallySignature(config, body, signed(body)), true);
  for (const bad of [null, '', signed(body + ' '), signed(body).toUpperCase()]) assert.equal(tally.validTallySignature(config, body, bad), false);
  const parsed = tally.parseTallySubmission(config, payload('the-ref'));
  assert.equal(parsed.ignored, false); assert.equal(parsed.submissionId, 'sub_123'); assert.equal(parsed.ref, 'the-ref');
  assert.equal(JSON.stringify(parsed.response).includes('the-ref'), false, 'the signed link is not stored with the answers');
  assert.deepEqual(parsed.response.fields.map(field => field.label), ['How useful was this session?', 'session']);
  assert.deepEqual({ ...tally.parseTallySubmission(config, { eventType: 'OTHER' }) }, { ignored: true });
  for (const bad of [null, [], payload('x', { formId: 'another' }), payload('x', { submissionId: 'has space' }), payload('x', { fields: 'nope' })])
    assert.equal(tally.parseTallySubmission(config, bad), null);
  const long = tally.parseTallySubmission(config, payload('x', { fields: [{ label: 'Comment', type: 'TEXTAREA', value: 'y'.repeat(5000) }] }));
  assert.ok(JSON.stringify(long.response).length < 3000);
});

function route(state) {
  return load('src/app/api/v2/feedback/tally/route.ts', {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) } },
    '@/lib/server/v2LearningFeature': { isV2LearningEnabled: () => state.enabled },
    '@/lib/server/v2ServiceClient': { createV2ServiceClient: () => ({ rpc: async (name, args) => { state.calls.push([name, args]); return { error: state.error }; } }) },
    '@/lib/server/v2TallyFeedback': { ...tally, tallyFeedbackConfig: () => state.configured ? config : null },
    '@/lib/server/v2CheckoutRequest': load('src/lib/server/v2CheckoutRequest.ts', { 'server-only': {} }),
  });
}
const post = (body, signature = signed(body)) => new Request('https://example.test/api/v2/feedback/tally', { method: 'POST', headers: { 'tally-signature': signature }, body });

test('the webhook records only signed submissions with a valid link and asks Tally to retry only temporary failures', async () => {
  const state = { enabled: true, configured: true, calls: [], error: null }, api = route(state);
  const token = tally.feedbackLinkToken(config, student, obligation);
  const good = JSON.stringify(payload(token));
  assert.equal((await api.POST(post(good))).status, 200);
  assert.deepEqual(state.calls.map(([name, args]) => [name, args.p_obligation_id, args.p_student_id, args.p_submission_id]), [['record_v2_tally_feedback', obligation, student, 'sub_123']]);
  state.calls.length = 0;
  assert.equal((await api.POST(post(good, signed('other')))).status, 401);
  assert.equal((await api.POST(post(JSON.stringify(payload('forged.token'))))).status, 400);
  assert.equal((await api.POST(post(JSON.stringify({ eventType: 'OTHER' })))).status, 200);
  assert.equal(state.calls.length, 0);
  state.error = { code: '42501' }; assert.equal((await api.POST(post(good))).status, 400);
  state.error = { code: '57014' }; assert.equal((await api.POST(post(good))).status, 503);
  state.configured = false; assert.equal((await api.POST(post(good))).status, 404);
  state.configured = true; state.enabled = false; assert.equal((await api.POST(post(good))).status, 404);
});
