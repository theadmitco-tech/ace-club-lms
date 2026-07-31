export const COURSE_MATERIALS_BUCKET = 'course-materials';
export const MAX_WORKSHEET_SIZE_BYTES = 50 * 1024 * 1024;

export function createProtectedMaterialUrl(path: string) {
  return `/api/materials/file?path=${encodeURIComponent(path)}`;
}
