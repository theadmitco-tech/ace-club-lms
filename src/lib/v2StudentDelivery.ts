import { isV2MeetingBatchId, isV2MeetingUrl } from './v2Meetings';
import { isV2CourseSessionSection, isV2SessionContent, isV2TemplateProduct, type V2CourseCode, type V2CourseSession } from './v2Templates';

export type V2PublishedCourse = { batchId: string; publicationRevision: number; batchRevision: number; title: string; productCode: V2CourseCode; sessions: V2CourseSession[] };
export type V2LiveClassStatus = { eventKey: string; title: string; publicationRevision: number; completedAt: string | null };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, names: string[]) => Object.keys(v).length === names.length && names.every((key) => Object.hasOwn(v, key));
const revision = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= 2147483647;
const title = (v: unknown): v is string => typeof v === 'string' && v.length <= 120 && v.trim().length > 0;
export function isV2PublishedCourse(v: unknown): v is V2PublishedCourse {
  return object(v) && keys(v, ['batchId','publicationRevision','batchRevision','title','productCode','sessions'])
    && isV2MeetingBatchId(v.batchId) && revision(v.publicationRevision) && revision(v.batchRevision) && title(v.title) && isV2TemplateProduct(v.productCode)
    && Array.isArray(v.sessions) && v.sessions.length <= 200 && v.sessions.every((s) => object(s) && keys(s,['key','title','section','content'])
      && isV2MeetingBatchId(s.key) && title(s.title) && isV2CourseSessionSection(v.productCode as V2CourseCode,s.section) && isV2SessionContent(s.content))
    && new Set(v.sessions.map((s) => s.key)).size === v.sessions.length;
}
export function isV2LiveClassStatuses(v: unknown): v is V2LiveClassStatus[] {
  return Array.isArray(v) && v.length <= 100 && v.every((s) => object(s) && keys(s,['eventKey','title','publicationRevision','completedAt'])
    && isV2MeetingBatchId(s.eventKey) && title(s.title) && revision(s.publicationRevision)
    && (s.completedAt === null || (typeof s.completedAt === 'string' && Number.isFinite(Date.parse(s.completedAt)))))
    && new Set(v.map((s) => s.eventKey)).size === v.length;
}
export function isV2MeetingDelivery(v: unknown, batchId: string, eventKey: string): v is { batchId: string; eventKey: string; url: string; publicationRevision: number } {
  return object(v) && keys(v,['batchId','eventKey','url','publicationRevision']) && v.batchId === batchId && v.eventKey === eventKey
    && typeof v.url === 'string' && isV2MeetingUrl(v.url) && revision(v.publicationRevision);
}
