import { isV2BatchDraft, type V2BatchDraft } from './v2Batches';

export type V2MeetingLink = { key: string; url: string | null };
export type V2MeetingInput = {
  batchId: string;
  batchRevision: number;
  expectedRevision: number;
  requestId: string;
  links: V2MeetingLink[];
};
export type V2MeetingDraft = { batch: V2BatchDraft; revision: number; links: V2MeetingLink[] };
export type V2MeetingReceipt = { batchId: string; batchRevision: number; revision: number; replayed: boolean };
export type V2MeetingSaveResult = { status: 'error'; message: string } | { status: 'success'; receipt: V2MeetingReceipt };

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, fields: string[]) => Object.keys(value).length === fields.length && fields.every((key) => Object.hasOwn(value, key));
export const isV2MeetingBatchId = (value: unknown): value is string => typeof value === 'string' && value.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
const revision = (value: unknown, min: number, max = 2147483647): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

// Only canonical meeting-code links are accepted; no query, fragment, credentials
// or alternate host. Syntax validation does not verify meeting ownership or access.
export const isV2MeetingUrl = (value: unknown): value is string | null => value === null
  || (typeof value === 'string' && value.length === 36 && /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(value));

function linksValid(value: unknown): value is V2MeetingLink[] {
  return Array.isArray(value) && value.length <= 100
    && value.every((link) => object(link) && keys(link, ['key', 'url']) && isV2MeetingBatchId(link.key) && isV2MeetingUrl(link.url))
    && new Set(value.map((link) => link.key)).size === value.length;
}

export function validateV2MeetingInput(value: unknown): string | null {
  if (!object(value) || !keys(value, ['batchId', 'batchRevision', 'expectedRevision', 'requestId', 'links'])) return 'Invalid meeting draft request.';
  if (!isV2MeetingBatchId(value.batchId) || !isV2MeetingBatchId(value.requestId)) return 'Invalid batch or request identifier.';
  if (!revision(value.batchRevision, 1) || !revision(value.expectedRevision, 0, 2147483646)) return 'Invalid draft revision. Reload the current batch.';
  if (!linksValid(value.links)) return 'Use one canonical Google Meet link per event, or leave the field empty.';
  return null;
}

export function isV2MeetingDraft(value: unknown): value is V2MeetingDraft {
  if (!object(value) || !keys(value, ['batch', 'revision', 'links']) || !isV2BatchDraft(value.batch)
    || !revision(value.revision, 0) || !linksValid(value.links) || value.links.length !== value.batch.events.filter((event) => event.kind !== 'outline').length) return false;
  const eventKeys = new Set(value.batch.events.filter((event) => event.kind !== 'outline').map((event) => event.key));
  return value.links.every((link) => eventKeys.has(link.key)) && (value.revision !== 0 || value.links.every((link) => link.url === null));
}

export function isV2MeetingReceipt(value: unknown): value is V2MeetingReceipt {
  return object(value) && keys(value, ['batchId', 'batchRevision', 'revision', 'replayed'])
    && isV2MeetingBatchId(value.batchId) && revision(value.batchRevision, 1)
    && revision(value.revision, 1) && typeof value.replayed === 'boolean';
}
