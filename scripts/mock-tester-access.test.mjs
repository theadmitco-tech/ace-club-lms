import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('tester migration is assignment-scoped, revocable, and preserves release gating', async () => {
  const sql = await read('supabase/migrations/20260825100000_add_mock_assignment_tester_access.sql');
  assert.match(sql, /create table public\.mock_assignment_testers/);
  assert.match(sql, /primary key \(assignment_id, user_id\)/);
  assert.match(sql, /revoked_at is null/);
  assert.match(sql, /a\.release_at <= statement_timestamp\(\)/);
  assert.match(sql, /t\.assignment_id = p_assignment_id/);
  assert.match(sql, /p\.is_active = true/);
  assert.match(sql, /p\.role = 'student'/);
  assert.match(sql, /revoke all on function private\.is_eligible_mock_student/);
});

test('only the mock surface uses participant capability checks', async () => {
  const authorization = await read('src/lib/server/portalAuthorization.ts');
  const mockPage = await read('src/app/mocks/page.tsx');
  const attemptApi = await read('src/app/api/student/mock-attempts/route.ts');
  const dashboard = await read('src/app/dashboard/page.tsx');
  const scheduleLayout = await read('src/app/schedule/layout.tsx');
  assert.match(authorization, /getMockParticipantIdentity/);
  assert.match(mockPage, /requireMockParticipant/);
  assert.match(attemptApi, /getMockParticipantIdentity/);
  assert.match(dashboard, /requirePortalRole\('student'\)/);
  assert.match(scheduleLayout, /requirePortalRole\('student'\)/);
});

test('tester reporting is separate from the batch denominator', async () => {
  const reporting = await read('src/app/admin/mock-results/page.tsx');
  const loader = await read('src/lib/server/mockResults.ts');
  assert.match(loader, /mock_assignment_testers/);
  assert.match(loader, /students, testers/);
  assert.match(reporting, /\{completed\}\/\{assignment\.students\.length\}/);
  assert.match(reporting, /Testers \(excluded from batch completion\)/);
});

test('tester Admin mutations retain Admin authorization and private caching', async () => {
  const route = await read('src/app/api/admin/mock-builder/route.ts');
  assert.match(route, /requireAdmin\(\)/);
  assert.match(route, /private, no-store/);
  assert.match(route, /grant-tester/);
  assert.match(route, /revoke-tester/);
});
