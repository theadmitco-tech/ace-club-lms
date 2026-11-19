import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const exports = {};
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/adminResourceRows.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
const { resourceRows, resourceOrderDocuments } = exports;
const target = {batchId:'course',sessionKey:'session',publicationRevision:1,placement:'session',anchorKey:null,replaceKey:null,order:100};
const original = {key:'original',title:'Original',url:'https://example.test/original'};
const session={key:'session',content:{postSessionReads:[original]}};
const course={batchId:'course',publicationRevision:1,sessions:[session],anchors:[session]};
const item=(id,order,extra={})=>({id,deleted:false,visible:true,draft_revision:1,published_revision:1,document:{title:id,kind:'postSessionReads',url:'https://example.test/'+id,targets:[{...target,order}, {...target,sessionKey:'elsewhere',order:987}]},...extra});
test('Browser rows use saved placement order instead of draft creation order',()=>{
 const workspace={courses:[course],items:[item('last',300),item('first',0)]};
 assert.equal(resourceRows(workspace,course,session,'postSessionReads').map(r=>r.title).join(','),'first,Original,last');
});
test('Reordering preserves source documents and placements in other sessions',()=>{
 const workspace={courses:[course],items:[item('second',200),item('first',100)]};
 const rows=resourceRows(workspace,course,session,'postSessionReads');const snapshot=JSON.stringify(workspace);
 const changes=resourceOrderDocuments([...rows].reverse(),'postSessionReads');
 assert.ok(changes.length>0);assert.equal(JSON.stringify(workspace),snapshot);
 for(const change of changes.filter(c=>c.row.item)) assert.equal(change.document.targets[1].order,987);
 const positions=changes.map(c=>c.document.targets[0].order);assert.ok(positions.every(Number.isInteger));assert.equal(new Set(positions).size,positions.length);
});
test('Deleted original replacements stay hidden according to the published course',()=>{
 const hidden={...course,anchors:[{...session,content:{postSessionReads:[]}}]};
 assert.equal(resourceRows({courses:[hidden],items:[item('replacement',100,{deleted:true})]},hidden,session,'postSessionReads').length,0);
});
test('Existing unpublished content edits cannot be silently published by reordering',()=>{
 const workspace={courses:[course],items:[item('edited',300,{draft_revision:2})]};
 assert.throws(()=>resourceOrderDocuments(resourceRows(workspace,course,session,'postSessionReads'),'postSessionReads'),/unpublished edits/);
});
test('New original wrappers retain exact source identity and URL',()=>{
 const rows=resourceRows({courses:[course],items:[item('managed',0)]},course,session,'postSessionReads');
 const changes=resourceOrderDocuments(rows,'postSessionReads');const originalChange=changes.find(c=>!c.row.item);
 assert.equal(originalChange.document.targets[0].replaceKey,'original');assert.equal(originalChange.document.url,original.url);
});

test('Database publication composes the dragged order and deletion hides replacements without changing source revisions', {timeout:120000}, async()=>{
 const {withDisposablePostgres}=await import('./helpers/disposable-postgres.mjs');
 const {preparePhase3Database,as,json,literal}=await import('./helpers/v2-phase3-fixture.mjs');
 const {randomUUID}=await import('node:crypto');
 await withDisposablePostgres(async db=>{
  const f=preparePhase3Database(db), b=f.batch();f.publish(b);
  const call=(sql)=>JSON.parse(db.query(as(f.admin,sql)));
  const workspace=()=>call('select public.list_v2_content_workspace()');
  const source=db.query('select md5(jsonb_agg(to_jsonb(r) order by batch_id,revision)::text) from public.v2_course_batch_revisions r');
  const target={batchId:b.id,sessionKey:b.sessionKey,publicationRevision:1,placement:'session',anchorKey:null,replaceKey:null,order:200};
  const id=randomUUID();
  call(`select public.save_v2_content_item('${id}',0,'${randomUUID()}',${json({title:'Second material',kind:'materials',url:'https://example.test/second',targets:[target]})})`);
  const publish=(id,revision,action='publish')=>{
   const scope=call(`select public.v2_content_scope('${id}',${revision},'${action}')`);
   call(`select public.publish_v2_content_item('${id}',${revision},'${action}','${randomUUID()}','${scope.fingerprint}')`);
  };
  publish(id,1);
  let w=workspace(),c=w.courses.find(c=>c.batchId===b.id),s=c.sessions[0];
  const changes=resourceOrderDocuments(resourceRows(w,c,s,'materials').reverse(),'materials');
  const plans=changes.map(change=>({...change,id:change.row.item?.id??randomUUID(),revision:(change.row.item?.draft_revision??0)+1}));
  for(const change of plans) call(`select public.save_v2_content_item('${change.id}',${change.revision-1},'${randomUUID()}',${json(change.document)})`);
  assert.equal(workspace().courses.find(c=>c.batchId===b.id).anchors[0].content.materials[0].title,'Protected resource');
  const stale=call(`select public.v2_content_scope('${plans[1].id}',${plans[1].revision},'publish')`);
  publish(plans[0].id,plans[0].revision);
  db.rejects(as(f.admin,`select public.publish_v2_content_item('${plans[1].id}',${plans[1].revision},'publish','${randomUUID()}',${literal(stale.fingerprint)})`),/Scope changed/);
  publish(plans[1].id,plans[1].revision);
  w=workspace();c=w.courses.find(c=>c.batchId===b.id);
  assert.equal(c.anchors[0].content.materials.map(r=>r.title).join(','),'Second material,Protected resource');
  const replacement=plans.find(p=>!p.row.item);publish(replacement.id,replacement.revision,'delete');
  w=workspace();c=w.courses.find(c=>c.batchId===b.id);
  assert.equal(resourceRows(w,c,c.sessions[0],'materials').length,1);
  assert.equal(c.anchors[0].content.materials.length,1);
  assert.equal(db.query('select md5(jsonb_agg(to_jsonb(r) order by batch_id,revision)::text) from public.v2_course_batch_revisions r'),source);
 });
});
