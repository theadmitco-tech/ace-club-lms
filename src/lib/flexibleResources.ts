import { getProtectedMaterialPath, isSessionMaterialStoragePath, isWorksheetStoragePath } from './materialFiles.ts';
import { isSupportedYoutubeUrl } from './youtube.ts';

export const RESOURCE_CATEGORIES = [
  'starter_pack',
  'pre_read',
  'worksheet',
  'session_material',
  'recording',
  'post_class',
  'reference',
  'other',
] as const;

export const RESOURCE_SCOPES = ['batch', 'section', 'event', 'standalone'] as const;
export const RESOURCE_FORMATS = ['notion', 'pdf', 'youtube', 'text'] as const;

export type ResourceCategory = typeof RESOURCE_CATEGORIES[number];
export type ResourceScope = typeof RESOURCE_SCOPES[number];
export type ResourceFormat = typeof RESOURCE_FORMATS[number];

export type FlexibleResourceDraft = {
  courseId: string;
  materialId?: string | null;
  title: string;
  category: ResourceCategory;
  scope: ResourceScope;
  format: ResourceFormat;
  sectionKey?: string | null;
  sessionId?: string | null;
  notionUrl?: string | null;
  videoUrl?: string | null;
  fileUrl?: string | null;
  textContent?: string | null;
};

export type FlexibleResourceValidation =
  | { valid: true; draft: FlexibleResourceDraft }
  | { valid: false; errors: string[] };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SECTION_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSupportedNotionUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && (
      host === 'notion.so'
      || host.endsWith('.notion.so')
      || host === 'notion.site'
      || host.endsWith('.notion.site')
    );
  } catch {
    return false;
  }
}

export function validateFlexibleResourceDraft(raw: unknown): FlexibleResourceValidation {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Resource data is required.'] };
  }

  const value = raw as Partial<FlexibleResourceDraft>;
  const courseId = typeof value.courseId === 'string' ? value.courseId.trim() : '';
  const materialId = typeof value.materialId === 'string' ? value.materialId.trim() : null;
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const category = value.category as ResourceCategory;
  const scope = value.scope as ResourceScope;
  const format = value.format as ResourceFormat;
  const sectionKey = typeof value.sectionKey === 'string' && value.sectionKey.trim()
    ? value.sectionKey.trim()
    : null;
  const sessionId = typeof value.sessionId === 'string' && value.sessionId.trim()
    ? value.sessionId.trim()
    : null;
  const notionUrl = typeof value.notionUrl === 'string' && value.notionUrl.trim()
    ? value.notionUrl.trim()
    : null;
  const videoUrl = typeof value.videoUrl === 'string' && value.videoUrl.trim()
    ? value.videoUrl.trim()
    : null;
  const fileUrl = typeof value.fileUrl === 'string' && value.fileUrl.trim()
    ? value.fileUrl.trim()
    : null;
  const textContent = typeof value.textContent === 'string' && value.textContent.trim()
    ? value.textContent.trim()
    : null;
  const errors: string[] = [];

  if (!UUID_PATTERN.test(courseId)) errors.push('Choose a valid batch.');
  if (materialId && !UUID_PATTERN.test(materialId)) errors.push('The selected resource is invalid.');
  if (!title || title.length > 160) errors.push('Enter a title of 160 characters or fewer.');
  if (!RESOURCE_CATEGORIES.includes(category)) errors.push('Choose a supported resource category.');
  if (!RESOURCE_SCOPES.includes(scope)) errors.push('Choose a supported resource association.');
  if (!RESOURCE_FORMATS.includes(format)) errors.push('Choose a supported resource format.');

  if (scope === 'event') {
    if (!sessionId || !UUID_PATTERN.test(sessionId)) errors.push('Choose an event for an event resource.');
  } else if (sessionId) {
    errors.push('Only event resources can be attached to an event.');
  }

  if (scope === 'section') {
    if (!sectionKey || !SECTION_KEY_PATTERN.test(sectionKey)) errors.push('Choose a Section for a Section resource.');
  } else if (sectionKey) {
    errors.push('Only Section resources can carry a Section association.');
  }

  if ((category === 'recording' || category === 'session_material') && scope !== 'event') {
    errors.push('Recordings and Session materials must belong to one batch event.');
  }
  if (category === 'pre_read' && format !== 'notion') errors.push('Pre-reads use a Notion link.');
  if (category === 'worksheet' && format !== 'pdf') errors.push('Worksheets use a protected PDF.');
  if (category === 'session_material' && format !== 'pdf') errors.push('Session materials use a protected PDF.');
  if (category === 'recording' && format !== 'youtube') errors.push('Recordings use a YouTube link.');
  if (category === 'starter_pack' && format !== 'notion' && format !== 'text') {
    errors.push('Starter packs use a Notion link or short text instructions.');
  }

  if (format === 'notion' && (!notionUrl || !isSupportedNotionUrl(notionUrl))) {
    errors.push('Enter a valid notion.so or notion.site HTTPS link.');
  }
  if (format === 'youtube' && (!videoUrl || !isSupportedYoutubeUrl(videoUrl))) {
    errors.push('Enter a valid YouTube or youtu.be link.');
  }
  if (format === 'text' && (!textContent || textContent.length > 2000)) {
    errors.push('Enter text instructions of 2,000 characters or fewer.');
  }
  if (format === 'pdf') {
    const path = fileUrl ? getProtectedMaterialPath(fileUrl) : null;
    const validPath = category === 'worksheet'
      ? Boolean(path && isWorksheetStoragePath(path))
      : category === 'session_material'
        ? Boolean(path && sessionId && isSessionMaterialStoragePath(path, sessionId))
        : false;
    if (!validPath) errors.push('Upload the protected PDF before saving this resource.');
  }

  if (errors.length > 0) return { valid: false, errors };
  return {
    valid: true,
    draft: {
      courseId,
      materialId,
      title,
      category,
      scope,
      format,
      sectionKey,
      sessionId,
      notionUrl: format === 'notion' ? notionUrl : null,
      videoUrl: format === 'youtube' ? videoUrl : null,
      fileUrl: format === 'pdf' ? fileUrl : null,
      textContent: format === 'text' ? textContent : null,
    },
  };
}

export function getResourceCategoryLabel(category: ResourceCategory) {
  return ({
    starter_pack: 'Starter Pack',
    pre_read: 'Pre-read',
    worksheet: 'Worksheet',
    session_material: 'Session Material',
    recording: 'Recording',
    post_class: 'Post-class',
    reference: 'Reference',
    other: 'Other',
  } satisfies Record<ResourceCategory, string>)[category];
}
