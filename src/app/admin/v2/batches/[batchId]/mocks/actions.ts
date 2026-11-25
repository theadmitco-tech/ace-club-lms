'use server';

import { revalidatePath } from 'next/cache';
import { saveV2BatchMock, deleteV2BatchMock } from '@/lib/server/v2Mocks';

export async function saveMockAction(input: unknown) {
  const result = await saveV2BatchMock(input);
  if (result.status === 'success') { revalidatePath(`/admin/v2/batches/${(input as { batchId: string }).batchId}/mocks`); revalidatePath('/mocks'); }
  return result;
}

export async function deleteMockAction(batchId: string, mockId: string) {
  const deleted = await deleteV2BatchMock(batchId, mockId);
  if (deleted) { revalidatePath(`/admin/v2/batches/${batchId}/mocks`); revalidatePath('/mocks'); }
  return deleted;
}
