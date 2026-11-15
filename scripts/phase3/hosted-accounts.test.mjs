import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { initialAccountState, validateAccountState, prepareAccounts, recoverPending, removeAccounts, createAccountTransport } from './hosted-accounts.mjs';
import { fixtureLabels } from './hosted-fixtures.mjs';
import { newState, acceptSetup, cleanupPacket, acceptCleanup, trackCheckout } from './hosted-qa.mjs';
import { validateManifest, cleanupSql } from './hosted-fixtures.mjs';
import { PROJECT, ORIGIN } from '../phase1-hosted-closeout-config.mjs';
const argumentsForRun = { preview: 'https://ace-club-phase3-qa.vercel.app', commit: 'a'.repeat(40), startDate: '2030-01-10' };
function environment() {
  const state = initialAccountState(argumentsForRun, new Date('2026-11-15T00:00:00Z'));
  const auth = new Map(), profiles = new Map(), requests = [], snapshots = [], purchases = new Map();
  const request = async (method, resource, body) => {
    requests.push({ method, resource, body });
    if (method === 'POST') {
      const user = { id: randomUUID(), email: body.email, app_metadata: body.app_metadata, user_metadata: body.user_metadata, email_confirmed_at: '2026-11-15T00:00:01Z', created_at: '2026-11-15T00:00:01Z' };
      auth.set(user.id, user); profiles.set(user.id, { id: user.id, email: user.email, role: 'student', is_active: false }); return user;
    }
    if (resource.includes('?page=')) return { users: [...auth.values()] };
    if (resource.startsWith('/auth/v1/admin/users/')) {
      const id = resource.split('/').at(-1);
      if (method === 'DELETE') { auth.delete(id); profiles.delete(id); return {}; }
      return auth.get(id) ?? null;
    }
    if (resource.startsWith('/rest/v1/profiles')) { const id = /id=eq\.([a-f0-9-]+)/.exec(resource)[1]; return profiles.has(id) ? [profiles.get(id)] : []; }
    if (resource.startsWith('/rest/v1/v2_purchases')) { const id = /student_id=eq\.([a-f0-9-]+)/.exec(resource)[1]; return purchases.get(id) ?? []; }
    if (resource.startsWith('/rest/v1/rpc/read_v2_checkout_service')) return null;
    throw Error('Unknown synthetic request');
  };
  const save = async value => snapshots.push(structuredClone(value));
  return { state, auth, profiles, requests, snapshots, purchases, request, save };
}
async function acceptedCleanup(fixture, withCheckout = false) {
  const manifest = await prepareAccounts(fixture.state, fixture.request, fixture.save);
  let qa = newState(manifest, argumentsForRun, validateManifest);
  const baseline = { md5: 'a'.repeat(32), ledger_md5: 'b'.repeat(32), table_count: 92, excluded_generated_profiles: 20, excluded_generated_candidates: 20 };
  qa = acceptSetup(qa, { check: 'phase3_qa_fixture_setup', run_id: manifest.runId, qa_accounts: 20, batches: 5, baseline });
  if (withCheckout) qa = trackCheckout(qa, { id: randomUUID(), label: 'full', state: 'review', orderId: 'order_synthetic', paymentId: 'pay_synthetic', eventIds: [] });
  qa = cleanupPacket(qa, cleanupSql).state;
  qa = acceptCleanup(qa, { check: 'phase3_qa_fixture_cleanup', run_id: manifest.runId, baseline_restored: true, fingerprint: baseline, generated_profiles_deactivated: 20, auth_deletion_required: true });
  fixture.profiles.get(fixture.state.accounts.admin.id).role = 'admin';
  return qa;
}

test('account preparation records pending creation first and verifies all exact inactive synthetic identities', async () => {
  const f = environment(), manifest = await prepareAccounts(f.state, f.request, f.save);
  assert.equal(Object.keys(manifest.users).length, 20); assert.equal(f.auth.size, 20);
  assert.equal(f.requests.filter(r => r.method === 'POST').length, 20);
  assert.equal(f.snapshots[0].accounts.admin.stage, 'request_pending');
  assert.equal(f.state.googleOauthVerified, false); assert.equal(f.state.syntheticAuthentication, true);
  assert(fixtureLabels.every(label => f.state.accounts[label].stage === 'verified'));
  assert(f.requests.filter(r => r.method === 'POST').every(r => r.body.app_metadata.phase3_fixture_authentication === true));
  const previous = f.requests.length;
  await prepareAccounts(f.state, f.request, f.save);
  assert(f.requests.slice(previous).every(r => r.method === 'GET'));
});

test('ambiguous creation never retries or deletes and exact recovery uses reads only', async () => {
  const f = environment(); let failed = false;
  const responseLost = async (...args) => { const result = await f.request(...args); if (args[0] === 'POST' && !failed) { failed = true; throw Error('Synthetic timeout after server commit'); } return result; };
  await assert.rejects(() => prepareAccounts(f.state, responseLost, f.save));
  assert.equal(f.state.accounts.admin.stage, 'request_pending'); assert.equal(f.auth.size, 1);
  await assert.rejects(() => prepareAccounts(f.state, f.request, f.save), /ambiguous/);
  assert.equal(f.requests.filter(r => r.method === 'POST').length, 1);
  const count = f.requests.length;
  await recoverPending(f.state, f.request, f.save);
  assert(f.requests.slice(count).every(r => r.method === 'GET'));
  await prepareAccounts(f.state, f.request, f.save);
  assert.equal(f.auth.size, 20); assert.equal(f.requests.filter(r => r.method === 'DELETE').length, 0);
});

test('foreign ownership and provider-normalized metadata stop without profile rewrites or cleanup', async () => {
  for (const mutate of [u => { u.app_metadata.provider = 'email'; }, u => { u.user_metadata.phase3_qa_run = randomUUID(); }, u => { u.created_at = '2020-01-01T00:00:00Z'; }]) {
    const f = environment();
    await assert.rejects(() => prepareAccounts(f.state, async (...args) => { const result = await f.request(...args); if (args[0] === 'POST') mutate(result); return result; }, f.save));
    assert.equal(f.requests.filter(r => r.method === 'POST').length, 1);
    assert.equal(f.requests.filter(r => ['DELETE', 'PATCH', 'PUT'].includes(r.method)).length, 0);
  }
  const f = environment();
  await assert.rejects(() => prepareAccounts(f.state, async (...args) => { const result = await f.request(...args); if (args[1].startsWith('/rest/v1/profiles')) result[0].is_active = true; return result; }, f.save), /inactive/);
});

test('unresolved recovery cannot invent an account or retry its creation', async () => {
  const f = environment(); f.state.accounts.admin.stage = 'request_pending';
  await assert.rejects(() => recoverPending(f.state, f.request, f.save), /unresolved/);
  assert(f.requests.every(r => r.method === 'GET')); assert.equal(f.state.accounts.admin.id, null);
  f.auth.set(randomUUID(), { id: randomUUID(), email: f.state.accounts.admin.email, user_metadata: {}, created_at: '2026-11-15T00:00:01Z' });
  await assert.rejects(() => recoverPending(f.state, f.request, f.save), /ownership/);
});

test('cleanup refuses absent receipt, wrong run, active profiles, purchases and tracked checkout remnants before deletion', async () => {
  for (const mutation of [
    (_f, qa) => { qa.stage = 'setup_accepted'; qa.cleanupReceipt = null; },
    (f) => { f.state.runId = randomUUID(); },
    (f) => { f.profiles.get(f.state.accounts.full.id).is_active = true; },
    (f) => { f.purchases.set(f.state.accounts.full.id, [{ id: randomUUID() }]); },
  ]) {
    const f = environment(), qa = await acceptedCleanup(f); mutation(f, qa);
    await assert.rejects(() => removeAccounts(f.state, qa, f.request, f.save));
    assert.equal(f.requests.filter(r => r.method === 'DELETE').length, 0);
  }
});

test('a remaining exact tracked checkout blocks every account deletion', async () => {
  const f = environment(), qa = await acceptedCleanup(f, true);
  await assert.rejects(() => removeAccounts(f.state, qa, async (...args) => args[1].startsWith('/rest/v1/rpc/read_v2_checkout_service') ? { id: qa.checkouts[0].id } : f.request(...args), f.save), /tracked checkout remains/);
  assert.equal(f.requests.filter(r => r.method === 'DELETE').length, 0);
});

test('exact account cleanup verifies absence and resumes an interrupted delete without a second delete', async () => {
  const f = environment(), qa = await acceptedCleanup(f); let failed = false;
  const interrupted = async (...args) => { const result = await f.request(...args); if (args[0] === 'DELETE' && !failed) { failed = true; throw Error('Synthetic lost delete response'); } return result; };
  await assert.rejects(() => removeAccounts(f.state, qa, interrupted, f.save));
  assert.equal(f.state.accounts.contender_2.stage, 'delete_pending');
  const result = await removeAccounts(f.state, qa, f.request, f.save);
  assert.equal(result.accountsRemoved, 20); assert.equal(result.authAndProfileAbsenceVerified, true);
  assert.equal(result.googleOauthVerified, false); assert.equal(f.auth.size, 0); assert.equal(f.profiles.size, 0);
  assert.equal(f.requests.filter(r => r.method === 'DELETE').length, 20);
  assert(fixtureLabels.every(label => !Object.hasOwn(f.state.accounts[label], 'password')));
  validateAccountState(f.state);
});

test('cleanup rejects unexpected missing identities rather than attesting deletion', async () => {
  const f = environment(), qa = await acceptedCleanup(f), id = f.state.accounts.full.id;
  f.auth.delete(id); await assert.rejects(() => removeAccounts(f.state, qa, f.request, f.save), /unexpected missing/);
  assert.equal(f.requests.filter(r => r.method === 'DELETE').length, 0);
});

test('transport fixes staging origin, denies unrelated endpoints and recognizes only explicit Auth not-found', async () => {
  const jwt = role => 'synthetic.' + Buffer.from(JSON.stringify({ role, ref: PROJECT })).toString('base64url') + '.signature';
  const config = { SUPABASE_URL: ORIGIN, SUPABASE_ANON_KEY: jwt('anon'), SUPABASE_SERVICE_ROLE_KEY: jwt('service_role') };
  const requests = [], fetcher = async (url, options) => { requests.push({ url, options }); return new Response('{"code":"user_not_found"}', { status: 404 }); };
  const request = createAccountTransport(config, fetcher), id = randomUUID();
  assert.equal(await request('GET', `/auth/v1/admin/users/${id}`), null);
  assert(requests.every(r => r.url.startsWith(ORIGIN) && r.options.redirect === 'error'));
  for (const [method, resource] of [['POST', '/rest/v1/profiles'], ['PATCH', `/auth/v1/admin/users/${id}`], ['GET', 'https://foreign.invalid'], ['DELETE', '/auth/v1/admin/users']]) await assert.rejects(() => request(method, resource, {}));
  assert.equal(requests.length, 1);
  const ambiguous = createAccountTransport(config, async () => new Response('{"code":"not_found"}', { status: 404 }));
  await assert.rejects(() => ambiguous('GET', `/auth/v1/admin/users/${id}`));
  assert.throws(() => createAccountTransport({ ...config, SUPABASE_URL: 'https://production.invalid' }));
});

test('planning rejects stale IST dates and invalid calendar dates before any account creation', () => {
  assert.throws(() => initialAccountState({ ...argumentsForRun, startDate: '2026-11-15' }, new Date('2026-11-14T23:00:00Z')), /future IST/);
  assert.throws(() => initialAccountState({ ...argumentsForRun, startDate: '2030-02-30' }), /future IST/);
});

test('offline account CLI requires every private output ignored and persists owner-only state without network', () => {
  const repo = mkdtempSync(path.join(tmpdir(), 'phase3-account-cli-')), dir = path.join(repo, '.qa-private'), script = path.resolve('scripts/phase3/hosted-accounts.mjs');
  try {
    execFileSync('git', ['init', '--quiet', repo]);mkdirSync(dir, { mode: 0o700 });
    const run = (...args) => JSON.parse(execFileSync(process.execPath, [script, ...args, '--directory', dir], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }));
    const args = ['plan', '--preview', argumentsForRun.preview, '--commit', argumentsForRun.commit, '--start-date', argumentsForRun.startDate];
    writeFileSync(path.join(repo, '.gitignore'), '.qa-private/hosted-account-state.json\n');
    assert.throws(() => run(...args));
    writeFileSync(path.join(repo, '.gitignore'), ['hosted-account-state.json', 'generated-fixture-manifest.json', '.hosted-accounts.lock', '.hosted-account-state.json.pending.tmp'].map(name => `.qa-private/${name}`).join('\n') + '\n');
    assert.throws(() => run(...args));
    assert.throws(() => statSync(path.join(dir, 'hosted-account-state.json')));
    writeFileSync(path.join(repo, '.gitignore'), '.qa-private/\n');
    const result = run(...args);assert.equal(result.verified, 0);assert.equal(result.googleOauthVerified, false);
    const privateFile = path.join(dir, 'hosted-account-state.json'), state = JSON.parse(readFileSync(privateFile, 'utf8'));
    assert.equal(statSync(privateFile).mode & 0o777, 0o600);assert.equal(Object.keys(state.accounts).length, 20);
    assert(!JSON.stringify(result).includes('@'));assert(!JSON.stringify(result).includes(state.accounts.admin.password));
    assert.equal(run('status').removed, 0);assert.throws(() => run(...args));
  } finally { rmSync(repo, { recursive: true, force: true }); }
});
