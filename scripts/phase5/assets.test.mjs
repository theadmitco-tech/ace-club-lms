import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const load=(path,deps={},context={})=>{
 const exports={};const code=ts.transpileModule(readFileSync(new URL(`../../${path}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 runInNewContext(code,{exports,require:name=>{assert(Object.hasOwn(deps,name),name);return deps[name];},URL,URLSearchParams,Headers,Response,AbortSignal,...context});return exports;
};
const assets=load('src/lib/v2ContentAssets.ts');
const batch=randomUUID(),session=randomUUID(),item=randomUUID(),path=randomUUID()+'.mp4',ref=assets.contentAssetReference(path);
function harness(){
 const state={enabled:true,role:'admin',course:null,workspace:{items:[]},signs:[],uploads:[],fetches:[],signedUrl:`${assets.CONTENT_ORIGIN}/storage/v1/object/sign/${assets.CONTENT_BUCKET}/${path}?token=private-token`};
 const api=load('src/lib/server/v2ContentAssets.ts',{'server-only':{},'node:crypto':{randomUUID},'@/lib/v2ContentAssets':assets,
  './v2ContentPublishing':{isV2ContentPublishingEnabled:()=>state.enabled,readContentWorkspace:async()=>state.workspace},
  './portalAuthorization':{getPortalIdentity:async()=>state.role?{role:state.role}:null},
  './v2StudentDelivery':{getMyV2PublishedCourse:async id=>id===batch?state.course:null},
  '@/lib/v2Meetings':{isV2MeetingBatchId:v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v)},
  '@supabase/supabase-js':{createClient:()=>({storage:{from:bucket=>({createSignedUploadUrl:async(p,options)=>{state.uploads.push({bucket,path:p,options});return {data:{token:'upload-token'}};},createSignedUrl:async(p,seconds)=>{state.signs.push({bucket,path:p,seconds});return {data:{signedUrl:state.signedUrl}};}})}})},
 },{process:{env:{NEXT_PUBLIC_SUPABASE_URL:assets.CONTENT_ORIGIN,SUPABASE_SERVICE_ROLE_KEY:'private-key'}},fetch:async(url,options)=>{state.fetches.push({url:String(url),options});return new Response('synthetic-file',{status:options.headers.Range?206:200});}});
 return {api,state};
}
const params=()=>new URLSearchParams({batchId:batch,sessionKey:session,itemKey:item,format:'mp4'});
const course=()=>({sessions:[{key:session,content:{recordings:[{key:item,title:'Recording',url:ref}],materials:[],preSessionReads:[],postSessionReads:[]}}]});
test('canonical private references reject foreign origins, traversal and tokens',()=>{
 assert.equal(assets.contentAssetPath(ref),path);
 for(const value of [ref+'?token=x',ref+'#x',ref.replace('authenticated','public'),ref.replace('eyphkkginlgoaxflauog','other'),ref.replace(path,'../'+path)])assert.equal(assets.contentAssetPath(value),null);
});
test('upload authorization requires Admin, valid file type and bounded size',async()=>{
 const {api,state}=harness();const input={extension:'mp4',type:'video/mp4',size:100};
 state.role='student';await assert.rejects(()=>api.prepareContentUpload(input));assert.equal(state.uploads.length,0);
 state.role='admin';for(const value of [{...input,size:0},{...input,size:assets.CONTENT_UPLOAD_LIMIT+1},{...input,extension:'html'},{...input,type:'text/html'}])await assert.rejects(()=>api.prepareContentUpload(value));
 const result=await api.prepareContentUpload(input);assert.equal(assets.contentAssetPath(result.reference),result.path);assert.equal(state.uploads[0].options.upsert,false);assert.equal(state.uploads[0].bucket,assets.CONTENT_BUCKET);
 state.enabled=false;await assert.rejects(()=>api.prepareContentUpload(input));
});
test('Student file authorization follows current item and denied or replaced content cannot stream',async()=>{
 const {api,state}=harness();assert.equal(await api.authorizedContentAsset(params(),false),null);
 state.course=course();assert.equal(await api.authorizedContentAsset(params(),false),path);
 for(const key of ['batchId','sessionKey','itemKey','format']){const p=params();p.append(key,p.get(key));assert.equal(await api.authorizedContentAsset(p,false),null);}
 const injected=params();injected.set('path',path);assert.equal(await api.authorizedContentAsset(injected,false),null);
 state.course.sessions[0].content.recordings[0].key=randomUUID();assert.equal(await api.authorizedContentAsset(params(),false),null);
 state.course=null;assert.equal(await api.authorizedContentAsset(params(),false),null);assert.equal(state.signs.length,0);
});
test('Admin file preview requires a saved, nondeleted draft reference',async()=>{
 const {api,state}=harness(),p=new URLSearchParams({path});assert.equal(await api.authorizedContentAsset(p,true),null);
 state.workspace.items=[{deleted:false,document:{url:ref}}];assert.equal(await api.authorizedContentAsset(p,true),path);
 state.role='student';assert.equal(await api.authorizedContentAsset(p,true),null);state.role='admin';state.workspace.items[0].deleted=true;assert.equal(await api.authorizedContentAsset(p,true),null);
});
test('native streaming preserves ranges without returning signing tokens or shared caches',async()=>{
 const {api,state}=harness();const response=await api.streamContentAsset(path,'bytes=0-10');assert.equal(response.status,206);assert.equal(response.headers.get('Content-Type'),'video/mp4');assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(response.headers.get('Location'),null);assert.doesNotMatch(JSON.stringify([...response.headers]),/private-token|private-key/);assert.equal(state.fetches[0].options.redirect,'error');
 state.signedUrl='https://evil.example.test/file';assert.equal(await api.streamContentAsset(path,null),null);assert.equal(await api.streamContentAsset(path,'bytes=0-1,2-3'),null);assert.equal(state.fetches.length,1);
});
