import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const root = await mkdtemp(path.join(tmpdir(), 'ace-mapping-review-'));
const output = process.env.MAPPING_BROWSER_SCREENSHOT || path.join(tmpdir(), 'ace-mapping-review.png');
const put = async (file, contents) => {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), contents);
};
const component = 'src/app/admin/v2/batches/[batchId]/live/LiveSessionMappings.tsx';
for (const file of [component, 'src/lib/v2LiveMappingSuggestions.ts', 'src/app/admin/v2/templates/templates.module.css']) {
  await put(file, await readFile(path.join(repo, file)));
}
await put('src/app/globals.css', (await readFile(path.join(repo, 'src/app/globals.css'), 'utf8')).replace(/^@import url\(.*\);\r?\n/gm, ''));
await put('src/app/admin/workflow.css', await readFile(path.join(repo, 'src/app/admin/workflow.css')));
await put('package.json', JSON.stringify({ private: true, dependencies: { next: '16.2.4', react: '19.2.4', 'react-dom': '19.2.4' } }));
await put('tsconfig.json', await readFile(path.join(repo, 'tsconfig.json')));
await put('next.config.mjs', 'export default { devIndicators: false };');
await symlink(path.join(repo, 'node_modules'), path.join(root, 'node_modules'));
await put('src/app/layout.tsx', `import './globals.css';import './admin/workflow.css';export default function Layout({children}){return <html lang="en"><body>{children}</body></html>}`);
await put('src/app/admin/v2/batches/[batchId]/live/actions.ts', `export async function setLiveMappingAction(input){
  window.mappingCalls.push(input);
  if(input.eventKey==='two' && window.rejectMapping){window.rejectMapping=false;return {status:'error',message:'Synthetic interruption. Retry this link.'};}
  return {status:'success'};
}`);
await put('src/app/page.tsx', `'use client';
import {useState} from 'react';
import LiveSessionMappings from './admin/v2/batches/[batchId]/live/LiveSessionMappings';
const event=(key,title)=>({key,title,section:'quant',kind:'live'});
const session=(key,title)=>({key,title,section:'quant'});
export default function Page(){const [revision,setRevision]=useState(3);const [available,setAvailable]=useState(true);
return <main className="admin-workflow" style={{maxWidth:1000,margin:'auto',padding:24}}>
<button onClick={()=>setRevision(4)}>Simulate a new publication</button><button onClick={()=>setAvailable(false)}>Simulate unavailable status</button>
<LiveSessionMappings publication={{batchId:'synthetic-batch',revision,state:'published',events:[event('one','Algebra'),event('two','Geometry'),event('three','Arithmetic'),event('duplicate-a','Repeated'),event('duplicate-b','Repeated'),event('confirmed','Renamed class'),event('completed','Finished class')],sessions:[session('s-one','Algebra'),session('s-two','Geometry'),session('s-three','Arithmetic'),session('s-duplicate','Repeated'),session('s-confirmed','Original title'),session('s-completed','Finished class')]}}
 mappings={[{eventKey:'confirmed',sessionKey:'s-confirmed',publicationRevision:3}]} completedEventKeys={available?['completed']:undefined}/></main>}`);
const reservation = createServer();
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const server = spawn(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { PATH: process.env.PATH, NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1' },
});
let logs = '';
server.stdout.on('data', data => { logs += data; }); server.stderr.on('data', data => { logs += data; });
let browser;
try {
  const origin = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(origin)).ok) { ready = true; break; } } catch { /* Startup remains bounded. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, logs);
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.addInitScript(() => { window.mappingCalls = []; window.rejectMapping = true; });
  await page.goto(origin);
  await page.locator('#mapping-one').waitFor();
  assert.equal(await page.locator('#mapping-one').inputValue(), 's-one');
  assert.equal(await page.locator('#mapping-two').inputValue(), 's-two');
  assert.equal(await page.locator('#mapping-three').inputValue(), 's-three');
  assert.equal(await page.locator('#mapping-duplicate-a').inputValue(), '');
  assert.equal(await page.locator('#mapping-duplicate-b').inputValue(), '');
  assert.equal(await page.locator('#mapping-confirmed').inputValue(), 's-confirmed');
  assert.equal(await page.locator('#mapping-completed').count(), 0);
  assert.equal(await page.evaluate(() => window.mappingCalls.length), 0);
  await page.getByRole('button', { name: 'Confirm suggested links', exact: true }).click();
  await page.getByText('2 links confirmed. 1 link needs another attempt.', { exact: false }).waitFor();
  assert.equal(await page.locator('#mapping-error-two').innerText(), 'Synthetic interruption. Retry this link.');
  let calls = await page.evaluate(() => window.mappingCalls);
  assert.deepEqual(calls.map(item => item.eventKey), ['one', 'two', 'three']);
  assert.ok(calls.every(item => item.publicationRevision === 3 && item.batchId === 'synthetic-batch'));
  await page.getByRole('button', { name: 'Confirm suggested links', exact: true }).click();
  await page.getByText('1 link confirmed. Class completion remains a separate action.', { exact: true }).waitFor();
  calls = await page.evaluate(() => window.mappingCalls);
  assert.deepEqual(calls.map(item => item.eventKey), ['one', 'two', 'three', 'two']);
  assert.equal(await page.getByRole('button', { name: 'Confirm suggested links', exact: true }).count(), 0);
  await page.locator('#mapping-duplicate-a').selectOption('s-duplicate');
  await page.locator('li').filter({ has: page.locator('#mapping-duplicate-a') }).getByRole('button', { name: 'Confirm session mapping' }).click();
  await page.waitForFunction(() => window.mappingCalls.length === 5);
  await page.screenshot({ path: output, fullPage: true });
  await page.getByRole('button', { name: 'Simulate a new publication' }).click();
  await page.getByText('4 suggestions awaiting confirmation', { exact: true }).waitFor();
  assert.equal(await page.locator('#mapping-duplicate-a').inputValue(), '');
  await page.getByRole('button', { name: 'Simulate unavailable status' }).click();
  await page.getByText('Class completion status could not be loaded.', { exact: false }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Confirm suggested links', exact: true }).isDisabled(), true);
  console.log('PASS: suggestions, current confirmation, ambiguity, completed exclusion, partial retry, manual confirmation, revision reset, and missing-status guard. Screenshot: ' + output);
} finally {
  await browser?.close();
  server.kill('SIGTERM');
  await new Promise(resolve => { server.once('exit', resolve); setTimeout(resolve, 5000).unref(); });
  await rm(root, { recursive: true, force: true });
}
