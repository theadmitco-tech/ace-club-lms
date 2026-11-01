'use server';
import { revalidatePath } from 'next/cache';
import { previewPublicationScope,savePublicationScope } from '@/lib/server/v2PublicationScopes';
export async function previewPublicationScopeAction(input: unknown) { return previewPublicationScope(input); }
export async function savePublicationScopeAction(input: unknown,fingerprint: unknown) {
  const result = await savePublicationScope(input,fingerprint);
  if (result.status === 'success') { revalidatePath('/admin/v2/batches'); revalidatePath('/schedule/v2'); }
  return result;
}
