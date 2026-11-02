import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { approvedBatchRequests, matchingImportedBatch, prepareImportedBatches, publicationScopeMatches } from './phase2-material-acceptance.mjs';
const prepared = { report: { importId: randomUUID() }, plan: { drafts: ['full_course','quant','verbal','di'].map(productCode => ({
  templateId: randomUUID(), productCode, document: { sessions: [{ key: randomUUID(), title: 'Synthetic session', section: productCode === 'full_course' ? 'programme' : productCode,
    content: { materials: [], recordings: [], preSessionReads: [], postSessionReads: [] } }] },
})) } };
const requests = approvedBatchRequests(prepared);
const batchFor = request => ({ ...request, productCode: prepared.plan.drafts.find(draft => draft.templateId === request.templateId).productCode,
  revision: 1, events: [], sessions: prepared.plan.drafts.find(draft => draft.templateId === request.templateId).document.sessions });
const review = () => ({ fingerprint: 'a'.repeat(32), proposal: { action: 'publish', items: requests.map(request => ({ input: { batchId: request.id, batchRevision: 1, action: 'publish' },
  document: { batchId: request.id, batchRevision: 1, title: request.title, productCode: batchFor(request).productCode, state: 'published', events: [],
    sessions: batchFor(request).sessions.map(({ key,title,section }) => ({ key,title,section })) }, fingerprint: 'b'.repeat(32) })) } });

test('approved library batches have deterministic identities and preserve all course content', () => {
  assert.deepEqual(approvedBatchRequests(prepared), requests);
  assert.equal(new Set(requests.map(request => request.id)).size, 4);
  for (const request of requests) {
    const template = prepared.plan.drafts.find(draft => draft.templateId === request.templateId);
    assert.equal(matchingImportedBatch(batchFor(request), request, template), true);
    assert.equal(matchingImportedBatch({ ...batchFor(request), sessions: [] }, request, template), false);
    assert.equal(matchingImportedBatch({ ...batchFor(request), revision: 2 }, request, template), false);
  }
});

test('batch preparation performs only draft preview/save and reuses exact existing batches', async () => {
  const batches = [], calls = [];
  const client = { rpc: async (name, args) => {
    calls.push(name);
    if (name === 'list_v2_batch_drafts') return { data: batches, error: null };
    assert(['preview_v2_batch_draft','save_v2_batch_draft'].includes(name));
    const draft = batchFor(args.p_request);
    if (name === 'save_v2_batch_draft') batches.push(draft);
    return { data: { draft, fingerprint: 'a'.repeat(32) }, error: null };
  } };
  const record = (id, passed) => assert.equal(passed, true, id);
  assert.equal((await prepareImportedBatches(client, prepared, record)).length, 4);
  assert.equal(calls.filter(name => name === 'save_v2_batch_draft').length, 4);
  assert.equal((await prepareImportedBatches(client, prepared, record)).length, 4);
  assert.equal(calls.filter(name => name === 'save_v2_batch_draft').length, 4);
});

test('publication confirmation requires exactly the four approved batch projections', () => {
  assert.equal(publicationScopeMatches(review(), requests, prepared), true);
  for (const mutate of [value => value.proposal.items.push(value.proposal.items[0]), value => value.proposal.items.pop(),
    value => value.proposal.items[0].document.batchId = randomUUID(), value => value.proposal.items[0].document.sessions = [],
    value => value.proposal.items[0].document.batchRevision = 2, value => value.proposal.items[0].input = null]) {
    const changed = review(); mutate(changed); assert.equal(publicationScopeMatches(changed, requests, prepared), false);
  }
});
