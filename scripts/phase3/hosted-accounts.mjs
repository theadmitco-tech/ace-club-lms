import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PROJECT, ORIGIN, UUID, check, readConfig, validateConfig } from '../phase1-hosted-closeout-config.mjs';
import { privateDirectory, readPrivateJson, atomicPrivateWrite, validateState as validateQaState } from './hosted-qa.mjs';
import { fixtureLabels, fixtureEmail, createManifest, validateManifest } from './hosted-fixtures.mjs';
import { previewOrigin } from './check-hosted-readiness.mjs';

const stateFile = 'hosted-account-state.json';
const stages = ['planned', 'request_pending', 'created', 'verified', 'delete_pending', 'deleted'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const instant = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
function futureDate(value, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  check(/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value && value > today, 'A valid future IST class start date is required.');
}

export function initialAccountState({ preview, commit, startDate }, now = new Date()) {
  check(/^[a-f0-9]{40}$/.test(commit), 'An exact owner-verified candidate commit is required.');
  futureDate(startDate, now);
  const runId = randomUUID();
  return { format: 'phase3-generated-auth-v1', project: PROJECT, runId,
    preview: previewOrigin(preview), commit, startDate, createdAt: now.toISOString(),
    syntheticAuthentication: true, googleOauthVerified: false, cleanupAccepted: false,
    accounts: Object.fromEntries(fixtureLabels.map(label => [label, { email: fixtureEmail(runId, label), id: null,
      password: `Qa!${randomBytes(24).toString('base64url')}9a`, stage: 'planned' }])) };
}
export function validateAccountState(state) {
  check(object(state) && state.format === 'phase3-generated-auth-v1' && state.project === PROJECT && UUID.test(state.runId), 'Invalid generated-account run.');
  check(previewOrigin(state.preview) === state.preview && /^[a-f0-9]{40}$/.test(state.commit) && instant(state.createdAt), 'Invalid candidate attribution.');
  check(/^\d{4}-\d{2}-\d{2}$/.test(state.startDate) && state.syntheticAuthentication === true && state.googleOauthVerified === false, 'Synthetic fixture scope is required.');
  check(object(state.accounts) && Object.keys(state.accounts).length === fixtureLabels.length, 'Exact generated-account inventory required.');
  const ids = [];
  for (const label of fixtureLabels) {
    const account = state.accounts[label];
    check(object(account) && account.email === fixtureEmail(state.runId, label) && stages.includes(account.stage), 'Generated identity mismatch.');
    check(account.id === null || UUID.test(account.id), 'Invalid generated identity identifier.');
    if (account.stage !== 'deleted') check(typeof account.password === 'string' && account.password.length >= 32, 'Private fixture password is required.');
    if (['created', 'verified', 'delete_pending', 'deleted'].includes(account.stage)) check(account.id !== null, 'Recorded identity is required.');
    if (account.id !== null) ids.push(account.id);
  }
  check(ids.length === new Set(ids).size, 'Duplicate generated identity.');
  return state;
}
export function ownedIdentity(state, label, user, { requireGoogle = false } = {}) {
  const account = state.accounts[label];
  check(account && object(user) && UUID.test(user.id) && (!account.id || account.id === user.id)
    && user.email === account.email && user.user_metadata?.phase3_qa_run === state.runId && user.app_metadata?.phase3_fixture_authentication === true
    && instant(user.created_at) && Date.parse(user.created_at) >= Date.parse(state.createdAt), 'Generated Auth ownership mismatch.');
  if (requireGoogle) check(user.app_metadata?.provider === 'google' && instant(user.email_confirmed_at), 'Synthetic Google marker was not retained; setup must stop without metadata repair.');
  return user;
}
export function createAccountTransport(config, fetchImpl = fetch) {
  validateConfig(config, { database: false });
  return async (method, resource, body) => {
    const id = '[a-f0-9-]{36}';
    const reads = new RegExp(`^(?:/auth/v1/admin/users/${id}|/auth/v1/admin/users\\?page=[1-9][0-9]?&per_page=100|/rest/v1/profiles\\?id=eq\\.${id}&select=id,email,role,is_active|/rest/v1/v2_purchases\\?student_id=eq\\.${id}&select=id&limit=1|/rest/v1/rpc/read_v2_checkout_service\\?p_id=${id})$`, 'i');
    check((method === 'GET' && reads.test(resource) && body === undefined)
      || (method === 'POST' && resource === '/auth/v1/admin/users' && object(body))
      || (method === 'DELETE' && new RegExp(`^/auth/v1/admin/users/${id}$`, 'i').test(resource) && body === undefined), 'Only exact staging account lifecycle endpoints are allowed.');
    const response = await fetchImpl(ORIGIN + resource, { method, redirect: 'error', cache: 'no-store',
      signal: AbortSignal.timeout(20000), headers: { apikey: config.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (response.status === 404 && method === 'GET' && resource.startsWith('/auth/v1/admin/users/')) {
      const absent = await response.json();
      check(absent.code === 'user_not_found', 'Auth absence was not established.'); return null;
    }
    check(response.ok, 'A staging account request failed; private response withheld.');
    const value = await response.json();
    return resource.startsWith('/auth/v1/') && object(value?.user) ? value.user : value;
  };
}
async function readOwned(state, label, request, requireGoogle = false) {
  const account = state.accounts[label];
  const user = await request('GET', `/auth/v1/admin/users/${account.id}`);
  return ownedIdentity(state, label, user, { requireGoogle });
}
async function profile(state, label, request) {
  const account = state.accounts[label];
  const rows = await request('GET', `/rest/v1/profiles?id=eq.${account.id}&select=id,email,role,is_active`);
  check(Array.isArray(rows) && rows.length === 1 && rows[0].id === account.id && rows[0].email === account.email, 'Generated profile ownership mismatch.');
  return rows[0];
}
export async function prepareAccounts(state, request, save) {
  validateAccountState(state); futureDate(state.startDate);
  check(state.cleanupAccepted === false && Object.values(state.accounts).every(a => !['deleted', 'delete_pending'].includes(a.stage)), 'Cleanup has begun; account creation is closed.');
  for (const label of fixtureLabels) {
    const account = state.accounts[label];
    check(account.stage !== 'request_pending', 'An ambiguous create request requires exact read-only recovery; creation will not retry.');
    if (account.stage === 'planned') {
      account.stage = 'request_pending'; await save(state);
      // The requested provider marker is synthetic fixture metadata, never OAuth evidence.
      const user = await request('POST', '/auth/v1/admin/users', { email: account.email, password: account.password,
        email_confirm: true, app_metadata: { provider: 'google', providers: ['google'], phase3_fixture_authentication: true },
        user_metadata: { full_name: `Phase 3 QA ${label}`, phase3_qa_run: state.runId } });
      ownedIdentity(state, label, user); account.id = user.id; account.stage = 'created'; await save(state);
    }
    await readOwned(state, label, request, true);
    const p = await profile(state, label, request);
    check(p.role === 'student' && p.is_active === false, 'Fresh inactive Student profile required; existing state is never rewritten.');
    account.stage = 'verified'; await save(state);
  }
  return createManifest({ runId: state.runId, createdAt: state.createdAt, users: Object.fromEntries(fixtureLabels.map(label => [label, { id: state.accounts[label].id, email: state.accounts[label].email }])), preview: state.preview, commit: state.commit, startDate: state.startDate });
}
export async function recoverPending(state, request, save) {
  validateAccountState(state);
  const pending = fixtureLabels.filter(label => state.accounts[label].stage === 'request_pending');
  check(pending.length === 1, 'Exactly one ambiguous creation is required for recovery.');
  const label = pending[0], matches = [];
  let complete = false;
  for (let page = 1; page <= 50; page++) {
    const result = await request('GET', `/auth/v1/admin/users?page=${page}&per_page=100`);
    check(object(result) && Array.isArray(result.users) && result.users.length <= 100, 'Auth pagination was not validated.');
    for (const user of result.users) if (user.email === state.accounts[label].email) matches.push(user);
    if (result.users.length < 100) { complete = true; break; }
  }
  check(complete && matches.length === 1, 'Ambiguous request remains unresolved; no mutation or automatic retry is permitted.');
  const user = ownedIdentity(state, label, matches[0]);
  state.accounts[label].id = user.id; state.accounts[label].stage = 'created'; await save(state);
}
export function bindCleanup(state, qaState) {
  validateAccountState(state); validateQaState(qaState, validateManifest);
  check(qaState.stage === 'application_cleanup_accepted' && qaState.manifest.runId === state.runId
    && qaState.manifest.preview === state.preview && qaState.manifest.commit === state.commit
    && fixtureLabels.every(label => qaState.manifest.users[label].id === state.accounts[label].id
      && qaState.manifest.users[label].email === state.accounts[label].email), 'Exact accepted SQL cleanup and generated identities are required.');
  check(Object.values(state.accounts).every(a => ['verified', 'delete_pending', 'deleted'].includes(a.stage)), 'Incomplete account preparation requires separate reconciliation; automatic deletion is excluded.');
  return qaState;
}
export async function removeAccounts(state, qaState, request, save) {
  bindCleanup(state, qaState);
  // Every tracked payment record must be absent before any identity deletion.
  for (const checkout of qaState.checkouts) check(await request('GET', `/rest/v1/rpc/read_v2_checkout_service?p_id=${checkout.id}`) === null, 'A tracked checkout remains; Auth deletion refused.');
  for (const label of fixtureLabels) {
    const account = state.accounts[label];
    const user = await request('GET', `/auth/v1/admin/users/${account.id}`);
    if (user === null) {
      check(['delete_pending', 'deleted'].includes(account.stage), 'An unexpected missing identity requires reconciliation.');
    } else {
      check(account.stage !== 'deleted', 'A previously removed identity reappeared.'); ownedIdentity(state, label, user);
      const p = await profile(state, label, request);
      check(p.is_active === false && p.role === (label === 'admin' ? 'admin' : 'student'), 'Generated profile changed after SQL cleanup.');
    }
    const purchases = await request('GET', `/rest/v1/v2_purchases?student_id=eq.${account.id}&select=id&limit=1`);
    check(Array.isArray(purchases) && purchases.length === 0, 'A purchase remains; Auth deletion refused.');
  }
  state.cleanupAccepted = true; await save(state);
  for (const label of [...fixtureLabels].reverse()) {
    const account = state.accounts[label];
    const user = await request('GET', `/auth/v1/admin/users/${account.id}`);
    if (user !== null) {
      ownedIdentity(state, label, user);
      const p = await profile(state, label, request); check(p.is_active === false, 'Profile reactivated; deletion refused.');
      account.stage = 'delete_pending'; await save(state);
      await request('DELETE', `/auth/v1/admin/users/${account.id}`);
    } else check(['delete_pending', 'deleted'].includes(account.stage), 'Unexpected absent account.');
    check(await request('GET', `/auth/v1/admin/users/${account.id}`) === null, 'Auth deletion was not independently verified.');
    const profiles = await request('GET', `/rest/v1/profiles?id=eq.${account.id}&select=id,email,role,is_active`);
    check(Array.isArray(profiles) && profiles.length === 0, 'Generated profile remains after Auth deletion.');
    account.stage = 'deleted'; delete account.password; await save(state);
  }
  return { check: 'phase3_generated_auth_cleanup', accountsRemoved: fixtureLabels.length, authAndProfileAbsenceVerified: true, googleOauthVerified: false, paymentAcceptanceEstablished: false };
}
function parseOptions(argv) {
  const result = {};
  check(argv.length % 2 === 0, 'Named options require values.');
  for (let i = 0; i < argv.length; i += 2) {
    check(['--directory', '--preview', '--commit', '--start-date', '--staging-env', '--qa-state'].includes(argv[i]) && !Object.hasOwn(result, argv[i]) && argv[i + 1], 'Unknown or repeated option.');
    result[argv[i]] = argv[i + 1];
  }
  return result;
}
export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && argv[0] === '--help') {
    console.log('Generated Phase 3 staging accounts only; no OAuth acceptance is implied.\nplan --directory <700 Git-ignored directory> --preview <owner-confirmed origin> --commit <40 SHA> --start-date <future YYYY-MM-DD>\nprepare --directory <directory> --staging-env <600 staging credentials>\nrecover --directory <directory> --staging-env <credentials>\ncleanup --directory <directory> --staging-env <credentials> --qa-state <accepted offline lifecycle JSON>\nstatus --directory <directory>\nplan/status are offline. prepare/recover/cleanup call only the designated staging Auth/read endpoints. Ambiguous creation is never blindly retried; partial creation never triggers automatic deletion.'); return;
  }
  check(process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production', 'Production execution is excluded.');
  const [command, ...rest] = argv, options = parseOptions(rest);
  const names = { plan: ['--directory', '--preview', '--commit', '--start-date'], prepare: ['--directory', '--staging-env'], recover: ['--directory', '--staging-env'], cleanup: ['--directory', '--staging-env', '--qa-state'], status: ['--directory'] };
  check(names[command] && Object.keys(options).length === names[command].length && names[command].every(key => options[key]), 'Required command options are missing or unexpected.');
  const directory = privateDirectory(options['--directory']);
  for (const output of [stateFile, 'generated-fixture-manifest.json', '.hosted-accounts.lock', `.${stateFile}.pending.tmp`]) execFileSync('git', ['-C', directory, 'check-ignore', '--quiet', '--', path.join(directory, output)], { stdio: 'ignore' });
  const lock = path.join(directory, '.hosted-accounts.lock'), fd = openSync(lock, 'wx', 0o600);
  try {
    const filename = path.join(directory, stateFile);
    if (command === 'plan') {
      check(!existsSync(filename), 'An existing generated-account run must be retained.');
      const state = initialAccountState({ preview: options['--preview'], commit: options['--commit'], startDate: options['--start-date'] });
      atomicPrivateWrite(directory, stateFile, JSON.stringify(state, null, 2) + '\n');
    } else {
      const state = validateAccountState(readPrivateJson(filename));
      const save = current => atomicPrivateWrite(directory, stateFile, JSON.stringify(current, null, 2) + '\n', { replace: true });
      if (command !== 'status') {
        const request = createAccountTransport(readConfig(options['--staging-env'], { database: false }));
        if (command === 'prepare') {
          const manifest = await prepareAccounts(state, request, save);
          const destination = path.join(directory, 'generated-fixture-manifest.json');
          if (existsSync(destination)) validateManifest(readPrivateJson(destination));
          check(!existsSync(destination), 'Existing manifest must not be silently replaced.');
          atomicPrivateWrite(directory, 'generated-fixture-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
        } else if (command === 'recover') await recoverPending(state, request, save);
        else console.log(JSON.stringify(await removeAccounts(state, readPrivateJson(options['--qa-state']), request, save)));
      }
    }
    const state = validateAccountState(readPrivateJson(filename));
    console.log(JSON.stringify({ check: 'phase3_generated_auth_lifecycle', verified: Object.values(state.accounts).filter(a => a.stage === 'verified').length, removed: Object.values(state.accounts).filter(a => a.stage === 'deleted').length, ambiguous: Object.values(state.accounts).filter(a => a.stage === 'request_pending').length, syntheticAuthentication: true, googleOauthVerified: false }));
  } finally { closeSync(fd); unlinkSync(lock); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(() => { console.error('Generated-account operation stopped. Private run state retains partial progress; exact staging identity and cleanup evidence require review. No blind mutation retry or fallback cleanup occurred.'); process.exitCode = 1; });
