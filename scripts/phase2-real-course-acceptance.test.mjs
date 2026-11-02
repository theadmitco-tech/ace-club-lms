import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import {PROJECT} from './phase1-hosted-closeout-config.mjs';
import {describeApprovedFullCourse,prepareRealCourseAttachment,canonicalCourseSessions} from './phase2-real-course-acceptance.mjs';
function fixture(){
  const a='123456781234123412341234567890ab',b='323456781234123412341234567890ab';
  const content={preSessionReads:Array.from({length:8},(_,i)=>({key:randomUUID(),title:`Reading ${i}`,url:`https://example.notion.site/ebd//${a}`})),
    recordings:Array.from({length:4},(_,i)=>({key:randomUUID(),title:`Recording ${i}`,url:'https://example.test/recording'})),
    postSessionReads:[],materials:Array.from({length:5},(_,i)=>({key:randomUUID(),title:`Worksheet ${i}`,url:`/api/materials/file?path=${encodeURIComponent(`worksheets/${randomUUID()}/${randomUUID()}.pdf`)}`}))};
  const sessions=[{key:randomUUID(),title:'Subject session',section:'quant',content},{key:randomUUID(),title:'Getting started',section:'programme',content:{preSessionReads:[],postSessionReads:[],recordings:[],materials:[0,1].map(i=>({key:randomUUID(),title:`Starter ${i}`,url:`https://example.notion.site/ebd//${b}`}))}}];
  const templateId=randomUUID(),batchId=randomUUID();
  const plan={format:'v2-content-transfer-plan-1',source:PROJECT,mappingReviewHash:'a'.repeat(64),drafts:[{templateId,productCode:'full_course',document:{sessions}}]};
  const state={status:'accounts-created-awaiting-sql',courses:[{batchId:randomUUID()}]};
  const report={project:PROJECT,documents:[{batchId,productCode:'full_course',state:'published',revision:2,batchRevision:1,sessions:sessions.map(({key,title,section})=>({section,title,key}))}]};
  return {plan,state,report,batchId};
}
test('real-course attachment pins the existing Full Course without creating or changing its data',()=>{
  const {plan,state,report,batchId}=fixture(),before=JSON.stringify({plan,state,report});
  const result=prepareRealCourseAttachment(state,batchId,report,plan);
  assert.equal(result.realFullCourseBatchId,batchId);assert.equal(result.realCourseReview.itemCount,19);assert.equal(result.realCourseReview.publicationRevision,2);
  assert.equal(JSON.stringify({plan,state,report}),before);
  const description=describeApprovedFullCourse(plan);assert.equal(description.resources.length,19);assert.equal(description.pdfs.length,5);assert.equal(description.readings.length,2);
});
test('attachment rejects post-setup states, unrelated offerings and altered session headings',()=>{
  const {plan,state,report,batchId}=fixture();
  for(const status of ['ready-for-verification','verification-running','cleaned'])assert.throws(()=>prepareRealCourseAttachment({...state,status},batchId,report,plan),/before SQL/);
  assert.throws(()=>prepareRealCourseAttachment(state,batchId,{...report,project:'production'},plan),/staging/);
  for(const patch of [{state:'unpublished'},{productCode:'quant'},{revision:0},{sessions:[]}])assert.throws(()=>prepareRealCourseAttachment(state,batchId,{...report,documents:[{...report.documents[0],...patch}]},plan));
  assert.throws(()=>prepareRealCourseAttachment(state,state.courses[0].batchId,report,plan),/existing/);
});
test('nineteen-item source validation and session comparison preserve references and order independent of JSON key ordering',()=>{
  const {plan}=fixture();const sessions=plan.drafts[0].document.sessions;
  const reordered=sessions.map(({key,title,section,content})=>({content:{materials:content.materials,postSessionReads:content.postSessionReads,preSessionReads:content.preSessionReads,recordings:content.recordings},section,title,key}));
  assert.equal(JSON.stringify(canonicalCourseSessions(sessions)),JSON.stringify(canonicalCourseSessions(reordered)));
  const changed=structuredClone(plan);changed.drafts[0].document.sessions[0].content.materials.pop();assert.throws(()=>describeApprovedFullCourse(changed),/nineteen/);
  const broken=structuredClone(plan);broken.drafts[0].document.sessions[1].content.materials.forEach(item=>{item.url='https://example.test/missing-reading';});assert.throws(()=>describeApprovedFullCourse(broken),/two unique/);
});
