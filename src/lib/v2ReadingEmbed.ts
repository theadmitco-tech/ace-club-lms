/**
 * How a non-Notion reading is shown inside the course page. `source` is the already-authorized
 * address from v2CourseResourceHref: either a same-site file route or an https link.
 */
export type V2ReadingEmbed = { kind: 'document' | 'video'; src: string; external: boolean };

const GOOGLE_DOC = /^https:\/\/docs\.google\.com\/(document|spreadsheets|presentation|forms)\/d\/([\w-]+)/;
const DRIVE_FILE = /^https:\/\/drive\.google\.com\/file\/d\/([\w-]+)/;
const DRIVE_OPEN = /^https:\/\/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([\w-]+)/;
const CANVA = /^https:\/\/(?:www\.)?canva\.com\/design\/([\w-]+)\/([\w-]+)/;

export function v2ReadingEmbed(source: string | null): V2ReadingEmbed | null {
  if (!source) return null;
  // Files the site serves itself (PDFs, and course videos) open in place.
  if (source.startsWith('/api/')) {
    const format = new URLSearchParams(source.split('?')[1] ?? '').get('format');
    return { kind: format === 'mp4' || format === 'webm' ? 'video' : 'document', src: source, external: false };
  }
  let url: URL;
  try { url = new URL(source); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  const doc = source.match(GOOGLE_DOC);
  if (doc) return { kind: 'document', src: `https://docs.google.com/${doc[1]}/d/${doc[2]}/${doc[1] === 'forms' ? 'viewform?embedded=true' : 'preview'}`, external: true };
  const drive = source.match(DRIVE_FILE) ?? source.match(DRIVE_OPEN);
  if (drive) return { kind: 'document', src: `https://drive.google.com/file/d/${drive[1]}/preview`, external: true };
  const canva = source.match(CANVA);
  if (canva) return { kind: 'document', src: `https://www.canva.com/design/${canva[1]}/${canva[2]}/view?embed`, external: true };
  return { kind: 'document', src: url.toString(), external: true };
}
