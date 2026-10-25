import { isV2MeetingBatchId } from './v2Meetings';

export type V2EnrollmentOption = { studentId: string; name: string; active: boolean; eligible: boolean; revision: number };
export type V2EnrollmentInput = { batchId: string; studentId: string; active: boolean; expectedRevision: number };
export type V2EnrollmentResult = { status: 'success' } | { status: 'error'; message: string };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, fields: string[]) => Object.keys(v).length === fields.length && fields.every((key) => Object.hasOwn(v, key));
const revision = (v: unknown, max = 2147483647): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;
export function isV2EnrollmentInput(v: unknown): v is V2EnrollmentInput {
  return object(v) && keys(v, ['batchId', 'studentId', 'active', 'expectedRevision'])
    && isV2MeetingBatchId(v.batchId) && isV2MeetingBatchId(v.studentId) && typeof v.active === 'boolean' && revision(v.expectedRevision, 2147483646);
}
export function isV2EnrollmentOptions(v: unknown): v is V2EnrollmentOption[] {
  return Array.isArray(v) && v.every((row) => object(row) && keys(row, ['studentId', 'name', 'active', 'eligible', 'revision'])
    && isV2MeetingBatchId(row.studentId) && typeof row.name === 'string' && row.name.trim().length > 0
    && typeof row.active === 'boolean' && typeof row.eligible === 'boolean' && revision(row.revision)
    && (!row.active || row.revision > 0)) && new Set(v.map((row) => row.studentId)).size === v.length;
}
export function enrollmentMatchesInput(v: unknown, input: V2EnrollmentInput): boolean {
  return object(v) && keys(v, ['batchId', 'studentId', 'active', 'revision']) && v.batchId === input.batchId
    && v.studentId === input.studentId && v.active === input.active && v.revision === input.expectedRevision + 1;
}
