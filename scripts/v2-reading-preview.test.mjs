import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(file, dependencies = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(source, { exports, URL, require(name) {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}
const helpers = load('src/lib/v2ReadingPreview.ts');
const pageId = '123456781234123412341234567890ab';
const uuid = '12345678-1234-1234-1234-1234567890ab';
const paragraph = '22345678-1234-1234-1234-1234567890ab';
const content = () => ({ block: {
  [uuid]: { value: { id: uuid, type: 'page', alive: true, content: [paragraph] } },
  [paragraph]: { value: { id: paragraph, type: 'text', alive: true, properties: { title: [['Reading']] } } },
} });
function harness() {
  const state = { template: true, batch: false, role: 'admin', calls: [], authCalls: 0, result: content(), fault: null };
  const api = load('src/app/api/admin/v2/reading-preview/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, ...options }) } },
    'notion-client': { NotionAPI: class {
      constructor(options) { state.calls.push(['client', options]); }
      async getPage(...args) { state.calls.push(['page', ...args]); if (state.fault === 'provider') throw Error('private diagnostic'); return state.result; }
    } },
    '@/lib/server/portalAuthorization': { getPortalIdentity: async () => {
      state.authCalls++; if (state.fault === 'auth') throw Error('private diagnostic');
      return state.role ? { id: 'synthetic', role: state.role } : null;
    } },
    '@/lib/server/v2TemplateFeature': { isV2TemplateAuthoringEnabled: () => state.template },
    '@/lib/server/v2BatchFeature': { isV2BatchAuthoringEnabled: () => state.batch },
    '@/lib/v2ReadingPreview': helpers,
  });
  return { state, get: (query = `pageId=${pageId}`) => api.GET({ nextUrl: new URL(`https://example.test/api?${query}`) }) };
}

test('reading URLs accept only unambiguous HTTPS Notion page references', () => {
  for (const url of [`https://notion.so/${pageId}`, `https://docs.notion.site/Reading-${pageId.toUpperCase()}?pvs=4`, `https://www.notion.so/${uuid}`]) {
    assert.equal(helpers.v2ReadingPageId(url), pageId);
  }
  for (const url of ['', pageId, `http://notion.so/${pageId}`, `https://notion.so.evil.test/${pageId}`,
    `https://evil.test/${pageId}`, `https://user:password@notion.so/${pageId}`, `https://notion.so:8443/${pageId}`,
    `https://notion.so/${pageId}/${pageId}`, `https://notion.so/ebd/${pageId}`, 'https://notion.so/no-page-id', `<iframe src="https://notion.so/${pageId}">`]) {
    assert.equal(helpers.v2ReadingPageId(url), null, url);
  }
});
test('missing, mismatched, deleted and empty pages cannot pass content validation', () => {
  assert.equal(helpers.hasV2ReadingContent(content(), pageId), true);
  for (const value of [null, [], {}, { block: [] }, { block: {} }]) assert.equal(helpers.hasV2ReadingContent(value, pageId), false);
  for (const patch of [{ alive: false }, { id: paragraph }, { type: 'text' }, { content: [] }, { content: ['missing'] }]) {
    const value = content(); Object.assign(value.block[uuid].value, patch);
    assert.equal(helpers.hasV2ReadingContent(value, pageId), false);
  }
  const deleted = content(); deleted.block[paragraph].value.alive = false;
  assert.equal(helpers.hasV2ReadingContent(deleted, pageId), false);
  for (const value of [{}, { type: 'text' }, { type: 'text', properties: { title: [['   ']] } },
    { type: 'column', content: [paragraph] }]) {
    const empty = content(); empty.block[paragraph].value = value;
    assert.equal(helpers.hasV2ReadingContent(empty, pageId), false);
  }
  const nested = content(); nested.block.container = { value: { type: 'column', content: [paragraph] } };
  nested.block[uuid].value.content = ['container']; assert.equal(helpers.hasV2ReadingContent(nested, pageId), true);
});
test('disabled authoring and unauthorized identities never reach the Notion provider', async () => {
  for (const [patch, expected] of [[{ template: false, batch: false }, 404], [{ role: null }, 401], [{ role: 'student' }, 403]]) {
    const h = harness(); Object.assign(h.state, patch);
    assert.equal((await h.get()).status, expected); assert.equal(h.state.calls.length, 0);
    if (expected === 404) assert.equal(h.state.authCalls, 0);
  }
});
test('preview rejects duplicate parameters, extra identity/token/URL arguments and invalid IDs', async () => {
  const h = harness();
  for (const query of ['', 'pageId=bad', `pageId=${uuid}`, `pageId=${pageId}&pageId=${pageId}`,
    `pageId=${pageId}&token=secret`, `pageId=${pageId}&role=admin`, `pageId=${pageId}&url=https://example.test`]) {
    assert.equal((await h.get(query)).status, 400);
  }
  assert.equal(h.state.calls.length, 0);
});
test('active Admin can preview from either enabled authoring surface without a write dependency', async () => {
  for (const template of [true, false]) {
    const h = harness(); h.state.template = template; h.state.batch = !template;
    const response = await h.get(); assert.equal(response.status, 200); assert.equal(response.body, h.state.result);
    assert.equal(response.headers['Cache-Control'], 'private, no-store'); assert.equal(response.headers.Vary, 'Cookie');
    assert.deepEqual(JSON.parse(JSON.stringify(h.state.calls)), [
      ['client', { ofetchOptions: { timeout: 10000, retry: 0 } }],
      ['page', pageId, { fetchRelationPages: false, throwOnCollectionErrors: true }],
    ]);
    await h.get(); assert.equal(h.state.authCalls, 2); assert.equal(h.state.calls.length, 4);
  }
});
test('empty content and provider/auth faults fail privately and can be retried', async () => {
  const h = harness(); h.state.result = { block: {} }; assert.equal((await h.get()).status, 422);
  for (const fault of ['provider', 'auth']) {
    h.state.fault = fault; const result = await h.get(); assert.equal(result.status, 502);
    assert.doesNotMatch(JSON.stringify(result.body), /private diagnostic/);
    assert.equal(result.headers['Cache-Control'], 'private, no-store');
  }
  h.state.fault = null; h.state.result = content(); assert.equal((await h.get()).status, 200);
});
