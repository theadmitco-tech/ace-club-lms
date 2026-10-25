import { createHash } from 'node:crypto';

// Deterministic synthetic responses exercise browser behavior, not SQL correctness.
export const id = (value) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
export const fingerprint = (value) => createHash('md5').update(JSON.stringify(value)).digest('hex');
export const products = {
  full_batch: { label: 'Full Batch', sections: ['quant', 'verbal', 'di'], days: 56 },
  quant_crash: { label: 'Quant standalone course', sections: ['quant'], days: 7 },
  verbal_crash: { label: 'Verbal standalone course', sections: ['verbal'], days: 7 },
  di_crash: { label: 'DI standalone course', sections: ['di'], days: 7 },
};
export function template(code = 'full_batch', index = 1) {
  return { id: id(index), productCode: code, revision: 1, document: {
    title: `Synthetic ${products[code].label}`, summary: '', durationDays: products[code].days,
    events: [
      { key: id(index + 100), kind: 'live', title: 'Synthetic live lesson',
        section: products[code].sections[0], dayOffset: 0, localStartTime: '18:00',
        durationMinutes: 60, capacity: 8, instructor: 'Test instructor' },
      { key: id(index + 200), kind: 'outline', title: '', section: products[code].sections[0],
        dayOffset: null, localStartTime: null, durationMinutes: null, capacity: 8, instructor: '' },
    ],
  } };
}
export function batch(source = template(), index = 10) {
  return { id: id(index), productCode: source.productCode, templateId: source.id,
    templateRevision: source.revision, revision: 1, state: 'draft', title: 'Synthetic batch',
    startDate: '2026-11-02', timeZone: 'Asia/Kolkata', events: source.document.events.map((event) => ({
      key: event.key, kind: event.kind, title: event.title, section: event.section,
      localDate: event.kind === 'outline' ? null : '2026-11-02',
      localStartTime: event.localStartTime, durationMinutes: event.durationMinutes,
      capacity: 8, instructor: event.instructor, ...instants(event.kind, '2026-11-02', event.localStartTime, event.durationMinutes),
    })) };
}
function instants(kind, date, time, duration) {
  if (kind === 'outline') return { startsAt: null, endsAt: null };
  const start = new Date(`${date}T${time}:00+05:30`);
  return { startsAt: start.toISOString(), endsAt: new Date(+start + duration * 60000).toISOString() };
}
export function batchProposal(input, state) {
  const source = state.templates.find((item) => item.id === input.templateId);
  const previous = state.drafts.find((item) => item.id === input.id);
  const events = previous ? previous.events.map((event) => {
    const edit = input.events.find((item) => item.key === event.key);
    return { ...event, ...edit, ...instants(event.kind, edit.localDate, edit.localStartTime, edit.durationMinutes) };
  }) : source.document.events.map((event) => {
    const date = event.kind === 'outline' ? null
      : new Date(Date.parse(`${input.startDate}T00:00:00Z`) + event.dayOffset * 86400000).toISOString().slice(0, 10);
    return { key: event.key, kind: event.kind, title: event.title, section: event.section,
      localDate: date, localStartTime: event.localStartTime, durationMinutes: event.durationMinutes,
      capacity: 8, instructor: event.instructor, ...instants(event.kind, date, event.localStartTime, event.durationMinutes) };
  });
  const draft = { id: input.id, templateId: input.templateId, templateRevision: input.templateRevision,
    productCode: source.productCode, revision: input.expectedRevision + 1, state: 'draft',
    title: input.title, startDate: input.startDate, timeZone: input.timeZone, events };
  return { draft, fingerprint: fingerprint(draft) };
}
export function publicationProposal(input, state) {
  const draft = state.drafts.find((item) => item.id === input.batchId);
  const document = { batchId: draft.id, batchRevision: draft.revision, revision: input.expectedRevision + 1,
    state: input.action === 'publish' ? 'published' : 'unpublished', productCode: draft.productCode,
    title: draft.title, sections: products[draft.productCode].sections, timeZone: draft.timeZone,
    liveRegistrationLimit: draft.events.some((item) => item.kind !== 'outline') ? 8 : null,
    events: draft.events.map(({ key, title, section, kind, startsAt, endsAt, instructor }) => ({
      key, title, section, kind, startsAt, endsAt, instructor,
    })) };
  return { document, fingerprint: fingerprint(document) };
}
export function initialState() {
  const templates = Object.keys(products).map((code, index) => template(code, index + 1));
  return { templates, drafts: [batch(templates[0])], publications: [], meetings: {}, receipts: {},
    calls: [], faults: {}, readError: false, ownerId: 'synthetic-admin', worksheets: {} };
}
function upsert(items, record, key = 'id') {
  return [...items.filter((item) => item[key] !== record[key]), record];
}
export async function respond(state, method, args) {
  if (!Object.hasOwn(handlers, method)) throw new Error('Unknown fixture method');
  const copy = structuredClone(args);
  state.calls.push({ method, args: copy });
  const fault = state.faults[method];
  if (fault) {
    delete state.faults[method];
    if (fault.delay) await new Promise((resolve) => setTimeout(resolve, fault.delay));
    if (fault.error) return { status: 'error', message: fault.error };
    if (fault.invalidReceipt) return { data: { id: 'wrong-question' }, error: null };
    if (fault.interrupt) throw new Error('Synthetic transport interruption');
  }
  const result = handlers[method](state, ...copy);
  if (fault?.interruptAfterSave) throw new Error('Synthetic lost save confirmation');
  return result;
}
// These adapters intentionally do not claim authentication, RLS or database validation.
export function worksheet(state, materialId) {
  const key = `${state.ownerId}:${materialId}`;
  return state.worksheets[key] ??= { material_id: materialId, session_id: id(80), course_id: id(90), title: 'Synthetic worksheet',
    session_title: 'Synthetic class', section: 'QA', week_number: 1,
    questions: [1, 2].map(index => ({ id: id(300 + index), question_number: index, status: null, time_taken_seconds: null, comment: null, updated_at: null })) };
}
const handlers = {
  fixtureIdentity: (state, role) => ({ id: state.ownerId, role }),
  fixtureWorksheet: worksheet,
  fixtureSaveQuestion: (state, input) => {
    const question = worksheet(state, input.p_material_id).questions.find(q => q.id === input.p_question_id);
    Object.assign(question, { status: input.p_status, time_taken_seconds: input.p_time_taken_seconds, comment: input.p_comment, updated_at: new Date().toISOString() });
    return { data: question, error: null };
  },
  listV2TemplateDrafts: (state) => state.readError ? { status: 'error' } : { status: 'ready', templates: state.templates },
  listV2BatchDrafts: (state) => state.readError ? { status: 'error' } : { status: 'ready', drafts: state.drafts },
  listV2BatchPublications: (state) => state.readError ? { status: 'error' } : { status: 'ready', publications: state.publications },
  readV2MeetingDraft: (state, batchId) => ({ status: 'ready', draft: {
    batch: state.drafts.find((item) => item.id === batchId), revision: state.meetings[batchId]?.revision ?? 0,
    links: state.meetings[batchId]?.links ?? state.drafts.find((item) => item.id === batchId).events
      .filter((item) => item.kind !== 'outline').map((item) => ({ key: item.key, url: null })),
  } }),
  saveV2TemplateDraft: (state, input) => {
    if (state.receipts[input.requestId]) return { ...state.receipts[input.requestId], replayed: true };
    if ((state.templates.find(item => item.id === input.id)?.revision ?? 0) !== input.expectedRevision) return { status: 'error', message: 'Synthetic stale template. Reload the latest draft.' };
    const record = { id: input.id, productCode: input.productCode, revision: input.expectedRevision + 1, document: input.document };
    state.templates = upsert(state.templates, record);
    return state.receipts[input.requestId] = { status: 'success', template: record, replayed: false };
  },
  previewV2BatchDraft: (state, input) => ({ status: 'success', proposal: batchProposal(input, state) }),
  saveV2BatchDraft: (state, input) => {
    if (state.receipts[input.requestId]) return { ...state.receipts[input.requestId], replayed: true };
    if ((state.drafts.find(item => item.id === input.id)?.revision ?? 0) !== input.expectedRevision) return { status: 'error', message: 'Synthetic stale batch. Reload the latest draft.' };
    const { draft } = batchProposal(input, state);
    state.drafts = upsert(state.drafts, draft);
    return state.receipts[input.requestId] = { status: 'success', draft, replayed: false };
  },
  previewV2BatchPublication: (state, input) => ({ status: 'success', proposal: publicationProposal(input, state) }),
  saveV2BatchPublication: (state, input) => {
    if (state.receipts[input.requestId]) return { ...state.receipts[input.requestId], replayed: true };
    const { document } = publicationProposal(input, state);
    state.publications = upsert(state.publications, document, 'batchId');
    return state.receipts[input.requestId] = { status: 'success', document, replayed: false };
  },
  saveV2MeetingDraft: (state, input) => {
    if (state.receipts[input.requestId]) return {
      ...state.receipts[input.requestId], receipt: { ...state.receipts[input.requestId].receipt, replayed: true },
    };
    state.meetings[input.batchId] = { revision: input.expectedRevision + 1, links: input.links };
    return state.receipts[input.requestId] = { status: 'success', receipt: {
      batchId: input.batchId, batchRevision: input.batchRevision, revision: input.expectedRevision + 1, replayed: false,
    } };
  },
};
