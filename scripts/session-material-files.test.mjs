import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createProtectedMaterialUrl,
  getProtectedMaterialPath,
  isSessionMaterialStoragePath,
  isSupportedProtectedMaterialPath,
  isWorksheetStoragePath,
} from '../src/lib/materialFiles.ts';

const sessionId = '11111111-1111-4111-8111-111111111111';
const otherSessionId = '22222222-2222-4222-8222-222222222222';
const fileId = '33333333-3333-4333-8333-333333333333';
const sessionPath = `session-materials/${sessionId}/${fileId}.pdf`;
const worksheetPath = `worksheets/${sessionId}/${fileId}.pdf`;

test('round-trips canonical protected Session-material references', () => {
  const reference = createProtectedMaterialUrl(sessionPath);
  assert.equal(getProtectedMaterialPath(reference), sessionPath);
  assert.equal(isSessionMaterialStoragePath(sessionPath, sessionId), true);
  assert.equal(isSupportedProtectedMaterialPath(sessionPath), true);
});

test('keeps worksheet and Session-material namespaces distinct', () => {
  assert.equal(isWorksheetStoragePath(worksheetPath), true);
  assert.equal(isSessionMaterialStoragePath(worksheetPath), false);
  assert.equal(isWorksheetStoragePath(sessionPath), false);
  assert.equal(isSessionMaterialStoragePath(sessionPath), true);
});

test('rejects cross-session, traversal, non-PDF and non-UUID paths', () => {
  assert.equal(isSessionMaterialStoragePath(sessionPath, otherSessionId), false);
  assert.equal(isSessionMaterialStoragePath(`session-materials/${sessionId}/../${fileId}.pdf`), false);
  assert.equal(isSessionMaterialStoragePath(`session-materials/${sessionId}/${fileId}.png`), false);
  assert.equal(isSessionMaterialStoragePath(`session-materials/${sessionId}/reading.pdf`), false);
});

test('rejects external, duplicated and decorated protected references', () => {
  const reference = createProtectedMaterialUrl(sessionPath);
  assert.equal(getProtectedMaterialPath(`https://example.com${reference}`), null);
  assert.equal(getProtectedMaterialPath(`${reference}&path=${encodeURIComponent(sessionPath)}`), null);
  assert.equal(getProtectedMaterialPath(`${reference}&download=1`), null);
});
