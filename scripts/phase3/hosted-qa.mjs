import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, lstatSync, realpathSync, openSync, closeSync, fsyncSync, renameSync, unlinkSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { previewOrigin } from './check-hosted-readiness.mjs';

const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const only = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
const stages = ['prepared', 'setup_accepted', 'cleanup_prepared', 'application_cleanup_accepted'];
const stateName = 'hosted-qa-state.json';

// This lifecycle manages private packets only; Auth and provider APIs are never called.
export function newState(manifest, { preview, commit }, validateManifest) {
  validateManifest(manifest);
  assert(manifest.expectedTableCount === 92, 'The current hosted application table inventory must be 92.');
  assert(previewOrigin(preview) === manifest.preview, 'Owner-verified Preview must match the manifest.');
  assert(/^[a-f0-9]{40}$/.test(commit) && commit === manifest.commit, 'Exact owner-verified commit must match the manifest.');
  return { format: 'phase3-offline-qa-lifecycle-v1', project: 'eyphkkginlgoaxflauog',
    manifest, manifestSha256: sha(manifest), stage: 'prepared', baseline: null,
    checkouts: [], contentIds: [], setupReceipt: null, cleanupReceipt: null,
    authAccountsRemoved: false, providerAcceptance: 'not established by this offline lifecycle' };
}
export function validateState(state, validateManifest) {
  assert(object(state) && state.format === 'phase3-offline-qa-lifecycle-v1' && state.project === 'eyphkkginlgoaxflauog', 'Invalid lifecycle state.');
  validateManifest(state.manifest);
  assert(state.manifestSha256 === sha(state.manifest), 'Manifest changed after preparation.');
  assert(stages.includes(state.stage) && Array.isArray(state.checkouts) && Array.isArray(state.contentIds), 'Invalid lifecycle stage or tracking list.');
  assert(state.authAccountsRemoved === false, 'Offline lifecycle cannot attest Auth deletion.');
  if (state.baseline !== null) validateBaseline(state.baseline);
  if (state.stage !== 'prepared') {
    assert(state.baseline !== null, 'Accepted setup baseline is required.');
    const accepted = acceptSetup({ ...state, stage: 'prepared' }, state.setupReceipt);
    assert(['md5', 'ledger_md5', 'table_count', 'excluded_generated_profiles', 'excluded_generated_candidates'].every(key => accepted.baseline[key] === state.baseline[key]), 'Stored baseline differs from its accepted receipt.');
  } else assert(state.baseline === null && state.checkouts.length === 0 && state.contentIds.length === 0 && state.setupReceipt === null, 'Prepared state cannot contain accepted setup or tracking.');
  if (state.stage === 'application_cleanup_accepted') acceptCleanup({ ...state, stage: 'cleanup_prepared' }, state.cleanupReceipt);
  else assert(state.cleanupReceipt === null, 'Cleanup receipt is inconsistent with lifecycle state.');
  assert(new Set(state.contentIds).size === state.contentIds.length && state.contentIds.every(uuid), 'Invalid content tracking.');
  assert(new Set(state.checkouts.map(c => c.id)).size === state.checkouts.length, 'Duplicate checkout tracking.');
  for (const checkout of state.checkouts) {
    validateCheckout(checkout, state.manifest);
    assert(checkout.studentId === state.manifest.users[checkout.label].id, 'Stored checkout requires its exact Student identity.');
  }
  return state;
}
export function validateBaseline(value) {
  assert(only(value, ['md5', 'ledger_md5', 'table_count', 'excluded_generated_profiles', 'excluded_generated_candidates'])
    && /^[a-f0-9]{32}$/.test(value.md5) && /^[a-f0-9]{32}$/.test(value.ledger_md5) && value.table_count === 92
    && value.excluded_generated_profiles === 20 && value.excluded_generated_candidates === 20, 'The expected 92-table, 20-account baseline is required.');
  return value;
}
export function acceptSetup(state, receipt) {
  assert(state.stage === 'prepared', 'Setup receipt cannot overwrite an accepted baseline.');
  assert(object(receipt) && receipt.check === 'phase3_qa_fixture_setup'
    && receipt.run_id === state.manifest.runId, 'Setup receipt belongs to a different operation or run.');
  validateBaseline(receipt.baseline);
  assert(receipt.qa_accounts === 20 && receipt.batches === 5, 'Setup fixture counts do not match the prepared run.');
  return { ...state, stage: 'setup_accepted', baseline: receipt.baseline, setupReceipt: receipt };
}
export function validateCheckout(record, manifest) {
  assert(only(record, ['id', 'label', 'studentId', 'state', 'orderId', 'paymentId', 'eventIds']) && uuid(record.id), 'Invalid checkout record.');
  assert(Object.hasOwn(manifest.users, record.label), 'Checkout account is outside the recorded run.');
  if (record.studentId !== undefined) assert(record.studentId === manifest.users[record.label].id, 'Checkout Student identity does not match its fixture label.');
  assert(Array.isArray(record.eventIds) && record.eventIds.every(id => typeof id === 'string' && id.length > 0 && id.length <= 200) && new Set(record.eventIds).size === record.eventIds.length, 'Explicit unique tracked webhook event identifiers are required.');
  assert(['prepared', 'creating', 'ready', 'fulfilled', 'review'].includes(record.state), 'An explicit checkout state is required.');
  if (record.orderId !== null) assert(/^order_[A-Za-z0-9]+$/.test(record.orderId), 'Invalid provider order identifier.');
  if (record.paymentId !== null) assert(/^pay_[A-Za-z0-9]+$/.test(record.paymentId), 'Invalid provider payment identifier.');
  if (['ready', 'fulfilled'].includes(record.state)) assert(record.orderId !== null, 'An attached order identifier is required.');
  if (record.state === 'fulfilled') assert(record.paymentId !== null, 'A fulfilled payment identifier is required.');
  return record;
}
export function trackCheckout(state, record) {
  assert(['setup_accepted', 'cleanup_prepared'].includes(state.stage), 'Accepted setup is required before checkout tracking.');
  validateCheckout(record, state.manifest);
  const prior = state.checkouts.find(c => c.id === record.id);
  if (prior) {
    assert(prior.label === record.label, 'Tracked checkout ownership cannot change.');
    for (const field of ['orderId', 'paymentId']) assert(prior[field] === null || prior[field] === record[field], 'Tracked provider identifiers cannot change or disappear.');
    assert(prior.eventIds.every(event => record.eventIds.includes(event)), 'Tracked provider events cannot disappear.');
    if (prior.state === 'fulfilled') assert(record.state === 'fulfilled', 'Fulfilled tracking cannot regress.');
  }
  const others = state.checkouts.filter(c => c.id !== record.id);
  for (const other of others) {
    for (const field of ['orderId', 'paymentId']) assert(record[field] === null || other[field] !== record[field], 'Provider identifiers cannot be assigned to different checkouts.');
    assert(record.eventIds.every(event => !other.eventIds.includes(event)), 'Webhook events cannot belong to different checkouts.');
  }
  return { ...state, stage: 'setup_accepted', checkouts: [...others, { ...record, studentId: state.manifest.users[record.label].id }] };
}
export function trackContent(state, record) {
  assert(['setup_accepted', 'cleanup_prepared'].includes(state.stage), 'Accepted setup is required before content tracking.');
  assert(only(record, ['id']) && uuid(record.id), 'Invalid content tracking record.');
  assert(!state.contentIds.includes(record.id), 'Content is already tracked.');
  return { ...state, stage: 'setup_accepted', contentIds: [...state.contentIds, record.id] };
}
export function cleanupPacket(state, cleanupSql) {
  assert(state.stage === 'setup_accepted' || state.stage === 'cleanup_prepared', 'Accepted setup is required before cleanup generation.');
  validateBaseline(state.baseline);
  const sql = cleanupSql(state.manifest, { baseline: state.baseline, checkouts: state.checkouts.map(({ id, studentId, orderId, paymentId, eventIds }) => ({ id, studentId, orderId, paymentId, eventIds })), contentIds: state.contentIds });
  return { state: { ...state, stage: 'cleanup_prepared' }, sql };
}
export function acceptCleanup(state, receipt) {
  assert(state.stage === 'cleanup_prepared', 'The current cleanup packet must be prepared first.');
  assert(object(receipt) && receipt.check === 'phase3_qa_fixture_cleanup'
    && receipt.run_id === state.manifest.runId && receipt.baseline_restored === true
    && receipt.generated_profiles_deactivated === 20 && receipt.auth_deletion_required === true, 'A successful cleanup receipt for this run is required.');
  validateBaseline(receipt.fingerprint);
  assert(['md5', 'ledger_md5', 'table_count', 'excluded_generated_profiles', 'excluded_generated_candidates'].every(key => receipt.fingerprint[key] === state.baseline[key]), 'Cleanup fingerprint differs from the accepted baseline.');
  return { ...state, stage: 'application_cleanup_accepted', cleanupReceipt: receipt };
}

export function privateDirectory(directory) {
  const stat = lstatSync(directory);
  assert(stat.isDirectory() && !stat.isSymbolicLink() && stat.uid === process.getuid() && (stat.mode & 0o077) === 0, 'A pre-existing owner-only private directory is required.');
  assert(realpathSync(directory) === path.resolve(directory), 'Symlinked private directory paths are not accepted.');
  return path.resolve(directory);
}
export function readPrivateJson(file) {
  const stat = lstatSync(file);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.uid === process.getuid() && (stat.mode & 0o077) === 0, 'Private input must be an owner-only regular file without links.');
  assert(stat.size <= 2 * 1024 * 1024, 'Private input exceeds the size limit.');
  return JSON.parse(readFileSync(file, 'utf8'));
}
export function atomicPrivateWrite(directory, filename, contents, { replace = false } = {}) {
  const dir = privateDirectory(directory);
  assert(/^[a-zA-Z0-9.-]+$/.test(filename), 'Invalid private output name.');
  const target = path.join(dir, filename), temporary = path.join(dir, `.${filename}.${randomUUID()}.tmp`);
  if (existsSync(target)) {
    assert(replace, 'Existing private state or packet must not be overwritten implicitly.');
    const st = lstatSync(target);
    assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1 && st.uid === process.getuid() && (st.mode & 0o077) === 0, 'Existing output is not an owner-only regular file.');
  }
  // Both exact paths must be excluded before private bytes reach disk.
  for (const output of [target, temporary]) execFileSync('git', ['-C', dir, 'check-ignore', '--quiet', '--', output], { stdio: 'ignore' });
  const fd = openSync(temporary, 'wx', 0o600);
  try { writeFileSync(fd, contents); fsyncSync(fd); } finally { closeSync(fd); }
  try { renameSync(temporary, target); } finally { if (existsSync(temporary)) unlinkSync(temporary); }
}
function locked(directory, task) {
  const lock = path.join(privateDirectory(directory), '.hosted-qa.lock');
  const fd = openSync(lock, 'wx', 0o600);
  try { return task(); } finally { closeSync(fd); unlinkSync(lock); }
}
function options(argv) {
  assert(argv.length % 2 === 0, 'Named options require values.');
  const result = {};
  for (let i = 0; i < argv.length; i += 2) {
    const name = argv[i];
    assert(['--directory', '--manifest', '--owner-verified-preview', '--commit', '--receipt', '--record'].includes(name) && !Object.hasOwn(result, name), 'Unknown or repeated option.');
    result[name] = argv[i + 1];
  }
  return result;
}
export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && argv[0] === '--help') {
    console.log('Offline Phase 3 QA lifecycle. No Auth, database or provider API calls occur.\nprepare --directory <existing Git-ignored 700 directory> --manifest <600 JSON> --owner-verified-preview <HTTPS origin> --commit <40 SHA>\nsetup --directory <directory>\naccept-setup --directory <directory> --receipt <600 JSON>\nrecord-checkout --directory <directory> --record <600 JSON: id,label,state,orderId:null|string,paymentId:null|string,eventIds:[]>\nrecord-content --directory <directory> --record <600 JSON: id>\ncleanup --directory <directory>\naccept-cleanup --directory <directory> --receipt <600 JSON>\nstatus --directory <directory>\nSynthetic resources are non-deliverable placeholders. Account preparation and independently verified Auth cleanup are separate; this command never attests them.');
    return;
  }
  const [command, ...args] = argv, opts = options(args);
  const allowed = { prepare: ['--directory', '--manifest', '--owner-verified-preview', '--commit'], setup: ['--directory'], 'accept-setup': ['--directory', '--receipt'], 'record-checkout': ['--directory', '--record'], 'record-content': ['--directory', '--record'], cleanup: ['--directory'], 'accept-cleanup': ['--directory', '--receipt'], status: ['--directory'] };
  assert(Object.hasOwn(allowed, command) && Object.keys(opts).length === allowed[command].length && allowed[command].every(key => opts[key]), 'Required command options are missing or unexpected.');
  const dir = privateDirectory(opts['--directory']);
  for (const output of [stateName, '01-SETUP-FIXTURES.sql', '02-CLEANUP-FIXTURES.sql', '.hosted-qa.lock', `.${stateName}.pending.tmp`]) execFileSync('git', ['-C', dir, 'check-ignore', '--quiet', '--', path.join(dir, output)], { stdio: 'ignore' });
  const { validateManifest, setupSql, cleanupSql } = await import('./hosted-fixtures.mjs');
  locked(dir, () => {
    let state;
    if (command === 'prepare') {
      assert(!existsSync(path.join(dir, stateName)), 'A recorded run already exists; its state must be retained.');
      state = newState(readPrivateJson(opts['--manifest']), { preview: opts['--owner-verified-preview'], commit: opts['--commit'] }, validateManifest);
    } else state = validateState(readPrivateJson(path.join(dir, stateName)), validateManifest);
    if (command === 'setup') {
      assert(state.stage === 'prepared', 'Setup SQL is unavailable after setup acceptance.');
      atomicPrivateWrite(dir, '01-SETUP-FIXTURES.sql', setupSql(state.manifest), { replace: true });
    } else if (command === 'accept-setup') state = acceptSetup(state, readPrivateJson(opts['--receipt']));
    else if (command === 'record-checkout') state = trackCheckout(state, readPrivateJson(opts['--record']));
    else if (command === 'record-content') state = trackContent(state, readPrivateJson(opts['--record']));
    else if (command === 'cleanup') {
      const generated = cleanupPacket(state, cleanupSql); state = generated.state;
      atomicPrivateWrite(dir, '02-CLEANUP-FIXTURES.sql', generated.sql, { replace: true });
    } else if (command === 'accept-cleanup') state = acceptCleanup(state, readPrivateJson(opts['--receipt']));
    validateState(state, validateManifest);
    if (command !== 'status') atomicPrivateWrite(dir, stateName, JSON.stringify(state, null, 2) + '\n', { replace: command !== 'prepare' });
    console.log(JSON.stringify({ check: 'phase3_offline_qa_lifecycle', stage: state.stage,
      trackedCheckouts: state.checkouts.length, trackedContent: state.contentIds.length,
      hostedActionsPerformed: false, authAccountsRemoved: false, acceptanceEstablished: false }));
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(() => { console.error('Offline QA lifecycle refused the operation. Private inputs, exact run state, owner-confirmed Preview and Git-ignored permissions require verification; no hosted action was performed.'); process.exitCode = 1; });
}
