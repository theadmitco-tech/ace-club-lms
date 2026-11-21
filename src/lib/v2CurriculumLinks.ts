export type CurriculumSource = { batchId: string; revision: number; sessionKeys: string[] };
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
export function validCurriculumSources(v: unknown): v is CurriculumSource[] {
  return Array.isArray(v) && v.length > 0 && v.length <= 3 && v.every(s => s && typeof s === 'object'
    && Object.keys(s).length === 3 && uuid(s.batchId) && Number.isInteger(s.revision) && s.revision > 0
    && Array.isArray(s.sessionKeys) && s.sessionKeys.length > 0 && s.sessionKeys.length <= 100
    && s.sessionKeys.every(uuid) && new Set(s.sessionKeys).size === s.sessionKeys.length)
    && new Set(v.map(s => s.batchId)).size === v.length
    && new Set(v.flatMap(s => s.sessionKeys)).size === v.reduce((n,s) => n+s.sessionKeys.length,0);
}
