import { isV2MeetingBatchId } from './v2Meetings';
import { isV2ContentUrl, type V2CourseSession, type V2SessionContentKind } from './v2Templates';
export const CONTENT_PLACEMENTS = {
  session: 'Session content', before_course: 'Before the course area', area_top: 'At the subject-area top',
  before_video: 'Before a video', after_video: 'After a video', after_course: 'After the course area',
} as const;
export type ContentPlacement = keyof typeof CONTENT_PLACEMENTS;
export type ContentTarget = { batchId: string; sessionKey: string; publicationRevision: number; placement: ContentPlacement; anchorKey: string | null; replaceKey: string | null; order: number };
export type ContentDocument = { title: string; kind: V2SessionContentKind | 'heading'; url: string | null; targets: ContentTarget[] };
export type ContentItem = { id: string; draft_revision: number; published_revision: number | null; visible: boolean; deleted: boolean; publication_version: number; document: ContentDocument };
export type ContentCourse = { batchId: string; title: string; productCode: string; publicationRevision: number; sessions: V2CourseSession[]; anchors: V2CourseSession[] };
export type ContentWorkspace = { items: ContentItem[]; courses: ContentCourse[] };
export type ContentPlacementView = { key: string; sessionKey: string; placement: ContentPlacement; anchorKey: string | null; order: number };
export type ContentScope = { id: string; revision: number; action: 'publish' | 'unpublish' | 'delete'; fingerprint: string; targets: (ContentTarget & { courseTitle: string | null; sessionTitle: string | null })[] };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function validContentDocument(v: unknown): v is ContentDocument {
  if (!object(v) || Object.keys(v).length !== 4 || typeof v.title !== 'string' || !v.title.trim() || v.title !== v.title.trim() || v.title.length > 120
    || !['heading','materials','recordings','preSessionReads','postSessionReads'].includes(String(v.kind))
    || (v.kind === 'heading' ? v.url !== null : typeof v.url !== 'string' || v.url.length > 2048 || !isV2ContentUrl(v.url))
    || !Array.isArray(v.targets) || v.targets.length < 1 || v.targets.length > 200) return false;
  return v.targets.every(t => object(t) && Object.keys(t).length === 7 && isV2MeetingBatchId(t.batchId) && isV2MeetingBatchId(t.sessionKey)
    && Number.isInteger(t.publicationRevision) && Number(t.publicationRevision) > 0 && Number(t.publicationRevision) < 1e9
    && typeof t.placement === 'string' && Object.hasOwn(CONTENT_PLACEMENTS,t.placement)
    && Number.isInteger(t.order) && Number(t.order) >= 0 && Number(t.order) <= 9999
    && (['heading','materials','recordings'].includes(String(v.kind)) ? t.placement === 'session' : true)
    && (t.placement === 'before_video' || t.placement === 'after_video' ? isV2MeetingBatchId(t.anchorKey) : t.anchorKey === null)
    && (t.replaceKey === null || v.kind !== 'heading' && isV2MeetingBatchId(t.replaceKey)))
    && new Set(v.targets.map(t => `${t.batchId}:${t.sessionKey}`)).size === v.targets.length;
}
export function validContentPlacements(v: unknown): v is ContentPlacementView[] {
  return Array.isArray(v) && v.length <= 10000 && v.every(p=>object(p) && Object.keys(p).length===5 && isV2MeetingBatchId(p.key) && isV2MeetingBatchId(p.sessionKey)
    && typeof p.placement==='string' && Object.hasOwn(CONTENT_PLACEMENTS,p.placement) && (p.anchorKey===null || isV2MeetingBatchId(p.anchorKey)) && Number.isInteger(p.order));
}
