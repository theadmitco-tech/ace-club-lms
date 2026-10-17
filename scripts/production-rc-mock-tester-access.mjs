import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const projectRef = 'owmlxsnzogfapotmjrqk';
const assignmentId = '618d2a28-3843-49fc-af63-a59f5ce77c51';
const assessmentVersionId = '67707f60-1141-4243-be42-872baf9a6d1e';
const testerUserId = 'aadd27f7-ccbd-419a-814b-20c66cf6180b';
const completedAttemptId = 'eabe0c25-4be6-40ef-b035-59383deaf236';
const completedAttemptVersionId = 'a85a3fdd-b57b-4692-929a-9b210d65de30';
const actorId = 'befa6b3f-a71b-4175-bb3a-b3ee7afd2f19';
const mode = process.argv[2];

if (!['audit', 'apply', 'revoke'].includes(mode)) {
  throw new Error('Use audit, apply, or revoke.');
}

const metadata = JSON.parse(execFileSync('npx', [
  '--yes', 'supabase@2.114.0', 'projects', 'api-keys',
  '--project-ref', projectRef, '--output', 'json',
], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }));
const serviceRoleKey = metadata.find((key) => key.id === 'service_role' && !key.disabled)?.api_key;
if (!serviceRoleKey) throw new Error('Could not load the approved Production service-role key.');

const db = createClient(`https://${projectRef}.supabase.co`, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function check(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function loadState() {
  const [profileResult, actorResult, assignmentResult, attemptResult, grantResult] = await Promise.all([
    db.from('profiles').select('id,role,is_active').eq('id', testerUserId).single(),
    db.from('profiles').select('id,role,is_active').eq('id', actorId).single(),
    db.from('mock_assessment_assignments').select('id,assessment_version_id').eq('id', assignmentId).single(),
    db.from('mock_attempts').select('id,student_id,assignment_id,status,assessment_version_id').eq('id', completedAttemptId).single(),
    db.from('mock_assignment_testers').select('assignment_id,user_id,granted_by,granted_at,revoked_by,revoked_at')
      .eq('assignment_id', assignmentId).eq('user_id', testerUserId).maybeSingle(),
  ]);
  check(profileResult.error, 'Load tester profile');
  check(actorResult.error, 'Load granting actor');
  check(assignmentResult.error, 'Load assignment');
  check(attemptResult.error, 'Load identifying completed attempt');
  check(grantResult.error, 'Load tester grant');
  assert.deepEqual(profileResult.data, { id: testerUserId, role: 'student', is_active: true });
  assert.deepEqual(actorResult.data, { id: actorId, role: 'admin', is_active: true });
  assert.deepEqual(assignmentResult.data, { id: assignmentId, assessment_version_id: assessmentVersionId });
  assert.deepEqual(attemptResult.data, {
    id: completedAttemptId,
    student_id: testerUserId,
    assignment_id: assignmentId,
    status: 'completed',
    assessment_version_id: completedAttemptVersionId,
  });
  return grantResult.data;
}

let grant = await loadState();

if (mode === 'apply' && grant?.revoked_at !== null) {
  const grantedAt = new Date().toISOString();
  const { error } = await db.from('mock_assignment_testers').upsert({
    assignment_id: assignmentId,
    user_id: testerUserId,
    granted_by: actorId,
    granted_at: grantedAt,
    revoked_by: null,
    revoked_at: null,
  }, { onConflict: 'assignment_id,user_id' });
  check(error, 'Grant tester access');
  check((await db.from('mock_assessment_audit').insert({
    version_id: assessmentVersionId,
    assignment_id: assignmentId,
    action: 'tester_granted',
    actor_id: actorId,
    details: { testerUserId, reason: 'User-approved self-check of Production RC mock version 2' },
  })).error, 'Write tester grant audit');
  grant = await loadState();
}

if (mode === 'revoke' && grant && grant.revoked_at === null) {
  const revokedAt = new Date().toISOString();
  const { error } = await db.from('mock_assignment_testers').update({
    revoked_by: actorId,
    revoked_at: revokedAt,
  }).eq('assignment_id', assignmentId).eq('user_id', testerUserId).is('revoked_at', null);
  check(error, 'Revoke tester access');
  check((await db.from('mock_assessment_audit').insert({
    version_id: assessmentVersionId,
    assignment_id: assignmentId,
    action: 'tester_revoked',
    actor_id: actorId,
    details: { testerUserId, reason: 'Revoke self-check access for Production RC mock' },
  })).error, 'Write tester revocation audit');
  grant = await loadState();
}

const active = Boolean(grant && grant.revoked_at === null);
if (mode === 'apply') assert.equal(active, true, 'Tester grant is not active after apply.');
if (mode === 'revoke') assert.equal(active, false, 'Tester grant is still active after revoke.');
console.log(JSON.stringify({
  environment: 'Production',
  assignmentId,
  testerUserId,
  active,
  completedAttemptPreserved: true,
  inverse: `node scripts/production-rc-mock-tester-access.mjs ${active ? 'revoke' : 'apply'}`,
}, null, 2));
