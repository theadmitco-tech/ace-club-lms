import assert from 'node:assert/strict';
import test from 'node:test';
import { readDraftRecovery, writeDraftRecovery, removeDraftRecovery, clearDraftRecovery, draftRecoveryKey, DRAFT_RECOVERY_TTL } from '../src/lib/draftRecovery.ts';
import { isWorksheetRecovery, isWorksheetSaveReceipt } from '../src/lib/worksheetRecovery.ts';
function storage() {
  const values = new Map();
  return { get length() { return values.size; }, key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
const edit = { id: 'question-a', status: 'review', comment: 'Synthetic reflection', timeValue: '2:30', baseUpdatedAt: null };
test('scratch state is isolated by owner and route, and disappears on explicit discard', () => {
  const store = storage();
  assert.equal(writeDraftRecovery(store, 'student-a', 'worksheet-a', { edits: [edit] }, 10), true);
  assert.deepEqual(JSON.parse(readDraftRecovery(store, 'student-a', 'worksheet-a', 11)), { edits: [edit] });
  assert.equal(readDraftRecovery(store, 'student-b', 'worksheet-a', 11), null);
  assert.equal(readDraftRecovery(store, 'student-a', 'worksheet-b', 11), null);
  removeDraftRecovery(store, 'student-a', 'worksheet-a');
  assert.equal(readDraftRecovery(store, 'student-a', 'worksheet-a', 11), null);
});
test('expired, future, corrupt and incompatible envelopes are ignored', () => {
  const store = storage();
  writeDraftRecovery(store, 'a', 'b', edit, 100);
  assert.equal(readDraftRecovery(store, 'a', 'b', 100 + DRAFT_RECOVERY_TTL - 1) !== null, true);
  assert.equal(readDraftRecovery(store, 'a', 'b', 100 + DRAFT_RECOVERY_TTL), null);
  assert.equal(readDraftRecovery(store, 'a', 'b', 99), null);
  const key = draftRecoveryKey('a', 'b');
  const original = JSON.parse(store.getItem(key));
  for (const patch of [{ version: 2 }, { ownerId: 'other' }, { scope: 'other' }, { savedAt: '100' }, { payload: {} }]) {
    store.setItem(key, JSON.stringify({ ...original, ...patch }));
    assert.equal(readDraftRecovery(store, 'a', 'b', 101), null);
  }
  store.setItem(key, '{broken');
  assert.equal(readDraftRecovery(store, 'a', 'b', 101), null);
});
test('unavailable storage and oversized drafts cannot crash editing or sign-out', () => {
  const broken = new Proxy({}, { get() { throw new Error('Storage disabled'); } });
  assert.equal(readDraftRecovery(broken, 'a', 'b'), null);
  assert.equal(writeDraftRecovery(broken, 'a', 'b', edit), false);
  assert.equal(removeDraftRecovery(broken, 'a', 'b'), false);
  assert.doesNotThrow(() => clearDraftRecovery(broken));
  assert.equal(writeDraftRecovery(storage(), 'a', 'b', 'x'.repeat(500_001)), false);
});
test('sign-out cleanup removes all recovery entries but retains unrelated browser state', () => {
  const store = storage();
  store.setItem('unrelated', 'keep');
  for (const user of ['a', 'b']) for (const scope of ['template', 'meeting']) writeDraftRecovery(store, user, scope, edit);
  clearDraftRecovery(store);
  assert.equal(store.length, 1);
  assert.equal(store.getItem('unrelated'), 'keep');
});
test('worksheet recovery accepts incomplete input and rejects malformed/cross-question documents', () => {
  assert.equal(isWorksheetRecovery({ edits: [edit] }), true);
  assert.equal(isWorksheetRecovery({ edits: [{ ...edit, timeValue: '2:' }] }), true);
  for (const value of [null, {}, { edits: [null] }, { edits: [edit, edit] },
    ...[{ id: {} }, { comment: 'x'.repeat(2001) }, { status: 'passed' }, { timeValue: null }, { baseUpdatedAt: 'invalid' }].map(patch => ({ edits: [{ ...edit, ...patch }] }))]) {
    assert.equal(isWorksheetRecovery(value), false);
  }
});

test('only a matching, valid question save receipt can clear unsaved recovery', () => {
  const receipt = { id: edit.id, status: 'done', comment: null, time_taken_seconds: 150, updated_at: '2026-10-25T00:00:00Z' };
  assert.equal(isWorksheetSaveReceipt(receipt, edit.id), true);
  for (const value of [null, {}, ...[{ id: 'other-question' }, { status: 'passed' }, { comment: [] }, { time_taken_seconds: -1 }, { updated_at: 'invalid' }].map(patch => ({ ...receipt, ...patch }))]) {
    assert.equal(isWorksheetSaveReceipt(value, edit.id), false);
  }
});
