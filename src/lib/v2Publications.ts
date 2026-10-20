import { isV2ProductCode, isV2ProductSection, type V2ProductCode, type V2Section } from './v2Products';
import { V2_TEMPLATE_PRODUCTS } from './v2Templates';
import { isV2MeetingBatchId } from './v2Meetings';

export type V2PublicationInput = {
  batchId: string; batchRevision: number; expectedRevision: number;
  requestId: string; action: 'publish' | 'unpublish';
};
export type V2PublicationEvent = {
  key: string; title: string; section: V2Section; kind: 'live' | 'outline';
  startsAt: string | null; endsAt: string | null; instructor: string;
};
export type V2Publication = {
  batchId: string; batchRevision: number; revision: number; state: 'published' | 'unpublished';
  productCode: V2ProductCode; title: string; sections: V2Section[];
  timeZone: 'Asia/Kolkata'; liveRegistrationLimit: 8 | null; events: V2PublicationEvent[];
};
export type V2PublicationProposal = { document: V2Publication; fingerprint: string };
export type V2PublicationError = { status: 'error'; message: string };
export type V2PublicationPreview = V2PublicationError | { status: 'success'; proposal: V2PublicationProposal };
export type V2PublicationSave = V2PublicationError | { status: 'success'; document: V2Publication; replayed: boolean };

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, fields: string[]) => Object.keys(value).length === fields.length && fields.every((field) => Object.hasOwn(value, field));
const revision = (value: unknown, min: number, max = 2147483647): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
const label = (value: unknown, min: number): value is string => typeof value === 'string' && [...value].length >= min && [...value].length <= 120 && value.trim() === value && !value.includes('\0');
const instant = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
export const isV2PublicationFingerprint = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{32}$/.test(value);

export function isV2PublicationInput(value: unknown): value is V2PublicationInput {
  return object(value) && keys(value, ['batchId', 'batchRevision', 'expectedRevision', 'requestId', 'action'])
    && isV2MeetingBatchId(value.batchId) && isV2MeetingBatchId(value.requestId)
    && revision(value.batchRevision, 1) && revision(value.expectedRevision, 0, 2147483646)
    && (value.action === 'publish' || value.action === 'unpublish');
}

export function isV2Publication(value: unknown): value is V2Publication {
  if (!object(value) || !keys(value, ['batchId', 'batchRevision', 'revision', 'state', 'productCode', 'title', 'sections', 'timeZone', 'liveRegistrationLimit', 'events'])
    || !isV2MeetingBatchId(value.batchId) || !revision(value.batchRevision, 1) || !revision(value.revision, 1)
    || !['published', 'unpublished'].includes(String(value.state)) || !isV2ProductCode(value.productCode)
    || !label(value.title, 1) || value.timeZone !== 'Asia/Kolkata'
    || JSON.stringify(value.sections) !== JSON.stringify(V2_TEMPLATE_PRODUCTS[value.productCode].sections)
    || !Array.isArray(value.events) || value.events.length > 100) return false;
  let live = false;
  const ids = new Set<string>();
  for (const event of value.events) {
    if (!object(event) || !keys(event, ['key', 'title', 'section', 'kind', 'startsAt', 'endsAt', 'instructor'])
      || !isV2MeetingBatchId(event.key) || ids.has(event.key) || !isV2ProductSection(value.productCode, event.section)
      || !label(event.title, event.kind === 'outline' ? 0 : 1) || !label(event.instructor, 0)) return false;
    ids.add(event.key);
    if (event.kind === 'outline') {
      if (event.startsAt !== null || event.endsAt !== null) return false;
    } else if (event.kind === 'live') {
      if (!instant(event.startsAt) || !instant(event.endsAt)) return false;
      const minutes = (Date.parse(event.endsAt) - Date.parse(event.startsAt)) / 60000;
      if (!Number.isInteger(minutes) || minutes < 15 || minutes > 720) return false;
      live = true;
    } else return false;
  }
  return value.liveRegistrationLimit === (live ? 8 : null);
}

export function publicationMatchesInput(document: V2Publication, input: V2PublicationInput) {
  return document.batchId === input.batchId && document.batchRevision === input.batchRevision
    && document.revision === input.expectedRevision + 1
    && document.state === (input.action === 'publish' ? 'published' : 'unpublished');
}
