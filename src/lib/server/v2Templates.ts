import 'server-only';

import { getPortalIdentity } from '@/lib/server/portalAuthorization';
import { isV2TemplateAuthoringEnabled } from '@/lib/server/v2TemplateFeature';
import { isV2TemplateDraft, sameV2TemplateDocument, validateV2TemplateSave, type V2TemplateDraft, type V2TemplateSaveInput, type V2TemplateSaveResult } from '@/lib/v2Templates';
import { createClient } from '@/utils/supabase/server';

type TemplateListResult =
  | { status: 'ready'; templates: V2TemplateDraft[] }
  | { status: 'disabled' | 'forbidden' | 'unavailable'; templates: [] };

export async function listV2TemplateDrafts(): Promise<TemplateListResult> {
  if (!isV2TemplateAuthoringEnabled()) return { status: 'disabled', templates: [] };
  try {
    if ((await getPortalIdentity())?.role !== 'admin') return { status: 'forbidden', templates: [] };
    const client = await createClient();
    const { data, error } = await client.rpc('list_v2_template_drafts');
    if (error || !Array.isArray(data) || !data.every(isV2TemplateDraft)) return { status: 'unavailable', templates: [] };
    return { status: 'ready', templates: data };
  } catch {
    return { status: 'unavailable', templates: [] };
  }
}

export async function saveV2TemplateDraft(value: unknown): Promise<V2TemplateSaveResult> {
  if (!isV2TemplateAuthoringEnabled()) return { status: 'error', message: 'Template authoring is unavailable.' };
  try {
    if ((await getPortalIdentity())?.role !== 'admin') return { status: 'error', message: 'Active Admin access is required.' };
    const invalid = validateV2TemplateSave(value);
    if (invalid) return { status: 'error', message: invalid };
    const input = value as V2TemplateSaveInput;
    const client = await createClient();
    const { data, error } = await client.rpc('save_v2_template_draft', {
      p_id: input.id, p_product_code: input.productCode, p_expected_revision: input.expectedRevision,
      p_request_id: input.requestId, p_document: input.document,
    });
    if (error || !data || !isV2TemplateDraft(data.template) || typeof data.replayed !== 'boolean'
      || data.template.id !== input.id || data.template.productCode !== input.productCode
      || data.template.revision !== input.expectedRevision + 1
      || !sameV2TemplateDocument(data.template.document, input.document)) {
      if (error?.code === '40001') return { status: 'error', message: 'A newer revision exists. Reload the latest draft before saving again.' };
      if (error?.code === '22023') return { status: 'error', message: 'The draft or retry does not match the saved template. Reload the latest draft and review the fields.' };
      return { status: 'error', message: 'The draft could not be saved. Retry the same submission or reload the latest draft.' };
    }
    return { status: 'success', template: data.template, replayed: data.replayed };
  } catch {
    // Database and transport details must not reach browser responses or logs.
    return { status: 'error', message: 'The draft could not be saved. Retry the same submission or reload the latest draft.' };
  }
}
