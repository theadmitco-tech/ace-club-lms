import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

const cases=[
 ['v2Templates','saveV2TemplateDraft',[{}],/newer revision/i],
 ['v2Batches','previewV2BatchDraft',[{}],/batch or template changed/i],
 ['v2Batches','saveV2BatchDraft',[{},'a'.repeat(32)],/batch or template changed/i],
 ['v2Publications','previewV2BatchPublication',[{}],/draft or publication changed/i],
 ['v2Publications','saveV2BatchPublication',[{},'a'.repeat(64)],/draft or publication changed/i],
 ['v2Meetings','saveV2MeetingDraft',[{}],/schedule or meeting draft changed/i],
 ['v2PublicationScopes','previewPublicationScope',[{}],/publication scope changed/i],
 ['v2PublicationScopes','savePublicationScope',[{},'a'.repeat(64)],/publication scope changed/i],
 ['v2ContentImports','contentImportOperation',['preview',{}],/source, destination or reviewed scope changed/i],
];
for(const [module,method,args,message] of cases)test(`${module}.${method} preserves conflict guidance without an application retry`,async()=>{
 let calls=0,code='PT409',role='admin';
 const exports={};
 const helpers=new Proxy({}, {get:(_target,key)=>String(key).startsWith('validate')?()=>null:()=>true});
 const dependencies={
  'server-only':{},
  '@/lib/server/portalAuthorization':{getPortalIdentity:async()=>({role})},
  '@/utils/supabase/server':{createClient:async()=>({rpc:async()=>{calls++;return {data:null,error:{code,message:'Private database detail'}};}})},
  '@/lib/server/v2TemplateFeature':{isV2TemplateAuthoringEnabled:()=>true},
  '@/lib/server/v2BatchFeature':{isV2BatchAuthoringEnabled:()=>true},
  ...Object.fromEntries(['v2Templates','v2Batches','v2Meetings','v2PublicationScopes','v2Publications'].map(name=>['@/lib/'+name,helpers])),
 };
 const source=readFileSync(new URL(`../../src/lib/server/${module}.ts`,import.meta.url),'utf8');
 runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{assert(Object.hasOwn(dependencies,name),name);return dependencies[name];}});
 for(code of ['PT409','40001']){
  const before=calls,result=await exports[method](...args);
  assert.equal(calls,before+1);assert.equal(result.status,'error');assert.match(result.message,message);assert.doesNotMatch(result.message,/Private database detail/);
 }
 role='student';const before=calls;assert.equal((await exports[method](...args)).status,'error');assert.equal(calls,before);
});
