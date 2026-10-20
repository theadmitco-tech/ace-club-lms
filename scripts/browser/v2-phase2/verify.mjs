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
import { initialState, products, respond, id } from './fixtures.mjs';

const require = createRequire(import.meta.url);
const modulePath = process.env.PLAYWRIGHT_MODULE || require.resolve('playwright-core');
const { chromium } = await import(pathToFileURL(modulePath));
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
  await button(page, 'Synthetic batch · Full Batch · revision 1').click();
}
async function runTests() {
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
      assert.equal(await page.getByLabel('Duration in days').inputValue(), String(product.days));
      await button(page, 'Add live session').click();
      const live = page.getByRole('group', { name: 'Live session 1', exact: true });
      await visible(live.getByRole('combobox'));
      assert.deepEqual(await live.getByRole('combobox').locator('option').evaluateAll((els) => els.map((el) => el.value)), product.sections);
      await live.getByLabel('Title', { exact: true }).fill('Synthetic live lesson');
      await button(page, 'Add undated outline item').click();
      assert.equal(await page.getByRole('group', { name: 'Outline item 2', exact: true }).getByLabel('Local start time').count(), 0);
      await button(page, 'Save draft').focus();
      await page.keyboard.press('Enter');
      await text(page, 'Draft revision 1 saved.');
      assert.equal(state.templates.find((t) => t.productCode === code).document.events.length, 2);
    }
    await screenshot(page, 'templates-desktop');
  });
  await test('Template interrupted save, busy state and retry identity', async (page) => {
    await page.goto(`${origin}/admin/v2/templates`);
    await button(page, 'Full Batch').click();
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
    await text(page, 'Scope: this batch only · Full Batch · quant, verbal, di');
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
  for (const width of [320, 390, 768]) {
    await test(`Responsive forms and long titles at ${width}px`, async (page) => {
      state.templates[0].document.title = 'W'.repeat(120);
      state.drafts[0].title = 'B'.repeat(120);
      await page.goto(`${origin}/admin/v2/templates`);
      await button(page, 'Full Batch').click();
      await page.getByLabel('Title', { exact: true }).fill('Synthetic mobile template');
      await button(page, 'Add live session').click();
      await screenshot(page, `template-${width}`);
      await noOverflow(page);
      await dialog(page, () => page.getByRole('link', { name: 'Manage batch drafts' }).click(), true);
      await button(page, 'New batch draft').click();
      await screenshot(page, `batch-${width}`);
      await noOverflow(page);
      await button(page, `${'B'.repeat(120)} · Full Batch · revision 1`).click();
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
