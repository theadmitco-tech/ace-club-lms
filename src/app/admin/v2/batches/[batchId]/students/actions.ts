'use server';
import { revalidatePath } from 'next/cache';
import { setV2Enrollment } from '@/lib/server/v2Enrollments';
import { setV2LiveRegistration } from '@/lib/server/v2StudentDelivery';

export async function setEnrollmentAction(input: unknown) {
  const result = await setV2Enrollment(input);
  if (result.status === 'success') {
    revalidatePath('/admin/v2/batches', 'layout');
    revalidatePath('/schedule/v2');
  }
  return result;
}

/** Gives an enrolled student a live seat from the Students page; the database checks the seat limit. */
export async function giveLiveSeatAction(input: { batchId: string; studentId: string; expectedRevision: number }) {
  const result = await setV2LiveRegistration({ ...input, active: true });
  if (result.status === 'success') revalidatePath('/admin/v2/batches', 'layout');
  return result;
}
