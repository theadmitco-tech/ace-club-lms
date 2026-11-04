import 'server-only';
import { createClient } from '@/utils/supabase/server';
import { requirePortalRole } from './portalAuthorization';
import { isV2ContentPublishingEnabled } from './v2ContentPublishing';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
import { listV2BatchDrafts } from './v2Batches';
export async function readAdminStudentAccess(studentId:string) {
  if(!isV2ContentPublishingEnabled()||!isV2MeetingBatchId(studentId))throw new Error('Student workspace unavailable.');
  await requirePortalRole('admin');
  const client=await createClient();
  const [profile,purchases,enrollments,registrations,batches]=await Promise.all([
    client.from('profiles').select('id,full_name,is_active').eq('id',studentId).eq('role','student').maybeSingle(),
    client.from('v2_purchases').select('id,confirmed_at,expires_at,revoked_at,v2_product_grants(product_code)').eq('student_id',studentId).order('confirmed_at',{ascending:false}).limit(100),
    client.from('v2_batch_enrollments').select('batch_id,active').eq('student_id',studentId),
    client.from('v2_live_registrations').select('batch_id,active').eq('student_id',studentId),listV2BatchDrafts()]);
  return {profile,purchases,enrollments,registrations,batches,checkedAt:Date.now()};
}
