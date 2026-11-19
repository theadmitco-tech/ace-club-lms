import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
import { withDisposablePostgres } from './helpers/disposable-postgres.mjs';
import { preparePhase3Database, as, json, literal } from './helpers/v2-phase3-fixture.mjs';
function load(file, dependencies={}) {
 const exports={};runInNewContext(ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{assert.ok(Object.hasOwn(dependencies,name),name);return dependencies[name];}});return exports;
}
const pages=load('src/lib/v2CourseReadmes.ts'),templates=load('src/lib/v2Templates.ts'),batches=load('src/lib/v2Batches.ts',{'./v2Templates':templates});
const order=load('src/lib/v2SessionOrder.ts',{'./v2Batches':batches,'./v2CourseReadmes':pages});
const deletion=load('src/lib/v2SessionDeletion.ts',{'./v2Batches':batches,'./v2CourseReadmes':pages});
const batchId=randomUUID(),normal=['First','Second'].map(title=>({key:randomUUID(),title,section:'quant',content:templates.emptyV2SessionContent()}));
const content=Object.fromEntries(Object.keys(templates.emptyV2SessionContent()).map(kind=>[kind,[{key:randomUUID(),title:'README '+kind,url:'https://example.test/'+kind}]]));
const sessions=pages.updateCourseReadme(batchId,'quant',normal,'before',content);
const draft={id:batchId,productCode:'quant',sessions,events:[],templateId:randomUUID(),templateRevision:1,revision:1,title:'Course',startDate:'',timeZone:'Asia/Kolkata'};
test('Both README pages have stable identity and the complete resource structure',()=>{
 assert.equal(sessions.length,4);assert.equal(sessions[0].title,'Read before the course');assert.equal(sessions.at(-1).title,'Read after the course');assert.equal(sessions[0].content,content);assert.equal(normal.length,2);assert.equal(pages.withCourseReadmes(batchId,'quant',sessions).length,4);assert.equal(pages.validateCourseReadmes(batchId,sessions),null);
});
test('Only teaching sessions reorder and README resources remain intact',()=>{
 const input=order.reorderedSessionInput(draft,normal.map(s=>s.key),normal.map(s=>s.key).reverse(),randomUUID());assert.equal(input.sessions[0],sessions[0]);assert.equal(input.sessions.at(-1),sessions.at(-1));assert.equal(input.sessions[1],normal[1]);assert.equal(batches.validateV2BatchInput(input),null);
 assert.throws(()=>deletion.deletedSessionInput(draft,sessions.map(s=>s.key),sessions[0].key,randomUUID()),/permanent/);
 const input2=deletion.deletedResourceInput(draft,sessions.map(s=>s.key),sessions[0].key,{kind:'materials',key:content.materials[0].key},randomUUID());assert.equal(input2.sessions.length,4);assert.equal(input2.sessions[0].content.materials.length,0);
});
test('Server authoring rejects missing, renamed and moved fixed pages before a mutation RPC',async()=>{
 const calls=[];const api=load('src/lib/server/v2Batches.ts',{'server-only':{},'@/lib/v2Templates':templates,'@/lib/v2CourseReadmes':pages,'@/lib/v2Batches':batches,'@/lib/server/v2BatchFeature':{isV2BatchAuthoringEnabled:()=>true},'@/lib/server/portalAuthorization':{getPortalIdentity:async()=>({role:'admin'})},'@/utils/supabase/server':{createClient:async()=>({rpc:async name=>{calls.push(name);return {data:[{...draft,state:'draft'}],error:null};}})}});
 for(const changed of [normal,[...sessions.slice(1),sessions[0]],[{...sessions[0],title:'Renamed'},...sessions.slice(1)]]){
  const input={id:batchId,templateId:draft.templateId,templateRevision:1,expectedRevision:1,requestId:randomUUID(),title:'Course',startDate:'',timeZone:'Asia/Kolkata',events:[],sessions:changed};
  const preview=await api.previewV2BatchDraft(input),saved=await api.saveV2BatchDraft(input,'a'.repeat(32));assert.equal(preview.status,'error');assert.match(preview.message,/README/);assert.equal(saved.status,'error');
 }
 assert.ok(calls.every(name=>name==='list_v2_batch_drafts'));
});
test('Published README pages deliver every resource category and retain original teaching content', {timeout:120000},()=>withDisposablePostgres(async db=>{
 const f=preparePhase3Database(db),b=f.batch();f.publish(b);
 const rpc=sql=>JSON.parse(db.query(as(f.admin,sql)));
 const current=rpc('select public.list_v2_batch_drafts()').find(d=>d.id===b.id);
 const next=pages.updateCourseReadme(b.id,'quant',pages.updateCourseReadme(b.id,'quant',current.sessions,'before',content),'after',content);
 const input={id:b.id,templateId:b.templateId,templateRevision:1,expectedRevision:1,requestId:randomUUID(),title:current.title,startDate:current.startDate,timeZone:current.timeZone,events:batches.editableV2BatchEvents(current.events),sessions:next};
 const preview=rpc(`select public.preview_v2_batch_draft(${json(input)})`);rpc(`select public.save_v2_batch_draft(${json(input)},${literal(preview.fingerprint)})`);
 const pub={batchId:b.id,batchRevision:2,expectedRevision:1,requestId:randomUUID(),action:'publish'};const scope=rpc(`select public.preview_v2_batch_publication(${json(pub)})`);rpc(`select public.save_v2_batch_publication(${json(pub)},${literal(scope.fingerprint)})`);
 const workspace=rpc('select public.list_v2_content_workspace()'),published=workspace.courses.find(c=>c.batchId===b.id).anchors;
 assert.equal(published.length,3);assert.deepEqual(published[1],current.sessions[0]);for(const page of [published[0],published.at(-1)])for(const kind of Object.keys(content))assert.deepEqual(page.content[kind],content[kind]);
 const historical=JSON.parse(db.query(`select document from public.v2_course_batch_revisions where batch_id='${b.id}' and revision=1`));assert.deepEqual(historical.sessions,current.sessions);
}));
