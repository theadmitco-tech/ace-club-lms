'use server';

import { listV2BatchDrafts } from '@/lib/server/v2Batches';
import { listV2BatchPublications } from '@/lib/server/v2Publications';
import { isV2ContentPublishingEnabled } from '@/lib/server/v2ContentPublishing';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
import type { V2BatchDraft } from '@/lib/v2Batches';

export async function loadSessionDraftAction(batchId: string): Promise<
  { status: 'ready'; draft: V2BatchDraft } | { status: 'pending' | 'error'; message: string }
> {
  if (!isV2ContentPublishingEnabled() || !isV2MeetingBatchId(batchId)) return { status: 'error', message: 'Session editing is unavailable.' };
  const [drafts, publications] = await Promise.all([listV2BatchDrafts(), listV2BatchPublications()]);
  if (drafts.status !== 'ready' || publications.status !== 'ready') return { status: 'error', message: 'The current course could not be loaded. Retry shortly.' };
  const draft = drafts.drafts.find(item => item.id === batchId);
  const published = publications.publications.find(item => item.batchId === batchId);
  if (!draft?.sessions || !['quant', 'verbal', 'di'].includes(draft.productCode) || published?.state !== 'published') return { status: 'error', message: 'A published subject course is required.' };
  if (draft.revision !== published.batchRevision) return { status: 'pending', message: 'This course already has saved draft changes. Review and publish them before adding another session.' };
  return { status: 'ready', draft };
}
