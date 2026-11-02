export const CONTENT_BUCKET='v2-course-content';
export const CONTENT_ORIGIN='https://eyphkkginlgoaxflauog.supabase.co';
export const CONTENT_UPLOAD_LIMIT=50*1024*1024;
export const CONTENT_MIME={mp4:'video/mp4',webm:'video/webm',pdf:'application/pdf'} as const;
export function contentAssetPath(value:string):string|null {
  const prefix=`${CONTENT_ORIGIN}/storage/v1/object/authenticated/${CONTENT_BUCKET}/`;
  if(!value.startsWith(prefix))return null;
  const path=value.slice(prefix.length);
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(mp4|webm|pdf)$/.test(path)?path:null;
}
export function contentAssetReference(path:string){return `${CONTENT_ORIGIN}/storage/v1/object/authenticated/${CONTENT_BUCKET}/${path}`;}
export function contentAssetExtension(path:string):keyof typeof CONTENT_MIME|null {const extension=path.split('.').at(-1);return extension&&Object.hasOwn(CONTENT_MIME,extension)?extension as keyof typeof CONTENT_MIME:null;}
