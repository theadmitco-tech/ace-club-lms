import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./v2-phase1-role-probe.browser.js', import.meta.url), 'utf8');
const preview = 'https://ace-club-a8go51h46-theadmitco-techs-projects.vercel.app';
const branch = 'https://ace-club-lms-git-intern-v2-onboarding-theadmitco-techs-projects.vercel.app';
const paths = ['/api/admin/set-user-active', '/api/admin/session-materials'];
const validation = ['User ID and active state are required.', 'A valid batch session and title are required.'];

async function run({ origin = preview, responses, failure } = {}) {
  const requests = [];
  const output = [];
  const context = {
    location: { origin }, URL, AbortSignal,
    console: { info: (value) => output.push(JSON.parse(value)) },
    fetch: async (url, init) => {
      const index = requests.length;
      requests.push(url);
      assert.equal(url, origin + paths[index]);
      assert.equal(init.method, 'POST');
      assert.equal(init.body, '{}');
      assert.equal(init.credentials, 'same-origin');
      assert.equal(init.redirect, 'error');
      assert.equal(init.referrerPolicy, 'no-referrer');
      assert.equal(init.cache, 'no-store');
      assert.deepEqual(Object.keys(init.headers).sort(), ['Accept', 'Content-Type']);
      assert.equal(init.headers['Content-Type'], 'application/json');
      assert.ok(init.signal instanceof AbortSignal);
      if (failure === 'network') throw new Error('private response/token detail');
      const [status, error] = responses?.[index] ?? [400, validation[index]];
      return { status, json: async () => {
        if (failure === 'html') throw new SyntaxError('private redirect/login document');
        return { error, private_field: 'private response/token detail' };
      } };
    },
  };
  for (const property of ['document', 'localStorage', 'sessionStorage']) {
    Object.defineProperty(context, property, { get() { assert.fail(`Forbidden access: ${property}`); } });
  }
  await vm.runInNewContext(source, context);
  assert.equal(output.length, 1);
  assert.equal(JSON.stringify(output).includes('private'), false);
  return { report: output[0], requests };
}

test('sends only empty validation payloads to the two fixed Admin endpoints', async () => {
  const { report, requests } = await run();
  assert.equal(report.result, 'ADMIN_VALIDATION_REACHED');
  assert.equal(requests.length, 2);
});

test('accepts the verified branch alias using only its own origin', async () => {
  const { report, requests } = await run({ origin: branch });
  assert.equal(report.result, 'ADMIN_VALIDATION_REACHED');
  assert.equal(requests.length, 2);
});

test('rejects an old deployment, unrelated host or lookalike before any request', async () => {
  for (const origin of [
    'https://ace-club-1vr3qxhtk-theadmitco-techs-projects.vercel.app',
    'https://example.invalid', `${preview}.example.invalid`,
  ]) {
    const { report, requests } = await run({ origin });
    assert.equal(report.result, 'WRONG_PREVIEW');
    assert.equal(requests.length, 0);
  }
});

test('distinguishes Student denial from signed-out denial', async () => {
  for (const [status, error, expected] of [
    [403, 'Admin access required', 'NON_ADMIN_DENIED'],
    [401, 'Authentication required', 'SIGNED_OUT_DENIED'],
  ]) {
    const { report, requests } = await run({ responses: [[status, error], [status, error]] });
    assert.equal(report.result, expected);
    assert.equal(requests.length, 2);
  }
});

test('requires both status and exact route-specific validation before recognizing Admin', async () => {
  for (const response of [[200, validation[0]], [400, validation[1]], [500, 'private failure'], [403, 'unknown']]) {
    const { report, requests } = await run({ responses: [response] });
    assert.equal(report.result, 'REVIEW_REQUIRED');
    assert.equal(requests.length, 1);
  }
});

test('reports a session or authorization change between requests as inconclusive', async () => {
  const { report } = await run({ responses: [[400, validation[0]], [401, 'Authentication required']] });
  assert.equal(report.result, 'ROLE_RESULTS_DIFFER');
});

test('does not treat transport failures or login HTML as authorization evidence', async () => {
  for (const failure of ['network', 'html']) {
    const { report, requests } = await run({ failure });
    assert.equal(report.result, 'REQUEST_FAILED');
    assert.equal(requests.length, 1);
  }
});
