'use server';

import { revalidatePath } from 'next/cache';
import type { BatchProposalInput } from '@/lib/batchSchedule';
import { confirmTemplateBatch } from '@/lib/server/batchSchedule';
import { requirePortalRole } from '@/lib/server/portalAuthorization';

export type ConfirmBatchActionResult = {
  status: 'success' | 'error';
  message: string;
  courseId?: string;
  replayed?: boolean;
};

export async function confirmBatchAction(input: BatchProposalInput): Promise<ConfirmBatchActionResult> {
  await requirePortalRole('admin');
  try {
    const result = await confirmTemplateBatch(input);
    revalidatePath('/admin/courses');
    revalidatePath('/admin/sessions');
    return {
      status: 'success',
      courseId: result.courseId,
      replayed: result.replayed,
      message: result.replayed
        ? 'This proposal was already confirmed. The original batch was returned.'
        : `Batch created with ${result.sessions ?? 0} events and ${result.materials ?? 0} reusable resources.`,
    };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to create the batch.' };
  }
}
