import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { CONTENT_TABLES } from './v2-content-preservation.mjs';
import { reviewContentMapping } from './v2-content-mapping.mjs';

const id = (n) => `d1000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function fixture() {
  const inventory = {
    format: 'v2-legacy-content-inventory-1', source: 'synthetic-local', readOnly: true,
    capturedAt: '2026-10-25T00:00:00Z',
    tables: CONTENT_TABLES.map((name) => ({ name, schemaHash: 'a'.repeat(64), rows: [
      { id: id(1), hash: 'b'.repeat(64) }, { id: id(2), hash: 'c'.repeat(64) },
    ] })),
  };
  const templates = ['full_course', 'quant', 'verbal', 'di'].map((productCode, i) => ({
    id: id(10 + i), productCode, revision: 2,
    document: { title: 'PRIVATE-TARGET-TITLE', summary: '', durationDays: 7, events: [{
      key: id(20 + i), title: 'PRIVATE-EVENT', section: ['quant', 'quant', 'verbal', 'di'][i],
      kind: 'outline', dayOffset: null, localStartTime: null, durationMinutes: null, capacity: 8, instructor: '',
    }] },
  }));
  const proposal = { format: 'v2-content-mapping-proposal-1', source: inventory.source, bindings: [{
    source: { table: 'master_materials', id: id(1), rowHash: 'b'.repeat(64), schemaHash: 'a'.repeat(64) },
    target: { templateId: id(11), revision: 2, eventKey: id(21) },
  }] };
  return { inventory, templates, proposal };
}
const review = (f) => reviewContentMapping(f.inventory, f.templates, f.proposal);

test('prepares explicit scope for an undated outline without inventing live events or approval', () => {
  const f = fixture(); const original = JSON.stringify(f);
  const result = review(f);
  assert.equal(result.status, 'review_required');
  assert.deepEqual(result.products, ['quant']);
  assert.deepEqual(result.counts, { bindings: 1, sourceItems: 1, targetEvents: 1 });
  assert.equal(result.bindings[0].eventKind, 'outline');
  assert.equal(result.bindings[0].section, 'quant');
  assert.equal(result.unmappedSourceCount, 5);
  assert.equal(result.unboundTargetEventCount, 3);
  assert.match(result.reviewHash, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE-TARGET|PRIVATE-EVENT/);
  assert.equal(JSON.stringify(f), original);
});

test('shared content requires an explicit binding for each product; it never expands to all matching sections', () => {
  const f = fixture();
  assert.equal(review(f).bindings.length, 1);
  for (const template of [f.templates[0], f.templates[2], f.templates[3]]) {
    f.proposal.bindings.push({ source: { ...f.proposal.bindings[0].source }, target: {
      templateId: template.id, revision: template.revision, eventKey: template.document.events[0].key,
    } });
  }
  const result = review(f);
  assert.deepEqual(result.products, ['di', 'full_course', 'quant', 'verbal']);
  assert.deepEqual(result.counts, { bindings: 4, sourceItems: 1, targetEvents: 4 });
  assert.equal(result.unboundTargetEventCount, 0);
});

test('multiple distinct source items can be proposed for one event without conflating content IDs', () => {
  const f = fixture();
  f.proposal.bindings.push({ source: { ...f.proposal.bindings[0].source, table: 'materials' }, target: { ...f.proposal.bindings[0].target } });
  assert.deepEqual(review(f).counts, { bindings: 2, sourceItems: 2, targetEvents: 1 });
});

test('duplicate bindings and duplicate template IDs cannot silently multiply publication scope', () => {
  const f = fixture(); f.proposal.bindings.push(structuredClone(f.proposal.bindings[0]));
  assert.throws(() => review(f), /Invalid/);
  const g = fixture(); g.templates.push(structuredClone(g.templates[0]));
  assert.throws(() => review(g), /Invalid/);
});

test('changed, deleted or replaced source rows and schema drift invalidate the proposal', () => {
  for (const change of [
    (table) => { table.rows[0].hash = 'd'.repeat(64); },
    (table) => { table.rows.shift(); },
    (table) => { table.rows[0].id = id(999); },
    (table) => { table.schemaHash = 'e'.repeat(64); },
  ]) {
    const f = fixture(); change(f.inventory.tables.find((table) => table.name === 'master_materials'));
    assert.throws(() => review(f), /Invalid/);
  }
});

test('stale target revisions, deleted events and cross-template event IDs fail closed', () => {
  for (const mutate of [
    (f) => { f.proposal.bindings[0].target.revision = 1; },
    (f) => { f.templates[1].document.events = []; },
    (f) => { f.proposal.bindings[0].target.eventKey = id(22); },
    (f) => { f.proposal.bindings[0].target.templateId = id(999); },
  ]) {
    const f = fixture(); mutate(f); assert.throws(() => review(f), /Invalid/);
  }
});

test('actual template validation rejects a section outside its product and invalid live timing', () => {
  const f = fixture(); f.templates[1].document.events[0].section = 'verbal';
  assert.throws(() => review(f), /Invalid/);
  const g = fixture(); g.templates[1].document.events[0].kind = 'live';
  assert.throws(() => review(g), /Invalid/);
});

test('source labels, unsupported source tables, incomplete inventory and unexpected fields are rejected', () => {
  for (const mutate of [
    (f) => { f.proposal.source = 'another-project'; },
    (f) => { f.proposal.bindings[0].source.table = 'profiles'; },
    (f) => { f.inventory.tables.pop(); },
    (f) => { f.proposal.approved = true; },
    (f) => { f.proposal.bindings[0].target.allEvents = true; },
    (f) => { f.proposal.bindings[0].source.url = 'https://private.example.test'; },
    (f) => { f.proposal.bindings[0].source.rowHash = 'bad'; },
    (f) => { f.proposal.bindings = []; },
    (f) => { f.proposal.bindings[0].target.revision = 1.5; },
  ]) {
    const f = fixture(); mutate(f); assert.throws(() => review(f));
  }
});

test('review hash is stable across capture times, object keys, template ordering and binding ordering', () => {
  const f = fixture();
  f.proposal.bindings.push({ source: { ...f.proposal.bindings[0].source, id: id(2), rowHash: 'c'.repeat(64) }, target: { ...f.proposal.bindings[0].target } });
  const before = review(f);
  f.inventory.capturedAt = '2026-10-26T00:00:00Z';
  f.inventory.tables.reverse(); for (const table of f.inventory.tables) table.rows.reverse();
  f.templates.reverse(); f.proposal.bindings.reverse();
  f.proposal.bindings[0].target = Object.fromEntries(Object.entries(f.proposal.bindings[0].target).reverse());
  assert.equal(review(f).reviewHash, before.reviewHash);
});

test('review hash binds target contents and inventory data, even if supplied revisions are unchanged', () => {
  const f = fixture(); const before = review(f);
  f.templates[1].document.events[0].title = 'Updated target';
  assert.notEqual(review(f).reviewHash, before.reviewHash);
  const g = fixture(); g.inventory.tables[0].rows[0].hash = 'f'.repeat(64);
  assert.notEqual(review(g).reviewHash, before.reviewHash);
});

test('CLI reads only supplied local files and produces a review, never approval or mutation', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ace-mapping-review-'));
  try {
    const f = fixture();
    const paths = ['inventory', 'templates', 'proposal'].map((name) => {
      const path = join(directory, `${name}.json`); writeFileSync(path, JSON.stringify(f[name])); return path;
    });
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    const run = () => spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/v2-content-mapping.mjs', 'review', ...paths], { encoding: 'utf8', env });
    const result = run();
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).status, 'review_required');
    assert.equal(readFileSync(paths[2], 'utf8'), JSON.stringify(f.proposal));
    writeFileSync(paths[2], '{"PRIVATE-MAPPING-VALUE":');
    const bad = run(); assert.equal(bad.status, 2);
    assert.doesNotMatch(bad.stdout + bad.stderr, /PRIVATE-MAPPING-VALUE/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

function courseFixture() {
  const f=fixture();
  for (const template of f.templates) {
    template.document.sessions=template.document.events.map(event=>({
      key:event.key,title:event.title,section:event.section,
      content:{materials:[],recordings:[],preSessionReads:[],postSessionReads:[]},
    }));
    template.document.events=[]; template.document.durationDays=null;
  }
  f.proposal.format='v2-content-mapping-proposal-2';
  const binding=f.proposal.bindings[0];
  binding.target={templateId:binding.target.templateId,revision:2,sessionKey:id(21),contentKind:'preSessionReads'};
  return f;
}

test('current mapping targets undated course sessions and explicit content placement',()=>{
  const f=courseFixture(); const before=JSON.stringify(f);
  const result=review(f);
  assert.equal(result.format,'v2-content-mapping-review-2');
  assert.equal(result.bindings[0].targetKind,'course_session');
  assert.equal(result.bindings[0].target.contentKind,'preSessionReads');
  assert.deepEqual(result.counts,{bindings:1,sourceItems:1,targetSessions:1});
  assert.equal(result.unboundTargetSessionCount,3);
  assert.equal(JSON.stringify(f),before);
  const first=result.reviewHash;
  f.proposal.bindings[0].target.contentKind='postSessionReads';
  assert.notEqual(review(f).reviewHash,first);
});

test('shared session recording uses an explicit source reference for each destination',()=>{
  const f=courseFixture(); const binding=f.proposal.bindings[0];
  binding.source.table='master_sessions';binding.target.contentKind='recordings';
  f.proposal.bindings.push({source:{...binding.source},target:{...binding.target,templateId:id(10),sessionKey:id(20)}});
  assert.deepEqual(review(f).counts,{bindings:2,sourceItems:1,targetSessions:2});
  assert.deepEqual(review(f).products,['full_course','quant']);
  f.proposal.bindings[0].target.contentKind='preSessionReads';
  assert.throws(()=>review(f),/Invalid/);
});

test('course mapping rejects missing sessions, live-event targets, invalid placement and stale source evidence',()=>{
  for (const mutate of [
    f=>{f.templates[1].document.sessions=[];},
    f=>{f.proposal.bindings[0].target.sessionKey=id(22);},
    f=>{f.proposal.bindings[0].target.contentKind='live';},
    f=>{f.proposal.bindings[0].target.eventKey=id(21);},
    f=>{f.proposal.bindings[0].source.rowHash='e'.repeat(64);},
    f=>{f.proposal.bindings.push(structuredClone(f.proposal.bindings[0]));},
  ]) { const f=courseFixture();mutate(f);assert.throws(()=>review(f),/Invalid/); }
});
