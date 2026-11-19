import assert from 'node:assert/strict';
import test from 'node:test';
import { suggestV2LiveMappings } from '../src/lib/v2LiveMappingSuggestions.ts';

const event = (key, title, section = 'quant') => ({ key, title, section, kind: 'live' });
const session = (key, title, section = 'quant') => ({ key, title, section });
const publication = (overrides = {}) => ({ batchId: 'batch-a', revision: 3, state: 'published',
  events: [event('event-a', 'Algebra')], sessions: [session('session-a', 'Algebra')], ...overrides });
const mapping = (sessionKey, publicationRevision = 2) => ({ eventKey: 'event-a', sessionKey, publicationRevision });

test('new generated classes receive unique exact title and subject suggestions', () => {
  const sections = ['quant', 'verbal', 'di'];
  const result = suggestV2LiveMappings(publication({
    events: sections.map((section, index) => event(`event-${index}`, 'Introduction', section)),
    sessions: sections.map((section, index) => session(`session-${index}`, 'Introduction', section)),
  }), []);
  assert.deepEqual(result.map(item => [item.sessionKey, item.source]), sections.map((_, index) => [`session-${index}`, 'title']));
});
test('current publication confirmation takes precedence over renamed titles and history', () => {
  const result = suggestV2LiveMappings(publication({ sessions: [session('session-a', 'Renamed'), session('session-b', 'Algebra')] }), [mapping('session-b'), mapping('session-a', 3)]);
  assert.deepEqual(result[0], { eventKey: 'event-a', sessionKey: 'session-a', source: 'confirmed' });
});
test('latest valid historical link takes precedence over a new title match', () => {
  const result = suggestV2LiveMappings(publication({ sessions: [session('session-a', 'Algebra'), session('session-b', 'Different title')] }), [mapping('session-a', 1), mapping('session-b', 2)]);
  assert.equal(result[0].sessionKey, 'session-b');
  assert.equal(result[0].source, 'previous');
});
test('removed or wrong-subject historical links cannot be suggested', () => {
  for (const sessions of [[], [session('session-a', 'Algebra', 'verbal')]]) {
    assert.equal(suggestV2LiveMappings(publication({ sessions }), [mapping('session-a')])[0].source, 'none');
  }
});
test('a removed latest historical link does not resurrect an older link', () => {
  const result = suggestV2LiveMappings(publication({ sessions: [session('session-a', 'Different title')] }), [mapping('session-a', 1), mapping('removed', 2)]);
  assert.equal(result[0].source, 'none');
});
test('duplicate event or session titles remain manual', () => {
  for (const overrides of [
    { events: [event('event-a', 'Algebra'), event('event-b', 'Algebra')] },
    { sessions: [session('session-a', 'Algebra'), session('session-b', 'Algebra')] },
  ]) assert.ok(suggestV2LiveMappings(publication(overrides), []).every(item => item.source === 'none'));
});
test('case, whitespace, partial-title and cross-subject guesses remain manual', () => {
  for (const candidate of [session('session-a', 'algebra'), session('session-a', 'Algebra '), session('session-a', 'Algebra basics'), session('session-a', 'Algebra', 'verbal')]) {
    assert.equal(suggestV2LiveMappings(publication({ sessions: [candidate] }), [])[0].source, 'none');
  }
});
test('future revisions, unrelated events, and outline entries provide no historical suggestion', () => {
  const result = suggestV2LiveMappings(publication({ sessions: [session('session-a', 'Different title')], events: [event('event-a', 'Algebra'), { ...event('outline', 'Different title'), kind: 'outline' }] }), [mapping('session-a', 4), { ...mapping('session-a'), eventKey: 'other-event' }]);
  assert.deepEqual(result, [{ eventKey: 'event-a', sessionKey: '', source: 'none' }]);
});
test('unpublished snapshots never offer or claim confirmed links', () => {
  assert.equal(suggestV2LiveMappings(publication({ state: 'unpublished' }), [mapping('session-a', 3)])[0].source, 'none');
});
