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
const STAGING='https://eyphkkginlgoaxflauog.supabase.co',PRODUCTION='https://owmlxsnzogfapotmjrqk.supabase.co';
const environment=load('src/lib/v2Environment.ts',{},{atob});
const assetsFor=env=>load('src/lib/v2ContentAssets.ts',{'./v2Environment':environment},{process:{env}});
const previewEnv={VERCEL_ENV:'preview',NEXT_PUBLIC_SUPABASE_URL:STAGING,SUPABASE_SERVICE_ROLE_KEY:'private-key'};
const assets=assetsFor(previewEnv);
const batch=randomUUID(),session=randomUUID(),item=randomUUID(),path=randomUUID()+'.mp4',ref=assets.contentAssetReference(path,STAGING);
function harness(env=previewEnv){
 const state={enabled:true,role:'admin',course:null,workspace:{items:[]},signs:[],uploads:[],fetches:[],clientOrigins:[],signedUrl:`${STAGING}/storage/v1/object/sign/${assets.CONTENT_BUCKET}/${path}?token=private-token`};
 const supabase={createClient:origin=>{state.clientOrigins.push(origin);return {storage:{from:bucket=>({createSignedUploadUrl:async(p,options)=>{state.uploads.push({bucket,path:p,options});return {data:{token:'upload-token'}};},createSignedUrl:async(p,seconds)=>{state.signs.push({bucket,path:p,seconds});return {data:{signedUrl:state.signedUrl}};}})}};}};
 const serviceClient=load('src/lib/server/v2ServiceClient.ts',{'server-only':{},'@supabase/supabase-js':supabase,'@/lib/v2Environment':environment},{process:{env}});
 const api=load('src/lib/server/v2ContentAssets.ts',{'server-only':{},'node:crypto':{randomUUID},'@/lib/v2ContentAssets':assetsFor(env),'./v2ServiceClient':serviceClient,
  './v2ContentPublishing':{isV2ContentPublishingEnabled:()=>state.enabled,readContentWorkspace:async()=>state.workspace},
  './portalAuthorization':{getPortalIdentity:async()=>state.role?{role:state.role}:null},
  './v2StudentDelivery':{getMyV2PublishedCourse:async id=>id===batch?state.course:null},
  '@/lib/v2Meetings':{isV2MeetingBatchId:v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v)},
  },{process:{env},fetch:async(url,options)=>{state.fetches.push({url:String(url),options});return new Response('synthetic-file',{status:options.headers.Range?206:200});}});
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

test('content origin follows the deployment and never serves another project\'s reference', async () => {
 const productionEnv={VERCEL_ENV:'production',V2_PRODUCTION_RELEASE_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:PRODUCTION,NEXT_PUBLIC_SITE_URL:'https://aceclub.theadmitco.com',SUPABASE_SERVICE_ROLE_KEY:'private-key'};
 const production=assetsFor(productionEnv);
 const productionRef=production.contentAssetReference(path,PRODUCTION);
 assert.equal(production.contentOrigin(),PRODUCTION);
 assert.equal(production.contentAssetPath(productionRef),path);
 assert.equal(production.contentAssetPath(ref),null,'a staging reference is not a Production asset');
 assert.equal(assets.contentAssetPath(productionRef),null,'a Production reference is not a staging asset');
 for(const url of [undefined,'https://example.invalid','http://eyphkkginlgoaxflauog.supabase.co',STAGING+'/rest']) assert.equal(assetsFor({...previewEnv,NEXT_PUBLIC_SUPABASE_URL:url}).contentOrigin(),null);

 // Production signs only against the Production project and refuses a staging reference in a course.
 const prod=harness(productionEnv);prod.state.signedUrl=`${PRODUCTION}/storage/v1/object/sign/${production.CONTENT_BUCKET}/${path}?token=private-token`;
 prod.state.course={sessions:[{key:session,content:{recordings:[{key:item,title:'Recording',url:ref}],materials:[],preSessionReads:[],postSessionReads:[]}}]};
 assert.equal(await prod.api.authorizedContentAsset(params(),false),null);
 prod.state.course.sessions[0].content.recordings[0].url=productionRef;
 assert.equal(await prod.api.authorizedContentAsset(params(),false),path);
 assert.equal((await prod.api.streamContentAsset(path,null)).status,200);
 assert.deepEqual([...new Set(prod.state.clientOrigins)],[PRODUCTION]);
 const upload=await prod.api.prepareContentUpload({extension:'mp4',type:'video/mp4',size:100});
 assert.ok(upload.reference.startsWith(PRODUCTION+'/'));

 // Unapproved Production has no content storage at all.
 const {V2_PRODUCTION_RELEASE_ENABLED,...unreleased}=productionEnv;void V2_PRODUCTION_RELEASE_ENABLED;
 const blocked=harness(unreleased);
 await assert.rejects(()=>blocked.api.prepareContentUpload({extension:'mp4',type:'video/mp4',size:100}));
 assert.equal(await blocked.api.streamContentAsset(path,null),null);assert.equal(blocked.state.clientOrigins.length,0);
});
