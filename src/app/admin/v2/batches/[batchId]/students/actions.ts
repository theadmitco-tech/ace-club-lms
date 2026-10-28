'use server';
import { revalidatePath } from 'next/cache';
import { setV2Enrollment } from '@/lib/server/v2Enrollments';

export async function setEnrollmentAction(input: unknown) {
  const result = await setV2Enrollment(input);
  if (result.status === 'success') {
    revalidatePath('/admin/v2/batches', 'layout');
    revalidatePath('/schedule/v2');
  }
  return result;
}
