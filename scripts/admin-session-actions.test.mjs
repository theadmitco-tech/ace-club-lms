import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const batchId = '40000000-0000-4000-8000-000000000001';
const draft = { id: batchId, revision: 3, productCode: 'quant', sessions: [] };
const published = { batchId, batchRevision: 3, state: 'published' };
function fixture({ enabled = true, drafts = { status: 'ready', drafts: [draft] }, publications = { status: 'ready', publications: [published] } } = {}) {
  const calls = [], exports = {};
  const dependencies = {
    '@/lib/server/v2ContentPublishing': { isV2ContentPublishingEnabled: () => enabled },
    '@/lib/v2Meetings': { isV2MeetingBatchId: value => /^[a-f0-9-]{36}$/.test(value) },
    '@/lib/server/v2Batches': { listV2BatchDrafts: async () => { calls.push('drafts'); return drafts; } },
    '@/lib/server/v2Publications': { listV2BatchPublications: async () => { calls.push('publications'); return publications; } },
  };
  const source = readFileSync(new URL('../src/app/admin/v2/content/session-actions.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, { exports, require: name => { assert.ok(Object.hasOwn(dependencies, name)); return dependencies[name]; } });
  return { load: exports.loadSessionDraftAction, calls };
}
test('Disabled editing and invalid identifiers avoid data access', async () => {
  for (const [config, id] of [[{ enabled: false }, batchId], [{}, 'invalid']]) {
    const f = fixture(config); assert.equal((await f.load(id)).status, 'error'); assert.equal(f.calls.length, 0);
  }
});
test('Denied and unavailable authoring results cannot expose a session draft', async () => {
  for (const status of ['forbidden', 'unavailable', 'disabled']) {
    const f = fixture({ drafts: { status, drafts: [] } }); assert.equal((await f.load(batchId)).status, 'error');
  }
  assert.equal((await fixture({ publications: { status: 'unavailable', publications: [] } }).load(batchId)).status, 'error');
});
test('Unpublished, absent and Full Course records cannot be edited through subject addition', async () => {
  for (const config of [
    { drafts: { status: 'ready', drafts: [] } },
    { drafts: { status: 'ready', drafts: [{ ...draft, productCode: 'full_course' }] } },
    { publications: { status: 'ready', publications: [{ ...published, state: 'unpublished' }] } },
  ]) assert.equal((await fixture(config).load(batchId)).status, 'error');
});
test('An unpublished newer draft requires explicit review instead of silent inclusion', async () => {
  const f = fixture({ drafts: { status: 'ready', drafts: [{ ...draft, revision: 4 }] } });
  assert.equal((await f.load(batchId)).status, 'pending');
});
test('Matching publication returns the complete existing draft unchanged', async () => {
  const result = await fixture().load(batchId); assert.equal(result.status, 'ready'); assert.equal(result.draft, draft);
});
