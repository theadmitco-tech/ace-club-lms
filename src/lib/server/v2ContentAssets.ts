import 'server-only';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { CONTENT_BUCKET,CONTENT_ORIGIN,CONTENT_MIME,CONTENT_UPLOAD_LIMIT,contentAssetPath,contentAssetReference,contentAssetExtension } from '@/lib/v2ContentAssets';
import { isV2ContentPublishingEnabled,readContentWorkspace } from './v2ContentPublishing';
import { getPortalIdentity } from './portalAuthorization';
import { getMyV2PublishedCourse } from './v2StudentDelivery';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
function storage(){
  if(!isV2ContentPublishingEnabled()||process.env.NEXT_PUBLIC_SUPABASE_URL!==CONTENT_ORIGIN||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Private content storage is unavailable.');
  return createClient(CONTENT_ORIGIN,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from(CONTENT_BUCKET);
}
export async function prepareContentUpload(input:Record<string,unknown>){
  if((await getPortalIdentity())?.role!=='admin')throw new Error('Active Admin access required.');
  const extension=typeof input.extension==='string'&&Object.hasOwn(CONTENT_MIME,input.extension)?input.extension as keyof typeof CONTENT_MIME:null;
  if(!extension||input.type!==CONTENT_MIME[extension]||!Number.isSafeInteger(input.size)||Number(input.size)<1||Number(input.size)>CONTENT_UPLOAD_LIMIT)throw new Error('An MP4, WebM or PDF up to 50 MiB is required.');
  const path=`${randomUUID()}.${extension}`;
  const {data,error}=await storage().createSignedUploadUrl(path,{upsert:false});
  if(error||!data?.token)throw new Error('The upload could not be prepared.');
  return {path,token:data.token,reference:contentAssetReference(path)};
}
export async function authorizedContentAsset(params:URLSearchParams,admin:boolean){
  if(!isV2ContentPublishingEnabled())return null;
  if(admin){
    if([...params.keys()].some(k=>k!=='path')||params.getAll('path').length!==1||(await getPortalIdentity())?.role!=='admin')return null;
    const path=params.get('path')!,reference=contentAssetReference(path);
    if(contentAssetPath(reference)!==path)return null;
    const workspace=await readContentWorkspace();
    return workspace?.items.some(i=>!i.deleted&&i.document.url===reference)?path:null;
  }
  if([...params.keys()].some(k=>!['batchId','sessionKey','itemKey','format'].includes(k))||['batchId','sessionKey','itemKey','format'].some(k=>params.getAll(k).length!==1))return null;
  const batch=params.get('batchId'),session=params.get('sessionKey'),item=params.get('itemKey');
  if(!isV2MeetingBatchId(batch)||!isV2MeetingBatchId(session)||!isV2MeetingBatchId(item))return null;
  const course=await getMyV2PublishedCourse(batch),content=course?.sessions.find(s=>s.key===session)?.content;
  const resource=content&&Object.values(content).flat().find(i=>i.key===item),path=resource&&contentAssetPath(resource.url);
  return path&&contentAssetExtension(path)===params.get('format')?path:null;
}
export async function streamContentAsset(path:string,range:string|null):Promise<Response|null>{
  if(contentAssetPath(contentAssetReference(path))!==path||range&&!/^bytes=\d+-\d*$/.test(range))return null;
  try{
    const extension=contentAssetExtension(path);if(!extension)return null;
    const {data,error}=await storage().createSignedUrl(path,60);if(error||!data?.signedUrl)return null;
    const signed=new URL(data.signedUrl);
    if(signed.origin!==CONTENT_ORIGIN||decodeURIComponent(signed.pathname)!==`/storage/v1/object/sign/${CONTENT_BUCKET}/${path}`)return null;
    const response=await fetch(signed,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000),headers:range?{Range:range}:{}});
    if(![200,206].includes(response.status)||!response.body)return null;
    const headers=new Headers({'Content-Type':CONTENT_MIME[extension],'Content-Disposition':`inline; filename="course-content.${extension}"`,'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
    for(const name of ['content-length','content-range','accept-ranges']){const value=response.headers.get(name);if(value)headers.set(name,value);}
    return new Response(response.body,{status:response.status,headers});
  }catch{return null;}
}
