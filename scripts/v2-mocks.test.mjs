import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Synthetic requests against a stubbed database client.
function harness() {
  const calls = [];
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL('../src/lib/server/v2Mocks.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const deps = { 'server-only': {}, '@/utils/supabase/server': { createClient: async () => ({ rpc: async (name, args) => { calls.push([name, args]); return name === 'save_v2_batch_mock' ? { data: { id: 'mock-id' }, error: null } : { data: [], error: null }; } }) } };
  runInNewContext(code, { exports, Date, require: name => deps[name] });
  return { api: exports, calls };
}
const batchId = '10000000-0000-4000-8000-000000000001';
const valid = { batchId, title: '  Mock 1  ', startsAt: '2099-01-10T10:00:00+05:30', endsAt: '2099-01-10T13:30:00+05:30', testUrl: 'https://mocks.example.test/1', instructions: 'Quiet room' };

test('a valid mock is saved with trimmed fields', async () => {
  const { api, calls } = harness();
  assert.deepEqual({ ...await api.saveV2BatchMock(valid) }, { status: 'success', id: 'mock-id' });
  assert.equal(calls[0][0], 'save_v2_batch_mock'); assert.equal(calls[0][1].p_title, 'Mock 1'); assert.equal(calls[0][1].p_mock_id, null);
});

test('invalid mocks are refused before reaching the database', async () => {
  const { api, calls } = harness();
  for (const change of [{ batchId: 'nope' }, { title: '' }, { title: 'x'.repeat(161) }, { startsAt: 'later' }, { endsAt: '2099-01-10T09:00:00+05:30' },
    { testUrl: 'http://insecure.example.test' }, { testUrl: 'javascript:alert(1)' }, { instructions: 'x'.repeat(2001) }, { id: 'not-a-uuid' }])
    assert.equal((await api.saveV2BatchMock({ ...valid, ...change })).status, 'error', JSON.stringify(change));
  assert.equal(calls.length, 0);
  assert.equal(await api.deleteV2BatchMock('nope', batchId), false); assert.equal(await api.listV2BatchMocks('nope'), null);
});
