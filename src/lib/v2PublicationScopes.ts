import { isV2Publication, isV2PublicationFingerprint, isV2PublicationInput, publicationMatchesInput,
  type V2Publication, type V2PublicationInput } from './v2Publications';
import { isV2TemplateProduct, type V2CourseCode } from './v2Templates';
import { isV2MeetingBatchId } from './v2Meetings';

export type PublicationScopeInput = { requestId: string; action: 'publish' | 'unpublish'; productCodes: V2CourseCode[] };
export type PublicationScopeReview = { fingerprint: string; proposal: { action: 'publish' | 'unpublish';
  items: { input: V2PublicationInput; document: V2Publication; fingerprint: string }[] } };
export function isPublicationScopeInput(value: unknown): value is PublicationScopeInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const input = value as PublicationScopeInput;
  return Object.keys(input).length === 3 && isV2MeetingBatchId(input.requestId)
    && ['publish','unpublish'].includes(input.action) && Array.isArray(input.productCodes)
    && input.productCodes.length > 0 && input.productCodes.length <= 4
    && input.productCodes.every(isV2TemplateProduct) && new Set(input.productCodes).size === input.productCodes.length;
}
export function isPublicationScopeReview(value: unknown, input: PublicationScopeInput): value is PublicationScopeReview {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const review = value as PublicationScopeReview;
  return isV2PublicationFingerprint(review.fingerprint) && review.proposal?.action === input.action
    && Array.isArray(review.proposal.items) && review.proposal.items.length > 0 && review.proposal.items.length <= 100
    && review.proposal.items.every(item => !!item && typeof item === 'object' && !Array.isArray(item) && isV2PublicationInput(item.input) && isV2Publication(item.document)
      && isV2PublicationFingerprint(item.fingerprint) && publicationMatchesInput(item.document,item.input)
      && item.input.requestId === input.requestId && item.input.action === input.action
      && input.productCodes.includes(item.document.productCode))
    && new Set(review.proposal.items.map(item => item.document.batchId)).size === review.proposal.items.length;
}
