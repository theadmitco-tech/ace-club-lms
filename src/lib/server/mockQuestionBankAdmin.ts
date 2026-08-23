import 'server-only';

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  ExistingMockContent,
  MockSection,
  MockTaxonomyEntry,
  ParseQuestionPackageContext,
} from '@/lib/mockQuestionBank/types';

export function createMockAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error('Question Bank server configuration is incomplete.');
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function loadQuestionPackageContext(userId: string): Promise<ParseQuestionPackageContext> {
  const admin = createMockAdminClient();
  const [memberships, topics, questionIdentities, questionRevisions, stimulusIdentities, stimulusRevisions, media, completedImports] = await Promise.all([
    admin.from('mock_source_namespace_members').select('namespace_id, mock_source_namespaces!inner(code, is_active)').eq('user_id', userId).eq('is_active', true),
    admin.from('mock_topics').select('id, section, label, parent_id').eq('is_active', true),
    admin.from('mock_questions').select('id, namespace_id, source_external_id'),
    admin.from('mock_question_revisions').select('question_id, content_fingerprint, status').order('revision_number', { ascending: false }),
    admin.from('mock_stimuli').select('id, namespace_id, source_external_id'),
    admin.from('mock_stimulus_revisions').select('stimulus_id, content_fingerprint, status, stimulus_kind').order('revision_number', { ascending: false }),
    admin.from('mock_media').select('namespace_id, source_external_id, sha256').eq('status', 'ready'),
    admin.from('mock_imports').select('package_fingerprint').eq('status', 'completed'),
  ]);
  const failed = [memberships, topics, questionIdentities, questionRevisions, stimulusIdentities, stimulusRevisions, media, completedImports].find((result) => result.error);
  if (failed?.error) throw failed.error;

  const namespaceCodeById = new Map<string, string>();
  for (const identity of [...(questionIdentities.data ?? []), ...(stimulusIdentities.data ?? [])]) {
    if (identity.namespace_id && !namespaceCodeById.has(identity.namespace_id)) {
      const { data } = await admin.from('mock_source_namespaces').select('code').eq('id', identity.namespace_id).maybeSingle();
      if (data?.code) namespaceCodeById.set(identity.namespace_id, data.code);
    }
  }
  for (const row of media.data ?? []) {
    if (row.namespace_id && !namespaceCodeById.has(row.namespace_id)) {
      const { data } = await admin.from('mock_source_namespaces').select('code').eq('id', row.namespace_id).maybeSingle();
      if (data?.code) namespaceCodeById.set(row.namespace_id, data.code);
    }
  }

  const revisionByQuestion = new Map<string, { fingerprint: string; status: string }>();
  for (const revision of questionRevisions.data ?? []) if (!revisionByQuestion.has(revision.question_id)) revisionByQuestion.set(revision.question_id, { fingerprint: revision.content_fingerprint, status: revision.status });
  const revisionByStimulus = new Map<string, { fingerprint: string; status: string; stimulusType: string }>();
  for (const revision of stimulusRevisions.data ?? []) if (!revisionByStimulus.has(revision.stimulus_id)) revisionByStimulus.set(revision.stimulus_id, { fingerprint: revision.content_fingerprint, status: revision.status, stimulusType: revision.stimulus_kind });

  const existing: ExistingMockContent = {
    questions: new Map(), stimuli: new Map(), assets: new Map(),
    questionFingerprints: new Set(), stimulusFingerprints: new Set(),
  };
  for (const identity of questionIdentities.data ?? []) {
    const revision = revisionByQuestion.get(identity.id);
    const code = namespaceCodeById.get(identity.namespace_id);
    if (revision && code) {
      existing.questions.set(`${code}::${identity.source_external_id}`, revision);
      existing.questionFingerprints.add(revision.fingerprint);
    }
  }
  for (const identity of stimulusIdentities.data ?? []) {
    const revision = revisionByStimulus.get(identity.id);
    const code = namespaceCodeById.get(identity.namespace_id);
    if (revision && code) {
      existing.stimuli.set(`${code}::${identity.source_external_id}`, revision);
      existing.stimulusFingerprints.add(revision.fingerprint);
    }
  }
  for (const asset of media.data ?? []) {
    const code = namespaceCodeById.get(asset.namespace_id);
    if (code) existing.assets.set(`${code}::${asset.source_external_id}`, { sha256: asset.sha256 });
  }

  const topicById = new Map((topics.data ?? []).map((topic) => [topic.id, topic]));
  const taxonomy: MockTaxonomyEntry[] = [];
  for (const topic of topics.data ?? []) {
    if (topic.parent_id) continue;
    taxonomy.push({ section: topic.section as MockSection, topic: topic.label, subtopic: null });
    for (const child of topics.data ?? []) if (child.parent_id === topic.id) taxonomy.push({ section: topic.section as MockSection, topic: topic.label, subtopic: child.label });
  }
  void topicById;

  const authorizedNamespaces = new Set<string>();
  for (const membership of memberships.data ?? []) {
    const relation = membership.mock_source_namespaces as unknown as { code: string; is_active: boolean } | null;
    if (relation?.is_active) authorizedNamespaces.add(relation.code);
  }
  return {
    authorizedNamespaces,
    taxonomy,
    existing,
    completedPackageFingerprints: new Set((completedImports.data ?? []).map((item) => item.package_fingerprint)),
  };
}

export type MockQuestionListItem = {
  revisionId: string;
  questionId: string;
  sourceId: string;
  namespace: string;
  section: string;
  questionType: string;
  responseType: string;
  topic: string;
  subtopic: string | null;
  difficulty: string;
  status: string;
  revisionNumber: number;
  stem: unknown;
  interaction: unknown;
  sourceReference: string;
  createdAt: string;
  options: Array<{ slotId: string; optionId: string; displayOrder: number; content: unknown }>;
};

export async function listMockQuestions(filters: Record<string, string | undefined>): Promise<MockQuestionListItem[]> {
  const admin = createMockAdminClient();
  let query = admin.from('mock_question_revisions').select(`
    id, question_id, revision_number, section, question_type, response_type, difficulty,
    status, stem_json, interaction_json, source_reference, created_at,
    mock_questions!mock_question_revisions_question_id_fkey!inner(source_external_id, mock_source_namespaces!inner(code)),
    topic:mock_topics!mock_question_revisions_topic_id_fkey(label),
    subtopic:mock_topics!mock_question_revisions_subtopic_id_fkey(label)
  `).eq('import_state', 'ready').order('created_at', { ascending: false }).limit(200);
  if (filters.section) query = query.eq('section', filters.section);
  if (filters.questionType) query = query.eq('question_type', filters.questionType);
  if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.query) query = query.ilike('mock_questions.source_external_id', `%${filters.query.replaceAll('%', '')}%`);
  const { data, error } = await query;
  if (error) throw error;
  const revisionIds = (data ?? []).map((row) => row.id);
  const { data: options, error: optionsError } = revisionIds.length
    ? await admin.from('mock_question_options').select('question_revision_id, response_slot_id, option_id, display_order, content_json').in('question_revision_id', revisionIds).order('display_order')
    : { data: [], error: null };
  if (optionsError) throw optionsError;
  return (data ?? []).map((row) => {
    const question = row.mock_questions as unknown as { source_external_id: string; mock_source_namespaces: { code: string } };
    const topic = row.topic as unknown as { label: string } | null;
    const subtopic = row.subtopic as unknown as { label: string } | null;
    return {
      revisionId: row.id, questionId: row.question_id, sourceId: question.source_external_id,
      namespace: question.mock_source_namespaces.code, section: row.section, questionType: row.question_type,
      responseType: row.response_type, topic: topic?.label ?? '', subtopic: subtopic?.label ?? null,
      difficulty: row.difficulty, status: row.status, revisionNumber: row.revision_number,
      stem: row.stem_json, interaction: row.interaction_json, sourceReference: row.source_reference,
      createdAt: row.created_at,
      options: (options ?? []).filter((option) => option.question_revision_id === row.id).map((option) => ({
        slotId: option.response_slot_id, optionId: option.option_id, displayOrder: option.display_order,
        content: option.content_json,
      })),
    };
  });
}

export async function loadMockQuestionBankReference(userId: string) {
  const admin = createMockAdminClient();
  const context = await loadQuestionPackageContext(userId);
  const [{ data: topics, error: topicsError }, { data: stimuli, error: stimuliError }, { data: namespaces, error: namespacesError }, { data: media, error: mediaError }] = await Promise.all([
    admin.from('mock_topics').select('id, label, section, parent_id').eq('is_active', true).order('label'),
    admin.from('mock_stimulus_revisions').select('id, stimulus_kind, content_json, mock_stimuli!mock_stimulus_revisions_stimulus_id_fkey!inner(source_external_id, namespace_id)').eq('status', 'draft').eq('import_state', 'ready').order('created_at', { ascending: false }),
    admin.from('mock_source_namespaces').select('id, code, display_name').eq('is_active', true).order('code'),
    admin.from('mock_media').select('id, namespace_id, source_external_id, alt_text').eq('status', 'ready').order('created_at', { ascending: false }),
  ]);
  if (topicsError || stimuliError || namespacesError || mediaError) throw topicsError ?? stimuliError ?? namespacesError ?? mediaError;
  const authorizedNamespaces = (namespaces ?? []).filter((namespace) => context.authorizedNamespaces.has(namespace.code));
  const namespaceById = new Map(authorizedNamespaces.map((namespace) => [namespace.id, namespace.code]));
  return {
    authorizedNamespaces,
    topics: topics ?? [],
    stimuli: (stimuli ?? []).flatMap((revision) => {
      const identity = revision.mock_stimuli as unknown as { source_external_id: string; namespace_id: string };
      const namespace = namespaceById.get(identity.namespace_id);
      return namespace ? [{ id: revision.id, sourceId: identity.source_external_id, namespace, stimulusType: revision.stimulus_kind, content: revision.content_json }] : [];
    }),
    media: (media ?? []).flatMap((asset) => {
      const namespace = namespaceById.get(asset.namespace_id);
      return namespace ? [{ id: asset.id, sourceId: asset.source_external_id, namespace, altText: asset.alt_text }] : [];
    }),
  };
}
