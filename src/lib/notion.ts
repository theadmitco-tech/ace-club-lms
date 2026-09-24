
/**
 * Extracts Notion Page ID from a URL.
 * Supports standard Notion URLs.
 */
export function extractNotionPageId(url: string): string | null {
  const hyphenatedMatch = url.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  if (hyphenatedMatch) return hyphenatedMatch[0].replace(/-/g, '');

  const match = url.match(/([a-f0-9]{32})/);
  if (match) return match[1];
  
  // Also support short IDs if they exist
  const parts = url.split('-');
  const lastPart = parts[parts.length - 1];
  if (lastPart && lastPart.length >= 32) return lastPart.slice(0, 32);
  
  return null;
}

/**
 * Returns a safe public Notion URL from either a copied link or iframe markup.
 */
export function getPublicNotionUrl(sourceUrl?: string | null): string | null {
  if (!sourceUrl) return null;

  const iframeSrc = sourceUrl.match(/src=["']([^"']+)["']/i)?.[1];
  const candidate = (iframeSrc ?? sourceUrl).replaceAll('&amp;', '&').trim();

  try {
    const url = new URL(candidate);
    const isNotionHost = url.hostname === 'notion.so'
      || url.hostname.endsWith('.notion.so')
      || url.hostname === 'notion.site'
      || url.hostname.endsWith('.notion.site');

    return url.protocol === 'https:' && isNotionHost ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Normalizes every supported public Notion link to Notion's iframe route.
 * This avoids relying on Notion's private loadPageChunk API for copied links.
 */
export function getNotionEmbedUrl(
  sourceUrl: string | null | undefined,
  pageId: string,
): string | null {
  const notionUrl = getPublicNotionUrl(sourceUrl);
  if (!notionUrl) return null;

  const url = new URL(notionUrl);
  url.pathname = `/ebd/${pageId}`;
  url.search = '';
  url.hash = '';
  return url.toString();
}
