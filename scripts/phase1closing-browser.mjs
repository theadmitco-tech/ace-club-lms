import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, copyFile, writeFile, symlink, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const repo = fileURLToPath(new URL('../', import.meta.url));
const root = await mkdtemp(path.join(tmpdir(), 'ace-phase1-qa-browser-'));
const output = process.env.PHASE1_QA_BROWSER_OUTPUT || '/tmp/ace-phase1-qa-browser-results';
await mkdir(output, { recursive: true });
const put = async (file, content) => { await mkdir(path.dirname(path.join(root, file)), { recursive: true }); await writeFile(path.join(root, file), content); };
for (const file of ['src/lib/server/v2Phase1Verification.ts', 'src/lib/v2Products.ts', 'src/app/api/v2/phase1-verification/route.ts', 'src/app/qa/phase1/page.tsx', 'src/app/qa/phase1/VerificationRunner.tsx']) {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true }); await copyFile(path.join(repo, file), path.join(root, file));
}
await symlink(path.join(repo, 'node_modules'), path.join(root, 'node_modules'), 'dir');
await put('package.json', JSON.stringify({ private: true, dependencies: { next: '16.2.4', react: '19.2.4', 'react-dom': '19.2.4' } }));
await put('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2022', lib: ['dom', 'esnext'], strict: true, noEmit: true, skipLibCheck: true, esModuleInterop: true, module: 'esnext', moduleResolution: 'bundler', resolveJsonModule: true, jsx: 'react-jsx', plugins: [{ name: 'next' }], paths: { '@/*': ['./src/*'] } }, include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'] }));
await put('next.config.ts', "export default {poweredByHeader:false,devIndicators:false};");
await put('src/app/layout.tsx', "export default function Layout({children}:{children:React.ReactNode}){return <html lang='en'><body>{children}</body></html>}");
await put('src/app/page.tsx', "export default function Home(){return <h1>Local QA fixture</h1>}");
await put('src/utils/supabase/server.ts', `
import {cookies} from 'next/headers';
import type {SupabaseClient} from '@supabase/supabase-js';
export async function createClient(){
  const jar=await cookies();const role=jar.get('qa-role')?.value;
  const drift=jar.get('qa-drift')?.value==='true';
  const id='10000000-0000-4000-8000-000000000001';
  return {
    auth:{getUser:async()=>({data:{user:role?{id}:null},error:null})},
    from(table:string){
      return {select(){
        if(table==='profiles')return {eq(){return {maybeSingle:async()=>({data:{role,is_active:true},error:null})}}};
        return {
          then(resolve:(v:unknown)=>void){resolve({count:null,error:{code:'42501'}})},
          neq:async()=>({count:0,error:null})
        };
      }};
    },
    rpc:async(name:string,args?:Record<string,unknown>)=>{
      if(name==='grant_v2_purchase'){
        if(!args||Object.keys(args).length!==7||Object.values(args).some(x=>x!==null))throw Error('Unsafe probe');
        return {data:null,error:{code:drift?'22023':'42501'}};
      }
      if(name==='get_my_v2_access')return role?{data:[],error:null}:{data:null,error:{code:'42501'}};
      throw Error('Unexpected RPC');
    }
  } as unknown as SupabaseClient;
}`);

const reserve = createServer(); await new Promise(r => reserve.listen(0, '127.0.0.1', r)); const port = reserve.address().port; await new Promise(r => reserve.close(r));
const origin = `http://127.0.0.1:${port}`;
const next = path.join(repo, 'node_modules/next/dist/bin/next');
const env = { PATH: process.env.PATH, NODE_ENV: 'production', VERCEL_ENV: 'preview', NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: 'https://eyphkkginlgoaxflauog.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'header.' + Buffer.from(JSON.stringify({ role: 'anon', ref: 'eyphkkginlgoaxflauog' })).toString('base64url') + '.signature', VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40) };
const log = createWriteStream(path.join(output, 'server.log'));
let server, browser; const results = [], errors = [];
const wait = ms => new Promise(r => setTimeout(r, ms));
const start = async extra => {
  server = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: root, env: { ...env, ...extra }, stdio: ['ignore', 'pipe', 'pipe'] }); server.stdout.pipe(log, { end: false }); server.stderr.pipe(log, { end: false });
  for (let i = 0; i < 80; i++) { try { const r = await fetch(origin); if (r.ok) return; } catch {} await wait(250); }
  throw Error('Local fixture server did not start');
};
const stop = async () => { if (server && server.exitCode === null) { const done = new Promise(r => server.once('exit', r)); server.kill(); await done; } };
async function run(name, role, drift = false) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await context.addCookies([...(role ? [{ name: 'qa-role', value: role, url: origin }] : []), ...(drift ? [{ name: 'qa-drift', value: 'true', url: origin }] : [])]);
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin + '/qa/phase1');
  await page.waitForLoadState('networkidle');
  const pendingResponse = page.waitForResponse(response => response.url().endsWith('/api/v2/phase1-verification'));
  await page.getByRole('button', { name: 'Run read-only staging checks' }).click();
  const apiResponse = await pendingResponse;
  assert.equal(apiResponse.status(), 200, await apiResponse.text());
  await page.waitForSelector('pre', {timeout:5000}); const report = JSON.parse(await page.locator('pre').innerText());
  assert.equal(report.role, role || 'signed_out'); assert.equal(report.overall, drift ? 'fail' : 'inconclusive');
  assert.equal(report.checks.find(c => c.id === 'browser_role_grant_permission').status, drift ? 'fail' : 'pass');
  assert.ok(!JSON.stringify(report).includes('10000000-0000-4000-8000-000000000001'));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  if (role === 'student' && !drift) await page.screenshot({ path: path.join(output, 'student-qa.png'), fullPage: true });
  results.push({ name, passed: true }); await context.close();
}
try {
  const build = spawn(process.execPath, [next, 'build', '--webpack'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] }); build.stdout.pipe(log, { end: false }); build.stderr.pipe(log, { end: false });
  assert.equal(await new Promise(r => build.once('exit', r)), 0, 'Fixture build failed; inspect server.log');
  await start({}); browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox'] });
  await run('Signed-out browser forwards anonymous permissions', undefined);
  await run('Student browser preserves inconclusive fixture status', 'student');
  await run('Admin browser never claims Student isolation', 'admin');
  await run('Permission drift is a visible failure', 'student', true);
  await stop(); await start({ VERCEL_ENV: 'production' });
  assert.equal((await fetch(origin + '/qa/phase1')).status, 404);
  assert.equal((await fetch(origin + '/api/v2/phase1-verification', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: '{}' })).status, 404);
  results.push({ name: 'Production page and route deny before diagnostic requests', passed: true });
  assert.equal(errors.length, 0); console.log(JSON.stringify({ results, errors }, null, 2));
} catch (error) { results.push({ name: 'Harness or assertion', passed: false, error: error.message }); process.exitCode = 1; }
finally { await browser?.close(); await stop(); log.end(); await writeFile(path.join(output, 'results.json'), JSON.stringify({ mode: 'Actual QA page and route; local synthetic Supabase adapter, not hosted JWT evidence', results, errors }, null, 2) + '\n'); await rm(root, { recursive: true, force: true }); }
