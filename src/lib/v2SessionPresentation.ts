import { isV2ContentUrl, type V2SessionContentKind } from './v2Templates';

export const V2_SESSION_STAGES: readonly { kind: V2SessionContentKind; title: string; description: string }[] = [
  { kind: 'preSessionReads', title: 'Pre-class read', description: 'Preparation before the session' },
  { kind: 'recordings', title: 'Recording', description: 'The session, ready to revisit' },
  { kind: 'postSessionReads', title: 'Post-class read', description: 'Key ideas and further reading' },
  { kind: 'materials', title: 'Worksheet', description: 'Practice and supporting material' },
];

export function v2ResourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function v2CourseResourceHref(value: string, context: {
  mode: 'admin-preview' | 'student'; sessionKey: string; itemKey: string; batchId?: string;
}): string | null {
  if (value.startsWith('/api/materials/file?path=') && isV2ContentUrl(value)) {
    if (context.mode === 'admin-preview') return value.replace('/api/materials/file?', '/api/admin/v2/materials/file?');
    if (!context.batchId) return null;
    return `/api/v2/materials/file?batchId=${encodeURIComponent(context.batchId)}&sessionKey=${encodeURIComponent(context.sessionKey)}&itemKey=${encodeURIComponent(context.itemKey)}`;
  }
  return v2ResourceUrl(value);
}
