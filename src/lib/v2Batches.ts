import type { V2CourseCode } from './v2Templates';
import { isV2TemplateProduct, isV2SessionContent, isV2CourseSessions, type V2CourseSession, V2_TEMPLATE_PRODUCTS, type V2SessionContent } from './v2Templates';
import type { V2Section } from './v2Products';

export const V2_BATCH_TIME_ZONE = 'Asia/Kolkata' as const;

export type V2BatchEventInput = {
  key: string;
  kind?: 'live' | 'outline';
  localDate: string | null;
  localStartTime: string | null;
  durationMinutes: number | null;
  instructor: string;
  capacity: number;
};
export type V2BatchEvent = V2BatchEventInput & {
  content?: V2SessionContent;
  title: string;
  section: V2Section;
  startsAt: string | null;
  endsAt: string | null;
};
export type V2BatchInput = {
  sessions?: V2CourseSession[];
  id: string;
  templateId: string;
  templateRevision: number;
  expectedRevision: number;
  requestId: string;
  title: string;
  startDate: string;
  timeZone: typeof V2_BATCH_TIME_ZONE;
  events: V2BatchEventInput[] | null;
};
export type V2BatchDraft = {
  sessions?: V2CourseSession[];
  id: string;
  productCode: V2CourseCode;
  templateId: string;
  templateRevision: number;
  revision: number;
  state: 'draft';
  title: string;
  startDate: string;
  timeZone: typeof V2_BATCH_TIME_ZONE;
  events: V2BatchEvent[];
};
export type V2BatchProposal = { draft: V2BatchDraft; fingerprint: string };
export type V2BatchError = { status: 'error'; message: string };
export type V2BatchPreviewResult = V2BatchError | { status: 'success'; proposal: V2BatchProposal };
export type V2BatchSaveResult = V2BatchError | { status: 'success'; draft: V2BatchDraft; replayed: boolean };

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, expected: string[]) => Object.keys(value).length === expected.length && expected.every((key) => Object.hasOwn(value, key));
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
const integer = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
const label = (value: unknown, min = 0): value is string => typeof value === 'string' && [...value].length >= min && [...value].length <= 120 && !/\0|^[ \t\n\r\f\v]|[ \t\n\r\f\v]$/.test(value);

export function isV2BatchDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function v2BatchEventInstants(event: V2BatchEventInput): { startsAt: string | null; endsAt: string | null } {
  if (event.kind === 'outline') return { startsAt: null, endsAt: null };
  // The supported scheduling zone has a fixed +05:30 offset in the accepted
  // 2000–2099 date range. SQL independently computes instants using its zone data.
  const start = new Date(`${event.localDate}T${event.localStartTime}:00+05:30`);
  return { startsAt: start.toISOString(), endsAt: new Date(start.valueOf() + (event.durationMinutes ?? 0) * 60000).toISOString() };
}

function eventValid(value: unknown): value is V2BatchEventInput {
  if (!object(value) || !keys(value, ['key', 'localDate', 'localStartTime', 'durationMinutes', 'instructor', 'capacity', ...(Object.hasOwn(value, 'kind') ? ['kind'] : [])])
    || !uuid(value.key) || !integer(value.capacity, 1, 1000) || !label(value.instructor)) return false;
  if (value.kind === 'outline') return value.localDate === null && value.localStartTime === null && value.durationMinutes === null;
  return (value.kind === undefined || value.kind === 'live') && isV2BatchDate(value.localDate) && typeof value.localStartTime === 'string'
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.localStartTime) && integer(value.durationMinutes, 15, 720);
}

export function validateV2BatchInput(value: unknown): string | null {
  if (!object(value) || !keys(value, ['id', 'templateId', 'templateRevision', 'expectedRevision', 'requestId', 'title', 'startDate', 'timeZone', 'events', ...(Object.hasOwn(value, 'sessions') ? ['sessions'] : [])])) return 'Invalid batch request.';
  if (!uuid(value.id) || !uuid(value.templateId) || !uuid(value.requestId)) return 'Invalid batch or template identifier.';
  if (!integer(value.expectedRevision, 0, 2147483646) || !integer(value.templateRevision, 1, 2147483647)) return 'Invalid batch or template revision.';
  if (!label(value.title, 1)) return 'Enter a batch title of up to 120 characters without surrounding spaces.';
  if (value.startDate !== '' && !isV2BatchDate(value.startDate)) return 'Choose a valid template start date between 2000 and 2099.';
  if (value.timeZone !== V2_BATCH_TIME_ZONE) return 'The supported scheduling time zone is Asia/Kolkata.';
  if (value.sessions !== undefined && (value.expectedRevision === 0 || !isV2CourseSessions(value.sessions, ['quant', 'verbal', 'di']))) return 'Invalid course content edits.';
  if (value.expectedRevision === 0) return value.events === null ? null : 'A new batch must derive its schedule from the saved template.';
  if (!Array.isArray(value.events) || value.events.length > 100 || !value.events.every(eventValid)) return 'Each event needs a valid date, time, duration, instructor and capacity.';
  if (new Set(value.events.map((event) => event.key)).size !== value.events.length) return 'Event identifiers must be distinct.';
  return null;
}

export function editableV2BatchEvents(events: V2BatchEvent[]): V2BatchEventInput[] {
  return events.map(({ key, localDate, localStartTime, durationMinutes, instructor, capacity, kind }) =>
    ({ key, localDate, localStartTime, durationMinutes, instructor, capacity, ...(kind ? { kind } : {}) }));
}

export function isV2BatchDraft(value: unknown): value is V2BatchDraft {
  if (!object(value) || !keys(value, ['id', 'productCode', 'templateId', 'templateRevision', 'revision', 'state', 'title', 'startDate', 'timeZone', 'events', ...(Object.hasOwn(value, 'sessions') ? ['sessions'] : [])])
    || value.state !== 'draft' || !isV2TemplateProduct(value.productCode) || !integer(value.revision, 1, 2147483647)
    || !Array.isArray(value.events) || value.events.length > 100) return false;
  if (value.sessions !== undefined && !isV2CourseSessions(value.sessions, V2_TEMPLATE_PRODUCTS[value.productCode].sections)) return false;
  if (value.sessions !== undefined && value.events.some((event) => object(event) && (value.sessions as V2CourseSession[]).some((session) => session.key === event.key))) return false;
  const edits: V2BatchEventInput[] = [];
  for (const event of value.events) {
    if (!object(event) || !keys(event, ['key', 'title', 'section', 'localDate', 'localStartTime', 'durationMinutes', 'instructor', 'capacity', 'startsAt', 'endsAt', ...(Object.hasOwn(event, 'kind') ? ['kind'] : []), ...(Object.hasOwn(event, 'content') ? ['content'] : [])])) return false;
    if (event.content !== undefined && !isV2SessionContent(event.content)) return false;
    const edit = { key: event.key, localDate: event.localDate, localStartTime: event.localStartTime,
      durationMinutes: event.durationMinutes, instructor: event.instructor, capacity: event.capacity, ...(Object.hasOwn(event, 'kind') ? { kind: event.kind } : {}) };
    if (!eventValid(edit) || !label(event.title, event.kind === 'outline' ? 0 : 1) || !V2_TEMPLATE_PRODUCTS[value.productCode].sections.includes(event.section as V2Section)) return false;
    const instants = v2BatchEventInstants(edit);
    if (event.startsAt !== instants.startsAt || event.endsAt !== instants.endsAt) return false;
    edits.push(edit);
  }
  return validateV2BatchInput({ id: value.id, templateId: value.templateId, templateRevision: value.templateRevision,
    expectedRevision: 1, requestId: value.id, title: value.title, startDate: value.startDate, timeZone: value.timeZone, events: edits }) === null;
}

export function isV2BatchProposal(value: unknown): value is V2BatchProposal {
  return object(value) && keys(value, ['draft', 'fingerprint']) && isV2BatchDraft(value.draft)
    && typeof value.fingerprint === 'string' && /^[0-9a-f]{32}$/.test(value.fingerprint);
}
