import { editableV2BatchEvents, type V2BatchDraft, type V2BatchInput } from './v2Batches';

export function moveSessionKey(keys: string[], key: string, destination: number): string[] {
  const index = keys.indexOf(key);
  if (index < 0 || !Number.isInteger(destination) || destination < 0 || destination >= keys.length || index === destination) return keys;
  const result = [...keys];
  result.splice(index, 1);
  result.splice(destination, 0, key);
  return result;
}

export function reorderedSessionInput(draft: V2BatchDraft, original: string[], order: string[], requestId: string): V2BatchInput {
  const sessions = draft.sessions;
  if (!sessions || !['quant', 'verbal', 'di'].includes(draft.productCode)
    || sessions.length !== original.length || sessions.some((session, index) => session.key !== original[index])) {
    throw new Error('The session list changed. Close this editor and reload the course before reordering.');
  }
  if (order.length !== original.length || new Set(order).size !== original.length || order.some(key => !original.includes(key))) {
    throw new Error('The session order is incomplete. Reload the course before retrying.');
  }
  return {
    id: draft.id, templateId: draft.templateId, templateRevision: draft.templateRevision,
    expectedRevision: draft.revision, requestId, title: draft.title, startDate: draft.startDate,
    timeZone: draft.timeZone, events: editableV2BatchEvents(draft.events),
    sessions: order.map(key => sessions.find(session => session.key === key)!),
  };
}
