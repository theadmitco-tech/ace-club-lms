import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(path,deps,context={}){
 const exports={};const code=ts.transpileModule(readFileSync(new URL(`../../${path}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 runInNewContext(code,{exports,require:name=>{assert(Object.hasOwn(deps,name),name);return deps[name];},URL,Headers,Response,Error,...context});return exports;
}
test('stale publication becomes a bounded HTTP 409 without retrying or exposing database details',async()=>{
 const state={code:'PT409',calls:0};
 const service=load('src/lib/server/v2ContentPublishing.ts',{
  'server-only':{},'@/utils/supabase/server':{createClient:async()=>({rpc:async()=>{state.calls++;return {data:null,error:{code:state.code,message:'Private database detail'}};}})},
  './portalAuthorization':{getPortalIdentity:async()=>({role:'admin'})},'./v2LearningFeature':{isV2LearningEnabled:()=>true},
  '@/lib/v2Meetings':{isV2MeetingBatchId:value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value)},
  '@/lib/v2StudentDelivery':{isV2PublishedCourse:()=>true},'@/lib/v2ContentPublishing':{validContentDocument:()=>true,validContentPlacements:()=>true},
 },{process:{env:{V2_CONTENT_PUBLISHING_ENABLED:'true'}}});
 const route=load('src/app/api/admin/v2/content/route.ts',{'next/server':{NextResponse:{json:(body,init)=>new Response(JSON.stringify(body),{...init,headers:{...init.headers,'Content-Type':'application/json'}})}},'@/lib/server/v2ContentPublishing':service,'@/lib/server/v2ContentAssets':{prepareContentUpload:async()=>{throw Error('Unexpected upload');}}});
 const origin='https://preview.example.test';
 const request=()=>({headers:new Headers({origin}),nextUrl:{origin},text:async()=>JSON.stringify({action:'confirm',input:{id:randomUUID(),revision:1,action:'publish',requestId:randomUUID(),fingerprint:'a'.repeat(64)}})});
 for(const code of ['PT409','40001']){
  state.code=code;const before=state.calls,response=await route.POST(request());
  assert.equal(response.status,409);assert.equal(state.calls,before+1);assert.match((await response.json()).error,/Reload and review again/);assert.equal(response.headers.get('Cache-Control'),'private, no-store');
 }
 state.code='XX000';const response=await route.POST(request());assert.equal(response.status,400);assert.doesNotMatch(await response.text(),/Private database detail/);
 const foreign=request();foreign.headers.set('origin','https://foreign.example.test');const before=state.calls;assert.equal((await route.POST(foreign)).status,403);assert.equal(state.calls,before);
});
