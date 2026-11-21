export type LiveBatchSubject = 'quant' | 'verbal' | 'di' | 'full_course';
export type LiveBatchClassSubject = Exclude<LiveBatchSubject, 'full_course'>;
/** `live: false` keeps a course session (and its content) in the batch without a dated live class. */
export type LiveBatchClassInput = { key: string; title: string; date: string; time: string; duration: number; section?: LiveBatchClassSubject; live?: boolean };
export type LiveBatchSetup = { subject: LiveBatchSubject; title: string; sourceId: string; createFeedbackSessions: boolean; classes: LiveBatchClassInput[] };

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;

// Incomplete fields remain recoverable; publication validation still controls saves.
export function isLiveBatchSetup(value: unknown): value is LiveBatchSetup {
  if (!object(value) || typeof value.subject !== 'string' || !['quant', 'verbal', 'di', 'full_course'].includes(value.subject)
    || !text(value.title, 120) || !text(value.sourceId, 36) || typeof value.createFeedbackSessions !== 'boolean'
    || !Array.isArray(value.classes) || value.classes.length > 100) return false;
  return value.classes.every(item => object(item) && text(item.key, 64) && item.key.length > 0
    && text(item.title, 120) && text(item.date, 40) && text(item.time, 20)
    && (item.section === undefined || ['quant','verbal','di'].includes(String(item.section)))
    && (item.live === undefined || typeof item.live === 'boolean')
    && typeof item.duration === 'number' && Number.isFinite(item.duration))
    && new Set(value.classes.map(item => item.key)).size === value.classes.length;
}
