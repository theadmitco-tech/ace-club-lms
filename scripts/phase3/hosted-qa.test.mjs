import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, chmodSync, readFileSync, lstatSync, symlinkSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fixtureLabels, fixtureEmail, createManifest } from './hosted-fixtures.mjs';
import { newState, validateState, acceptSetup, trackCheckout, trackContent, cleanupPacket, acceptCleanup, privateDirectory, readPrivateJson, atomicPrivateWrite } from './hosted-qa.mjs';

const id = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
const manifest = { expectedTableCount: 92, runId: id, preview: 'https://ace-club-qa-synthetic.vercel.app', commit: 'a'.repeat(40), users: { eligible: { id: other, email: 'synthetic@example.invalid' } } };
const baseline = { md5: 'b'.repeat(32), table_count: 92, excluded_generated_profiles: 20, excluded_generated_candidates: 20, ledger_md5: 'e'.repeat(32) };
const validateManifest = value => assert.deepEqual(value, manifest);
const prepared = () => newState(structuredClone(manifest), { preview: manifest.preview, commit: manifest.commit }, validateManifest);
const setup = (patch = {}) => ({ check: 'phase3_qa_fixture_setup', run_id: id, qa_accounts: 20, batches: 5, baseline, ...patch });
const accepted = () => acceptSetup(prepared(), setup());
const cleanup = (patch = {}) => ({ check: 'phase3_qa_fixture_cleanup', run_id: id, baseline_restored: true, generated_profiles_deactivated: 20, auth_deletion_required: true, fingerprint: baseline, ...patch });

test('private lifecycle requires explicit matching owner Preview and candidate', () => {
  assert.throws(() => newState(manifest, { preview: 'https://aceclub.theadmitco.com', commit: manifest.commit }, validateManifest));
  assert.throws(() => newState(manifest, { preview: manifest.preview, commit: 'c'.repeat(40) }, validateManifest));
  assert.throws(() => newState(manifest, { preview: manifest.preview + '?token=private', commit: manifest.commit }, validateManifest));
  const state = prepared(); state.manifest.commit = 'd'.repeat(40);
  assert.throws(() => validateState(state, () => undefined), /Manifest changed/);
});
test('setup receipt cannot replace baseline, accept an unrelated run or ignore schema drift', () => {
  assert.throws(() => acceptSetup(prepared(), setup({ run_id: other })));
  assert.throws(() => acceptSetup(prepared(), setup({ check: 'phase3_activation' })));
  assert.throws(() => acceptSetup(prepared(), setup({ baseline: { ...baseline, table_count: 93 } })));
  assert.throws(() => acceptSetup(prepared(), setup({ qa_accounts: 19 })));
  assert.throws(() => acceptSetup(accepted(), setup()));
  assert.equal(accepted().stage, 'setup_accepted');
  const forged = accepted(); forged.baseline = { ...baseline, md5: 'd'.repeat(32) };
  assert.throws(() => validateState(forged, validateManifest), /Stored baseline differs/);
  const noReceipt = accepted(); noReceipt.setupReceipt = null;
  assert.throws(() => validateState(noReceipt, validateManifest));
});
test('tracked checkouts reject unknown identities and preserve attached provider references', () => {
  assert.throws(() => trackCheckout(prepared(), { id, label: 'eligible', state: 'prepared', orderId: null, paymentId: null, eventIds: [] }));
  assert.throws(() => trackCheckout(accepted(), { id, label: 'unknown', state: 'prepared', orderId: null, paymentId: null, eventIds: [] }));
  assert.throws(() => trackCheckout(accepted(), { id, label: 'eligible', state: 'fulfilled' }));
  const ready = trackCheckout(accepted(), { id, label: 'eligible', state: 'ready', orderId: 'order_synthetic', paymentId: null, eventIds: [] });
  assert.throws(() => trackCheckout(ready, { id, label: 'eligible', state: 'ready', orderId: 'order_changed', paymentId: null, eventIds: [] }));
  const fulfilled = trackCheckout(ready, { id, label: 'eligible', state: 'fulfilled', orderId: 'order_synthetic', paymentId: 'pay_synthetic', eventIds: [] });
  assert.throws(() => trackCheckout(fulfilled, { id, label: 'eligible', state: 'ready', orderId: 'order_synthetic', paymentId: 'pay_synthetic', eventIds: [] }));
  assert.equal(fulfilled.checkouts.length, 1);
});
test('cleanup includes only explicit tracking and requires matching exact receipt', () => {
  let state = trackContent(accepted(), { id: other });
  state = trackCheckout(state, { id, label: 'eligible', state: 'prepared', orderId: null, paymentId: null, eventIds: [] });
  let args;
  const packet = cleanupPacket(state, (m, input) => { assert.deepEqual(m, manifest); args = input; return '-- synthetic packet'; });
  assert.deepEqual(args.baseline, baseline); assert.deepEqual(args.contentIds, [other]);
  assert.equal(args.checkouts.length, 1); assert.equal(packet.state.stage, 'cleanup_prepared');
  assert.throws(() => acceptCleanup(state, cleanup()));
  for (const patch of [{ run_id: other }, { baseline_restored: false }, { fingerprint: { ...baseline, md5: 'c'.repeat(32) } }]) assert.throws(() => acceptCleanup(packet.state, cleanup(patch)));
  const finished = acceptCleanup(packet.state, cleanup());
  assert.equal(finished.stage, 'application_cleanup_accepted');
  assert.equal(finished.authAccountsRemoved, false);
  assert.throws(() => trackContent(finished, { id }));
  assert.throws(() => acceptCleanup(finished, cleanup()));
  assert.equal(trackContent(packet.state, { id }).stage, 'setup_accepted');
});
test('private state writes are owner-only, atomic and refuse implicit replacement or linked input', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'phase3-offline-qa-'));
  chmodSync(dir, 0o700);
  try {
    const target = path.join(dir, 'state.json');
    atomicPrivateWrite(dir, 'state.json', JSON.stringify(prepared()));
    assert.equal(lstatSync(target).mode & 0o777, 0o600);
    assert.equal(readPrivateJson(target).stage, 'prepared');
    assert.throws(() => atomicPrivateWrite(dir, 'state.json', '{}'));
    assert.equal(readPrivateJson(target).stage, 'prepared');
    atomicPrivateWrite(dir, 'state.json', JSON.stringify(accepted()), { replace: true });
    assert.equal(readPrivateJson(target).stage, 'setup_accepted');
    assert.throws(() => atomicPrivateWrite(dir, '../escape.json', '{}'));
    symlinkSync(target, path.join(dir, 'linked.json'));
    assert.throws(() => readPrivateJson(path.join(dir, 'linked.json')));
    assert.throws(() => atomicPrivateWrite(dir, 'linked.json', '{}', { replace: true }));
    assert.equal(JSON.parse(readFileSync(target, 'utf8')).stage, 'setup_accepted');
    chmodSync(target, 0o644); assert.throws(() => readPrivateJson(target));
    chmodSync(dir, 0o755); assert.throws(() => privateDirectory(dir));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});


test('actual CLI generates matching fixture packets and retains incomplete Auth status across restarts', () => {
  const repo = mkdtempSync(path.join(tmpdir(), 'phase3-cli-repository-'));
  const dir = path.join(repo, '.qa-private');
  const script = path.resolve('scripts/phase3/hosted-qa.mjs');
  try {
    execFileSync('git', ['init', '--quiet', repo]);
    writeFileSync(path.join(repo, '.gitignore'), '.qa-private/\n');
    mkdirSync(dir, { mode: 0o700 });
    const runId = randomUUID(), users = Object.fromEntries(fixtureLabels.map(label => [label, { id: randomUUID(), email: fixtureEmail(runId, label) }]));
    const actual = createManifest({ runId, createdAt: '2026-11-14T00:00:00.000Z', users, preview: manifest.preview, commit: manifest.commit, startDate: '2027-01-10' });
    const put = (name, data) => { writeFileSync(path.join(dir, name), JSON.stringify(data), { mode: 0o600 }); return path.join(dir, name); };
    const run = (command, ...args) => JSON.parse(execFileSync(process.execPath, [script, command, '--directory', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
    const source = put('manifest.json', actual);
    assert.equal(run('prepare', '--manifest', source, '--owner-verified-preview', actual.preview, '--commit', actual.commit).stage, 'prepared');
    assert.throws(() => run('prepare', '--manifest', source, '--owner-verified-preview', actual.preview, '--commit', actual.commit));
    run('setup');
    const setupSQL = readFileSync(path.join(dir, '01-SETUP-FIXTURES.sql'), 'utf8');
    assert.ok(setupSQL.includes('phase3_qa_fixture_setup'));
    assert.ok(setupSQL.includes(users.admin.id));
    run('accept-setup', '--receipt', put('setup-result.json', setup({ run_id: runId })));
    const checkoutId = randomUUID();
    run('record-checkout', '--record', put('checkout.json', { id: checkoutId, label: 'full', state: 'fulfilled', orderId: 'order_exact', paymentId: 'pay_exact', eventIds: ['event_exact'] }));
    assert.equal(run('cleanup').stage, 'cleanup_prepared');
    const cleanupSQL = readFileSync(path.join(dir, '02-CLEANUP-FIXTURES.sql'), 'utf8');
    assert.ok(cleanupSQL.includes(users.full.id));assert.ok(cleanupSQL.includes(checkoutId));
    assert.ok(cleanupSQL.includes('event_exact'));assert.ok(cleanupSQL.includes(baseline.ledger_md5));
    const state = readPrivateJson(path.join(dir, 'hosted-qa-state.json'));
    assert.equal(state.checkouts[0].studentId, users.full.id);
    assert.deepEqual(state.checkouts[0].eventIds, ['event_exact']);
    assert.equal(run('status').authAccountsRemoved, false);
    assert.equal(run('accept-cleanup', '--receipt', put('cleanup-result.json', cleanup({ run_id: runId }))).stage, 'application_cleanup_accepted');
    assert.equal(run('status').acceptanceEstablished, false);
    for (const file of ['hosted-qa-state.json','01-SETUP-FIXTURES.sql','02-CLEANUP-FIXTURES.sql']) assert.equal(lstatSync(path.join(dir, file)).mode & 0o777, 0o600);
    assert.throws(() => run('record-checkout', '--record', path.join(dir, 'checkout.json')));
    const unsafe = path.join(repo, 'not-ignored');mkdirSync(unsafe, { mode: 0o700 });
    assert.throws(() => execFileSync(process.execPath, [script, 'prepare', '--directory', unsafe, '--manifest', source, '--owner-verified-preview', actual.preview, '--commit', actual.commit], { stdio: 'pipe' }));
  } finally { rmSync(repo, { recursive: true, force: true }); }
});
