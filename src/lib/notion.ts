
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
