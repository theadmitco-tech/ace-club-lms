import { isV2MeetingBatchId } from './v2Meetings';
import type { V2CourseSessionSection } from './v2Templates';

export type V2LearningObligation = {
  id: string; batchId: string; sessionKey: string; sessionTitle: string; section: V2CourseSessionSection; source: 'recording' | 'live';
  eventKey: string | null; createdAt: string;
};
export type V2LearningProgress = {
  sessionKey: string; itemKey: string | null; status: 'opened' | 'read'; lastOpenedAt: string; readAt: string | null;
};
export type V2LearningState = {
  batchId: string; publicationRevision: number;
  sessions: { key: string; title: string; section: V2CourseSessionSection; locked: boolean }[];
  obligations: V2LearningObligation[]; progress: V2LearningProgress[]; lastSessionKey: string | null;
  liveRegistered: boolean;
  liveEvents: { key: string; title: string; section: V2CourseSessionSection; startsAt: string; endsAt: string;
    completedAt: string | null; sessionKey: string | null }[];
};
export type V2FeedbackResponse = { usefulness: number | null; clarity: number | null; comment: string; attendance: 'attended' | 'missed' | 'recording' };
export type V2ProgressInput = { batchId: string; sessionKey: string; itemKey: string | null; state: 'opened' | 'read'; publicationRevision: number };
export type V2FeedbackInput = { obligationId: string; requestId: string; response: V2FeedbackResponse };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, names: string[]) => Object.keys(v).length === names.length && names.every(name => Object.hasOwn(v, name));
const section = (v: unknown): v is V2CourseSessionSection => typeof v === 'string' && ['quant', 'verbal', 'di', 'programme'].includes(v);
const instant = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
const title = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 120;
const revision = (v: unknown): v is number => Number.isInteger(v) && Number(v) >= 1 && Number(v) <= 2147483647;
export function isV2LearningState(v: unknown): v is V2LearningState {
  if (!object(v) || !keys(v, ['batchId', 'publicationRevision', 'sessions', 'obligations', 'progress', 'lastSessionKey', 'liveRegistered', 'liveEvents'])
    || !isV2MeetingBatchId(v.batchId) || !revision(v.publicationRevision) || typeof v.liveRegistered !== 'boolean'
    || !(v.lastSessionKey === null || isV2MeetingBatchId(v.lastSessionKey))) return false;
  if (!Array.isArray(v.sessions) || v.sessions.length > 200 || !v.sessions.every(s => object(s) && keys(s, ['key', 'title', 'section', 'locked'])
    && isV2MeetingBatchId(s.key) && title(s.title) && section(s.section) && typeof s.locked === 'boolean')
    || new Set(v.sessions.map(s => s.key)).size !== v.sessions.length) return false;
  if (v.lastSessionKey !== null && !v.sessions.some(s => s.key === v.lastSessionKey && !s.locked)) return false;
  if (!Array.isArray(v.obligations) || v.obligations.length > 1000 || !v.obligations.every(o => object(o) && keys(o, ['id', 'batchId', 'sessionKey', 'sessionTitle', 'section', 'source', 'eventKey', 'createdAt'])
    && isV2MeetingBatchId(o.id) && isV2MeetingBatchId(o.batchId) && title(o.sessionTitle) && isV2MeetingBatchId(o.sessionKey) && section(o.section) && ['recording', 'live'].includes(String(o.source))
    && (o.source === 'live' ? isV2MeetingBatchId(o.eventKey) : o.eventKey === null) && instant(o.createdAt))
    || new Set(v.obligations.map(o => o.id)).size !== v.obligations.length) return false;
  if (!Array.isArray(v.progress) || v.progress.length > 10000 || !v.progress.every(p => object(p) && keys(p, ['sessionKey', 'itemKey', 'status', 'lastOpenedAt', 'readAt'])
    && isV2MeetingBatchId(p.sessionKey) && (p.itemKey === null || isV2MeetingBatchId(p.itemKey)) && ['opened', 'read'].includes(String(p.status))
    && (v.sessions as V2LearningState['sessions']).some(s => s.key === p.sessionKey) && instant(p.lastOpenedAt) && (p.status === 'read' ? instant(p.readAt) : p.readAt === null))
    || new Set(v.progress.map(p => `${p.sessionKey}:${p.itemKey}`)).size !== v.progress.length) return false;
  if (v.obligations.some(o => o.batchId === v.batchId && (v.sessions as V2LearningState['sessions']).some(s => s.key === o.sessionKey && (s.section !== o.section || s.locked)))) return false;
  return Array.isArray(v.liveEvents) && v.liveEvents.length <= 100 && (v.liveRegistered || v.liveEvents.length === 0)
    && v.liveEvents.every(e => object(e) && keys(e, ['key', 'title', 'section', 'startsAt', 'endsAt', 'completedAt', 'sessionKey'])
      && isV2MeetingBatchId(e.key) && title(e.title) && section(e.section) && instant(e.startsAt) && instant(e.endsAt)
      && Date.parse(e.endsAt) > Date.parse(e.startsAt) && (e.completedAt === null || instant(e.completedAt)) && (e.sessionKey === null || isV2MeetingBatchId(e.sessionKey))) && new Set(v.liveEvents.map(e => e.key)).size === v.liveEvents.length;
}
export function isV2ProgressInput(v: unknown): v is V2ProgressInput {
  return object(v) && keys(v, ['batchId', 'sessionKey', 'itemKey', 'state', 'publicationRevision'])
    && isV2MeetingBatchId(v.batchId) && isV2MeetingBatchId(v.sessionKey) && (v.itemKey === null || isV2MeetingBatchId(v.itemKey))
    && ['opened', 'read'].includes(String(v.state)) && revision(v.publicationRevision);
}
export function isV2FeedbackInput(v: unknown): v is V2FeedbackInput {
  if (!object(v) || !keys(v, ['obligationId', 'requestId', 'response']) || !isV2MeetingBatchId(v.obligationId) || !isV2MeetingBatchId(v.requestId)
    || !object(v.response) || !keys(v.response, ['usefulness', 'clarity', 'comment', 'attendance'])) return false;
  const r = v.response;
  return (r.attendance === 'missed' ? r.usefulness === null && r.clarity === null : Number.isInteger(r.usefulness) && Number(r.usefulness) >= 1 && Number(r.usefulness) <= 5
    && Number.isInteger(r.clarity) && Number(r.clarity) >= 1 && Number(r.clarity) <= 5)
    && typeof r.comment === 'string' && r.comment.length <= 4000 && !r.comment.includes('\0')
    && ['attended', 'missed', 'recording'].includes(String(r.attendance));
}
export type V2RecordingInput = { batchId: string; sessionKey: string; recordingKey: string; publicationRevision: number };
export type V2WatchSample = { watchId: string; requestId: string; positionSeconds: number; durationSeconds: number; playing: boolean };
export function isV2RecordingInput(v: unknown): v is V2RecordingInput {
  return object(v) && keys(v, ['batchId', 'sessionKey', 'recordingKey', 'publicationRevision']) && isV2MeetingBatchId(v.batchId)
    && isV2MeetingBatchId(v.sessionKey) && isV2MeetingBatchId(v.recordingKey) && revision(v.publicationRevision);
}
export function isV2WatchSample(v: unknown): v is V2WatchSample {
  return object(v) && keys(v, ['watchId', 'requestId', 'positionSeconds', 'durationSeconds', 'playing'])
    && isV2MeetingBatchId(v.watchId) && isV2MeetingBatchId(v.requestId) && typeof v.playing === 'boolean'
    && typeof v.positionSeconds === 'number' && Number.isFinite(v.positionSeconds) && v.positionSeconds >= 0
    && typeof v.durationSeconds === 'number' && Number.isFinite(v.durationSeconds) && v.durationSeconds > 0 && v.durationSeconds <= 43200
    && v.positionSeconds <= v.durationSeconds + 1;
}
