import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(source, { exports, URL, Date, Set, ...globals, require(name) {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
const contracts = load('src/lib/v2Learning.ts', { './v2Meetings': { isV2MeetingBatchId: uuid } });
const batchId = randomUUID(), sessionKey = randomUUID(), itemKey = randomUUID(), obligationId = randomUUID(), requestId = randomUUID();
const progress = { batchId, sessionKey, itemKey, state: 'opened', publicationRevision: 1 };
const feedback = { obligationId, requestId, response: { usefulness: 4, clarity: 4, comment: 'Synthetic response', attendance: 'recording' } };
const learning = {
  batchId, publicationRevision: 1,
  sessions: [{ key: sessionKey, title: 'Quant 4', section: 'quant', locked: false }],
  obligations: [{ id: obligationId, batchId, sessionKey, sessionTitle: 'Quant 4', section: 'quant', source: 'recording', eventKey: null, createdAt: '2026-11-02T10:00:00Z' }],
  progress: [], lastSessionKey: null, liveRegistered: false, liveEvents: [],
};
function harness() {
  const state = { enabled: true, identity: { id: randomUUID(), role: 'student' }, data: null, error: null, fault: null, calls: [], clients: 0 };
  const api = load('src/lib/server/v2Learning.ts', {
    'server-only': {}, '@/lib/v2Meetings': { isV2MeetingBatchId: uuid }, '@/lib/v2Learning': contracts,
    './v2LearningFeature': { isV2LearningEnabled: () => state.enabled },
    './portalAuthorization': { getPortalIdentity: async () => { if (state.fault === 'identity') throw Error('private diagnostic'); return state.identity; } },
    '@/utils/supabase/server': { createClient: async () => {
      state.clients++; if (state.fault === 'client') throw Error('private diagnostic');
      return { rpc: async (...args) => { state.calls.push(args); if (state.fault === 'rpc') throw Error('private diagnostic'); return { data: state.data, error: state.error }; } };
    } },
  });
  return { state, api };
}

test('learning feature is disabled outside explicit staging Preview or local development', () => {
  const env = { V2_LEARNING_DELIVERY_ENABLED: 'true', VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: 'https://eyphkkginlgoaxflauog.supabase.co' };
  const feature = load('src/lib/server/v2LearningFeature.ts', { 'server-only': {} }, { process: { env } });
  assert.equal(feature.isV2LearningEnabled(), true);
  for (const patch of [
    { VERCEL_ENV: 'production' }, { VERCEL_ENV: 'other' }, { V2_LEARNING_DELIVERY_ENABLED: 'false' },
    { NEXT_PUBLIC_SUPABASE_URL: 'https://owmlxsnzogfapotmjrqk.supabase.co' },
    { NEXT_PUBLIC_SUPABASE_URL: 'https://eyphkkginlgoaxflauog.supabase.co.evil.invalid' },
    { NEXT_PUBLIC_SUPABASE_URL: 'https://user:password@eyphkkginlgoaxflauog.supabase.co' },
  ]) {
    const denied = load('src/lib/server/v2LearningFeature.ts', { 'server-only': {} }, { process: { env: { ...env, ...patch } } });
    assert.equal(denied.isV2LearningEnabled(), false);
  }
  const local = load('src/lib/server/v2LearningFeature.ts', { 'server-only': {} }, { process: { env: { ...env, VERCEL_ENV: undefined, NODE_ENV: 'development' } } });
  assert.equal(local.isV2LearningEnabled(), true);
});

test('learning DTO excludes private resource fields and unauthorized live details', () => {
  assert.equal(contracts.isV2LearningState(learning), true);
  for (const value of [null, {}, { ...learning, serviceKey: 'private' }, { ...learning, publicationRevision: 0 },
    { ...learning, sessions: [{ ...learning.sessions[0], url: 'https://private.invalid/resource' }] },
    { ...learning, sessions: [learning.sessions[0], learning.sessions[0]] },
    { ...learning, obligations: [{ ...learning.obligations[0], studentId: randomUUID() }] },
    { ...learning, liveEvents: [{ key: randomUUID(), title: 'Live', section: 'quant', startsAt: '2026-11-03T10:00:00Z', endsAt: '2026-11-03T11:00:00Z', completedAt: null, sessionKey }] },
  ]) assert.equal(contracts.isV2LearningState(value), false);
});

test('browser progress cannot claim attendance, completion or a supplied Student identity', () => {
  assert.equal(contracts.isV2ProgressInput(progress), true);
  for (const patch of [{ state: 'completed' }, { state: 'watched' }, { state: 'attended' }, { studentId: randomUUID() }, { publicationRevision: 0 }, { itemKey: 'invalid' }, { batchId: 'invalid' }]) {
    assert.equal(contracts.isV2ProgressInput({ ...progress, ...patch }), false);
  }
  assert.equal(contracts.isV2FeedbackInput(feedback), true);
  for (const value of [{ ...feedback, studentId: randomUUID() }, { ...feedback, requestId: 'invalid' },
    { ...feedback, response: { ...feedback.response, attendanceVerified: true } },
    { ...feedback, response: { ...feedback.response, usefulness: 6 } },
    { ...feedback, response: { ...feedback.response, comment: '\0' } },
  ]) assert.equal(contracts.isV2FeedbackInput(value), false);
});

test('learning DAL refuses disabled, unauthenticated and Admin callers before opening a client', async () => {
  for (const patch of [{ enabled: false }, { identity: null }, { identity: { id: randomUUID(), role: 'admin' } }]) {
    const h = harness(); Object.assign(h.state, patch);
    assert.equal(await h.api.getMyV2LearningState(batchId), null);
    assert.equal(await h.api.markV2LearningProgress(progress), false);
    assert.equal(await h.api.submitV2SessionFeedback(feedback), null);
    assert.equal(h.state.clients, 0);
  }
  const h = harness();
  assert.equal(await h.api.getMyV2LearningState('invalid'), null);
  assert.equal(await h.api.markV2LearningProgress({ ...progress, studentId: randomUUID() }), false);
  assert.equal(await h.api.submitV2SessionFeedback({ ...feedback, studentId: randomUUID() }), null);
  assert.equal(h.state.clients, 0);
});

test('learning DAL binds responses to the requested course and rechecks every request', async () => {
  const h = harness(); h.state.data = learning;
  assert.equal((await h.api.getMyV2LearningState(batchId)).batchId, batchId);
  h.state.data = { ...learning, batchId: randomUUID() };
  assert.equal(await h.api.getMyV2LearningState(batchId), null);
  h.state.data = null;
  assert.equal(await h.api.getMyV2LearningState(batchId), null);
  h.state.data = { saved: true };
  assert.equal(await h.api.markV2LearningProgress(progress), true);
  h.state.data = { submitted: true, replayed: true };
  assert.deepEqual(JSON.parse(JSON.stringify(await h.api.submitV2SessionFeedback(feedback))), { submitted: true, replayed: true });
  assert.deepEqual(JSON.parse(JSON.stringify(h.state.calls[0])), ['get_my_v2_learning_state', { p_batch_id: batchId }]);
  assert.deepEqual(JSON.parse(JSON.stringify(h.state.calls[3])), ['mark_v2_learning_progress', {
    p_batch_id: batchId, p_session_key: sessionKey, p_item_key: itemKey, p_state: 'opened', p_publication_revision: 1,
  }]);
  assert.ok(h.state.calls.every(([, args]) => !Object.hasOwn(args, 'p_student_id')));
});

test('transport and provider errors fail closed without exposing diagnostics or stale success', async () => {
  for (const fault of ['identity', 'client', 'rpc', 'provider']) {
    const h = harness(); h.state.fault = fault; h.state.error = fault === 'provider' ? { message: 'private diagnostic' } : null;
    h.state.data = learning; assert.equal(await h.api.getMyV2LearningState(batchId), null);
    h.state.data = { saved: true }; assert.equal(await h.api.markV2LearningProgress(progress), false);
    h.state.data = { submitted: true, replayed: false }; assert.equal(await h.api.submitV2SessionFeedback(feedback), null);
  }
});

function routeHarness() {
  const state = { enabled: true, progress: true, feedback: { submitted: true, replayed: false }, calls: [] };
  const route = load('src/app/api/v2/learning/route.ts', {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200, headers: options.headers }) } },
    '@/lib/server/v2LearningFeature': { isV2LearningEnabled: () => state.enabled },
    '@/lib/server/v2Learning': {
      markV2LearningProgress: async input => { state.calls.push(['progress', input]); return contracts.isV2ProgressInput(input) && state.progress; },
      submitV2SessionFeedback: async input => { state.calls.push(['feedback', input]); return contracts.isV2FeedbackInput(input) && state.feedback; },
    },
  });
  const request = (body, origin = 'https://preview.example.test') => new Request('https://preview.example.test/api/v2/learning', {
    method: 'POST', headers: { Host: 'preview.example.test', 'Content-Type': 'application/json', ...(origin === null ? {} : { Origin: origin }) }, body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { state, route, request };
}

test('learning mutation route rejects cross-origin, missing-origin and disabled requests before writes', async () => {
  const h = routeHarness(); const body = { action: 'progress', ...progress };
  for (const origin of ['https://attacker.invalid', 'null', null]) assert.equal((await h.route.POST(h.request(body, origin))).status, 403);
  assert.equal(h.state.calls.length, 0);
  h.state.enabled = false; assert.equal((await h.route.POST(h.request(body))).status, 404);
  assert.equal(h.state.calls.length, 0);
});

test('learning mutations validate external Host when Next normalizes the internal listener URL', async () => {
  const h = routeHarness(), body = JSON.stringify({ action: 'progress', ...progress });
  const base = { Host: 'preview.example.test', Origin: 'https://preview.example.test', 'Content-Type': 'application/json' };
  const request = patch => new Request('https://internal-listener.invalid/api/v2/learning', { method: 'POST', headers: { ...base, ...patch }, body });
  assert.equal((await h.route.POST(request({}))).status, 200);
  h.state.calls.length = 0;
  for (const patch of [
    { Host: '' }, { Host: 'preview.example.test,attacker.invalid' }, { Host: 'preview.example.test/evil' },
    { Host: 'user:password@preview.example.test' }, { Host: 'preview.example.test?evil' },
    { Host: 'attacker.invalid', 'X-Forwarded-Host': 'preview.example.test' },
    { Origin: 'https://attacker.invalid', 'X-Forwarded-Host': 'attacker.invalid' },
    { 'Content-Type': 'text/plain' },
  ]) assert.equal((await h.route.POST(request(patch))).status, 403);
  assert.equal(h.state.calls.length, 0);
});

test('malformed, oversized and unknown learning operations cannot mutate progress or feedback', async () => {
  const h = routeHarness();
  for (const body of ['{', 'null', '[]', '"text"']) assert.equal((await h.route.POST(h.request(body))).status, 400);
  assert.equal((await h.route.POST(h.request(' '.repeat(16001)))).status, 413);
  assert.equal((await h.route.POST(h.request({ action: 'grant', ...feedback }))).status, 409);
  assert.equal(h.state.calls.length, 0);
  assert.equal((await h.route.POST(h.request({ action: 'progress', ...progress, studentId: randomUUID() }))).status, 409);
});

test('learning route exposes confirmed success only and disables shared caching', async () => {
  const h = routeHarness();
  const saved = await h.route.POST(h.request({ action: 'progress', ...progress }));
  assert.equal(saved.status, 200); assert.equal(saved.body.saved, true);
  assert.equal(saved.headers['Cache-Control'], 'private, no-store'); assert.equal(saved.headers.Vary, 'Cookie');
  h.state.progress = false; assert.equal((await h.route.POST(h.request({ action: 'progress', ...progress }))).status, 409);
  h.state.feedback = null; assert.equal((await h.route.POST(h.request({ action: 'feedback', ...feedback }))).status, 409);
  h.state.feedback = { submitted: true, replayed: true };
  const confirmed = await h.route.POST(h.request({ action: 'feedback', ...feedback }));
  assert.equal(confirmed.status, 200); assert.equal(confirmed.body.replayed, true);
});

test('Phase 4 reading requires exact session context and denies locked resources before external fetch', async () => {
  const pageId = 'a'.repeat(32), blockedSession = randomUUID(); let enabled = true, reads = 0, courseReads = 0;
  const resource = { key: itemKey, title: 'Current reading', url: `https://notion.so/${pageId}` };
  let course = { sessions: [{ key: sessionKey, content: { preSessionReads: [resource], postSessionReads: [], materials: [] } }] };
  const route = load('src/app/api/v2/course-reading/route.ts', {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200, headers: options.headers }) } },
    'notion-client': { NotionAPI: class { async getPage() { reads++; return {}; } } },
    '@/lib/server/v2StudentDelivery': { getMyV2PublishedCourse: async () => { courseReads++; return course; } },
    '@/lib/server/v2LearningFeature': { isV2LearningEnabled: () => enabled },
    '@/lib/v2Meetings': { isV2MeetingBatchId: uuid },
    '@/lib/v2ReadingPreview': { v2ReadingPageId: value => value.endsWith(pageId) ? pageId : null, hasV2ReadingContent: () => true },
  });
  const request = query => ({ nextUrl: new URL(`https://preview.example.test/api/v2/course-reading?${query}`) });
  const base = `batchId=${batchId}&pageId=${pageId}`;
  for (const query of [base, `${base}&sessionKey=invalid`, `${base}&sessionKey=${sessionKey}&sessionKey=${blockedSession}`, `${base}&sessionKey=${sessionKey}&studentId=foreign`]) {
    assert.equal((await route.GET(request(query))).status, 404);
  }
  assert.equal(reads, 0); assert.equal(courseReads, 0);
  assert.equal((await route.GET(request(`${base}&sessionKey=${blockedSession}`))).status, 404); assert.equal(reads, 0);
  const allowed = await route.GET(request(`${base}&sessionKey=${sessionKey}`));
  assert.equal(allowed.status, 200); assert.equal(reads, 1); assert.equal(allowed.headers['Cache-Control'], 'private, no-store');
  course = null; assert.equal((await route.GET(request(`${base}&sessionKey=${sessionKey}`))).status, 404); assert.equal(reads, 1);
  enabled = false; course = { sessions: [{ key: sessionKey, content: { preSessionReads: [resource], postSessionReads: [], materials: [] } }] };
  assert.equal((await route.GET(request(base))).status, 200);
});

test('locked PDF and meeting routes do not sign or redirect a protected resource', async () => {
  let path = null, streamed = 0, meeting = null;
  class FakeResponse { constructor(body, options = {}) { Object.assign(this, { body, status: options.status ?? 200, headers: options.headers }); } static json(body, options) { return new FakeResponse(body, options); } }
  const file = load('src/app/api/v2/materials/file/route.ts', {
    'next/server': { NextResponse: FakeResponse },
    '@/lib/server/v2MaterialFiles': { getV2StudentMaterialPath: async () => path, streamV2Material: async () => { streamed++; return new FakeResponse('synthetic bytes', { status: 200 }); } },
  });
  const fileRequest = { nextUrl: new URL(`https://preview.example.test/api/v2/materials/file?batchId=${batchId}&sessionKey=${sessionKey}&itemKey=${itemKey}`), headers: new Headers() };
  assert.equal((await file.GET(fileRequest)).status, 404); assert.equal(streamed, 0);
  path = 'synthetic/worksheet.pdf'; assert.equal((await file.GET(fileRequest)).status, 200); assert.equal(streamed, 1);
  path = null; assert.equal((await file.GET(fileRequest)).status, 404); assert.equal(streamed, 1);
  const meet = load('src/app/api/v2/meeting/route.ts', {
    'next/server': { NextResponse: FakeResponse }, '@/lib/server/v2StudentDelivery': { getMyV2Meeting: async () => meeting },
  });
  const meetRequest = { nextUrl: new URL(`https://preview.example.test/api/v2/meeting?batchId=${batchId}&eventKey=${itemKey}`) };
  const denied = await meet.GET(meetRequest); assert.equal(denied.status, 404); assert.equal(denied.headers.Location, undefined);
  meeting = { url: 'https://meet.google.com/abc-defg-hij' }; assert.equal((await meet.GET(meetRequest)).status, 303);
  meeting = null; assert.equal((await meet.GET(meetRequest)).status, 404);
});

test('course page never serializes stale resource URLs against newer gates or mismatched revisions', async () => {
  const blockedKey = randomUUID(), allowedKey = randomUUID();
  const privateCourse = { batchId, title: 'Published course', publicationRevision: 1, sessions: [
    { key: blockedKey, section: 'quant', content: { recordings: [{ url: 'https://private.invalid/blocked' }] } },
    { key: allowedKey, section: 'verbal', content: { recordings: [{ url: 'https://private.invalid/allowed' }] } },
  ] };
  let state = { ...learning, obligations: [], sessions: [{ key: blockedKey, title: 'Quant 5', section: 'quant', locked: true }, { key: allowedKey, title: 'Verbal 1', section: 'verbal', locked: false }] };
  const jsx = (type, props) => ({ type, props });
  const page = load('src/app/schedule/v2/[batchId]/page.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/link': { default: 'Link' }, 'next/navigation': { notFound: () => { throw Error('notFound'); } },
    '@/lib/server/v2LearningFeature': { isV2LearningEnabled: () => true }, '@/lib/server/v2Learning': { getMyV2LearningState: async () => state },
    '@/components/student/V2LearningWorkspace': { V2LearningWorkspace: 'LearningWorkspace' },
    '@/lib/server/portalAuthorization': { requirePortalRole: async () => ({ role: 'student' }) },
    '@/lib/server/v2StudentScheduleFeature': { isV2StudentScheduleEnabled: () => true },
    '@/lib/server/v2StudentDelivery': { getMyV2PublishedCourse: async () => privateCourse },
    '@/components/student/StudentHeader': { StudentHeader: 'Header' }, '@/components/student/V2CourseSessionView': { V2CourseSessionView: 'LegacySession' },
    '../../../dashboard/dashboard.css': {},
  });
  const find = (node, type) => {
    if (!node || typeof node !== 'object') return null;
    if (node.type === type) return node;
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children.flat(Infinity) : [children]) { const result = find(child, type); if (result) return result; }
    return null;
  };
  const render = () => page.default({ params: Promise.resolve({ batchId }), searchParams: Promise.resolve({ view: 'live' }) });
  const current = find(await render(), 'LearningWorkspace');
  assert.ok(current); assert.equal(current.props.course.sessions.length, 1); assert.equal(current.props.course.sessions[0].key, allowedKey);
  assert.doesNotMatch(JSON.stringify(current), /private\.invalid\/blocked/); assert.equal(current.props.initialView, 'live');
  state = { ...state, publicationRevision: 2 };
  const mismatch = await render(); assert.equal(find(mismatch, 'LearningWorkspace'), null); assert.doesNotMatch(JSON.stringify(mismatch), /private\.invalid/);
  state = null; const unavailable = await render(); assert.equal(find(unavailable, 'LearningWorkspace'), null); assert.doesNotMatch(JSON.stringify(unavailable), /private\.invalid/);
});

test('recording observations reject forged identities, malformed durations and feedback-completion claims', async () => {
  const input = { batchId, sessionKey, recordingKey: itemKey, publicationRevision: 1 };
  const sample = { watchId: randomUUID(), requestId: randomUUID(), positionSeconds: 5, durationSeconds: 100, playing: true };
  assert.equal(contracts.isV2RecordingInput(input), true); assert.equal(contracts.isV2WatchSample(sample), true);
  for (const patch of [{ studentId: randomUUID() }, { publicationRevision: 0 }, { recordingKey: 'invalid' }]) assert.equal(contracts.isV2RecordingInput({ ...input, ...patch }), false);
  for (const patch of [{ studentId: randomUUID() }, { feedbackComplete: true }, { durationSeconds: 0 }, { durationSeconds: 43201 }, { durationSeconds: Infinity }, { positionSeconds: NaN }, { playing: 'true' }]) assert.equal(contracts.isV2WatchSample({ ...sample, ...patch }), false);
  for (const patch of [{ enabled: false }, { identity: null }, { identity: { id: randomUUID(), role: 'admin' } }]) {
    const h = harness(); Object.assign(h.state, patch);
    assert.equal(await h.api.beginV2RecordingWatch(input), null); assert.equal(await h.api.recordV2RecordingSample(sample), null); assert.equal(await h.api.reportV2RecordingWatched(input), null); assert.equal(h.state.clients, 0);
  }
  const h = harness(); h.state.data = { watchId: sample.watchId, thresholdPercent: 80, due: false, watchedSeconds: 0, durationSeconds: null };
  assert.equal((await h.api.beginV2RecordingWatch(input)).watchId, sample.watchId);
  h.state.data = { thresholdPercent: 80, due: false, watchedSeconds: 5 }; assert.equal((await h.api.recordV2RecordingSample(sample)).due, false);
  assert.ok(h.state.calls.every(([name]) => !name.includes('feedback')));
  assert.ok(h.state.calls.every(([, args]) => !Object.hasOwn(args, 'p_student_id')));
});
