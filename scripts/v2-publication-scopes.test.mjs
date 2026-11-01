import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const load=(path,deps={})=>{
 const exports={};const compiled=ts.transpileModule(readFileSync(new URL(`../${path}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 runInNewContext(compiled,{exports,require:name=>{assert(Object.hasOwn(deps,name),name);return deps[name];}});return exports;
};
const templates=load('src/lib/v2Templates.ts'),batches=load('src/lib/v2Batches.ts',{'./v2Templates':templates});
const meetings=load('src/lib/v2Meetings.ts',{'./v2Batches':batches});
const publications=load('src/lib/v2Publications.ts',{'./v2Templates':templates,'./v2Meetings':meetings});
const scopes=load('src/lib/v2PublicationScopes.ts',{'./v2Publications':publications,'./v2Templates':templates,'./v2Meetings':meetings});
const request={requestId:randomUUID(),action:'publish',productCodes:['quant']};
const document={batchId:randomUUID(),batchRevision:1,revision:1,state:'published',productCode:'quant',title:'Synthetic course',sections:['quant'],timeZone:'Asia/Kolkata',liveRegistrationLimit:null,events:[],sessions:[]};
const item={input:{batchId:document.batchId,batchRevision:1,expectedRevision:0,requestId:request.requestId,action:'publish'},document,fingerprint:'a'.repeat(32)};
const review={fingerprint:'b'.repeat(32),proposal:{action:'publish',items:[item]}};

test('scope review rejects malformed nested records without throwing',()=>{
 assert.equal(scopes.isPublicationScopeReview(review,request),true);
 for(const value of [null,[],{}, {...review,proposal:null},... [null,undefined,1,'invalid',{},[]].map(value=>({...review,proposal:{action:'publish',items:[value]}})),
  {...review,proposal:{action:'publish',items:[item,item]}}]){
   assert.doesNotThrow(()=>scopes.isPublicationScopeReview(value,request));assert.equal(scopes.isPublicationScopeReview(value,request),false);
 }
});

test('scope save rejects provider responses outside selected products and action',async()=>{
 let result={data:{documents:[document],replayed:false},error:null};
 const server=load('src/lib/server/v2PublicationScopes.ts',{'server-only':{},'@/lib/v2PublicationScopes':scopes,'@/lib/v2Publications':publications,
  '@/lib/server/portalAuthorization':{getPortalIdentity:async()=>({role:'admin'})},
  '@/lib/server/v2BatchFeature':{isV2BatchAuthoringEnabled:()=>true},
  '@/utils/supabase/server':{createClient:async()=>({rpc:async()=>result})}});
 assert.equal((await server.savePublicationScope(request,'b'.repeat(32))).status,'success');
 for(const documents of [[{...document,state:'unpublished'}],[{...document,productCode:'di',sections:['di']}],[document,document]]){
  result={data:{documents,replayed:false},error:null};assert.equal((await server.savePublicationScope(request,'b'.repeat(32))).status,'error');
 }
});
