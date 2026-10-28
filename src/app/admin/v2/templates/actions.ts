'use server';

import { revalidatePath } from 'next/cache';
import { saveV2TemplateDraft } from '@/lib/server/v2Templates';
import type { V2TemplateSaveResult } from '@/lib/v2Templates';

export async function saveTemplateDraftAction(input: unknown): Promise<V2TemplateSaveResult> {
  // The DAL checks feature availability, current Admin identity, and input on
  // every call. The database repeats authorization and validation at the write.
  const result = await saveV2TemplateDraft(input);
  if (result.status === 'success') revalidatePath('/admin/v2/templates');
  return result;
}
