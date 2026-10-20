import type { V2ProductCode, V2Section } from './v2Products';

export const V2_TEMPLATE_PRODUCTS: Record<V2ProductCode, { label: string; sections: V2Section[]; suggestedDays: number }> = {
  full_batch: { label: 'Full Batch', sections: ['quant', 'verbal', 'di'], suggestedDays: 56 },
  quant_crash: { label: 'Quant standalone course', sections: ['quant'], suggestedDays: 7 },
  verbal_crash: { label: 'Verbal standalone course', sections: ['verbal'], suggestedDays: 7 },
  di_crash: { label: 'DI standalone course', sections: ['di'], suggestedDays: 7 },
};

export type V2TemplateEvent = {
  key: string;
  title: string;
  section: V2Section;
  kind?: 'live' | 'outline';
  dayOffset: number | null;
  localStartTime: string | null;
  durationMinutes: number | null;
  capacity: number;
  instructor: string;
};

export type V2TemplateDocument = {
  title: string;
  summary: string;
  durationDays: number;
  events: V2TemplateEvent[];
};

export type V2TemplateDraft = {
  id: string;
  productCode: V2ProductCode;
  revision: number;
  document: V2TemplateDocument;
};

export type V2TemplateSaveInput = {
  id: string;
  productCode: V2ProductCode;
  expectedRevision: number;
  requestId: string;
  document: V2TemplateDocument;
};

export type V2TemplateSaveResult =
  | { status: 'success'; template: V2TemplateDraft; replayed: boolean }
  | { status: 'error'; message: string };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const keysAre = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const textFits = (value: unknown, min: number, max: number): value is string => typeof value === 'string' && [...value].length >= min && [...value].length <= max && !/^[ \t\n\r\f\v]|[ \t\n\r\f\v]$/.test(value);
const integerFits = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

export function isV2TemplateProduct(value: unknown): value is V2ProductCode {
  return typeof value === 'string' && Object.hasOwn(V2_TEMPLATE_PRODUCTS, value);
}

// Draft validation permits incomplete teaching content, but never a different
// product scope, unknown fields, malformed times, or ambiguous event identities.
export function validateV2TemplateSave(value: unknown): string | null {
  if (!object(value) || !keysAre(value, ['id', 'productCode', 'expectedRevision', 'requestId', 'document'])) return 'Invalid template request.';
  if (typeof value.id !== 'string' || !uuid.test(value.id) || typeof value.requestId !== 'string' || !uuid.test(value.requestId)) return 'Invalid template or request identifier.';
  if (!isV2TemplateProduct(value.productCode)) return 'Select a supported product.';
  if (!integerFits(value.expectedRevision, 0, 2147483646)) return 'Invalid template revision.';
  const doc = value.document;
  if (!object(doc) || !keysAre(doc, ['title', 'summary', 'durationDays', 'events'])) return 'Invalid template fields.';
  if (!textFits(doc.title, 1, 120) || !textFits(doc.summary, 0, 2000)) return 'Enter a title (up to 120 characters) and summary (up to 2,000 characters), without surrounding spaces.';
  if (!integerFits(doc.durationDays, 1, 366)) return 'Duration must be between 1 and 366 days.';
  if (!Array.isArray(doc.events) || doc.events.length > 100) return 'A draft supports up to 100 events.';
  const keys = new Set<string>();
  for (const [index, event] of doc.events.entries()) {
    const label = `Event ${index + 1}`;
    if (!object(event) || !keysAre(event, ['key', 'title', 'section', 'dayOffset', 'localStartTime', 'durationMinutes', 'capacity', 'instructor', ...(Object.hasOwn(event, 'kind') ? ['kind'] : [])])) return `${label}: invalid fields.`;
    if (typeof event.key !== 'string' || !uuid.test(event.key) || keys.has(event.key)) return `${label}: invalid or duplicate event identifier.`;
    keys.add(event.key);
    if (event.kind !== undefined && event.kind !== 'live' && event.kind !== 'outline') return `${label}: invalid item type.`;
    if (!textFits(event.title, event.kind === 'outline' ? 0 : 1, 120) || !textFits(event.instructor, 0, 120)) return `${label}: enter a title and an optional instructor, each up to 120 characters.`;
    if (!V2_TEMPLATE_PRODUCTS[value.productCode].sections.includes(event.section as V2Section)) return `${label}: the section must belong to the selected product.`;
    if (!integerFits(event.capacity, 1, 1000)) return `${label}: invalid historical capacity.`;
    if (event.kind === 'outline') {
      if (event.dayOffset !== null || event.localStartTime !== null || event.durationMinutes !== null) return `${label}: outline items must not carry live timing.`;
      continue;
    }
    if (!integerFits(event.dayOffset, 0, doc.durationDays - 1)) return `${label}: the day must fall within the template duration.`;
    if (typeof event.localStartTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.localStartTime)) return `${label}: enter a valid start time.`;
    if (!integerFits(event.durationMinutes, 15, 720)) return `${label}: duration must be between 15 and 720 minutes.`;
    if (!integerFits(event.capacity, 1, 1000)) return `${label}: live capacity must be between 1 and 1,000.`;
    const endMinute = Number(event.localStartTime.slice(0, 2)) * 60 + Number(event.localStartTime.slice(3)) + event.durationMinutes;
    if (event.dayOffset * 1440 + endMinute > doc.durationDays * 1440) return `${label}: the end time exceeds the template duration.`;
  }
  return null;
}

export function isV2TemplateDraft(value: unknown): value is V2TemplateDraft {
  if (!object(value) || !keysAre(value, ['id', 'productCode', 'revision', 'document']) || !integerFits(value.revision, 1, 2147483647)) return false;
  return validateV2TemplateSave({ id: value.id, productCode: value.productCode,
    expectedRevision: value.revision - 1, requestId: value.id, document: value.document }) === null;
}

export function sameV2TemplateDocument(left: V2TemplateDocument, right: V2TemplateDocument): boolean {
  return left.title === right.title && left.summary === right.summary && left.durationDays === right.durationDays
    && left.events.length === right.events.length && left.events.every((event, index) => {
      const other = right.events[index];
      return event.key === other.key && event.title === other.title && event.section === other.section
        && (event.kind ?? 'live') === (other.kind ?? 'live') && event.dayOffset === other.dayOffset && event.localStartTime === other.localStartTime
        && event.durationMinutes === other.durationMinutes && event.capacity === other.capacity
        && event.instructor === other.instructor;
    });
}
