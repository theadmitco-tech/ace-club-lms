import { courseReadmePosition } from './v2CourseReadmes';
import type { V2SessionContentKind } from './v2Templates';
import { editableV2BatchEvents, type V2BatchDraft, type V2BatchInput } from './v2Batches';

export function deletedSessionInput(draft: V2BatchDraft, original: string[], sessionKey: string, requestId: string, resourceOnly = false): V2BatchInput {
  if (!resourceOnly && courseReadmePosition(sessionKey)) throw new Error('The course README pages are permanent. Their resources can be edited or removed.');
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

export function deletedResourceInput(draft: V2BatchDraft, original: string[], sessionKey: string, resource: { kind: V2SessionContentKind; key: string }, requestId: string): V2BatchInput {
  const input = deletedSessionInput(draft, original, sessionKey, requestId, true);
  const session = draft.sessions!.find(item => item.key === sessionKey)!;
  if (!session.content[resource.kind].some(item => item.key === resource.key)) throw new Error('The resource changed. Reload the course before deleting.');
  return { ...input, sessions: draft.sessions!.map(item => item.key !== sessionKey ? item : { ...item, content: { ...item.content, [resource.kind]: item.content[resource.kind].filter(entry => entry.key !== resource.key) } }) };
}
