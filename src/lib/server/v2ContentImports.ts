import 'server-only';
import { getPortalIdentity } from '@/lib/server/portalAuthorization';
import { isV2TemplateAuthoringEnabled } from '@/lib/server/v2TemplateFeature';
import { createClient } from '@/utils/supabase/server';

export type ImportWorkspace = {
  assets: { id: string; title: string; url: string; templateIds: string[] }[];
  templates: { id: string; title: string }[];
  imports: { id: string; createdAt: string; recovered: boolean; templates: number; placements: number }[];
};
export type ImportResult = { status: 'success'; data: Record<string, unknown> } | { status: 'error'; message: string };

export async function listContentImportWorkspace(): Promise<ImportWorkspace | null> {
  if (!isV2TemplateAuthoringEnabled()) return null;
  try {
    if ((await getPortalIdentity())?.role !== 'admin') return null;
    const client = await createClient();
    const { data, error } = await client.rpc('list_v2_content_import_workspace');
    if (error || !data || !Array.isArray(data.assets) || !Array.isArray(data.templates) || !Array.isArray(data.imports)) return null;
    return data as ImportWorkspace;
  } catch { return null; }
}

export async function contentImportOperation(operation: unknown, input: unknown): Promise<ImportResult> {
  if (!isV2TemplateAuthoringEnabled()) return { status: 'error', message: 'Content transfer is unavailable.' };
  try {
    if ((await getPortalIdentity())?.role !== 'admin') return { status: 'error', message: 'Active Admin access is required.' };
    if (!input || typeof input !== 'object' || JSON.stringify(input).length > 750_000) return { status: 'error', message: 'The reviewed transfer file is invalid or too large.' };
    const value = input as Record<string, unknown>;
    const functions: Record<string, { name: string; args: Record<string, unknown> }> = {
      preview: { name: 'preview_v2_content_import', args: { p_plan: value.plan } },
      apply: { name: 'apply_v2_content_import', args: { p_id: value.id, p_plan: value.plan, p_fingerprint: value.fingerprint } },
      recover: { name: 'recover_v2_content_import', args: { p_id: value.id } },
      previewReplacement: { name: 'preview_v2_asset_replacement', args: { p_request: value.request } },
      replace: { name: 'apply_v2_asset_replacement', args: { p_id: value.id, p_request: value.request, p_fingerprint: value.fingerprint } },
    };
    if (typeof operation !== 'string' || !Object.hasOwn(functions, operation)) return { status: 'error', message: 'Unknown content transfer action.' };
    const selected = functions[operation];
    const client = await createClient();
    const { data, error } = await client.rpc(selected.name, selected.args);
    if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
      return { status: 'error', message: (error?.code === '40001' || error?.code === 'PT409')
        ? 'The source, destination or reviewed scope changed. Reload the current material and review again.'
        : 'The content action could not be completed. Check the selected sources, destination revisions and Admin access.' };
    }
    return { status: 'success', data };
  } catch { return { status: 'error', message: 'The content action could not be completed. The same confirmed submission can be retried.' }; }
}
