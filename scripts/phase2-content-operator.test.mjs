import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { runOperator, readOperatorState, operatorSummary } from './phase2-content-operator.mjs';

function harness() {
  const users = new Map(), profiles = new Map(), calls = [];
  const success = data => ({ data, error: null });
  const service = { auth: { admin: {
    listUsers: async () => success({ users: [...users.values()] }),
    createUser: async input => { calls.push('create'); const user = { id: randomUUID(), ...input }; users.set(user.id, user); return success({ user }); },
    getUserById: async id => success({ user: users.get(id) }),
    updateUserById: async (id, input) => { calls.push('disable'); Object.assign(users.get(id), input); return success({ user: users.get(id) }); },
  } }, from: table => {
    assert.equal(table, 'profiles');
    return {
      upsert: async input => { calls.push('profile'); profiles.set(input.id, input); return success(input); },
      select: () => ({ eq: (_, id) => ({ single: async () => success(profiles.get(id)) }) }),
      update: input => ({ eq: async (_, id) => { calls.push('inactive'); Object.assign(profiles.get(id), input); return success(null); } }),
    };
  } };
  return { service, users, profiles, calls };
}

test('dedicated operator prepare is idempotent and deactivation preserves audit identity', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ace-operator-test-')), path = join(directory, 'state.json'), h = harness();
  try {
    const first = await runOperator('prepare', h.service, path), state = readOperatorState(path);
    assert.equal(first.status, 'ready'); assert.equal(h.users.size, 1); assert.equal(statSync(path).mode & 0o077, 0);
    assert.equal(h.users.get(state.userId).email_confirm, true);
    assert.equal(h.profiles.get(state.userId).role, 'admin'); assert.equal(h.profiles.get(state.userId).is_active, true);
    assert.equal((await runOperator('prepare', h.service, path)).operatorId, first.operatorId);
    assert.equal(h.calls.filter(call => call === 'create').length, 1);
    assert(!JSON.stringify(operatorSummary(state)).includes(state.password));
    const stopped = await runOperator('deactivate', h.service, path);
    assert.equal(stopped.status, 'deactivated'); assert.equal(stopped.auditIdentityRetained, true);
    assert.equal(stopped.passwordRetained, false); assert.equal(h.users.size, 1); assert.equal(h.profiles.size, 1);
    assert.equal(h.profiles.get(state.userId).is_active, false);
    assert.equal(h.users.get(state.userId).ban_duration, '876000h');
    assert.equal((await runOperator('deactivate', h.service, path)).status, 'deactivated');
    assert.equal(h.calls.filter(call => call === 'disable').length, 1);
    await assert.rejects(runOperator('prepare', h.service, path), /must not be reactivated/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('ownership mismatch prevents profile changes and deactivation', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ace-operator-test-')), path = join(directory, 'state.json'), h = harness();
  try {
    await runOperator('prepare', h.service, path);
    const state = readOperatorState(path), calls = h.calls.length;
    h.users.get(state.userId).app_metadata.phase2_content_operator_run = randomUUID();
    await assert.rejects(runOperator('deactivate', h.service, path), /ownership mismatch/);
    await assert.rejects(runOperator('prepare', h.service, path), /ownership mismatch/);
    assert.equal(h.calls.length, calls); assert.equal(h.profiles.get(state.userId).is_active, true);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
