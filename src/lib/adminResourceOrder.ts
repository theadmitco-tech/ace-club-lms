import type { ContentDocument, ContentTarget, ContentWorkspace } from './v2ContentPublishing';

export function resourceOrderChoices(document: ContentDocument, target: ContentTarget, workspace: ContentWorkspace, itemId?: string) {
  const course = workspace.courses.find(item => item.batchId === target.batchId);
  const session = course?.sessions.find(item => item.key === target.sessionKey);
  const managed = workspace.items.filter(item => !item.deleted && item.id !== itemId && item.document.kind === document.kind)
    .flatMap(item => item.document.targets.filter(t => t.batchId === target.batchId && t.sessionKey === target.sessionKey)
      .map(t => ({ title: item.document.title, order: t.order, target: t, document: item.document })));
  const peers = managed.filter(item => item.target.placement === target.placement && item.target.anchorKey === target.anchorKey)
    .map(item => ({ title: item.title, order: item.order }));
  if (target.placement === 'session' && document.kind !== 'heading') {
    session?.content[document.kind].forEach((item, index) => {
      if (item.key !== target.replaceKey && !managed.some(m => m.target.replaceKey === item.key)) peers.push({ title: item.title, order: (index + 1) * 100 });
    });
  }
  peers.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  const options: { value: number; label: string }[] = [];
  for (let index = 0; index <= peers.length; index++) {
    const lower = index === 0 ? -1 : peers[index - 1].order;
    const upper = index === peers.length ? 10000 : peers[index].order;
    if (upper - lower < 2) continue;
    const value = index === 0 ? 0 : index === peers.length ? Math.min(9999, lower + 100) : Math.floor((lower + upper) / 2);
    options.push({ value, label: index < peers.length ? `Before ${peers[index].title}` : peers.length ? `After ${peers[index - 1].title}` : 'First resource' });
  }
  if (!options.some(option => option.value === target.order)) options.unshift({ value: target.order, label: 'Keep current position' });
  return { options, peers };
}
