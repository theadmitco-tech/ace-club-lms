export const readingId = '123456781234123412341234567890ab';
export const secondReadingId = '323456781234123412341234567890ab';
export function readingRecord(pageId = readingId, title = 'Synthetic reading body') {
  const uuid = (value) => value.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
  const root = uuid(pageId), paragraph = '22345678-1234-1234-1234-1234567890ab';
  const image = '42345678-1234-1234-1234-1234567890ab';
  return {
    block: {
      [root]: { role: 'reader', value: { id: root, type: 'page', alive: true, version: 1,
        content: [paragraph, image], properties: { title: [['Provider page title']] } } },
      [paragraph]: { role: 'reader', value: { id: paragraph, type: 'text', alive: true, version: 1,
        parent_id: root, parent_table: 'block', properties: { title: [[title], [' Bold content', [['b']]],
          [' Reference link', [['a', 'https://example.test/reading-reference']]]] } } },
      [image]: { role: 'reader', value: { id: image, type: 'image', alive: true, version: 1,
        parent_id: root, parent_table: 'block', properties: { source: [['/reading-fixture-image.svg']], caption: [['Synthetic diagram']] },
        format: { block_width: 240, block_height: 80, display_source: '/reading-fixture-image.svg' } } },
    },
    collection: {}, collection_view: {}, notion_user: {}, collection_query: {}, signed_urls: {},
  };
}
