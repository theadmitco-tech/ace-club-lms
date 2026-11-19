import type { ContentCourse, ContentDocument, ContentItem, ContentTarget, ContentWorkspace } from './v2ContentPublishing';
import type { V2CourseSession, V2SessionContentKind } from './v2Templates';

export type ResourceRow = { key: string; title: string; url: string; target: ContentTarget; item: ContentItem | null };
export function resourceRows(workspace: ContentWorkspace, course: ContentCourse, session: V2CourseSession, kind: V2SessionContentKind): ResourceRow[] {
  const managed = workspace.items.filter(item => item.document.kind === kind && item.document.targets.some(t => t.batchId === course.batchId && t.sessionKey === session.key));
  const visibleOriginals = new Set(course.anchors.find(s => s.key === session.key)?.content[kind].map(r => r.key) ?? []);
  const rows: ResourceRow[] = session.content[kind].filter(resource => visibleOriginals.has(resource.key) && !managed.some(item => !item.deleted && item.document.targets.some(t => t.batchId === course.batchId && t.sessionKey === session.key && t.replaceKey === resource.key)))
    .map(resource => ({ ...resource, item: null, target: { batchId: course.batchId, sessionKey: session.key, publicationRevision: course.publicationRevision, placement: 'session', anchorKey: null, replaceKey: resource.key, order: (session.content[kind].indexOf(resource) + 1) * 100 } }));
  for (const item of managed.filter(item => !item.deleted)) {
    const target = item.document.targets.find(t => t.batchId === course.batchId && t.sessionKey === session.key)!;
    rows.push({ key: item.id, title: item.document.title, url: item.document.url!, target, item });
  }
  return rows.sort((a, b) => a.target.order - b.target.order || a.key.localeCompare(b.key));
}
export function resourceOrderDocuments(rows: ResourceRow[], kind: V2SessionContentKind): { row: ResourceRow; document: ContentDocument }[] {
  if (rows.length > 9999 || new Set(rows.map(row => row.key)).size !== rows.length) throw new Error('Reload the resource list before reordering.');
  if (rows.some(row => row.item && row.item.published_revision !== null && row.item.draft_revision !== row.item.published_revision)) throw new Error('Some resources have unpublished edits. Publish or resolve those edits before reordering.');
  const groups = new Map<string, ResourceRow[]>();
  for (const row of rows) {
    const key = `${row.target.placement}:${row.target.anchorKey ?? ''}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return rows.flatMap(row => {
    const group = groups.get(`${row.target.placement}:${row.target.anchorKey ?? ''}`)!;
    const order = (group.indexOf(row) + 1) * Math.min(100, Math.floor(9999 / group.length));
    if (order === row.target.order) return [];
    const target = { ...row.target, order };
    return [{ row, document: row.item ? { ...row.item.document, targets: row.item.document.targets.map(t => t.batchId === target.batchId && t.sessionKey === target.sessionKey ? target : t) } : { title: row.title, kind, url: row.url, targets: [target] } }];
  });
}
