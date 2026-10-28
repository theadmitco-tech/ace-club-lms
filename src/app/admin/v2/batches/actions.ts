'use server';

import { revalidatePath } from 'next/cache';
import { previewV2BatchDraft, saveV2BatchDraft } from '@/lib/server/v2Batches';
import { previewV2BatchPublication, saveV2BatchPublication } from '@/lib/server/v2Publications';

export async function previewBatchPublicationAction(input: unknown) {
  return previewV2BatchPublication(input);
}

export async function saveBatchPublicationAction(input: unknown, fingerprint: unknown) {
  const result = await saveV2BatchPublication(input, fingerprint);
  if (result.status === 'success') revalidatePath('/admin/v2/batches');
  return result;
}

export async function previewBatchDraftAction(input: unknown) {
  return previewV2BatchDraft(input);
}

export async function saveBatchDraftAction(input: unknown, fingerprint: unknown) {
  const result = await saveV2BatchDraft(input, fingerprint);
  if (result.status === 'success') revalidatePath('/admin/v2/batches');
  return result;
}
