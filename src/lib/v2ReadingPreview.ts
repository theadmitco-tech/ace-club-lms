/** Only recognized public Notion page URLs can enter the draft reader. */
export function v2ReadingPageId(source: string): string | null {
  try {
    const url = new URL(source);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname.split('/').includes('ebd')
      || !(url.hostname === 'notion.so' || url.hostname.endsWith('.notion.so')
        || url.hostname === 'notion.site' || url.hostname.endsWith('.notion.site'))) return null;
    const ids = url.pathname.split('/').map((part) => part.match(/(?:^|-)([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i)?.[1])
      .filter((id): id is string => Boolean(id));
    return ids.length === 1 ? ids[0].replaceAll('-', '').toLowerCase() : null;
  } catch { return null; }
}

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

/** A missing, deleted or empty page must not be reported as a rendered preview. */
export function hasV2ReadingContent(value: unknown, pageId: string): boolean {
  if (!/^[a-f0-9]{32}$/.test(pageId) || !object(value) || !object(value.block)) return false;
  const blocks = value.block;
  const root = Object.values(blocks).find((entry) => object(entry) && object(entry.value)
    && typeof entry.value.id === 'string' && entry.value.id.replaceAll('-', '').toLowerCase() === pageId);
  if (!object(root) || !object(root.value) || root.value.type !== 'page' || root.value.alive === false
    || !Array.isArray(root.value.content) || root.value.content.length === 0) return false;
  const visited = new Set<string>();
  const containsContent = (key: unknown): boolean => {
    if (typeof key !== 'string' || visited.has(key) || !object(blocks[key]) || !object(blocks[key].value)) return false;
    visited.add(key);
    const block = blocks[key].value;
    if (block.alive === false || typeof block.type !== 'string') return false;
    const properties = object(block.properties) ? Object.values(block.properties) : [];
    const hasText = properties.some((parts) => Array.isArray(parts) && parts.some((part) =>
      Array.isArray(part) && typeof part[0] === 'string' && part[0].trim().length > 0));
    const hasImage = block.type === 'image' && object(block.format)
      && typeof block.format.display_source === 'string' && block.format.display_source.trim().length > 0;
    return hasText || hasImage || (Array.isArray(block.content) && block.content.some(containsContent));
  };
  return root.value.content.some(containsContent);
}
