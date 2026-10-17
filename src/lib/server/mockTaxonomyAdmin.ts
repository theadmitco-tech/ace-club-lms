import 'server-only';
import { createMockAdminClient } from './mockQuestionBankAdmin';

export type TaxonomySection = 'quant' | 'verbal' | 'data_insights';

function slug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
}

function label(value: unknown) {
  const result = typeof value === 'string' ? value.trim() : '';
  if (result.length < 1 || result.length > 120) throw new Error('Taxonomy labels must be 1–120 characters.');
  return result;
}

function section(value: unknown): TaxonomySection {
  if (value !== 'quant' && value !== 'verbal' && value !== 'data_insights') throw new Error('Choose Quant, Verbal or Data Insights.');
  return value;
}

export async function listTaxonomyAdmin() {
  const db = createMockAdminClient();
  const { data, error } = await db.from('mock_topics').select('id,code,label,section,parent_id,is_active,created_at').order('section').order('parent_id', { ascending: true, nullsFirst: true }).order('label');
  if (error) throw error;
  return data ?? [];
}

export async function createTaxonomyTopic(userId: string, input: { label: unknown; section: unknown; parentId?: unknown }) {
  const db = createMockAdminClient(); const text = label(input.label); const selectedSection = section(input.section); const parentId = typeof input.parentId === 'string' && input.parentId ? input.parentId : null;
  let code = slug(text); if (!code) throw new Error('The label must contain letters or numbers.');
  if (parentId) {
    const { data: parent, error } = await db.from('mock_topics').select('id,section,is_active,parent_id').eq('id', parentId).maybeSingle();
    if (error) throw error; if (!parent || parent.parent_id || !parent.is_active) throw new Error('Choose one active root topic as the parent.');
    if (parent.section !== selectedSection) throw new Error('A subtopic inherits its parent topic section.');
    code = `${parent.id.slice(0, 8)}-${code}`;
  }
  const { data, error } = await db.from('mock_topics').insert({ code, label: text, section: selectedSection, parent_id: parentId, is_active: true }).select('id,code,label,section,parent_id,is_active').single();
  if (error?.code === '23505') throw new Error('An active or inactive taxonomy value with that label already exists in this scope.');
  if (error) throw error;
  void userId;
  return data;
}

export async function updateTaxonomyValue(userId: string, id: string, input: { label?: unknown; isActive?: unknown }) {
  const db = createMockAdminClient(); const update: Record<string, unknown> = {};
  if (input.label !== undefined) { const text = label(input.label); update.label = text; }
  if (input.isActive !== undefined) update.is_active = input.isActive === true;
  if (!Object.keys(update).length) throw new Error('Provide a label or active-state change.');
  const { data, error } = await db.from('mock_topics').update(update).eq('id', id).select('id,code,label,section,parent_id,is_active').single();
  if (error?.code === '23505') throw new Error('An active or inactive taxonomy value with that label already exists in this scope.');
  if (error) throw error;
  void userId;
  return data;
}
