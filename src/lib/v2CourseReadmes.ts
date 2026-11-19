import type { V2CourseSession, V2CourseSessionSection, V2SessionContent } from './v2Templates';

export type CourseReadmePosition = 'before' | 'after';
export const COURSE_README_TITLES = { before: 'Read before the course', after: 'Read after the course' } as const;
const prefixes = { before: 'ace00001', after: 'ace00002' } as const;
// Reserved prefixes identify fixed pages; the remaining UUID bits retain the course identity.
export function courseReadmeKey(batchId: string, position: CourseReadmePosition): string { return prefixes[position] + batchId.slice(8); }
export function courseReadmePosition(key: string): CourseReadmePosition | null {
  return key.startsWith(prefixes.before + '-') ? 'before' : key.startsWith(prefixes.after + '-') ? 'after' : null;
}
export function courseReadme(batchId: string, section: V2CourseSessionSection, position: CourseReadmePosition): V2CourseSession {
  return { key: courseReadmeKey(batchId, position), title: COURSE_README_TITLES[position], section, content: { preSessionReads: [], recordings: [], postSessionReads: [], materials: [] } };
}
export function pinCourseReadmes<T extends { key: string }>(sessions: T[]): T[] {
  return [...sessions.filter(s => courseReadmePosition(s.key) === 'before'), ...sessions.filter(s => !courseReadmePosition(s.key)), ...sessions.filter(s => courseReadmePosition(s.key) === 'after')];
}
export function withCourseReadmes(batchId: string, section: V2CourseSessionSection, sessions: V2CourseSession[]): V2CourseSession[] {
  const result = [...sessions];
  for (const position of ['before', 'after'] as const) if (!result.some(s => courseReadmePosition(s.key) === position)) result.push(courseReadme(batchId, section, position));
  return pinCourseReadmes(result);
}
export function updateCourseReadme(batchId: string, section: V2CourseSessionSection, sessions: V2CourseSession[], position: CourseReadmePosition, content: V2SessionContent): V2CourseSession[] {
  return withCourseReadmes(batchId, section, sessions).map(s => courseReadmePosition(s.key) === position ? { ...s, content } : s);
}
export function validateCourseReadmes(_batchId: string, sessions: V2CourseSession[], previous: V2CourseSession[] = []): string | null {
  const fixed = sessions.filter(s => courseReadmePosition(s.key));
  if (!fixed.length && !previous.some(s => courseReadmePosition(s.key))) return null;
  for (const position of ['before', 'after'] as const) {
    const expected = position === 'before' ? sessions[0] : sessions.at(-1);
    if (!expected || courseReadmePosition(expected.key) !== position || expected.title !== COURSE_README_TITLES[position]) return 'The two course README pages must remain at the beginning and end, with their fixed names.';
  }
  if (fixed.length !== 2 || fixed[0].section !== fixed[1].section || previous.some(old => courseReadmePosition(old.key) && !fixed.some(current => current.key === old.key && current.section === old.section))) return 'Fixed course README pages cannot be removed or assigned a different subject.';
  return null;
}
