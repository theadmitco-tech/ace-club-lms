import { V2_PRODUCTION_PROJECT, V2_STAGING_PROJECT, exactHttpsOrigin } from './v2Environment';

export const CONTENT_BUCKET='v2-course-content';
export const CONTENT_UPLOAD_LIMIT=50*1024*1024;
export const CONTENT_MIME={mp4:'video/mp4',webm:'video/webm',pdf:'application/pdf'} as const;

const ALLOWED_CONTENT_ORIGINS:readonly string[]=[V2_STAGING_PROJECT.supabaseOrigin,V2_PRODUCTION_PROJECT.supabaseOrigin];

/**
 * Storage origin for private course content in this deployment: its own approved Supabase
 * project, or null. A reference from any other project is never treated as a content asset,
 * so Production never signs or fetches a staging reference just because the object path matches.
 */
export function contentOrigin(value:string|undefined=process.env.NEXT_PUBLIC_SUPABASE_URL):string|null {
  const origin=exactHttpsOrigin(value);
  return origin&&ALLOWED_CONTENT_ORIGINS.includes(origin)?origin:null;
}
export function contentAssetPath(value:string,origin:string|null=contentOrigin()):string|null {
  if(!origin||!ALLOWED_CONTENT_ORIGINS.includes(origin))return null;
  const prefix=`${origin}/storage/v1/object/authenticated/${CONTENT_BUCKET}/`;
  if(!value.startsWith(prefix))return null;
  const path=value.slice(prefix.length);
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(mp4|webm|pdf)$/.test(path)?path:null;
}
export function contentAssetReference(path:string,origin:string):string{return `${origin}/storage/v1/object/authenticated/${CONTENT_BUCKET}/${path}`;}
export function contentAssetExtension(path:string):keyof typeof CONTENT_MIME|null {const extension=path.split('.').at(-1);return extension&&Object.hasOwn(CONTENT_MIME,extension)?extension as keyof typeof CONTENT_MIME:null;}
