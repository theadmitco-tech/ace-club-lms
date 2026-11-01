import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const load=(path,deps={},context={})=>{
  const exports={};const code=ts.transpileModule(readFileSync(new URL(`../${path}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  runInNewContext(code,{exports,require:(name)=>{assert(Object.hasOwn(deps,name),name);return deps[name];},URL,Headers,Response,AbortSignal,...context});return exports;
};
const material=load('src/lib/materialFiles.ts');
const batchId=randomUUID(),sessionKey=randomUUID(),itemKey=randomUUID();
const path=`worksheets/${randomUUID()}/${randomUUID()}.pdf`,ref=material.createProtectedMaterialUrl(path);
function harness(){
  const state={enabled:true,role:'student',course:null,templates:[],batches:[],signs:[],fetches:[],signedUrl:`https://staging.example.test/storage/v1/object/sign/course-materials/${path}?token=private-token`};
  const api=load('src/lib/server/v2MaterialFiles.ts',{'server-only':{},'@/lib/materialFiles':material,
    '@supabase/supabase-js':{createClient:()=>({storage:{from:bucket=>({createSignedUrl:async(p,seconds)=>{state.signs.push({bucket,path:p,seconds});return {data:{signedUrl:state.signedUrl},error:null};}})}})},
    '@/lib/server/v2TemplateFeature':{isV2TemplateAuthoringEnabled:()=>state.enabled},
    '@/lib/server/portalAuthorization':{getPortalIdentity:async()=>state.role?{role:state.role}:null},
    '@/lib/server/v2Templates':{listV2TemplateDrafts:async()=>({status:'ready',templates:state.templates})},
    '@/lib/server/v2Batches':{listV2BatchDrafts:async()=>({status:'ready',drafts:state.batches})},
    '@/lib/server/v2StudentDelivery':{getMyV2PublishedCourse:async(id)=>id===batchId?state.course:null},
    '@/lib/v2Meetings':{isV2MeetingBatchId:v=>typeof v==='string'&&/^[0-9a-f-]{36}$/.test(v)},
  },{process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://staging.example.test',SUPABASE_SERVICE_ROLE_KEY:'private-key'}},fetch:async(url,options)=>{state.fetches.push({url:String(url),options});return new Response('%PDF-fixture',{status:options.headers.Range?206:200,headers:{'Content-Type':'application/pdf','content-length':'12'}});}});
  return {state,api};
}
const session={key:sessionKey,content:{materials:[{key:itemKey,title:'Worksheet',url:ref}],preSessionReads:[],postSessionReads:[],recordings:[]}};
test('only canonical protected worksheet and session-material references are accepted',()=>{
  const {api}=harness();assert.equal(api.canonicalV2MaterialPath(ref),path);
  for(const input of [`${ref}&extra=x`,`${ref}#fragment`,`${ref}&path=${encodeURIComponent(path)}`,'/api/materials/file?path=../secret.pdf','/api/materials/file?path=worksheets%252Fsecret.pdf',`https://elsewhere.example.test${ref}`]) assert.equal(api.canonicalV2MaterialPath(input),null);
});
test('Student file lookup accepts only the exact item in the authorized pinned course',async()=>{
  const {api,state}=harness();assert.equal(await api.getV2StudentMaterialPath(batchId,sessionKey,itemKey),null);
  state.course={sessions:[session]};assert.equal(await api.getV2StudentMaterialPath(batchId,sessionKey,itemKey),path);
  assert.equal(await api.getV2StudentMaterialPath(randomUUID(),sessionKey,itemKey),null);
  assert.equal(await api.getV2StudentMaterialPath(batchId,randomUUID(),itemKey),null);
  assert.equal(await api.getV2StudentMaterialPath(batchId,sessionKey,randomUUID()),null);
  state.course=null;assert.equal(await api.getV2StudentMaterialPath(batchId,sessionKey,itemKey),null);assert.equal(state.signs.length,0);
});
test('Admin file preview requires active Admin access and a saved authoring reference',async()=>{
  const {api,state}=harness();state.templates=[{document:{sessions:[session],events:[]}}];
  assert.equal(await api.getV2AdminMaterialPath(path),null);state.role='admin';assert.equal(await api.getV2AdminMaterialPath(path),path);
  state.templates=[];assert.equal(await api.getV2AdminMaterialPath(path),null);state.batches=[{sessions:[session],events:[]}];assert.equal(await api.getV2AdminMaterialPath(path),path);
  state.enabled=false;assert.equal(await api.getV2AdminMaterialPath(path),null);
});
test('private PDF streaming keeps storage tokens server-side and disables shared caches',async()=>{
  const {api,state}=harness();const response=await api.streamV2Material(path,'bytes=0-11');
  assert.equal(response.status,206);assert.equal(await response.text(),'%PDF-fixture');assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  assert.equal(response.headers.get('Vary'),'Cookie');assert.equal(response.headers.get('Location'),null);assert.equal(response.headers.get('Content-Type'),'application/pdf');
  assert.doesNotMatch(JSON.stringify([...response.headers]),/private-token|private-key/);assert.equal(state.signs[0].bucket,'course-materials');assert.equal(state.signs[0].seconds,60);
  assert.equal(state.fetches[0].options.redirect,'error');assert.equal(state.fetches[0].options.headers.Range,'bytes=0-11');
});
test('streaming rejects alternate signing origins, path substitution and invalid byte ranges',async()=>{
  const {api,state}=harness();for(const url of ['https://evil.example.test/storage/v1/object/sign/course-materials/x.pdf','https://staging.example.test/storage/v1/object/sign/course-materials/secret.pdf','http://staging.example.test/storage/v1/object/sign/course-materials/x.pdf']){state.signedUrl=url;assert.equal(await api.streamV2Material(path,null),null);}
  assert.equal(state.fetches.length,0);assert.equal(await api.streamV2Material(path,'bytes=0-1,2-3'),null);assert.equal(await api.streamV2Material('../secret.pdf',null),null);
});
test('Student route rejects arbitrary path, duplicate IDs and denied authorization before streaming',async()=>{
  let allowed=null,streams=0,reads=0;
  const route=load('src/app/api/v2/materials/file/route.ts',{'next/server':{NextResponse:{json:(body,options)=>({body,...options})}},
    '@/lib/server/v2MaterialFiles':{getV2StudentMaterialPath:async()=>{reads++;return allowed;},streamV2Material:async()=>{streams++;return new Response('%PDF');}}});
  const query=`batchId=${batchId}&sessionKey=${sessionKey}&itemKey=${itemKey}`;
  const req=(q)=>({nextUrl:new URL(`https://preview.example.test/api/v2/materials/file?${q}`),headers:new Headers()});
  assert.equal((await route.GET(req(`${query}&path=secret`))).status,404);assert.equal(reads,0);
  assert.equal((await route.GET(req(`${query}&itemKey=${itemKey}`))).status,404);assert.equal(reads,0);
  assert.equal((await route.GET(req(query))).status,404);assert.equal(streams,0);
  allowed=path;assert.equal((await route.GET(req(query))).status,200);assert.equal(streams,1);
});
