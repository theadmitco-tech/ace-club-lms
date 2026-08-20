import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  getNextEvent,
  groupTimelineByDay,
  groupTimelineBySection,
  groupTimelineByWeek,
  isCrashCourse,
} from '../src/lib/studentTimeline.ts';

function session(id, sessionDate, options = {}) {
  return {
    id,
    title: options.title ?? id,
    session_number: options.sessionNumber ?? 1,
    session_date: sessionDate,
    session_end_at: options.sessionEndAt ?? sessionDate,
    class_type: options.classType ?? null,
    instructor: null,
    week_number: options.weekNumber ?? null,
    weekday: null,
    event_type: options.eventType ?? 'live_class',
    section_key: options.sectionKey ?? null,
    display_order: options.displayOrder ?? null,
    materials: [],
  };
}

test('groups Full Course events into non-empty chronological weeks', () => {
  const groups = groupTimelineByWeek([
    session('week-two', '2026-08-12T14:30:00.000Z', { weekNumber: 2 }),
    session('week-one-later', '2026-08-06T14:30:00.000Z', { weekNumber: 1, displayOrder: 2 }),
    session('week-one-first', '2026-08-05T14:30:00.000Z', { weekNumber: 1, displayOrder: 1 }),
  ]);

  assert.deepEqual(groups.map(({ weekNumber, sessions }) => [weekNumber, sessions.map(({ id }) => id)]), [
    [1, ['week-one-first', 'week-one-later']],
    [2, ['week-two']],
  ]);
});

test('groups crash-course events by their IST calendar day', () => {
  const groups = groupTimelineByDay([
    session('day-two', '2026-08-19T14:30:00.000Z'),
    session('day-one-later', '2026-08-18T15:30:00.000Z', { displayOrder: 2 }),
    session('day-one-first', '2026-08-18T14:30:00.000Z', { displayOrder: 1 }),
  ], 'Asia/Kolkata');

  assert.deepEqual(groups.map(({ dateKey, sessions }) => [dateKey, sessions.map(({ id }) => id)]), [
    ['2026-08-18', ['day-one-first', 'day-one-later']],
    ['2026-08-19', ['day-two']],
  ]);
});

test('recognizes legacy crash-course timelines before course_mode is projected', () => {
  const legacyCourse = { id: 'course', name: 'IPM 2026', course_mode: null };

  assert.equal(isCrashCourse(legacyCourse, [session('day-one', '2026-08-18T14:30:00.000Z')]), true);
  assert.equal(isCrashCourse(legacyCourse, [
    session('week-one', '2026-08-18T14:30:00.000Z', { weekNumber: 1 }),
  ]), false);
});

test('groups only represented Sections without inventing placeholders', () => {
  const groups = groupTimelineBySection([
    session('qa', '2026-08-18T14:30:00.000Z', { sectionKey: 'qa' }),
    session('mock', '2026-08-19T14:30:00.000Z', { classType: 'MOCK', eventType: 'mock' }),
  ]);

  assert.deepEqual(groups.map(({ section }) => section), ['QA', 'MOCK']);
});

test('selects next event and next mock independently', () => {
  const sessions = [
    session('past', '2026-08-17T14:30:00.000Z'),
    session('next-class', '2026-08-19T14:30:00.000Z'),
    session('next-mock', '2026-08-20T14:30:00.000Z', { eventType: 'mock' }),
  ];

  assert.equal(getNextEvent(sessions, '2026-08-18T12:00:00.000Z')?.id, 'next-class');
  assert.equal(getNextEvent(sessions, '2026-08-18T12:00:00.000Z', 'mock')?.id, 'next-mock');
});

test('Student projection preserves authorization, publication, release, and least-privilege boundaries', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260818170000_add_student_portal_projection.sql', import.meta.url), 'utf8');
  const compatibilitySql = await readFile(new URL('../supabase/migrations/20260818173000_fix_student_portal_projection_compatibility.sql', import.meta.url), 'utf8');
  const inactiveBatchAccessSql = await readFile(new URL('../supabase/migrations/20260820114212_restore_enrolled_student_inactive_batch_access.sql', import.meta.url), 'utf8');
  assert.match(sql, /profile\.role = 'student'/);
  assert.match(sql, /profile\.is_active = true/);
  assert.match(sql, /public\.can_access_course\(selected_course_id\)/);
  assert.match(sql, /session\.is_published = true/);
  assert.match(sql, /material\.available_from <= statement_timestamp\(\)/);
  assert.match(sql, /revoke all on function public\.get_student_timeline\(\) from public, anon/);
  assert.match(sql, /grant execute on function public\.get_student_timeline\(\) to authenticated/);
  assert.doesNotMatch(sql, /drop table public\.|truncate public\.|include-all/i);
  assert.match(compatibilitySql, /create or replace function public\.get_student_timeline\(\)/);
  assert.match(compatibilitySql, /session\.is_published = true/);
  assert.match(compatibilitySql, /material\.available_from <= statement_timestamp\(\)/);
  assert.match(compatibilitySql, /revoke all on function public\.get_student_timeline\(\) from public, anon/);
  assert.doesNotMatch(compatibilitySql, /session\.is_cancelled|drop table public\.|truncate public\.|include-all/i);
  assert.match(inactiveBatchAccessSql, /profile\.role = 'student'/);
  assert.match(inactiveBatchAccessSql, /profile\.is_active = true/);
  assert.match(inactiveBatchAccessSql, /from public\.enrollments as enrollment\s+where enrollment\.user_id = student_id/);
  assert.doesNotMatch(inactiveBatchAccessSql, /and course\.is_active = true/);
  assert.match(inactiveBatchAccessSql, /public\.can_access_course\(selected_course_id\)/);
  assert.match(inactiveBatchAccessSql, /session\.is_published = true/);
  assert.match(inactiveBatchAccessSql, /material\.available_from <= statement_timestamp\(\)/);
  assert.match(inactiveBatchAccessSql, /revoke all on function public\.get_student_timeline\(\) from public, anon/);
  assert.match(inactiveBatchAccessSql, /grant execute on function public\.get_student_timeline\(\) to authenticated/);
  assert.doesNotMatch(inactiveBatchAccessSql, /update public\.courses|update public\.enrollments|drop table public\.|truncate public\.|include-all/i);
});

test('Student surfaces keep Home compact and use Day/Week plus contextual resource filters', async () => {
  const [home, schedule, resources, resourceFilters, loader] = await Promise.all([
    readFile(new URL('../src/app/dashboard/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/schedule/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/resources/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/student/ResourceFilters.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/server/studentTimeline.ts', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(home, /Next mock|Recently released|nextMock/);
  assert.match(home, /isBeforeBatchStart && starterPacks\.length > 0/);
  assert.match(home, /<PortalResourceCard hideDetails/);
  assert.doesNotMatch(home, /Prepare for each section|Shown until that section|Shown after class until/);
  assert.doesNotMatch(schedule, /groupTimelineBySection|view=section/);
  assert.match(schedule, /groupTimelineByDay/);
  assert.match(schedule, /groupTimelineByWeek/);
  const sectionFilter = resourceFilters.indexOf('<strong>Sections</strong>');
  const topicFilter = resourceFilters.indexOf('<strong>Topic</strong>');
  const categoryFilter = resourceFilters.indexOf('<strong>Category</strong>');
  assert(sectionFilter > 0 && topicFilter > sectionFilter && categoryFilter > topicFilter);
  assert.match(resourceFilters, /router\.replace/);
  assert.doesNotMatch(resourceFilters, />Apply</);
  assert.match(resources, /SECTION_ORDER = \['QA', 'VA', 'DI'\]/);
  assert.match(resources, /sectionResources/);
  assert.match(resources, /<PortalResourceCard hideDetails/);
  assert.match(resources, /Starter Packs and standalone resources remain under All Sections and All Topics/);
  assert.match(loader, /\.from\('materials'\)/);
  assert.match(loader, /category, resource_scope, resource_format/);
});
