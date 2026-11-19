import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';
import { preparePhase3Database, as, json, literal } from './helpers/v2-phase3-fixture.mjs';

function load(file, deps = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => { assert.ok(Object.hasOwn(deps, name)); return deps[name]; } });
  return exports;
}
const templates = load('src/lib/v2Templates.ts');
const batches = load('src/lib/v2Batches.ts', { './v2Templates': templates });
const { deletedSessionInput } = load('src/lib/v2SessionDeletion.ts', { './v2Batches': batches, './v2CourseReadmes': load('src/lib/v2CourseReadmes.ts') });
const draft = { id:randomUUID(), templateId:randomUUID(), templateRevision:1, revision:3, productCode:'quant', title:'Synthetic course', startDate:'', timeZone:'Asia/Kolkata', events:[],
  sessions:['First','Second'].map(title=>({key:randomUUID(),title,section:'quant',content:templates.emptyV2SessionContent()})) };
test('Deletion preserves other session identities, source revision and input snapshot', () => {
  const keys=draft.sessions.map(s=>s.key), requestId=randomUUID();
  const input=deletedSessionInput(draft,keys,keys[0],requestId);
  assert.equal(input.sessions[0],draft.sessions[1]);assert.equal(input.expectedRevision,3);assert.equal(input.requestId,requestId);
  assert.equal(draft.sessions.length,2);assert.equal(batches.validateV2BatchInput(input),null);
  const last={...draft,sessions:[draft.sessions[0]]};
  assert.equal(batches.validateV2BatchInput(deletedSessionInput(last,[keys[0]],keys[0],randomUUID())),null);
});
test('Deletion rejects stale, duplicate, absent and foreign session selections', () => {
  const keys=draft.sessions.map(s=>s.key);
  for(const original of [keys.slice().reverse(),keys.slice(0,1),[keys[0],keys[0]]]) assert.throws(()=>deletedSessionInput(draft,original,keys[0],randomUUID()),/changed/);
  assert.throws(()=>deletedSessionInput(draft,keys,randomUUID(),randomUUID()),/changed/);
  assert.throws(()=>deletedSessionInput({...draft,productCode:'full_course'},keys,keys[0],randomUUID()),/changed/);
});
test('Session deletion requires publication, preserves historical revisions and denies Student writes', {timeout:120000}, () => withDisposablePostgres(async db => {
  const f=preparePhase3Database(db), b=f.batch('quant',true);
  db.apply('20261120100000_add_v2_live_class_editing.sql');
  const readDraft=()=>JSON.parse(db.query(`select document from public.v2_course_batch_revisions where batch_id='${b.id}' order by revision desc limit 1`));
  const previews=new Map();
  const save=input=>{
    const preview=previews.get(input.requestId)??JSON.parse(db.query(as(f.admin,`select public.preview_v2_batch_draft(${json(input)})`)));
    previews.set(input.requestId,preview);
    return JSON.parse(db.query(as(f.admin,`select public.save_v2_batch_draft(${json(input)},${literal(preview.fingerprint)})`)));
  };
  const publish=(batchRevision,expectedRevision)=>{
    const input={batchId:b.id,batchRevision,expectedRevision,requestId:randomUUID(),action:'publish'};
    const preview=JSON.parse(db.query(as(f.admin,`select public.preview_v2_batch_publication(${json(input)})`)));
    db.query(as(f.admin,`select public.save_v2_batch_publication(${json(input)},${literal(preview.fingerprint)})`));
  };
  const first=readDraft(), second={...first.sessions[0],key:randomUUID(),title:'Retained session',content:templates.emptyV2SessionContent()};
  save({id:first.id,templateId:first.templateId,templateRevision:first.templateRevision,expectedRevision:1,requestId:randomUUID(),title:first.title,startDate:first.startDate,timeZone:first.timeZone,events:batches.editableV2BatchEvents(first.events),sessions:[...first.sessions,second]});
  publish(2,0);
  const before=readDraft(), input=deletedSessionInput(before,before.sessions.map(s=>s.key),b.sessionKey,randomUUID());
  const student=randomUUID();db.query(`insert into auth.users(id,email) values('${student}','session-deletion@example.invalid');update public.profiles set role='student',is_active=true where id='${student}'`);
  db.rejects(as(student,`select public.preview_v2_batch_draft(${json(input)})`),/Admin|admin|denied/);
  save(input);save(input);
  assert.equal(db.query(`select jsonb_array_length(document->'sessions') from public.v2_batch_publication_revisions where batch_id='${b.id}' order by revision desc limit 1`),'2');
  assert.equal(db.query(`select count(*) from public.v2_course_batch_revisions where batch_id='${b.id}' and revision=3`),'1');
  publish(3,1);
  const published=JSON.parse(db.query(`select document from public.v2_batch_publication_revisions where batch_id='${b.id}' order by revision desc limit 1`));
  assert.deepEqual(published.sessions.map(s=>s.key),[second.key]);
  assert.deepEqual(readDraft().events,before.events);
  assert.deepEqual(JSON.parse(db.query(`select document from public.v2_course_batch_revisions where batch_id='${b.id}' and revision=2`)),before);
  assert.equal(db.query(`select count(*) from public.v2_course_template_revisions where template_id='${b.templateId}'`),'1');
  const stale={...input,requestId:randomUUID()};db.rejects(as(f.admin,`select public.preview_v2_batch_draft(${json(stale)})`),/revision|changed/i);
}));
