import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isSupportedNotionUrl,
  validateFlexibleResourceDraft,
} from '../src/lib/flexibleResources.ts';

const courseId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';

test('accepts standalone and batch starter packs without fake sessions', () => {
  for (const scope of ['standalone', 'batch']) {
    const result = validateFlexibleResourceDraft({
      courseId,
      title: 'Getting started',
      category: 'starter_pack',
      scope,
      format: 'notion',
      notionUrl: 'https://ace-club.notion.site/getting-started-123',
    });
    assert.equal(result.valid, true);
    if (result.valid) assert.equal(result.draft.sessionId, null);
  }
});

test('accepts Section text instructions and rejects an event association', () => {
  const accepted = validateFlexibleResourceDraft({
    courseId,
    title: 'Quant reference note',
    category: 'reference',
    scope: 'section',
    sectionKey: 'quantitative-ability',
    format: 'text',
    textContent: 'Review this before the next problem-solving block.',
  });
  assert.equal(accepted.valid, true);

  const rejected = validateFlexibleResourceDraft({
    courseId,
    title: 'Broken Section note',
    category: 'reference',
    scope: 'section',
    sectionKey: 'quantitative-ability',
    sessionId,
    format: 'text',
    textContent: 'This must not carry a fake event.',
  });
  assert.equal(rejected.valid, false);
});

test('keeps recordings and Session materials event-owned', () => {
  const recording = validateFlexibleResourceDraft({
    courseId,
    title: 'Class recording',
    category: 'recording',
    scope: 'event',
    sessionId,
    format: 'youtube',
    videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
  });
  assert.equal(recording.valid, true);

  const leakedRecording = validateFlexibleResourceDraft({
    courseId,
    title: 'Cross-batch recording',
    category: 'recording',
    scope: 'batch',
    format: 'youtube',
    videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
  });
  assert.equal(leakedRecording.valid, false);

  const wrongSessionPdf = validateFlexibleResourceDraft({
    courseId,
    title: 'Private notes',
    category: 'session_material',
    scope: 'event',
    sessionId,
    format: 'pdf',
    fileUrl: '/api/materials/file?path=session-materials%2F33333333-3333-4333-8333-333333333333%2F44444444-4444-4444-8444-444444444444.pdf',
  });
  assert.equal(wrongSessionPdf.valid, false);
});

test('accepts only supported Notion hosts', () => {
  assert.equal(isSupportedNotionUrl('https://www.notion.so/example'), true);
  assert.equal(isSupportedNotionUrl('https://ace.notion.site/example'), true);
  assert.equal(isSupportedNotionUrl('http://ace.notion.site/example'), false);
  assert.equal(isSupportedNotionUrl('https://notion.site.example.com/example'), false);
});
