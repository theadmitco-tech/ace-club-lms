import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { createFixtureApp, repo, sources } from './fixture-app.mjs';
import { initialState, products, respond, id, publicationProposal } from './fixtures.mjs';

const require = createRequire(import.meta.url);
const modulePath = process.env.PLAYWRIGHT_MODULE || require.resolve('playwright-core');
const playwright = await import(pathToFileURL(modulePath));
const { chromium } = playwright.default ?? playwright;
const output = path.resolve(process.env.V2_BROWSER_OUTPUT || path.join(tmpdir(), 'ace-v2-browser-results'));
await mkdir(output, { recursive: true });
let state = initialState();
const backend = createServer(async (request, response) => {
  try {
    assert.equal(request.method, 'POST');
    assert.equal(request.headers.host, `127.0.0.1:${backend.address().port}`);
    let body = '';
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 200_000) throw new Error('Fixture input too large');
    }
    const result = await respond(state, request.url.slice(1), JSON.parse(body));
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(result));
  } catch {
    response.writeHead(500);
    response.end('Synthetic fixture failure');
  }
});
await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve));
const root = await createFixtureApp(backend.address().port);
const reservation = createServer();
await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const env = { PATH: process.env.PATH, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' };
const log = createWriteStream(path.join(output, 'fixture-server.log'));
const next = path.join(repo, 'node_modules/next/dist/bin/next');
let server;
let browser;
const results = [];
const blocked = [];
const browserErrors = [];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, timeout = 10000) {
  const deadline = Date.now() + timeout;
  let last;
  do {
    try { return await check(); } catch (error) { last = error; }
    await wait(75);
  } while (Date.now() < deadline);
  throw last;
}
async function visible(locator) { await locator.waitFor({ state: 'visible', timeout: 10000 }); }
async function text(page, value) { await visible(page.getByText(value, { exact: false }).first()); }
async function noOverflow(page) {
  const sizes = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth, viewport: innerWidth,
  }));
  assert.ok(sizes.content <= sizes.viewport + 1, JSON.stringify(sizes));
}
async function screenshot(page, name) {
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
}
const button = (page, name) => page.getByRole('button', { name, exact: true });
async function dialog(page, trigger, accept = false) {
  const seen = page.waitForEvent('dialog', { timeout: 2500 });
  const action = trigger().then(() => null, (error) => error);
  const prompt = await seen;
  const type = prompt.type();
  if (accept) await prompt.accept(); else await prompt.dismiss();
  const error = await action;
  if (error) throw error;
  return type;
}
async function test(name, run, viewport = { width: 1440, height: 1000 }) {
  if (process.env.V2_BROWSER_CASE && !name.includes(process.env.V2_BROWSER_CASE)) return;
  state = initialState();
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    blocked.push(url.origin);
    return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (error) => browserErrors.push({ test: name, message: error.message }));
  try {
    await run(page);
    results.push({ name, status: 'passed' });
    console.info(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: 'failed', error: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
    await screenshot(page, `failure-${name.replace(/[^a-z0-9]+/gi, '-')}`).catch(() => {});
  } finally {
    await context.close();
  }
}
async function openBatch(page) {
  await page.goto(`${origin}/admin/v2/batches`);
  await button(page, 'Synthetic batch · Full Course · revision 1').click();
}
async function runTests() {
  await test('Enrolled schedule renders published live times and undated outlines on mobile', async (page) => {
    const published = publicationProposal({ batchId: state.drafts[0].id, expectedRevision: 0, action: 'publish' }, state).document;
    state.studentSchedules = [published];
    await page.goto(`${origin}/schedule/v2`);
    await text(page, 'Enrolled batch schedules');
    await text(page, published.title);
    await text(page, 'Date to be announced');
    await text(page, 'IST');
    assert.equal(await page.getByRole('link', { name: /Join/ }).count(), 0);
    await noOverflow(page);
    await screenshot(page, 'enrolled-schedule-mobile');
  }, { width: 390, height: 844 });
  await test('Enrolled schedule distinguishes empty and failed reads', async (page) => {
    await page.goto(`${origin}/schedule/v2`);
    await text(page, 'No published batch schedules yet');
    state.readError = true;
    await page.reload();
    await text(page, 'Schedule could not be loaded');
    assert.equal(await page.getByText('No published batch schedules yet').count(), 0);
    state.readError = false;
    await page.getByRole('link', { name: 'Retry', exact: true }).click();
    await text(page, 'No published batch schedules yet');
  });
  await test('Enrollment review confirms by keyboard and removes on mobile', async (page) => {
    await page.goto(`${origin}/admin/v2/batches/${state.drafts[0].id}/students`);
    await button(page, 'Enroll in batch').click();
    assert.equal(state.enrollmentOptions[0].active, false);
    await text(page, 'Enroll Synthetic Student?');
    await button(page, 'Confirm enrollment').focus();
    await page.keyboard.press('Enter');
    await text(page, 'Student enrolled in this batch.');
    assert.equal(state.enrollmentOptions[0].active, true);
    await button(page, 'Remove from batch').click();
    await button(page, 'Confirm removal').click();
    await text(page, 'Student removed from this batch.');
    assert.equal(state.enrollmentOptions[0].active, false);
    await noOverflow(page);
  }, { width: 390, height: 844 });
  await test('Interrupted enrollment reloads committed state without repeating a stale confirmation', async (page) => {
    await page.goto(`${origin}/admin/v2/batches/${state.drafts[0].id}/students`);
    await button(page, 'Enroll in batch').click();
    state.faults.setV2Enrollment = { interruptAfterSave: true };
    await button(page, 'Confirm enrollment').click();
    await text(page, 'Confirmation was interrupted.');
    assert.equal(state.enrollmentOptions[0].active, true);
    assert.equal(await button(page, 'Confirm enrollment').isDisabled(), true);
    await dialog(page, () => button(page, 'Reload student list').click(), true);
    await visible(button(page, 'Remove from batch'));
    assert.equal(state.calls.filter((call) => call.method === 'setV2Enrollment').length, 1);
  });

  await test('Empty screens and recoverable list errors', async (page) => {
    state.templates = [];
    state.drafts = [];
    await page.goto(`${origin}/admin/v2/templates`);
    await text(page, 'No templates have been created.');
    await page.getByRole('link', { name: 'Manage batch drafts' }).click();
    await text(page, 'No batch drafts have been saved.');
    assert.equal(await button(page, 'New batch draft').isDisabled(), true);
    state.readError = true;
    await page.reload();
    await text(page, 'Batch drafts could not be loaded.');
    state.readError = false;
    await page.getByRole('link', { name: 'Retry loading drafts' }).click();
    await text(page, 'No batch drafts have been saved.');
  });
  await test('Four product forms, keyboard save and native validation', async (page) => {
    state.templates = [];
    await page.goto(`${origin}/admin/v2/templates`);
    for (const [code, product] of Object.entries(products)) {
      await button(page, product.label).click();
      await button(page, 'Save draft').click();
      assert.equal(await page.locator('#template-title').evaluate((el) => el.validity.valueMissing), true);
      await page.getByLabel('Title', { exact: true }).fill(`Browser ${code}`);
      assert.equal(await page.getByLabel('Live schedule span in days (optional without live classes)').inputValue(), product.days === null ? '' : String(product.days));
      await page.locator('#template-duration').fill('56');
      await button(page, 'Add live class').click();
      const live = page.getByRole('group', { name: 'Live class 1', exact: true });
      await visible(live.getByRole('combobox'));
      assert.deepEqual(await live.getByRole('combobox').locator('option').evaluateAll((els) => els.map((el) => el.value)), product.sections);
      await live.getByLabel('Title', { exact: true }).fill('Synthetic live lesson');
      await button(page, 'Add course session').click();
      assert.equal(await page.getByRole('group', { name: 'Course session 2', exact: true }).getByLabel('Local start time').count(), 0);
      await button(page, 'Save draft').focus();
      await page.keyboard.press('Enter');
      await text(page, 'Draft revision 1 saved.');
      assert.equal(state.templates.find((t) => t.productCode === code).document.events.length, 2);
    }
    await screenshot(page, 'templates-desktop');
  });
  await test('Complete individual content saves without a live schedule and survives reload', async (page) => {
    state.templates = [];
    await page.goto(`${origin}/admin/v2/templates`);
    await button(page, 'Quant').click();
    await page.locator('#template-title').fill('Complete Quant course');
    assert.equal(await page.locator('#template-duration').inputValue(), '');
    await button(page, 'Add course session').click();
    const session = page.getByRole('group', { name: 'Course session 1', exact: true });
    await session.getByLabel('Title', { exact: true }).fill('Quant fundamentals');
    assert.equal(await session.getByLabel('Local start time').count(), 0);
    for (const label of ['Materials', 'Recordings', 'Pre-session reads', 'Post-session reads']) {
      await button(session, `Add ${label.toLowerCase()} item`).click();
      const group = session.getByRole('group', { name: `${label} (1)`, exact: true });
      await group.getByLabel('Title', { exact: true }).fill(`${label} example`);
      await group.getByLabel('HTTPS link').fill(`https://example.test/${label.toLowerCase().replaceAll(' ', '-')}`);
    }
    await button(page, 'Save draft').click();
    await text(page, 'Draft revision 1 saved.');
    const saved = structuredClone(state.templates[0]);
    assert.equal(saved.document.durationDays, null);
    assert.equal(Object.values(saved.document.events[0].content).every((items) => items.length === 1), true);
    await page.reload();
    await button(page, 'Complete Quant course · Quant · revision 1').click();
    assert.equal(await page.getByLabel('HTTPS link').count(), 4);
    assert.equal(await page.getByLabel('Local start time').count(), 0);
    assert.deepEqual(state.templates[0], saved);
    await noOverflow(page);
    await screenshot(page, 'complete-individual-content-mobile');
  }, { width: 390, height: 844 });
  await test('Template interrupted save, busy state and retry identity', async (page) => {
    await page.goto(`${origin}/admin/v2/templates`);
    await button(page, 'Full Course').click();
    await page.getByLabel('Title', { exact: true }).fill('Retry template');
    state.faults.saveV2TemplateDraft = { delay: 700, interruptAfterSave: true };
    await button(page, 'Save draft').click();
    await visible(button(page, 'Saving…'));
    assert.equal(await page.getByLabel('Title', { exact: true }).isDisabled(), true);
    await text(page, 'Save confirmation was interrupted.');
    await dialog(page, () => page.getByRole('link', { name: 'Manage batch drafts' }).click());
    assert.ok(page.url().endsWith('/templates'));
    await button(page, 'Save draft').click();
    await text(page, 'previous submission recovered');
    const calls = state.calls.filter((call) => call.method === 'saveV2TemplateDraft');
    assert.equal(calls.length, 2);
    assert.equal(calls[0].args[0].requestId, calls[1].args[0].requestId);
    assert.equal(state.templates.filter((t) => t.document.title === 'Retry template').length, 1);
    await page.getByRole('link', { name: 'Manage batch drafts' }).click();
    await text(page, 'V2 batch drafts');
  });
  await test('Batch review, publish, independent edits, unpublish and republish', async (page) => {
    await page.goto(`${origin}/admin/v2/batches`);
    await button(page, 'New batch draft').click();
    await page.getByLabel('Batch title', { exact: true }).fill('Browser lifecycle batch');
    await page.getByLabel('Template start date', { exact: false }).fill('2026-11-02');
    await button(page, 'Review schedule').click();
    await text(page, 'Review: Browser lifecycle batch');
    await page.getByLabel('Batch title', { exact: true }).fill('Browser revised batch');
    assert.equal(await button(page, 'Confirm and save draft').count(), 0);
    await button(page, 'Review schedule').click();
    await button(page, 'Confirm and save draft').click();
    await text(page, 'Draft revision 1 saved.');
    const saved = state.drafts.find((b) => b.title === 'Browser revised batch');
    assert.equal(saved.events[0].startsAt, '2026-11-02T12:30:00.000Z');
    const publication = page.getByRole('region', { name: 'Review batch publication', exact: true });
    const item = publication.getByRole('listitem').filter({ has: page.getByText('Browser revised batch', { exact: true }) });
    await item.getByRole('button', { name: 'Preview publication', exact: true }).click();
    await text(page, 'Scope: this batch only · Full Course · quant, verbal, di');
    assert.equal(state.publications.length, 0);
    await button(page, 'Confirm publish').click();
    await text(page, 'Publication revision 1 published.');
    await page.getByLabel('Start time (IST)').fill('19:00');
    await button(page, 'Review schedule').click();
    await button(page, 'Confirm and save draft').click();
    await text(page, 'Draft revision 2 saved.');
    assert.equal(state.publications[0].events[0].startsAt, '2026-11-02T12:30:00.000Z');
    assert.equal(state.templates[0].document.events[0].localStartTime, '18:00');
    await item.getByRole('button', { name: 'Preview publication', exact: true }).click();
    await visible(button(page, 'Confirm publish'));
    await screenshot(page, 'publication-desktop');
    await button(page, 'Confirm publish').click();
    await text(page, 'Publication revision 2 published.');
    assert.equal(state.publications[0].events[0].startsAt, '2026-11-02T13:30:00.000Z');
    await item.getByRole('button', { name: 'Review unpublish', exact: true }).click();
    await button(page, 'Confirm unpublish').click();
    await text(page, 'Publication revision 3 unpublished.');
    await item.getByRole('button', { name: 'Preview publication', exact: true }).click();
    await button(page, 'Confirm publish').click();
    await text(page, 'Publication revision 4 published.');
  });
  await test('Batch stale errors and interrupted confirmations preserve review', async (page) => {
    await openBatch(page);
    await page.getByLabel('Batch title', { exact: true }).fill('Changed synthetic batch');
    state.faults.previewV2BatchDraft = { error: 'Synthetic stale draft. Reload the latest draft.' };
    await button(page, 'Review schedule').click();
    await text(page, 'Synthetic stale draft.');
    assert.equal(await button(page, 'Confirm and save draft').count(), 0);
    await button(page, 'Review schedule').click();
    await text(page, 'Review: Changed synthetic batch');
    state.faults.saveV2BatchDraft = { interruptAfterSave: true };
    await button(page, 'Confirm and save draft').click();
    await text(page, 'Save confirmation was interrupted.');
    await button(page, 'Confirm and save draft').click();
    await text(page, 'previous submission recovered');
    const calls = state.calls.filter((c) => c.method === 'saveV2BatchDraft');
    assert.deepEqual(calls[0].args, calls[1].args);
    assert.equal(state.drafts[0].revision, 2);
  });
  await test('An interrupted publication review cannot be silently replaced', async (page) => {
    await page.goto(`${origin}/admin/v2/batches`);
    await button(page, 'Preview publication').click();
    await visible(button(page, 'Confirm publish'));
    assert.equal(await button(page, 'Preview publication').isDisabled(), true);
    state.faults.saveV2BatchPublication = { interruptAfterSave: true };
    await button(page, 'Confirm publish').click();
    await text(page, 'Confirmation was interrupted.');
    assert.equal(await button(page, 'Preview publication').isDisabled(), true);
    await button(page, 'Confirm publish').click();
    await text(page, 'previous confirmation recovered');
    const saves = state.calls.filter(call => call.method === 'saveV2BatchPublication');
    assert.deepEqual(saves[0].args, saves[1].args);
    assert.equal(state.publications[0].revision, 1);
    await button(page, 'Preview publication').click();
    await button(page, 'Cancel review').click();
    assert.equal(await button(page, 'Preview publication').isDisabled(), false);
  });
  await test('Template event reordering survives recovery and saving without moving an existing batch', async (page) => {
    const previousBatch = structuredClone(state.drafts[0]);
    const initialKeys = state.templates[0].document.events.map(event => event.key);
    await page.goto(`${origin}/admin/v2/templates`);
    await button(page, 'Synthetic Full Course · Full Course · revision 1').click();
    assert.equal(await button(page, 'Move event 1 up').isDisabled(), true);
    assert.equal(await button(page, 'Move event 2 down').isDisabled(), true);
    await button(page, 'Move event 2 up').focus();
    await page.keyboard.press('Enter');
    await dialog(page, () => page.reload(), true);
    await button(page, 'Restore edits').click();
    assert.match(await page.locator('fieldset legend').nth(1).textContent(), /Course session 1/);
    await button(page, 'Save draft').click();
    await text(page, 'Draft revision 2 saved.');
    const saved = state.templates.find(template => template.id === id(1));
    assert.deepEqual(saved.document.events.map(event => event.key), [...initialKeys].reverse());
    assert.deepEqual(state.drafts[0], previousBatch);
    await page.reload();
    assert.equal(await button(page, 'Restore edits').count(), 0);
    await button(page, 'Synthetic Full Course · Full Course · revision 2').click();
    assert.match(await page.locator('fieldset legend').nth(1).textContent(), /Course session 1/);
  });
  await test('Publication review protects meeting-link navigation', async (page) => {
    await page.goto(`${origin}/admin/v2/batches`);
    await button(page, 'Preview publication').click();
    await visible(button(page, 'Confirm publish'));
    await dialog(page, () => page.getByRole('link', { name: 'Private meeting drafts for Synthetic batch' }).click());
    assert.ok(page.url().endsWith('/batches'));
    await visible(button(page, 'Confirm publish'));
    await button(page, 'Cancel review').click();
    await page.getByRole('link', { name: 'Private meeting drafts for Synthetic batch' }).click();
    await text(page, 'Private meeting drafts');
  });
  await test('Publication stale and interrupted responses keep the confirmation safe', async (page) => {
    await page.goto(`${origin}/admin/v2/batches`);
    await button(page, 'Preview publication').click();
    await visible(button(page, 'Confirm publish'));
    state.faults.saveV2BatchPublication = { error: 'Synthetic stale publication. Reload and preview again.' };
    await button(page, 'Confirm publish').click();
    await text(page, 'Synthetic stale publication.');
    assert.equal(state.publications.length, 0);
    await button(page, 'Cancel review').click();
    await button(page, 'Preview publication').click();
    await visible(button(page, 'Confirm publish'));
    state.faults.saveV2BatchPublication = { interruptAfterSave: true };
    await button(page, 'Confirm publish').click();
    await text(page, 'Confirmation was interrupted.');
    await button(page, 'Confirm publish').click();
    await text(page, 'previous confirmation recovered');
    assert.equal(state.publications.length, 1);
    const calls = state.calls.filter((c) => c.method === 'saveV2BatchPublication');
    assert.deepEqual(calls[1].args, calls[2].args);
  });
  await test('Meeting validation, stale failure, lost confirmation and reload', async (page) => {
    await page.goto(`${origin}/admin/v2/batches/${id(10)}/meeting`);
    const input = page.getByRole('textbox');
    assert.equal(await input.count(), 1);
    await input.fill('https://example.test/unapproved');
    await button(page, 'Review meeting changes').click();
    await until(async () => assert.ok((await page.locator('form [role="alert"]').textContent()).length > 0));
    assert.equal(await button(page, 'Confirm and save private draft').count(), 0);
    await input.fill('https://meet.google.com/abc-defg-hij');
    await button(page, 'Review meeting changes').click();
    state.faults.saveV2MeetingDraft = { error: 'Synthetic stale meeting. Reload the latest draft.' };
    await button(page, 'Confirm and save private draft').click();
    await text(page, 'Synthetic stale meeting.');
    state.faults.saveV2MeetingDraft = { interruptAfterSave: true };
    await button(page, 'Confirm and save private draft').click();
    await text(page, 'Save confirmation was interrupted.');
    await button(page, 'Confirm and save private draft').click();
    await text(page, 'Previous save recovered.');
    const calls = state.calls.filter((c) => c.method === 'saveV2MeetingDraft');
    assert.deepEqual(calls[0].args, calls[2].args);
    await button(page, 'Reload current draft').click();
    await until(async () => assert.equal(await input.inputValue(), 'https://meet.google.com/abc-defg-hij'));
    await screenshot(page, 'meeting-desktop');
  });
  await test('Unsaved navigation cancellation, reload and sign-out', async (page) => {
    await openBatch(page);
    await page.getByLabel('Batch title', { exact: true }).fill('Keep these edits');
    await dialog(page, () => page.locator('.sidebar-nav-item').filter({ hasText: 'Dashboard' }).click());
    await dialog(page, () => button(page, 'Sign Out').click());
    await dialog(page, () => button(page, 'Reload latest drafts').click());
    assert.equal(await page.getByLabel('Batch title', { exact: true }).inputValue(), 'Keep these edits');
    await dialog(page, () => page.getByRole('link', { name: 'Manage course templates' }).click());
    assert.ok(page.url().endsWith('/batches'));
    await dialog(page, () => page.locator('.sidebar-nav-item').filter({ hasText: 'Dashboard' }).click(), true);
    await text(page, 'Synthetic Admin dashboard');
    await button(page, 'Sign Out').click();
    await text(page, 'Synthetic sign-out destination');
  });
  await test('Template recovery survives navigation and a lost save confirmation after reload', async (page) => {
    await page.goto(`${origin}/admin/v2/templates`);
    await button(page, 'Full Course').click();
    await page.getByLabel('Title', { exact: true }).fill('Recover this template');
    await dialog(page, () => page.locator('.sidebar-nav-item').filter({ hasText: 'Dashboard' }).click(), true);
    await page.goto(`${origin}/admin/v2/templates`);
    await button(page, 'Restore edits').click();
    assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Recover this template');
    state.faults.saveV2TemplateDraft = { interruptAfterSave: true };
    await button(page, 'Save draft').click();
    await text(page, 'Save confirmation was interrupted.');
    await dialog(page, () => page.reload(), true);
    await button(page, 'Restore edits').click();
    await button(page, 'Save draft').click();
    await text(page, 'previous submission recovered');
    const calls = state.calls.filter(c => c.method === 'saveV2TemplateDraft');
    assert.deepEqual(calls[0].args, calls[1].args);
    await page.reload();
    assert.equal(await button(page, 'Restore edits').count(), 0);
  });
  await test('Batch recovery preserves the reviewed schedule and exact interrupted request', async (page) => {
    await openBatch(page);
    await page.getByLabel('Batch title', { exact: true }).fill('Recovered batch');
    await button(page, 'Review schedule').click();
    state.faults.saveV2BatchDraft = { interruptAfterSave: true };
    await button(page, 'Confirm and save draft').click();
    await text(page, 'Save confirmation was interrupted.');
    await dialog(page, () => page.reload(), true);
    await button(page, 'Restore edits').click();
    await text(page, 'Review: Recovered batch');
    await button(page, 'Confirm and save draft').click();
    await text(page, 'previous submission recovered');
    const calls = state.calls.filter(c => c.method === 'saveV2BatchDraft');
    assert.deepEqual(calls[0].args, calls[1].args);
    assert.equal(state.drafts[0].revision, 2);
  });
  await test('Meeting recovery preserves private links and interrupted request across reload', async (page) => {
    await page.goto(`${origin}/admin/v2/batches/${id(10)}/meeting`);
    await page.getByRole('textbox').fill('https://meet.google.com/abc-defg-hij');
    await button(page, 'Review meeting changes').click();
    state.faults.saveV2MeetingDraft = { interruptAfterSave: true };
    await button(page, 'Confirm and save private draft').click();
    await text(page, 'Save confirmation was interrupted.');
    await dialog(page, () => page.reload(), true);
    await button(page, 'Restore edits').click();
    assert.equal(await page.getByRole('textbox').inputValue(), 'https://meet.google.com/abc-defg-hij');
    await button(page, 'Confirm and save private draft').click();
    await text(page, 'Previous save recovered.');
    const calls = state.calls.filter(c => c.method === 'saveV2MeetingDraft');
    assert.deepEqual(calls[0].args, calls[1].args);
    assert.equal(state.publications.length, 0);
  });
  await test('Publication recovery requires another explicit confirmation and retains replay identity', async (page) => {
    await page.goto(`${origin}/admin/v2/batches`);
    await button(page, 'Preview publication').click();
    state.faults.saveV2BatchPublication = { interruptAfterSave: true };
    await button(page, 'Confirm publish').click();
    await text(page, 'Confirmation was interrupted.');
    await dialog(page, () => page.reload(), true);
    assert.equal(await button(page, 'Confirm publish').count(), 0);
    const callsBefore = state.calls.filter(c => c.method === 'saveV2BatchPublication').length;
    await button(page, 'Restore edits').click();
    await visible(button(page, 'Confirm publish'));
    assert.equal(state.calls.filter(c => c.method === 'saveV2BatchPublication').length, callsBefore);
    await button(page, 'Confirm publish').click();
    await text(page, 'previous confirmation recovered');
    const calls = state.calls.filter(c => c.method === 'saveV2BatchPublication');
    assert.deepEqual(calls[0].args, calls[1].args);
    assert.equal(state.publications[0].revision, 1);
  });
  await test('Recovery isolates users, supports discard and clears on sign-out', async (page) => {
    await page.goto(`${origin}/admin/v2/templates`);
    await button(page, 'Full Course').click();
    await page.getByLabel('Title', { exact: true }).fill('Private user A draft');
    state.ownerId = 'synthetic-user-b';
    await dialog(page, () => page.reload(), true);
    assert.equal(await button(page, 'Restore edits').count(), 0);
    state.ownerId = 'synthetic-admin';
    await page.reload();
    await button(page, 'Restore edits').click();
    assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Private user A draft');
    await dialog(page, () => page.reload(), true);
    await button(page, 'Discard recovery').click();
    await page.reload();
    assert.equal(await button(page, 'Restore edits').count(), 0);
    await button(page, 'Full Course').click();
    await page.getByLabel('Title', { exact: true }).fill('Clear on sign-out');
    await dialog(page, () => button(page, 'Sign Out').click(), true);
    await text(page, 'Synthetic sign-out destination');
    assert.equal(await page.evaluate(() => Object.keys(sessionStorage).filter(k => k.startsWith('ace:draft:')).length), 0);
  });
  await test('Unavailable tab storage reports recovery loss while server saving remains usable', async (page) => {
    await page.goto(`${origin}/admin/v2/templates`);
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Synthetic quota error'); }; });
    await button(page, 'Full Course').click();
    await page.getByLabel('Title', { exact: true }).fill('Storage unavailable');
    await text(page, 'Recovery is unavailable in this tab.');
    await button(page, 'Save draft').click();
    await text(page, 'Draft revision 1 saved.');
  });
  await test('Student worksheet edits survive navigation, stay isolated and save after explicit retry', async (page) => {
    await page.goto(`${origin}/practice/fixture/${id(70)}`);
    const comment = page.getByLabel('Comment for question 1');
    await comment.fill('Recover my reflection');
    // Navigate without blurring first: recovery must be written during input.
    await page.goto(`${origin}/admin`);
    await page.goto(`${origin}/practice/fixture/${id(71)}`);
    assert.equal(await button(page, 'Restore edits').count(), 0);
    assert.equal(await page.getByLabel('Comment for question 1').inputValue(), '');
    state.ownerId = 'synthetic-user-b';
    await page.goto(`${origin}/practice/fixture/${id(70)}`);
    assert.equal(await button(page, 'Restore edits').count(), 0);
    state.ownerId = 'synthetic-admin';
    await page.reload();
    await button(page, 'Restore edits').click();
    assert.equal(await comment.inputValue(), 'Recover my reflection');
    assert.equal(state.calls.filter(c => c.method === 'fixtureSaveQuestion').length, 0);
    await button(page, 'Retry').click();
    await page.reload();
    assert.equal(await comment.inputValue(), 'Recover my reflection');
    assert.equal(await button(page, 'Restore edits').count(), 0);
  });
  await test('Student thrown saves become retryable and partial bulk retries touch failed questions only', async (page) => {
    await page.goto(`${origin}/practice/fixture/${id(70)}`);
    state.faults.fixtureSaveQuestion = { interrupt: true };
    await page.getByLabel('Comment for question 1').fill('Transport failure');
    await page.getByRole('heading', { name: 'Synthetic worksheet' }).click();
    await text(page, 'Could not save. Retry this question.');
    await button(page, 'Retry').click();
    await until(async () => assert.equal(await button(page, 'Retry').count(), 0));
    await page.getByLabel('Select all', { exact: true }).check();
    await button(page, 'Mark selected Done').click();
    state.faults.fixtureSaveQuestion = { interrupt: true };
    await button(page, 'Confirm').click();
    await text(page, '1 saved. Questions 1 could not be saved');
    const before = state.calls.filter(c => c.method === 'fixtureSaveQuestion').length;
    await button(page, 'Retry failed only').click();
    await text(page, '1 question saved.');
    assert.equal(state.calls.filter(c => c.method === 'fixtureSaveQuestion').length, before + 1);
    await page.reload();
    assert.equal(await page.getByRole('button', { name: 'Done', exact: true }).evaluateAll(els => els.every(el => el.getAttribute('aria-pressed') === 'true')), true);
  });
  await test('Student recovery preserves newer server edits and ignores removed questions', async (page) => {
    await page.goto(`${origin}/practice/fixture/${id(70)}`);
    await page.getByLabel('Comment for question 1').fill('Old unsaved reflection');
    await page.goto(`${origin}/admin`);
    const server = state.worksheets[`synthetic-admin:${id(70)}`].questions[0];
    server.comment = 'Newer saved reflection'; server.updated_at = '2026-10-25T00:00:00.000Z';
    await page.goto(`${origin}/practice/fixture/${id(70)}`);
    await button(page, 'Restore edits').click();
    await text(page, '1 changed or removed questions were kept as currently saved.');
    assert.equal(await page.getByLabel('Comment for question 1').inputValue(), 'Newer saved reflection');
    assert.equal(state.calls.filter(c => c.method === 'fixtureSaveQuestion').length, 0);
  });

  await test('Recovered stale template cannot overwrite a newer saved revision', async (page) => {
    await page.goto(`${origin}/admin/v2/templates`);
    await button(page, 'Synthetic Full Course · Full Course · revision 1').click();
    await page.locator('#template-title').fill('Old recovered edit');
    await dialog(page, () => page.reload(), true);
    state.templates[0].revision = 2; state.templates[0].document.title = 'Newer saved title';
    await button(page, 'Restore edits').click();
    await button(page, 'Save draft').click();
    await text(page, 'Synthetic stale template.');
    assert.equal(await page.locator('#template-title').inputValue(), 'Old recovered edit');
    assert.equal(state.templates[0].document.title, 'Newer saved title');
  });
  await test('Recovered private links stop when the batch schedule has changed', async (page) => {
    await page.goto(`${origin}/admin/v2/batches/${id(10)}/meeting`);
    await page.getByRole('textbox').fill('https://meet.google.com/abc-defg-hij');
    state.drafts[0].revision = 2;
    await dialog(page, () => page.reload(), true);
    await button(page, 'Restore edits').click();
    await text(page, 'The batch schedule changed.');
    assert.equal(await page.getByRole('textbox').inputValue(), '');
    assert.equal(state.calls.filter(c => c.method === 'saveV2MeetingDraft').length, 0);
    await button(page, 'Discard recovery').click();
  });
  await test('Student saving disables overlapping bulk actions and malformed receipts retain edits', async (page) => {
    await page.goto(`${origin}/practice/fixture/${id(70)}`);
    await page.getByLabel('Select all', { exact: true }).check();
    state.faults.fixtureSaveQuestion = { delay: 600, invalidReceipt: true };
    await page.getByLabel('Comment for question 1').fill('Keep this unsaved reflection');
    await page.getByRole('heading', { name: 'Synthetic worksheet' }).click();
    await text(page, 'Saving…');
    assert.equal(await button(page, 'Mark selected Done').isDisabled(), true);
    assert.equal(await page.getByLabel('Comment for question 1').isDisabled(), true);
    await text(page, 'Could not save. Retry this question.');
    assert.equal(await page.getByLabel('Comment for question 1').inputValue(), 'Keep this unsaved reflection');
    await page.reload();
    await button(page, 'Restore edits').click();
    assert.equal(await page.getByLabel('Comment for question 1').inputValue(), 'Keep this unsaved reflection');
    await button(page, 'Retry').click();
    await until(async () => assert.equal(await button(page, 'Retry').count(), 0));
  });
  await test('Pending recovery requires an explicit choice before replacing worksheet, meeting or publication work', async (page) => {
    await page.goto(`${origin}/practice/fixture/${id(70)}`);
    await page.getByLabel('Comment for question 1').fill('Choose before replacing this');
    await page.goto(`${origin}/admin`);
    await page.goto(`${origin}/practice/fixture/${id(70)}`);
    await visible(button(page, 'Restore edits'));
    assert.equal(await page.getByLabel('Comment for question 1').isDisabled(), true);
    await button(page, 'Discard recovery').click();
    assert.equal(await page.getByLabel('Comment for question 1').isDisabled(), false);
    await page.goto(`${origin}/admin/v2/batches/${id(10)}/meeting`);
    await page.getByRole('textbox').fill('https://meet.google.com/abc-defg-hij');
    await dialog(page, () => page.reload(), true);
    await visible(button(page, 'Restore edits'));
    assert.equal(await page.getByRole('textbox').isDisabled(), true);
    await button(page, 'Restore edits').click();
    assert.equal(await page.getByRole('textbox').isDisabled(), false);
    await dialog(page, () => button(page, 'Return to batch drafts').click(), true);
    await button(page, 'Preview publication').click();
    await dialog(page, () => page.reload(), true);
    await visible(button(page, 'Restore edits'));
    assert.equal(await button(page, 'Preview publication').isDisabled(), true);
    await button(page, 'Discard recovery').click();
    assert.equal(await button(page, 'Preview publication').isDisabled(), false);
    assert.equal(state.publications.length, 0);
  });
  for (const width of [320, 390, 768]) {
    await test(`Responsive forms and long titles at ${width}px`, async (page) => {
      state.templates[0].document.title = 'W'.repeat(120);
      state.drafts[0].title = 'B'.repeat(120);
      await page.goto(`${origin}/admin/v2/templates`);
      await button(page, 'Full Course').click();
      await page.getByLabel('Title', { exact: true }).fill('Synthetic mobile template');
      await button(page, 'Add live class').click();
      await screenshot(page, `template-${width}`);
      await noOverflow(page);
      await dialog(page, () => page.getByRole('link', { name: 'Manage batch drafts' }).click(), true);
      await button(page, 'New batch draft').click();
      await screenshot(page, `batch-${width}`);
      await noOverflow(page);
      await button(page, `${'B'.repeat(120)} · Full Course · revision 1`).click();
      await button(page, 'Preview publication').click();
      await visible(button(page, 'Confirm publish'));
      await screenshot(page, `publication-${width}`);
      await noOverflow(page);
    }, { width, height: 844 });
  }
  await test('Mobile navigation has an accessible name and avoids hidden keyboard targets', async (page) => {
    await page.goto(`${origin}/admin/v2/templates`);
    const toggle = button(page, 'Open admin navigation');
    await visible(toggle);
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    await toggle.focus();
    await page.keyboard.press('Enter');
    const close = button(page, 'Close admin navigation');
    assert.equal(await close.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    await visible(toggle);
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    await page.locator('body').click({ position: { x: 300, y: 200 } });
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => !!document.activeElement?.closest('.admin-sidebar')), false);
    }
    await screenshot(page, 'mobile-navigation');
  }, { width: 390, height: 844 });
}

try {
  console.info('Building disposable browser fixture from current sources.');
  const build = spawn(process.execPath, [next, 'build', '--webpack'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  build.stdout.pipe(log, { end: false }); build.stderr.pipe(log, { end: false });
  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { build.kill('SIGTERM'); reject(new Error('Fixture build timed out')); }, 180000);
    build.on('error', reject);
    build.on('exit', (value) => { clearTimeout(timer); resolve(value); });
  });
  assert.equal(code, 0, `Fixture build failed; inspect ${path.join(output, 'fixture-server.log')}`);
  server = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.pipe(log, { end: false }); server.stderr.pipe(log, { end: false });
  await until(async () => assert.equal((await fetch(`${origin}/admin`)).status, 200), 20000);
  browser = await chromium.launch({
    ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
    headless: true,
  });
  console.info(`Fixture ready; Chromium ${browser.version()}.`);
  await runTests();
  assert.equal(blocked.length, 0, `Unexpected external browser requests: ${[...new Set(blocked)].join(', ')}`);
  assert.deepEqual(browserErrors, [], 'Unexpected browser runtime errors');
} catch (error) {
  results.push({ name: 'Harness', status: 'failed', error: error.message });
  console.error(error.message);
} finally {
  const hashes = {};
  for (const file of [...sources, 'src/app/globals.css']) {
    hashes[file] = createHash('sha256').update(await readFile(path.join(root, file))).digest('hex');
  }
  await writeFile(path.join(output, 'results.json'), JSON.stringify({
    baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(),
    mode: 'isolated UI fixture; synthetic auth and DAL; not staging or authorization evidence',
    stylesheetAdjustment: 'Remove external font imports from fixture globals.css; other copied screen files remain exact.',
    browser: browser?.version(), hashes, results, blockedOrigins: [...new Set(blocked)], browserErrors,
  }, null, 2) + '\n');
  await browser?.close();
  if (server) {
    const stopped = new Promise((resolve) => server.once('exit', resolve));
    server.kill('SIGTERM');
    await stopped;
  }
  backend.closeAllConnections();
  await new Promise((resolve) => backend.close(resolve));
  log.end();
  await rm(root, { recursive: true, force: true });
}
console.info(`${results.filter((r) => r.status === 'passed').length} passed; ${results.filter((r) => r.status === 'failed').length} failed. Evidence: ${output}`);
process.exitCode = results.some((r) => r.status === 'failed') ? 1 : 0;
