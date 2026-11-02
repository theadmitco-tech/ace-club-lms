import { constants, existsSync, lstatSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { PROJECT, ORIGIN, UUID, check, readConfig } from './phase1-hosted-closeout-config.mjs';

export const OPERATOR_STATE = '/tmp/ace-phase2-content-operator.private.json';
const purpose = 'phase2_content_operator';
const safe = (result, stage) => { check(!result.error, `${stage} failed; provider details withheld.`); return result.data; };

export function readOperatorState(path = OPERATOR_STATE) {
  const stat = lstatSync(path);
  check(stat.isFile() && !stat.isSymbolicLink() && stat.uid === process.getuid() && (stat.mode & 0o077) === 0, 'Operator state must be an owned private file.');
  const state = JSON.parse(readFileSync(path, 'utf8'));
  check(state?.purpose === purpose && state.project === PROJECT && UUID.test(state.runId)
    && state.email === `ace-content-operator-${state.runId}@example.invalid`
    && (!state.userId || UUID.test(state.userId)), 'Operator ownership manifest is invalid.');
  return state;
}

export function saveOperatorState(state, path = OPERATOR_STATE, initial = false) {
  if (!initial) readOperatorState(path);
  const encoded = JSON.stringify(state, null, 2) + '\n';
  if (initial) { writeFileSync(path, encoded, { flag: constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, mode: 0o600 }); return; }
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, encoded, { flag: constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, mode: 0o600 });
  renameSync(temporary, path);
}

export function ownedOperator(user, state) {
  return !!user && user.id === state.userId && user.email === state.email
    && user.app_metadata?.phase2_content_operator_run === state.runId
    && user.app_metadata?.phase2_content_operator === true;
}

export function operatorSummary(state) {
  return { purpose: state.purpose, project: state.project, runId: state.runId, operatorId: state.userId ?? null,
    status: state.status, emailDeliveryRequested: false, auditIdentityRetained: state.status === 'deactivated', passwordRetained: Object.hasOwn(state, 'password') };
}

export async function runOperator(mode, service, path = OPERATOR_STATE) {
  check(['prepare', 'deactivate'].includes(mode), 'Only prepare or deactivate is supported.');
  let state;
  if (mode === 'prepare') {
    if (existsSync(path)) {
      state = readOperatorState(path);
      check(state.status !== 'deactivated', 'The retained audit identity is deactivated; it must not be reactivated automatically.');
    } else {
      const runId = randomUUID();
      state = { purpose, project: PROJECT, runId, email: `ace-content-operator-${runId}@example.invalid`,
        password: `Op!${randomUUID()}aA9`, status: 'preparing', createdAt: new Date().toISOString(), userId: null };
      saveOperatorState(state, path, true);
    }
    if (!state.userId) {
      // The unique persisted email and administrator-owned metadata identify a
      // partial creation after a lost provider response; no existing identity is selected.
      let found = null;
      for (let page = 1; page <= 100; page++) {
        const listed = safe(await service.auth.admin.listUsers({ page, perPage: 100 }), 'Operator creation reconciliation');
        found = listed.users.find(user => user.email === state.email) ?? null;
        if (found || listed.users.length < 100) break;
        check(page < 100, 'Operator reconciliation exceeded the bounded account inventory.');
      }
      if (found) {
        state.userId = found.id;
        check(ownedOperator(found, state), 'Existing operator metadata does not match this run.');
      } else {
        const created = safe(await service.auth.admin.createUser({ email: state.email, password: state.password,
          email_confirm: true, user_metadata: { full_name: 'Content Operator' },
          app_metadata: { phase2_content_operator: true, phase2_content_operator_run: state.runId } }), 'Create dedicated content operator');
        state.userId = created.user.id;
        check(ownedOperator(created.user, state), 'Created operator metadata does not match this run.');
      }
      state.status = 'identity-created'; saveOperatorState(state, path);
    }
    const user = safe(await service.auth.admin.getUserById(state.userId), 'Verify operator ownership').user;
    check(ownedOperator(user, state), 'Operator identity ownership mismatch.');
    safe(await service.from('profiles').upsert({ id: state.userId, email: state.email, full_name: 'Content Operator', role: 'admin', is_active: true }), 'Prepare content operator profile');
    const profile = safe(await service.from('profiles').select('id,role,is_active').eq('id', state.userId).single(), 'Verify operator profile');
    check(profile.id === state.userId && profile.role === 'admin' && profile.is_active === true, 'Operator profile verification failed.');
    state.status = 'ready'; state.readyAt ??= new Date().toISOString(); saveOperatorState(state, path);
    return operatorSummary(state);
  }
  state = readOperatorState(path);
  check(UUID.test(state.userId), 'No generated operator identity is available.');
  const user = safe(await service.auth.admin.getUserById(state.userId), 'Verify operator ownership').user;
  check(ownedOperator(user, state), 'Operator identity ownership mismatch.');
  if (state.status === 'deactivated') return operatorSummary(state);
  safe(await service.from('profiles').update({ is_active: false }).eq('id', state.userId), 'Deactivate operator profile');
  const profile = safe(await service.from('profiles').select('id,is_active').eq('id', state.userId).single(), 'Verify deactivation');
  check(profile.id === state.userId && profile.is_active === false, 'Operator deactivation verification failed.');
  safe(await service.auth.admin.updateUserById(state.userId, { ban_duration: '876000h', password: `Closed!${randomUUID()}aA9` }), 'Disable retained audit identity');
  state.status = 'deactivated'; state.deactivatedAt = new Date().toISOString(); delete state.password; saveOperatorState(state, path);
  return operatorSummary(state);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const mode = process.argv[2];
    check(['prepare', 'deactivate'].includes(mode) && process.argv.length === 3, 'Usage: prepare | deactivate.');
    const config = readConfig('/tmp/ace-phase1-staging.env', { database: false });
    const service = createClient(ORIGIN, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(20000) }) },
    });
    console.log(JSON.stringify(await runOperator(mode, service), null, 2));
  } catch {
    console.error('Content operator action failed; private state remains available for ownership and retry review.');
    process.exitCode = 1;
  }
}
