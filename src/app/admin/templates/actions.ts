'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { validateCourseTemplateDraft } from '@/lib/courseTemplates';
import { createCourseTemplateRevision } from '@/lib/server/courseTemplates';
import { requirePortalRole } from '@/lib/server/portalAuthorization';

export type SaveTemplateState = {
  status: 'idle' | 'error' | 'success';
  message: string;
  errors?: string[];
};

export async function saveCourseTemplateAction(
  _previousState: SaveTemplateState,
  formData: FormData,
): Promise<SaveTemplateState> {
  await requirePortalRole('admin');
  const templateId = String(formData.get('templateId') ?? '');
  const expectedRevisionId = String(formData.get('expectedRevisionId') ?? '');
  const payload = String(formData.get('payload') ?? '');
  if (!templateId || !expectedRevisionId || !payload) {
    return { status: 'error', message: 'Template save data is incomplete.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { status: 'error', message: 'Template data could not be read.' };
  }

  const validation = validateCourseTemplateDraft(parsed);
  if (!validation.valid) {
    return { status: 'error', message: 'Fix the highlighted template structure before saving.', errors: validation.errors };
  }

  try {
    await createCourseTemplateRevision(templateId, expectedRevisionId, validation.draft);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save the template revision.';
    return { status: 'error', message };
  }

  revalidatePath('/admin/templates');
  redirect(`/admin/templates?template=${encodeURIComponent(templateId)}&saved=1`);
}
