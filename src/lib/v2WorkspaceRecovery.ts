import { isV2Publication, isV2PublicationInput, isV2PublicationFingerprint, publicationMatchesInput, type V2PublicationInput, type V2PublicationProposal } from './v2Publications';
import { isV2SessionContent, isV2TemplateProduct, V2_TEMPLATE_PRODUCTS, type V2TemplateDraft } from './v2Templates';
import { isV2BatchDraft, isV2BatchProposal, type V2BatchDraft, type V2BatchInput, type V2BatchProposal } from './v2Batches';
import { isV2MeetingBatchId as uuid, validateV2MeetingInput, type V2MeetingInput, type V2MeetingLink } from './v2Meetings';

export type TemplateWorkspace = { draft: V2TemplateDraft; retry: { payload: string; requestId: string } | null };
export type BatchWorkspace = { input: V2BatchInput; original: V2BatchDraft | null; review: { input: V2BatchInput; proposal: V2BatchProposal } | null };
export type MeetingWorkspace = { batchRevision: number; revision: number; requestId: string; links: V2MeetingLink[]; review: V2MeetingInput | null };
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max = 240): value is string => typeof value === 'string' && value.length <= max;
const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const revision = (value: unknown) => number(value) && Number.isInteger(value) && value >= 0 && value <= 2147483647;
const nullableNumber = (value: unknown) => value === null || number(value);
const nullableText = (value: unknown) => value === null || text(value);
const events = (value: unknown, check: (event: Record<string, unknown>) => boolean) => Array.isArray(value) && value.length <= 100
  && value.every((event) => object(event) && uuid(event.key) && (event.kind === undefined || event.kind === 'live' || event.kind === 'outline')
    && (event.content === undefined || isV2SessionContent(event.content, true)) && text(event.instructor) && nullableText(event.localStartTime) && nullableNumber(event.durationMinutes) && number(event.capacity) && check(event));

// Scratch documents may be incomplete or invalid while typing. Validate their
// shape here; existing server/SQL validation still controls every save.
export function isTemplateWorkspace(value: unknown): value is TemplateWorkspace {
  if (!object(value) || !object(value.draft)) return false;
  const draft = value.draft;
  const doc = draft.document;
  if (!uuid(draft.id) || !revision(draft.revision) || !isV2TemplateProduct(draft.productCode) || !object(doc)) return false;
  const sections: readonly string[] = V2_TEMPLATE_PRODUCTS[draft.productCode].sections;
  return text(doc.title) && text(doc.summary, 4000) && nullableNumber(doc.durationDays)
    && events(doc.events, (event) => text(event.title) && typeof event.section === 'string' && sections.includes(event.section) && nullableNumber(event.dayOffset))
    && (value.retry === null || (object(value.retry) && uuid(value.retry.requestId) && text(value.retry.payload, 250_000)
      && value.retry.payload === JSON.stringify(draft)));
}
function batchInput(value: unknown): value is V2BatchInput {
  return object(value) && uuid(value.id) && uuid(value.templateId) && uuid(value.requestId) && revision(value.templateRevision)
    && revision(value.expectedRevision) && text(value.title) && text(value.startDate) && value.timeZone === 'Asia/Kolkata'
    && (value.events === null || events(value.events, (event) => nullableText(event.localDate)));
}
export function isBatchWorkspace(value: unknown): value is BatchWorkspace {
  return object(value) && batchInput(value.input) && (value.original === null || (isV2BatchDraft(value.original) && value.original.id === value.input.id))
    && (value.review === null || (object(value.review) && batchInput(value.review.input) && isV2BatchProposal(value.review.proposal)
      && JSON.stringify(value.review.input) === JSON.stringify(value.input) && value.review.proposal.draft.id === value.input.id));
}
export function isMeetingWorkspace(value: unknown): value is MeetingWorkspace {
  return object(value) && revision(value.batchRevision) && revision(value.revision) && uuid(value.requestId)
    && Array.isArray(value.links) && value.links.length <= 100 && value.links.every((link) => object(link) && uuid(link.key) && nullableText(link.url))
    && (value.review === null || (validateV2MeetingInput(value.review) === null && object(value.review)
      && value.review.batchRevision === value.batchRevision && value.review.expectedRevision === value.revision
      && value.review.requestId === value.requestId && JSON.stringify(value.review.links) === JSON.stringify(value.links)));
}

export type PublicationWorkspace = { input: V2PublicationInput; proposal: V2PublicationProposal };
export function isPublicationWorkspace(value: unknown): value is PublicationWorkspace {
  return object(value) && isV2PublicationInput(value.input) && object(value.proposal) && isV2Publication(value.proposal.document)
    && isV2PublicationFingerprint(value.proposal.fingerprint) && publicationMatchesInput(value.proposal.document, value.input);
}
