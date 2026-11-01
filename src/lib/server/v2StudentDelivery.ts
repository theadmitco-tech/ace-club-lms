import 'server-only';
import { getPortalIdentity } from '@/lib/server/portalAuthorization';
import { isV2StudentScheduleEnabled } from '@/lib/server/v2StudentScheduleFeature';
import { createClient } from '@/utils/supabase/server';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
import { isV2PublishedCourse, isV2MeetingDelivery, isV2LiveClassStatuses } from '@/lib/v2StudentDelivery';
import { enrollmentMatchesInput, isV2EnrollmentInput, isV2EnrollmentOptions } from '@/lib/v2Enrollments';

export async function getMyV2PublishedCourse(batchId: unknown) {
  try {
    if (!isV2StudentScheduleEnabled() || !isV2MeetingBatchId(batchId) || (await getPortalIdentity())?.role !== 'student') return null;
    const client = await createClient();
    const { data, error } = await client.rpc('get_my_v2_published_course', { p_batch_id: batchId });
    return !error && isV2PublishedCourse(data) && data.batchId === batchId ? data : null;
  } catch { return null; }
}
export async function getMyV2Meeting(batchId: unknown, eventKey: unknown) {
  try {
    if (!isV2StudentScheduleEnabled() || !isV2MeetingBatchId(batchId) || !isV2MeetingBatchId(eventKey) || (await getPortalIdentity())?.role !== 'student') return null;
    const client = await createClient();
    const { data, error } = await client.rpc('get_my_v2_meeting', { p_batch_id: batchId, p_event_key: eventKey });
    return !error && isV2MeetingDelivery(data,batchId,eventKey) ? data : null;
  } catch { return null; }
}
export async function readV2LiveOperations(batchId: unknown) {
  try {
    if (!isV2StudentScheduleEnabled() || !isV2MeetingBatchId(batchId) || (await getPortalIdentity())?.role !== 'admin') return null;
    const client = await createClient();
    const [registrations, classes] = await Promise.all([
      client.rpc('list_v2_live_registration_options',{p_batch_id:batchId}),
      client.rpc('list_v2_live_class_status',{p_batch_id:batchId}),
    ]);
    return !registrations.error && !classes.error && isV2EnrollmentOptions(registrations.data) && isV2LiveClassStatuses(classes.data)
      ? { registrations: registrations.data, classes: classes.data } : null;
  } catch { return null; }
}
export async function setV2LiveRegistration(input: unknown) {
  const failure = { status: 'error' as const, message: 'Registration could not be confirmed. Reload the roster before retrying.' };
  try {
    if (!isV2StudentScheduleEnabled() || !isV2EnrollmentInput(input) || (await getPortalIdentity())?.role !== 'admin') return failure;
    const client = await createClient();
    const { data,error } = await client.rpc('set_v2_live_registration',{p_batch_id:input.batchId,p_student_id:input.studentId,p_active:input.active,p_expected_revision:input.expectedRevision});
    if (!error && enrollmentMatchesInput(data,input)) return {status:'success' as const};
  } catch { /* Failed or interrupted confirmations require a refreshed roster. */ }
  return failure;
}
export async function completeV2LiveClass(input: {batchId:string;eventKey:string;publicationRevision:number}) {
  const failure = {status:'error' as const,message:'Class completion could not be confirmed. Reload the published class list before retrying.'};
  try {
    if (!isV2StudentScheduleEnabled() || !input || !isV2MeetingBatchId(input.batchId) || !isV2MeetingBatchId(input.eventKey)
      || !Number.isInteger(input.publicationRevision) || input.publicationRevision < 1 || (await getPortalIdentity())?.role !== 'admin') return failure;
    const client = await createClient();
    const {data,error} = await client.rpc('complete_v2_live_class',{p_batch_id:input.batchId,p_event_key:input.eventKey,p_publication_revision:input.publicationRevision});
    if (!error && data?.eventKey === input.eventKey && typeof data.completedAt === 'string' && Number.isFinite(Date.parse(data.completedAt)) && typeof data.replayed === 'boolean') return {status:'success' as const};
  } catch { /* Completion never falls back to a client-derived success state. */ }
  return failure;
}
