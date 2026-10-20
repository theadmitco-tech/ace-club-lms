'use server';

import { revalidatePath } from 'next/cache';
import { saveV2MeetingDraft } from '@/lib/server/v2Meetings';

export async function saveMeetingDraftAction(input: unknown) {
  const result = await saveV2MeetingDraft(input);
  if (result.status === 'success') revalidatePath(`/admin/v2/batches/${result.receipt.batchId}/meeting`);
  return result;
}
