import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const exports = {};
const source = readFileSync(new URL('../src/lib/v2SessionOrder.ts', import.meta.url), 'utf8');
runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
  exports, require: name => { assert.equal(name, './v2Batches'); return { editableV2BatchEvents: events => events }; },
});
const { moveSessionKey, reorderedSessionInput } = exports;
const json = value => JSON.parse(JSON.stringify(value));
const draft = { id:'batch', productCode:'quant', templateId:'template', templateRevision:2, revision:4, title:'Subject course', startDate:'2026-11-01', timeZone:'Asia/Kolkata', events:[{key:'event',localDate:'2026-11-10'}], sessions:['a','b','c'].map(key=>({key,title:key,content:{materials:[{key:'pdf-'+key,url:'private-'+key}]}})) };
test('Moves preserve identity and the source array without duplicates', () => {
  const source=['a','b','c']; assert.deepEqual(json(moveSessionKey(source,'a',2)),['b','c','a']);assert.deepEqual(json(moveSessionKey(source,'c',0)),['c','a','b']);assert.deepEqual(source,['a','b','c']);
  for(const destination of [-1,3,NaN,0.5])assert.equal(moveSessionKey(source,'a',destination),source);
  assert.equal(moveSessionKey(source,'missing',1),source);assert.equal(moveSessionKey(source,'a',0),source);
});
test('A reordered draft retains exact session objects, metadata and scheduled events', () => {
  const input=reorderedSessionInput(draft,['a','b','c'],['c','a','b'],'request');assert.equal(input.sessions[0],draft.sessions[2]);assert.equal(input.events,draft.events);assert.equal(input.expectedRevision,4);assert.equal(input.requestId,'request');assert.equal(input.templateRevision,2);assert.deepEqual(input.sessions.map(s=>s.key),['c','a','b']);assert.deepEqual(draft.sessions.map(s=>s.key),['a','b','c']);
});
test('Missing, duplicated, extra and foreign session keys are rejected', () => {
  for(const keys of [['a','a','c'],['a','b'],['a','b','c','d'],['a','b','foreign']])assert.throws(()=>reorderedSessionInput(draft,['a','b','c'],keys,'request'),/incomplete/);
});
test('Stale source orders, changed membership and unsupported offerings require reload', () => {
  for(const original of [['b','a','c'],['a','b'],['a','b','other']])assert.throws(()=>reorderedSessionInput(draft,original,['c','a','b'],'request'),/changed/);
  assert.throws(()=>reorderedSessionInput({...draft,productCode:'full_course'},['a','b','c'],['c','a','b'],'request'),/changed/);
});
