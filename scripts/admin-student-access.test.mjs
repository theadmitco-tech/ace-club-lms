import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
const source=readFileSync(new URL('../src/lib/server/adminStudentAccess.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const student='10000000-0000-4000-8000-000000000001';
function fixture({enabled=true,denied=false,error=false}={}) {
 const calls=[],exports={};
 const dependencies={
  'server-only':{},
  './v2ContentPublishing':{isV2ContentPublishingEnabled:()=>enabled},
  '@/lib/v2Meetings':{isV2MeetingBatchId:value=>value===student},
  './portalAuthorization':{requirePortalRole:async role=>{calls.push(['role',role]);if(denied)throw new Error('Forbidden');}},
  './v2Batches':{listV2BatchDrafts:async()=>({status:'ready',drafts:[]})},
  '@/utils/supabase/server':{createClient:async()=>{calls.push(['client']);return {from:table=>{
   const query={};for(const method of ['select','eq','order','range','limit','maybeSingle'])query[method]=(...args)=>{calls.push([table,method,...args]);return query;};
   query.then=(resolve,reject)=>Promise.resolve({data:error?null:[],error:error?{message:'Synthetic failure'}:null}).then(resolve,reject);return query;
  }};}},
 };
 runInNewContext(compiled,{exports,require:name=>{assert.ok(Object.hasOwn(dependencies,name));return dependencies[name];}});
 return {read:exports.readAdminStudentAccess,calls};
}
test('disabled workspace and invalid Student identity stop before database access',async()=>{
 for(const [options,id] of [[{enabled:false},student],[{},'invalid']]){const f=fixture(options);await assert.rejects(f.read(id),/unavailable/);assert.deepEqual(f.calls,[]);}
});
test('a denied Admin role stops all Student queries',async()=>{const f=fixture({denied:true});await assert.rejects(f.read(student),/Forbidden/);assert.deepEqual(f.calls,[['role','admin']]);});
test('caller-bound reads constrain every private table to the selected Student',async()=>{const f=fixture();await f.read(student);assert.deepEqual(f.calls.slice(0,2),[['role','admin'],['client']]);
 for(const table of ['profiles','v2_purchases','v2_batch_enrollments','v2_live_registrations'])assert.ok(f.calls.some(call=>call[0]===table&&call[1]==='eq'&&call[2]===(table==='profiles'?'id':'student_id')&&call[3]===student));
 assert.ok(f.calls.some(call=>call[0]==='profiles'&&call[1]==='eq'&&call[2]==='role'&&call[3]==='student'));
 assert.doesNotMatch(JSON.stringify(f.calls),/payment_reference|service_role|\*/);
});
test('database failures remain explicit instead of becoming empty access records',async()=>{const result=await fixture({error:true}).read(student);for(const name of ['profile','purchases','enrollments','registrations']){assert.equal(result[name].data,null);assert.ok(result[name].error);}assert.ok(Number.isFinite(result.checkedAt));});
