import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractNotionPageId,
  getNotionEmbedUrl,
  getPublicNotionUrl,
} from '../src/lib/notion.ts';

const pageId = '3604e51784b880c4b785e05df9d308a9';

test('normalizes a public Notion copy link to its iframe route', () => {
  const copiedUrl = `https://nebula-darkness-356.notion.site/RC-Primary-Purpose-Questions-${pageId}?source=copy_link`;

  assert.equal(extractNotionPageId(copiedUrl), pageId);
  assert.equal(
    getNotionEmbedUrl(copiedUrl, pageId),
    `https://nebula-darkness-356.notion.site/ebd/${pageId}`,
  );
});

test('normalizes a complete Notion iframe without retaining duplicate slashes or query parameters', () => {
  const iframe = `<iframe src="https://nebula-darkness-356.notion.site/ebd//${pageId}?source=copy_link" width="100%"></iframe>`;

  assert.equal(
    getNotionEmbedUrl(iframe, pageId),
    `https://nebula-darkness-356.notion.site/ebd/${pageId}`,
  );
});

test('rejects non-HTTPS and lookalike Notion hosts', () => {
  assert.equal(getPublicNotionUrl(`http://notion.site/${pageId}`), null);
  assert.equal(getPublicNotionUrl(`https://notion.site.example.com/${pageId}`), null);
  assert.equal(getNotionEmbedUrl(`https://example.com/${pageId}`, pageId), null);
});
