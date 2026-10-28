import 'server-only';
import { getPortalIdentity } from '@/lib/server/portalAuthorization';
import { isV2StudentScheduleEnabled } from '@/lib/server/v2StudentScheduleFeature';
import { createClient } from '@/utils/supabase/server';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
import { enrollmentMatchesInput, isV2EnrollmentInput, isV2EnrollmentOptions, type V2EnrollmentOption, type V2EnrollmentResult } from '@/lib/v2Enrollments';

export async function listV2EnrollmentOptions(batchId: unknown): Promise<{ status: 'ready'; options: V2EnrollmentOption[] } | { status: 'unavailable'; options: [] }> {
  try {
    if (!isV2StudentScheduleEnabled() || (await getPortalIdentity())?.role !== 'admin' || !isV2MeetingBatchId(batchId)) return { status: 'unavailable', options: [] };
    const client = await createClient();
    const { data, error } = await client.rpc('list_v2_batch_enrollment_options', { p_batch_id: batchId });
    if (!error && isV2EnrollmentOptions(data)) return { status: 'ready', options: data };
  } catch { /* Return no roster on authorization or transport failures. */ }
  return { status: 'unavailable', options: [] };
}

export async function setV2Enrollment(input: unknown): Promise<V2EnrollmentResult> {
  const failure = { status: 'error' as const, message: 'Enrollment could not be confirmed. Reload the student list before retrying.' };
  try {
    if (!isV2StudentScheduleEnabled() || (await getPortalIdentity())?.role !== 'admin' || !isV2EnrollmentInput(input)) return failure;
    const client = await createClient();
    const { data, error } = await client.rpc('set_v2_batch_enrollment', {
      p_batch_id: input.batchId, p_student_id: input.studentId, p_active: input.active, p_expected_revision: input.expectedRevision,
    });
    if (!error && enrollmentMatchesInput(data, input)) return { status: 'success' };
  } catch { /* An ambiguous response is resolved by reloading, never by a blind toggle. */ }
  return failure;
}
