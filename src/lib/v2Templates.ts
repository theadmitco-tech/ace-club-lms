import type { V2Section } from './v2Products';

export type V2CourseCode = 'full_course' | 'quant' | 'verbal' | 'di';

export const V2_SESSION_CONTENT_LABELS = {
  materials: 'Materials', recordings: 'Recordings', preSessionReads: 'Pre-session reads', postSessionReads: 'Post-session reads',
} as const;
export type V2SessionContentKind = keyof typeof V2_SESSION_CONTENT_LABELS;
export type V2SessionContentItem = { key: string; title: string; url: string };
export type V2SessionContent = Record<V2SessionContentKind, V2SessionContentItem[]>;
export const emptyV2SessionContent = (): V2SessionContent => ({ materials: [], recordings: [], preSessionReads: [], postSessionReads: [] });

export const V2_TEMPLATE_PRODUCTS: Record<V2CourseCode, { label: string; sections: V2Section[]; suggestedDays: number | null }> = {
  full_course: { label: 'Full Course', sections: ['quant', 'verbal', 'di'], suggestedDays: 56 },
  quant: { label: 'Quant', sections: ['quant'], suggestedDays: null },
  verbal: { label: 'Verbal', sections: ['verbal'], suggestedDays: null },
  di: { label: 'DI', sections: ['di'], suggestedDays: null },
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
  content?: V2SessionContent;
};

export type V2TemplateDocument = {
  title: string;
  summary: string;
  durationDays: number | null;
  events: V2TemplateEvent[];
};

export type V2TemplateDraft = {
  id: string;
  productCode: V2CourseCode;
  revision: number;
  document: V2TemplateDocument;
};

export type V2TemplateSaveInput = {
  id: string;
  productCode: V2CourseCode;
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

export function isV2SessionContent(value: unknown, allowIncomplete = false): value is V2SessionContent {
  if (!object(value) || !keysAre(value, Object.keys(V2_SESSION_CONTENT_LABELS))) return false;
  const ids = new Set<string>();
  for (const items of Object.values(value)) {
    if (!Array.isArray(items) || items.length > 50) return false;
    for (const item of items) {
      if (!object(item) || !keysAre(item, ['key', 'title', 'url']) || typeof item.key !== 'string'
        || !uuid.test(item.key) || ids.has(item.key) || !(allowIncomplete ? typeof item.title === 'string' && item.title.length <= 120 : textFits(item.title, 1, 120))
        || typeof item.url !== 'string' || item.url.length > 2048
        || (!allowIncomplete && !/^https:\/\/[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?(?::[0-9]{1,5})?(?:[/?#][^\s\\]*)?$/.test(item.url))) return false;
      ids.add(item.key);
    }
  }
  return true;
}

export function isV2TemplateProduct(value: unknown): value is V2CourseCode {
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
  if (doc.durationDays !== null && !integerFits(doc.durationDays, 1, 366)) return 'Duration must be between 1 and 366 days.';
  if (!Array.isArray(doc.events) || doc.events.length > 100) return 'A draft supports up to 100 events.';
  const keys = new Set<string>();
  for (const [index, event] of doc.events.entries()) {
    const label = `Event ${index + 1}`;
    if (!object(event) || !keysAre(event, ['key', 'title', 'section', 'dayOffset', 'localStartTime', 'durationMinutes', 'capacity', 'instructor', ...(Object.hasOwn(event, 'kind') ? ['kind'] : []), ...(Object.hasOwn(event, 'content') ? ['content'] : [])])) return `${label}: invalid fields.`;
    if (event.content !== undefined && !isV2SessionContent(event.content)) return `${label}: each content item needs a title and an HTTPS link, with no duplicate identifiers.`;
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
    if (doc.durationDays === null) return `${label}: set a duration before scheduling a live class.`;
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
        && sameV2SessionContent(event.content, other.content)
        && (event.kind ?? 'live') === (other.kind ?? 'live') && event.dayOffset === other.dayOffset && event.localStartTime === other.localStartTime
        && event.durationMinutes === other.durationMinutes && event.capacity === other.capacity
        && event.instructor === other.instructor;
    });
}

export function isV2CourseSection(code: V2CourseCode, section: unknown): section is V2Section {
  return isV2TemplateProduct(code) && V2_TEMPLATE_PRODUCTS[code].sections.includes(section as V2Section);
}

export function sameV2SessionContent(left?: V2SessionContent, right?: V2SessionContent): boolean {
  const a = left ?? emptyV2SessionContent(), b = right ?? emptyV2SessionContent();
  return (Object.keys(V2_SESSION_CONTENT_LABELS) as V2SessionContentKind[]).every((kind) =>
    a[kind].length === b[kind].length && a[kind].every((item, index) => {
      const other = b[kind][index];
      return item.key === other.key && item.title === other.title && item.url === other.url;
    }));
}
