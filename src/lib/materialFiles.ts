export const COURSE_MATERIALS_BUCKET = 'course-materials';
export const MAX_WORKSHEET_SIZE_BYTES = 50 * 1024 * 1024;
export const MAX_SESSION_MATERIAL_SIZE_BYTES = 50 * 1024 * 1024;

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const WORKSHEET_PATH_PATTERN = new RegExp(`^worksheets/${UUID_PATTERN}/${UUID_PATTERN}\\.pdf$`, 'i');
const SESSION_MATERIAL_PATH_PATTERN = new RegExp(`^session-materials/${UUID_PATTERN}/${UUID_PATTERN}\\.pdf$`, 'i');

export function createProtectedMaterialUrl(path: string) {
  return `/api/materials/file?path=${encodeURIComponent(path)}`;
}

export function getProtectedMaterialPath(fileReference: string) {
  if (!fileReference.startsWith('/api/materials/file?')) return null;
  try {
    const url = new URL(fileReference, 'https://materials.invalid');
    if (url.pathname !== '/api/materials/file') return null;
    const paths = url.searchParams.getAll('path');
    if (paths.length !== 1 || [...url.searchParams.keys()].some((key) => key !== 'path')) return null;
    return paths[0];
  } catch {
    return null;
  }
}

export function isWorksheetStoragePath(path: string) {
  return WORKSHEET_PATH_PATTERN.test(path);
}

export function isSessionMaterialStoragePath(path: string, sessionId?: string) {
  if (!SESSION_MATERIAL_PATH_PATTERN.test(path)) return false;
  return sessionId
    ? path.toLowerCase().startsWith(`session-materials/${sessionId.toLowerCase()}/`)
    : true;
}

export function isSupportedProtectedMaterialPath(path: string) {
  return isWorksheetStoragePath(path) || isSessionMaterialStoragePath(path);
}
