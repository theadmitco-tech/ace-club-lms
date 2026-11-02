import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const load=(path,deps={},context={})=>{
  const exports={};
  const code=ts.transpileModule(readFileSync(new URL(`../${path}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  runInNewContext(code,{exports,require:(name)=>{assert(Object.hasOwn(deps,name),name);return deps[name];},...context});return exports;
};
const templates=load('src/lib/v2Templates.ts'),batches=load('src/lib/v2Batches.ts',{'./v2Templates':templates});
const meetings=load('src/lib/v2Meetings.ts',{'./v2Batches':batches}),enrollments=load('src/lib/v2Enrollments.ts',{'./v2Meetings':meetings});
const contracts=load('src/lib/v2StudentDelivery.ts',{'./v2Meetings':meetings,'./v2Templates':templates});
const batchId=randomUUID(),studentId=randomUUID(),eventKey=randomUUID();
const content={materials:[],recordings:[],preSessionReads:[],postSessionReads:[]};
const course={batchId,publicationRevision:2,batchRevision:1,title:'Published course',productCode:'quant',sessions:[{key:randomUUID(),title:'Exact title',section:'quant',content}]};
const meeting={batchId,eventKey,url:'https://meet.google.com/abc-defg-hij',publicationRevision:2};
const registration={batchId,studentId,active:true,expectedRevision:0};
function harness(role='student') {
  const state={role,enabled:true,calls:[],clients:0,result:{data:null,error:null},fault:''};
  const api=load('src/lib/server/v2StudentDelivery.ts',{'./v2LearningFeature':{isV2LearningEnabled:()=>false},'server-only':{},'@/lib/v2StudentDelivery':contracts,'@/lib/v2Meetings':meetings,'@/lib/v2Enrollments':enrollments,
    '@/lib/server/v2StudentScheduleFeature':{isV2StudentScheduleEnabled:()=>state.enabled},
    '@/lib/server/portalAuthorization':{getPortalIdentity:async()=>{if(state.fault==='auth')throw Error('secret');return state.role?{role:state.role,id:studentId}:null;}},
    '@/utils/supabase/server':{createClient:async()=>{state.clients++;if(state.fault==='client')throw Error('secret');return {rpc:async(...args)=>{state.calls.push(args);if(state.fault==='rpc')throw Error('secret');return state.result;}};}}});
  return {state,api};
}
test('published course contract rejects wrong section, unsafe URL, duplicates and extra private fields',()=>{
  assert.equal(contracts.isV2PublishedCourse(course),true);
  for(const data of [null,{}, {...course,private:'secret'},{...course,batchRevision:0},{...course,sessions:[course.sessions[0],course.sessions[0]]},
    {...course,sessions:[{...course.sessions[0],section:'di'}]},
    {...course,sessions:[{...course.sessions[0],content:{...content,recordings:[{key:randomUUID(),title:'Recording',url:'javascript:alert(1)'}]}}]}]) assert.equal(contracts.isV2PublishedCourse(data),false);
});
test('private meeting contract rejects off-site URLs, credentials, unrelated event and metadata',()=>{
  assert.equal(contracts.isV2MeetingDelivery(meeting,batchId,eventKey),true);
  for(const patch of [{url:'https://meet.google.com.evil.test/abc-defg-hij'},{url:'https://user:secret@meet.google.com/abc-defg-hij'},{url:'https://meet.google.com/abc-defg-hij?secret=yes'},{eventKey:randomUUID()},{batchId:randomUUID()},{actor_id:studentId}]) assert.equal(contracts.isV2MeetingDelivery({...meeting,...patch},batchId,eventKey),false);
});
test('Student delivery authenticates and checks feature/identifier before provider access',async()=>{
  for(const patch of [{enabled:false},{role:'admin'},{role:null}]) {
    const h=harness();Object.assign(h.state,patch);assert.equal(await h.api.getMyV2PublishedCourse(batchId),null);assert.equal(await h.api.getMyV2Meeting(batchId,eventKey),null);assert.equal(h.state.clients,0);
  }
  const h=harness();assert.equal(await h.api.getMyV2PublishedCourse('invalid'),null);assert.equal(await h.api.getMyV2Meeting(batchId,'invalid'),null);assert.equal(h.state.clients,0);
});
test('delivery uses caller session and validates identity on every uncached response',async()=>{
  const h=harness();h.state.result.data=course;assert.equal((await h.api.getMyV2PublishedCourse(batchId)).title,course.title);
  h.state.result.data=null;assert.equal(await h.api.getMyV2PublishedCourse(batchId),null);
  h.state.result.data={...course,batchId:randomUUID()};assert.equal(await h.api.getMyV2PublishedCourse(batchId),null);
  h.state.result.data=meeting;assert.equal((await h.api.getMyV2Meeting(batchId,eventKey)).url,meeting.url);
  assert.equal(h.state.calls.length,4);assert.deepEqual(JSON.parse(JSON.stringify(h.state.calls[0])),['get_my_v2_published_course',{p_batch_id:batchId}]);
  assert.deepEqual(JSON.parse(JSON.stringify(h.state.calls[3])),['get_my_v2_meeting',{p_batch_id:batchId,p_event_key:eventKey}]);
});
test('delivery failures expose neither provider errors nor previous successful data',async()=>{
  for(const fault of ['auth','client','rpc','provider']) {
    const h=harness();h.state.fault=fault;h.state.result={data:meeting,error:fault==='provider'?{message:'secret'}:null};
    assert.equal(await h.api.getMyV2Meeting(batchId,eventKey),null);assert.equal(await h.api.getMyV2PublishedCourse(batchId),null);
  }
});
test('live operations require Admin and exact registration revisions',async()=>{
  for(const role of ['student',null]) {
    const h=harness(role);assert.equal(await h.api.readV2LiveOperations(batchId),null);assert.equal((await h.api.setV2LiveRegistration(registration)).status,'error');
    assert.equal((await h.api.completeV2LiveClass({batchId,eventKey,publicationRevision:2})).status,'error');assert.equal(h.state.clients,0);
  }
  const h=harness('admin');h.state.result.data={batchId,studentId,active:true,revision:1};assert.equal((await h.api.setV2LiveRegistration(registration)).status,'success');
  for(const patch of [{revision:0},{studentId:randomUUID()},{active:false},{private:'secret'}]) {h.state.result.data={batchId,studentId,active:true,revision:1,...patch};assert.equal((await h.api.setV2LiveRegistration(registration)).status,'error');}
});
test('class completion requires matching validated receipt; transport failures remain errors',async()=>{
  const h=harness('admin'),input={batchId,eventKey,publicationRevision:2};
  h.state.result.data={eventKey,completedAt:'2026-11-02T12:00:00Z',replayed:false};assert.equal((await h.api.completeV2LiveClass(input)).status,'success');
  h.state.result.data={eventKey:randomUUID(),completedAt:'2026-11-02T12:00:00Z',replayed:false};assert.equal((await h.api.completeV2LiveClass(input)).status,'error');
  h.state.result.data={eventKey,completedAt:'invalid',replayed:false};assert.equal((await h.api.completeV2LiveClass(input)).status,'error');
  for(const fault of ['auth','client','rpc']) {h.state.fault=fault;assert.equal((await h.api.completeV2LiveClass(input)).status,'error');}
});
test('Notion delivery rejects an unrelated reading before external fetch and disables shared caching',async()=>{
  const pageId='a'.repeat(32),requested=new URL(`https://example.test/api/v2/course-reading?batchId=${batchId}&pageId=${pageId}`);
  let current=course,fetched=0,validContent=true;
  const api=load('src/app/api/v2/course-reading/route.ts',{'next/server':{NextResponse:{json:(body,options)=>({body,...options})}},
    'notion-client':{NotionAPI:class {async getPage(){fetched++;return {};}}},
    '@/lib/server/v2LearningFeature':{isV2LearningEnabled:()=>false},'@/lib/v2Meetings':meetings,
    '@/lib/server/v2StudentDelivery':{getMyV2PublishedCourse:async()=>current},
    '@/lib/v2ReadingPreview':{v2ReadingPageId:(url)=>url.endsWith(pageId)?pageId:null,hasV2ReadingContent:()=>validContent}});
  let result=await api.GET({nextUrl:requested});assert.equal(result.status,404);assert.equal(fetched,0);
  current={...course,sessions:[{...course.sessions[0],content:{...content,preSessionReads:[{key:randomUUID(),title:'Published reading',url:`https://notion.so/${pageId}`}]}}]};
  result=await api.GET({nextUrl:requested});assert.equal(fetched,1);assert.equal(result.headers['Cache-Control'],'private, no-store');assert.equal(result.headers.Vary,'Cookie');
  current={...course,sessions:[{...course.sessions[0],content:{...content,materials:[{key:randomUUID(),title:'Published starter reading',url:`https://notion.so/ebd//${pageId}`}]}}]};
  result=await api.GET({nextUrl:requested});assert.equal(fetched,2);assert.equal(result.headers['Cache-Control'],'private, no-store');
  validContent=false;result=await api.GET({nextUrl:requested});assert.equal(result.status,422);assert.equal(fetched,3);
  current=null;result=await api.GET({nextUrl:requested});assert.equal(result.status,404);assert.equal(fetched,3);
});
test('meeting redirect rechecks current access and never redirects denied callers',async()=>{
  let current=null;
  const api=load('src/app/api/v2/meeting/route.ts',{'next/server':{NextResponse:class {constructor(body,options){Object.assign(this,{body,...options});}static json(body,options){return {body,...options};}}},
    '@/lib/server/v2StudentDelivery':{getMyV2Meeting:async()=>current}});
  const request={nextUrl:new URL(`https://example.test/api/v2/meeting?batchId=${batchId}&eventKey=${eventKey}`)};
  assert.equal((await api.GET(request)).status,404);current=meeting;
  const result=await api.GET(request);assert.equal(result.status,303);assert.equal(result.headers.Location,meeting.url);assert.equal(result.headers['Referrer-Policy'],'no-referrer');
  current=null;assert.equal((await api.GET(request)).status,404);
});
