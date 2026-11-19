import { editableV2BatchEvents, type V2BatchDraft, type V2BatchInput } from './v2Batches';

export function deletedSessionInput(draft: V2BatchDraft, original: string[], sessionKey: string, requestId: string): V2BatchInput {
  const sessions = draft.sessions;
  if (!sessions || !['quant', 'verbal', 'di'].includes(draft.productCode)
    || sessions.length !== original.length || sessions.some((session, index) => session.key !== original[index])
    || new Set(original).size !== original.length || !original.includes(sessionKey)) {
    throw new Error('The session list changed. Close this dialog and reload the course before deleting.');
  }
  return {
    id: draft.id, templateId: draft.templateId, templateRevision: draft.templateRevision,
    expectedRevision: draft.revision, requestId, title: draft.title, startDate: draft.startDate,
    timeZone: draft.timeZone, events: editableV2BatchEvents(draft.events),
    sessions: sessions.filter(session => session.key !== sessionKey),
  };
}
