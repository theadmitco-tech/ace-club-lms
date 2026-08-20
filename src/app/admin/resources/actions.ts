'use server';

import { revalidatePath } from 'next/cache';
import { validateFlexibleResourceDraft } from '@/lib/flexibleResources';
import {
  cleanupProtectedResourceFile,
  removeUnreleasedFlexibleResource,
  saveFlexibleResource,
} from '@/lib/server/flexibleResources';
import { requirePortalRole } from '@/lib/server/portalAuthorization';

export type ResourceActionResult = {
  status: 'error' | 'success';
  message: string;
  errors?: string[];
};

export async function saveFlexibleResourceAction(raw: unknown): Promise<ResourceActionResult> {
  await requirePortalRole('admin');
  const validation = validateFlexibleResourceDraft(raw);
  if (!validation.valid) {
    return { status: 'error', message: 'Fix the resource details before saving.', errors: validation.errors };
  }

  const uploadedFile = Boolean(raw && typeof raw === 'object' && (raw as { uploadedFile?: unknown }).uploadedFile === true);
  try {
    const saved = await saveFlexibleResource(validation.draft);
    const cleanupPending = saved.previousFileUrl
      ? !(await cleanupProtectedResourceFile(saved.previousFileUrl))
      : false;
    revalidatePath('/admin/resources');
    return {
      status: 'success',
      message: cleanupPending
        ? 'Resource saved. The previous private file still needs storage cleanup.'
        : validation.draft.materialId ? 'Resource updated.' : 'Resource added to this batch.',
    };
  } catch (error) {
    if (uploadedFile) await cleanupProtectedResourceFile(validation.draft.fileUrl);
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to save this resource.' };
  }
}

export async function removeFlexibleResourceAction(
  courseId: string,
  materialId: string,
): Promise<ResourceActionResult> {
  await requirePortalRole('admin');
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(courseId) || !uuidPattern.test(materialId)) {
    return { status: 'error', message: 'The selected resource is invalid.' };
  }
  try {
    const result = await removeUnreleasedFlexibleResource(courseId, materialId);
    revalidatePath('/admin/resources');
    return {
      status: 'success',
      message: result.cleanupPending
        ? 'Resource removed. Its private file still needs storage cleanup.'
        : 'Unreleased resource removed.',
    };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to remove this resource.' };
  }
}
