'use server';
import { revalidatePath } from 'next/cache';
import { getPortalIdentity } from '@/lib/server/portalAuthorization';
import { isV2BatchAuthoringEnabled } from '@/lib/server/v2BatchFeature';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
import { createClient } from '@/utils/supabase/server';
export async function readBatchArchives():Promise<{batchId:string;revision:number;archived:boolean}[]|null> {
 if(!isV2BatchAuthoringEnabled()||(await getPortalIdentity())?.role!=='admin')return null;
 try {
 const client=await createClient();const {data,error}=await client.rpc('list_v2_batch_archives');
 return !error&&Array.isArray(data)&&data.every(row=>row&&isV2MeetingBatchId(row.batchId)&&Number.isInteger(row.revision)&&row.revision>0&&typeof row.archived==='boolean')?data:null;
 } catch { return null; }
}
export async function archiveBatch(input:{batchId:string;archived:boolean;revision:number;draft:number;publication:number;requestId:string}) {
 if(!isV2BatchAuthoringEnabled()||(await getPortalIdentity())?.role!=='admin')return {error:'Active Admin access is required.'};
 if(!isV2MeetingBatchId(input.batchId)||!isV2MeetingBatchId(input.requestId)||typeof input.archived!=='boolean'||![input.revision,input.draft,input.publication].every(n=>Number.isInteger(n)&&n>=0))return {error:'Invalid batch request.'};
 const client=await createClient();const {error}=await client.rpc('set_v2_batch_archived',{p_batch:input.batchId,p_archived:input.archived,p_revision:input.revision,p_draft:input.draft,p_publication:input.publication,p_request:input.requestId});
 if(error)return {error:error.code==='PT409'?'This batch changed. Reload the page and review again.':'Archiving could not be confirmed. Retry or check staging setup.'};
 revalidatePath('/admin/v2/batches');return {error:null};
}
