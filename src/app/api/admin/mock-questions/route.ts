import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  MOCK_DIFFICULTIES,
  MOCK_QUESTION_TYPES,
  MOCK_RESPONSE_TYPES,
  type MockDifficulty,
  type MockQuestionType,
  type MockResponseType,
  type NormalizedOption,
  type NormalizedQuestion,
  type NormalizedStimulus,
} from '@/lib/mockQuestionBank/types';
import { expectedSection, responseTypeAllowed, sha256, stableStringify, validateRichContent, validateSafeJson } from '@/lib/mockQuestionBank/validation';
import { requireAdmin } from '@/lib/server/requireAdmin';
import { loadQuestionPackageContext } from '@/lib/server/mockQuestionBankAdmin';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
const HEADERS = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

type ManualBody = {
  namespace?: unknown;
  questionType?: unknown;
  responseType?: unknown;
  topic?: unknown;
  subtopic?: unknown;
  difficulty?: unknown;
  sourceReference?: unknown;
  stem?: unknown;
  interaction?: unknown;
  options?: unknown;
  answerConfirmation?: unknown;
  answerCheck?: unknown;
  validationStatus?: unknown;
  validationNotes?: unknown;
  existingStimulusId?: unknown;
  stimulus?: unknown;
};

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: HEADERS });
}

function parseOptions(value: unknown): { options: NormalizedOption[]; error?: string } {
  if (!Array.isArray(value) || value.length < 2) return { options: [], error: 'Provide at least two response options.' };
  const options: NormalizedOption[] = [];
  const identities = new Set<string>();
  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return { options: [], error: 'Every response option must be an object.' };
    const item = candidate as Record<string, unknown>;
    const slotId = typeof item.slotId === 'string' ? item.slotId.trim() : '';
    const optionId = typeof item.optionId === 'string' ? item.optionId.trim() : '';
    const displayOrder = typeof item.displayOrder === 'number' ? item.displayOrder : Number(item.displayOrder);
    const content = validateRichContent(item.content);
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(slotId) || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(optionId)) return { options: [], error: 'Option slot and option IDs must be stable safe IDs.' };
    if (!Number.isInteger(displayOrder) || displayOrder < 1) return { options: [], error: 'Option display order must be a positive integer.' };
    if (!content.value) return { options: [], error: content.errors[0] ?? 'Option content is invalid.' };
    const identity = `${slotId}::${optionId}`;
    if (identities.has(identity)) return { options: [], error: 'Response option IDs must be unique within a slot.' };
    identities.add(identity);
    options.push({ slotId, optionId, displayOrder, content: content.value, isCorrect: item.isCorrect === true });
  }
  const slots = new Map<string, NormalizedOption[]>();
  for (const option of options) slots.set(option.slotId, [...(slots.get(option.slotId) ?? []), option]);
  for (const [slotId, slotOptions] of slots) if (slotOptions.filter((option) => option.isCorrect).length !== 1) return { options: [], error: `Slot ${slotId} must have exactly one correct option.` };
  return { options };
}

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return authorization.response;
  let body: ManualBody;
  try {
    body = await request.json() as ManualBody;
  } catch {
    return response({ error: 'Question request must be valid JSON.' }, 400);
  }
  const namespace = typeof body.namespace === 'string' ? body.namespace.trim().toUpperCase() : '';
  const questionType = typeof body.questionType === 'string' ? body.questionType.trim().toUpperCase() as MockQuestionType : '' as MockQuestionType;
  const responseType = typeof body.responseType === 'string' ? body.responseType.trim().toLowerCase() as MockResponseType : '' as MockResponseType;
  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  const subtopic = typeof body.subtopic === 'string' && body.subtopic.trim() ? body.subtopic.trim() : null;
  const difficulty = typeof body.difficulty === 'string' ? body.difficulty.trim().toLowerCase() as MockDifficulty : '' as MockDifficulty;
  const sourceReference = typeof body.sourceReference === 'string' ? body.sourceReference.trim() : '';
  const answerConfirmation = body.answerConfirmation === 'SOURCE_CONFIRMED' ? 'SOURCE_CONFIRMED' : 'FOUNDER_CONFIRMED';
  const answerCheck = body.answerCheck === 'UNVERIFIABLE_REVIEW' ? 'UNVERIFIABLE_REVIEW' : 'PASS';
  const validationStatus = body.validationStatus === 'REVIEW' ? 'REVIEW' : 'READY';
  const validationNotes = typeof body.validationNotes === 'string' && body.validationNotes.trim() ? body.validationNotes.trim() : null;
  if (!MOCK_QUESTION_TYPES.includes(questionType)) return response({ error: 'Choose a supported question type.' }, 400);
  if (!MOCK_RESPONSE_TYPES.includes(responseType) || !responseTypeAllowed(questionType, responseType)) return response({ error: 'Response type is incompatible with question type.' }, 400);
  if (!MOCK_DIFFICULTIES.includes(difficulty)) return response({ error: 'Choose Easy, Medium, or Hard.' }, 400);
  if (!sourceReference || sourceReference.length > 1000) return response({ error: 'A source filename or URL is required.' }, 400);
  const stem = validateRichContent(body.stem);
  if (!stem.value) return response({ error: stem.errors[0] ?? 'Question content is invalid.' }, 400);
  if (!body.interaction || typeof body.interaction !== 'object' || Array.isArray(body.interaction)) return response({ error: 'Interaction configuration must be an object.' }, 400);
  const interactionErrors = validateSafeJson(body.interaction);
  if (interactionErrors.length) return response({ error: interactionErrors[0] }, 400);
  const parsedOptions = parseOptions(body.options);
  if (parsedOptions.error) return response({ error: parsedOptions.error }, 400);
  const slotCount = new Set(parsedOptions.options.map((option) => option.slotId)).size;
  if (responseType === 'single_choice' && slotCount !== 1) return response({ error: 'Single-choice questions require one response slot.' }, 400);
  if (responseType === 'two_part_matrix' && slotCount !== 2) return response({ error: 'TPA requires exactly two response slots.' }, 400);

  let context;
  try {
    context = await loadQuestionPackageContext(authorization.userId);
  } catch (error) {
    console.error('Manual question reference load failed:', error);
    return response({ error: 'Unable to load Question Bank reference data.' }, 500);
  }
  if (!context.authorizedNamespaces.has(namespace)) return response({ error: 'You are not an active member of that contributor namespace.' }, 403);
  const section = expectedSection(questionType);
  const taxonomyMatches = context.taxonomy.filter((entry) => entry.section === section && entry.topic.toLowerCase() === topic.toLowerCase() && (entry.subtopic ?? '').toLowerCase() === (subtopic ?? '').toLowerCase());
  if (taxonomyMatches.length !== 1) return response({ error: 'Choose one active canonical topic/subtopic.' }, 400);

  const questionUuid = randomUUID();
  const sourceQuestionId = `Q-${questionType}-${questionUuid}`;
  const options = parsedOptions.options;
  const answer: Record<string, string> = {};
  for (const option of options.filter((candidate) => candidate.isCorrect)) answer[option.slotId] = option.optionId;
  let sourceStimulusId = typeof body.existingStimulusId === 'string' && body.existingStimulusId.trim() ? body.existingStimulusId.trim() : null;
  const stimuli: NormalizedStimulus[] = [];
  if (body.stimulus && typeof body.stimulus === 'object' && !Array.isArray(body.stimulus)) {
    const stimulusInput = body.stimulus as Record<string, unknown>;
    const stimulusType = typeof stimulusInput.stimulusType === 'string' ? stimulusInput.stimulusType : '';
    const allowed = ['rich_text', 'passage', 'graphic', 'sortable_table', 'tabbed_content', 'two_part_context'];
    if (!allowed.includes(stimulusType)) return response({ error: 'Choose a supported shared stimulus type.' }, 400);
    const contentErrors = validateSafeJson(stimulusInput.content);
    if (contentErrors.length) return response({ error: contentErrors[0] }, 400);
    if (stimulusType === 'graphic') {
      const graphicContent = stimulusInput.content && typeof stimulusInput.content === 'object' && !Array.isArray(stimulusInput.content) ? stimulusInput.content as Record<string, unknown> : {};
      const assetId = typeof graphicContent.asset_id === 'string' ? graphicContent.asset_id : '';
      if (!assetId || !context.existing.assets.has(`${namespace}::${assetId}`)) return response({ error: 'Graphic stimulus must reference an existing ready protected asset ID from this namespace.' }, 400);
    }
    sourceStimulusId = `STIM-${randomUUID()}`;
    const config = stimulusInput.config && typeof stimulusInput.config === 'object' ? stimulusInput.config : {};
    stimuli.push({
      sourceNamespace: namespace, sourceStimulusId, stimulusType: stimulusType as NormalizedStimulus['stimulusType'],
      title: typeof stimulusInput.title === 'string' && stimulusInput.title.trim() ? stimulusInput.title.trim() : null,
      content: stimulusInput.content, config, revisionNote: 'Created in Admin Question Editor', action: 'reject',
      contentFingerprint: sha256(stableStringify({ stimulusType, content: stimulusInput.content, config })),
    });
  }
  if (sourceStimulusId && !stimuli.length && !context.existing.stimuli.has(`${namespace}::${sourceStimulusId}`)) return response({ error: 'Selected shared stimulus is not available in this namespace.' }, 400);
  const expectedStimulus: Partial<Record<MockQuestionType, string>> = { RC: 'passage', GI: 'graphic', TI: 'sortable_table', MSR: 'tabbed_content', TPA: 'two_part_context' };
  if (expectedStimulus[questionType] && !sourceStimulusId) return response({ error: `${questionType} requires a compatible shared stimulus.` }, 400);
  const selectedStimulusType = stimuli[0]?.stimulusType ?? (sourceStimulusId ? context.existing.stimuli.get(`${namespace}::${sourceStimulusId}`)?.stimulusType : undefined);
  if (expectedStimulus[questionType] && selectedStimulusType && selectedStimulusType !== expectedStimulus[questionType]) return response({ error: `${questionType} requires a ${expectedStimulus[questionType]} stimulus.` }, 400);

  const question: NormalizedQuestion = {
    sourceNamespace: namespace, sourceQuestionId, section, questionType, responseType, topic, subtopic, difficulty,
    sourceStimulusId, stimulusGroupOrder: sourceStimulusId ? 1 : null, stem: stem.value, interaction: body.interaction as Record<string, unknown>,
    explanation: null, sourceReference, answerConfirmation, answerCheck, assetCheck: 'NOT_APPLICABLE', validationStatus,
    validationNotes, action: 'reject', options, answer,
    contentFingerprint: sha256(stableStringify({ section, questionType, responseType, topic, subtopic, stem: stem.value, interaction: body.interaction, sourceStimulusId, options: options.map((option) => ({ slotId: option.slotId, optionId: option.optionId, displayOrder: option.displayOrder, content: option.content })) })),
  };
  const packageId = `manual-${questionUuid}`;
  const payload = { questions: [question], stimuli, assets: [] };
  const fingerprint = sha256(stableStringify({ packageId, payload }));
  const previewDigest = sha256(stableStringify(payload));
  const supabase = await createClient();
  const { data: begin, error: beginError } = await supabase.rpc('begin_mock_question_import', {
    p_package_id: packageId, p_package_fingerprint: fingerprint, p_preview_digest: previewDigest,
    p_namespace_code: namespace, p_payload: payload, p_operation_manifest: { operation: 'manual-editor' },
  });
  if (beginError) return response({ error: beginError.message }, beginError.code === '42501' ? 403 : 409);
  const importId = (begin as { importId?: string } | null)?.importId;
  if (!importId) return response({ error: 'Draft audit operation was not created.' }, 500);
  const report = { sourceQuestionId, createdAt: new Date().toISOString(), source: 'manual-editor' };
  const { error: finalizeError } = await supabase.rpc('finalize_mock_question_import', { p_import_id: importId, p_result_report: report });
  if (finalizeError) {
    await supabase.rpc('fail_mock_question_import', { p_import_id: importId, p_reason: finalizeError.message });
    return response({ error: finalizeError.message }, 409);
  }
  return response({ importId, sourceQuestionId, status: 'draft' }, 201);
}

export async function PATCH(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return authorization.response;
  let body: { revisionId?: unknown; stem?: unknown; interaction?: unknown; sourceReference?: unknown; validationNotes?: unknown; options?: unknown };
  try { body = await request.json() as typeof body; } catch { return response({ error: 'Question request must be valid JSON.' }, 400); }
  const revisionId = typeof body.revisionId === 'string' ? body.revisionId : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(revisionId)) return response({ error: 'Choose a valid Draft revision.' }, 400);
  const stem = validateRichContent(body.stem);
  if (!stem.value) return response({ error: stem.errors[0] ?? 'Question content is invalid.' }, 400);
  if (!body.interaction || typeof body.interaction !== 'object' || Array.isArray(body.interaction)) return response({ error: 'Interaction configuration must be an object.' }, 400);
  const interactionErrors = validateSafeJson(body.interaction);
  if (interactionErrors.length) return response({ error: interactionErrors[0] }, 400);
  const parsedOptions = parseOptions(body.options);
  if (parsedOptions.error) return response({ error: parsedOptions.error }, 400);
  const sourceReference = typeof body.sourceReference === 'string' ? body.sourceReference.trim() : '';
  if (!sourceReference || sourceReference.length > 1000) return response({ error: 'A source filename or URL is required.' }, 400);
  const validationNotes = typeof body.validationNotes === 'string' ? body.validationNotes.trim() : '';
  const fingerprint = sha256(stableStringify({ stem: stem.value, interaction: body.interaction, options: parsedOptions.options.map((option) => ({ slotId: option.slotId, optionId: option.optionId, displayOrder: option.displayOrder, content: option.content })) }));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('update_mock_question_draft', {
    p_revision_id: revisionId,
    p_stem: stem.value,
    p_interaction: body.interaction,
    p_source_reference: sourceReference,
    p_validation_notes: validationNotes,
    p_content_fingerprint: fingerprint,
    p_options: parsedOptions.options,
  });
  if (error) return response({ error: error.message }, error.code === '42501' ? 403 : 409);
  return response(data);
}
