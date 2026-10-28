import type { StudentQuestionStatus } from './studentPractice';
export type WorksheetEdit = {
  id: string; status: StudentQuestionStatus | null; comment: string | null;
  timeValue: string; baseUpdatedAt: string | null;
};
export type WorksheetRecovery = { edits: WorksheetEdit[] };
export function isWorksheetRecovery(value: unknown): value is WorksheetRecovery {
  if (!value || typeof value !== 'object' || !('edits' in value) || !Array.isArray(value.edits) || value.edits.length > 1000) return false;
  return value.edits.every((edit: unknown) => {
    if (!edit || typeof edit !== 'object') return false;
    const row = edit as Record<string, unknown>;
    return typeof row.id === 'string' && row.id.length <= 100 && [null, 'done', 'review'].includes(row.status as StudentQuestionStatus | null)
      && (row.comment === null || (typeof row.comment === 'string' && row.comment.length <= 2000))
      && typeof row.timeValue === 'string' && row.timeValue.length <= 20
      && (row.baseUpdatedAt === null || (typeof row.baseUpdatedAt === 'string' && Number.isFinite(Date.parse(row.baseUpdatedAt))));
  }) && new Set(value.edits.map((edit: WorksheetEdit) => edit.id)).size === value.edits.length;
}

export type WorksheetSaveReceipt = {
  id: string; status: StudentQuestionStatus | null; time_taken_seconds: number | null;
  comment: string | null; updated_at: string;
};
export function isWorksheetSaveReceipt(value: unknown, questionId: string): value is WorksheetSaveReceipt {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.id === questionId && [null, 'done', 'review'].includes(row.status as StudentQuestionStatus | null)
    && (row.time_taken_seconds === null || (typeof row.time_taken_seconds === 'number' && Number.isSafeInteger(row.time_taken_seconds) && row.time_taken_seconds >= 0))
    && (row.comment === null || (typeof row.comment === 'string' && row.comment.length <= 2000))
    && typeof row.updated_at === 'string' && Number.isFinite(Date.parse(row.updated_at));
}
