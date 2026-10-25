import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const load=(path,deps={},context={}) => {
  const exports={};
  const code=ts.transpileModule(readFileSync(new URL(`../${path}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  runInNewContext(code,{exports,require:(name)=>{assert(Object.hasOwn(deps,name),name);return deps[name];},...context}); return exports;
};
const templates=load('src/lib/v2Templates.ts'), products=load('src/lib/v2Products.ts');
const batches=load('src/lib/v2Batches.ts',{'./v2Templates':templates});
const meetings=load('src/lib/v2Meetings.ts',{'./v2Batches':batches});
const publication=load('src/lib/v2Publications.ts',{'./v2Templates':templates,'./v2Products':products,'./v2Meetings':meetings});
const enrollment=load('src/lib/v2Enrollments.ts',{'./v2Meetings':meetings});
const batchId=randomUUID(),studentId=randomUUID();
const schedule={batchId,batchRevision:1,revision:1,state:'published',productCode:'quant_crash',title:'Synthetic batch',sections:['quant'],timeZone:'Asia/Kolkata',liveRegistrationLimit:null,events:[]};
function harness(role='student') {
  const state={role,enabled:true,calls:[],clients:0,result:{data:[],error:null},fault:''};
  const deps={'server-only':{},'@/lib/v2Publications':publication,'@/lib/v2Enrollments':enrollment,'@/lib/v2Meetings':meetings,
    '@/lib/server/v2StudentScheduleFeature':{isV2StudentScheduleEnabled:()=>state.enabled},
    '@/lib/server/portalAuthorization':{getPortalIdentity:async()=>{if(state.fault==='auth')throw Error('private');return state.role?{id:studentId,role:state.role}:null;}},
    '@/utils/supabase/server':{createClient:async()=>{state.clients++;if(state.fault==='client')throw Error('private');return {rpc:async(...args)=>{state.calls.push(args);if(state.fault==='rpc')throw Error('private');return state.result;}};}}};
  return {state,reader:load('src/lib/server/v2StudentSchedules.ts',deps),admin:load('src/lib/server/v2Enrollments.ts',deps)};
}
test('reader guards disabled, Admin and signed-out callers before data access',async()=>{
  for(const patch of [{enabled:false},{role:'admin'},{role:null}]){const h=harness();Object.assign(h.state,patch);assert.equal((await h.reader.getMyV2BatchSchedules()).status,'unavailable');assert.equal(h.state.clients,0);}
});
test('reader derives identity from database session, accepts empty results and does not cache results',async()=>{
  const h=harness();assert.equal((await h.reader.getMyV2BatchSchedules()).status,'ready');
  h.state.result.data=[schedule];assert.equal((await h.reader.getMyV2BatchSchedules()).schedules[0].batchId,batchId);
  h.state.result.data=[];assert.equal((await h.reader.getMyV2BatchSchedules()).schedules.length,0);
  assert.equal(h.state.calls.length,3); for(const call of h.state.calls)assert.deepEqual(call,['get_my_v2_batch_schedules']);
});
test('reader rejects malformed, duplicate, unpublished and private payloads',async()=>{
  for(const data of [null,{},[schedule,schedule],[{...schedule,state:'unpublished'}],[{...schedule,url:'private'}],[{...schedule,sections:['di']}],[{...schedule,events:[{url:'private'}]}]]){
    const h=harness();h.state.result.data=data;assert.equal((await h.reader.getMyV2BatchSchedules()).status,'unavailable');
  }
});
test('reader transport and provider failures remain controlled and reveal no diagnostics',async()=>{
  for(const fault of ['auth','client','rpc','provider']){const h=harness();h.state.fault=fault;if(fault==='provider')h.state.result={data:[schedule],error:{message:'private'}};
    const result=await h.reader.getMyV2BatchSchedules();assert.equal(result.status,'unavailable');assert.doesNotMatch(JSON.stringify(result),/private/);}
});
test('enrollment adapters require Admin and reject malformed inputs before RPC',async()=>{
  const input={batchId,studentId,active:true,expectedRevision:0};
  for(const role of ['student',null]){const h=harness(role);assert.equal((await h.admin.listV2EnrollmentOptions(batchId)).status,'unavailable');assert.equal((await h.admin.setV2Enrollment(input)).status,'error');assert.equal(h.state.clients,0);}
  const h=harness('admin');for(const value of [null,{}, {...input,active:'true'},{...input,expectedRevision:-1},{...input,actorId:randomUUID()}])assert.equal((await h.admin.setV2Enrollment(value)).status,'error');
  await h.admin.listV2EnrollmentOptions('invalid');assert.equal(h.state.clients,0);
  h.state.enabled=false;await h.admin.listV2EnrollmentOptions(batchId);await h.admin.setV2Enrollment(input);assert.equal(h.state.clients,0);
});
test('enrollment roster rejects private or duplicate rows',async()=>{
  const h=harness('admin'), row={studentId,name:'Student',active:true,eligible:true,revision:1};
  h.state.result.data=[row];assert.equal((await h.admin.listV2EnrollmentOptions(batchId)).status,'ready');
  for(const data of [[row,row],[{...row,email:'private'}],[{...row,revision:0}],[{...row,eligible:'yes'}],null]){h.state.result.data=data;assert.equal((await h.admin.listV2EnrollmentOptions(batchId)).status,'unavailable');}
});
test('enrollment confirmations must match the requested identity, state and revision',async()=>{
  const h=harness('admin'),input={batchId,studentId,active:true,expectedRevision:0},receipt={batchId,studentId,active:true,revision:1};
  h.state.result.data=receipt;assert.equal((await h.admin.setV2Enrollment(input)).status,'success');
  for(const patch of [{studentId:randomUUID()},{batchId:randomUUID()},{active:false},{revision:2},{private:'secret'}]){h.state.result.data={...receipt,...patch};assert.equal((await h.admin.setV2Enrollment(input)).status,'error');}
  for(const fault of ['auth','client','rpc']){h.state.fault=fault;const result=await h.admin.setV2Enrollment(input);assert.equal(result.status,'error');assert.doesNotMatch(JSON.stringify(result),/private/);}
});
test('Student schedule flag is off by default and cannot bypass authoring or Production gates',()=>{
  for(const [env,batchEnabled,expected] of [[{},true,false],[{V2_STUDENT_SCHEDULE_ENABLED:'true'},true,true],[{V2_STUDENT_SCHEDULE_ENABLED:'true'},false,false]]){
    const api=load('src/lib/server/v2StudentScheduleFeature.ts',{'server-only':{},'./v2BatchFeature':{isV2BatchAuthoringEnabled:()=>batchEnabled}},{process:{env}});
    assert.equal(api.isV2StudentScheduleEnabled(),expected);
  }
  const feature=load('src/lib/server/v2TemplateFeature.ts',{'server-only':{}},{process:{env:{V2_TEMPLATE_AUTHORING_ENABLED:'true',VERCEL_ENV:'production'}}});
  assert.equal(feature.isV2TemplateAuthoringEnabled(),false);
});

test('Student schedule route hides when disabled and authorizes before loading',async()=>{
  let enabled=false,deny=false;const calls=[];
  const page=load('src/app/schedule/v2/page.tsx',{
    'react/jsx-runtime':{jsx:()=>({}),jsxs:()=>({})},'next/link':{},'next/navigation':{notFound:()=>{throw Error('Not found');}},
    '@/components/student/StudentHeader':{},'../../dashboard/dashboard.css':{},'@/lib/v2Templates':templates,
    '@/lib/server/v2StudentScheduleFeature':{isV2StudentScheduleEnabled:()=>enabled},
    '@/lib/server/portalAuthorization':{requirePortalRole:async(role)=>{calls.push(role);if(deny)throw Error('Denied');}},
    '@/lib/server/v2StudentSchedules':{getMyV2BatchSchedules:async()=>{calls.push('read');return {status:'ready',schedules:[]};}},
  });
  await assert.rejects(page.default(),/Not found/);assert.equal(calls.length,0);
  enabled=true;deny=true;await assert.rejects(page.default(),/Denied/);assert.deepEqual(calls,['student']);
  calls.length=0;deny=false;await page.default();assert.deepEqual(calls,['student','read']);
});
test('enrollment action delegates authorization and refreshes views only after confirmed writes',async()=>{
  let status='error';const calls=[];
  const action=load('src/app/admin/v2/batches/[batchId]/students/actions.ts',{
    'next/cache':{revalidatePath:(...args)=>calls.push(args)},
    '@/lib/server/v2Enrollments':{setV2Enrollment:async(input)=>{assert.equal(input,studentId);return {status};}},
  });
  await action.setEnrollmentAction(studentId);assert.equal(calls.length,0);
  status='success';await action.setEnrollmentAction(studentId);assert.deepEqual(calls,[['/admin/v2/batches','layout'],['/schedule/v2']]);
});
