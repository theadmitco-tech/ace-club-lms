import type { V2BatchDraft } from './v2Batches';
import type { LiveBatchClassInput, LiveBatchSubject } from './v2LiveBatchSetup';
import { courseReadmePosition } from './v2CourseReadmes';

export function curriculumLibraries(drafts: V2BatchDraft[], subject: LiveBatchSubject) {
  return drafts.filter(draft => (subject === 'full_course' ? ['quant','verbal','di'].includes(draft.productCode) : draft.productCode === subject)
    && draft.curriculumPublicationRevision !== -1 && !draft.events.some(event => event.kind === 'live') && !!draft.sessions?.some(session => !courseReadmePosition(session.key)));
}
export function curriculumClasses(drafts: V2BatchDraft[]): LiveBatchClassInput[] {
  return drafts.flatMap(draft => (draft.sessions ?? []).filter(session => !courseReadmePosition(session.key) && session.section !== 'programme').map(session => ({
    key: session.key, title: session.title, section: session.section as 'quant' | 'verbal' | 'di', date: '', time: '19:00', duration: 120,
  })));
}
