import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const output = path.resolve(process.env.V2_PHASE4_BROWSER_OUTPUT || path.join(tmpdir(), 'ace-v2-phase4-browser-results'));
await mkdir(output, { recursive: true });
const root = await mkdtemp(path.join(tmpdir(), 'ace-v2-phase4-browser-'));
const id = n => `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const batchId = id(1), quant4 = id(4), quant5 = id(5), verbal = id(6), di = id(7);
const content = n => ({
  preSessionReads: [{ key: id(n + 100), title: 'Preparation reading', url: 'https://docs.example.test/pre-read' }],
  recordings: [{ key: id(n + 200), title: 'Shared recording', url: 'https://www.youtube.com/watch?v=abcdefghijk' }],
  postSessionReads: [{ key: id(n + 300), title: 'Reflection reading', url: 'https://docs.example.test/post-read' }],
  materials: [{ key: id(n + 400), title: 'Practice worksheet', url: `/api/materials/file?path=${encodeURIComponent('worksheets/'+id(401)+'/'+id(402)+'.pdf')}` }],
});
const sourceSessions = [
  { key: quant4, title: 'Quant 4', section: 'quant', content: content(4) },
  { key: quant5, title: 'Quant 5', section: 'quant', content: content(5) },
  { key: verbal, title: 'Verbal 1', section: 'verbal', content: content(6) },
  { key: di, title: 'DI 1', section: 'di', content: content(7) },
];
function initial() {
  return { obligations: [], progress: [], lastSessionKey: null, liveRegistered: false, liveEvents: [], calls: [], submissions: [], interruptOnce: false, rejectProgress: false, noRecording: false, externalRecording: false, feedbackAlreadyComplete: false, extraSessions: [], liveSchedule: null };
}
let state = initial();
function view() {
  const allSessions = [...sourceSessions, ...state.extraSessions];
  const sessions = allSessions.map(({ key, title, section }) => ({ key, title, section,
    locked: state.obligations.some(o => o.section === section) && !state.obligations.some(o => o.batchId === batchId && o.sessionKey === key),
  }));
  return { course: { batchId, publicationRevision: 1, batchRevision: 1, title: 'Synthetic Full Course', productCode: 'full_course', sessions: allSessions.filter(s => !sessions.find(item => item.key === s.key).locked).map(s => ({...s, content: {...s.content, recordings: state.noRecording ? [] : state.externalRecording ? s.content.recordings.map(item => ({...item,url:'https://recordings.example.test/player/session'})) : s.content.recordings}})) },
    learning: { batchId, publicationRevision: 1, sessions, obligations: state.obligations, progress: state.progress, lastSessionKey: state.lastSessionKey, liveRegistered: state.liveRegistered, liveEvents: state.liveEvents },
    liveSchedule: state.liveSchedule,
  };
}
function obligation(key = quant4, source = 'recording', count = 1) {
  return { id: id(800 + count), batchId, sessionKey: key, sessionTitle: sourceSessions.find(s => s.key === key).title,
    section: sourceSessions.find(s => s.key === key).section, source, eventKey: source === 'live' ? id(900 + count) : null, createdAt: '2026-11-02T10:00:00Z' };
}
const backend = createServer((request, response) => {
  if (request.url !== '/state') { response.writeHead(404).end(); return; }
  response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(view()));
});
await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
const put = async (file, body) => { await mkdir(path.dirname(path.join(root, file)), { recursive: true }); await writeFile(path.join(root, file), body); };
const copied = new Set();
async function copySource(file) {
  if (copied.has(file)) return;
  copied.add(file);
  if(file === 'src/lib/AuthContext.tsx'){await put(file,`'use client';export function useAuth(){return {logout:async()=>{},addToast:(_type:string,_message:string)=>{}};}`);return;}
  const source = await readFile(path.join(repo, file), 'utf8'); await put(file, source);
  for (const match of source.matchAll(/(?:from\s+|import\s*(?:\(\s*)?)['"](@\/[^'"]+|\.[^'"]+)['"]/g)) {
    const target = match[1].startsWith('@/') ? 'src/' + match[1].slice(2) : path.normalize(path.join(path.dirname(file), match[1]));
    let found;
    for (const candidate of [target, target+'.ts', target+'.tsx', target+'.css', target+'/index.ts', target+'/index.tsx']) {
      try { await access(path.join(repo, candidate)); found=candidate; break; } catch { /* The next source extension is checked. */ }
    }
    if (!found) throw Error('Fixture dependency unavailable: '+target);
    await copySource(found);
  }
}
await copySource('src/components/student/V2LearningWorkspace.tsx');
await copySource('src/components/student/V2LearningLibrary.tsx');
await copySource('src/components/student/StudentHeader.tsx');
await copySource('src/components/student/StudentCourseNav.tsx');
await copySource('src/app/dashboard/dashboard.css');
await copySource('public/5.svg');await copySource('public/6.svg');
await put('src/lib/server/v2LearningFeature.ts','export function isV2LearningEnabled(){return true;}');
await put('src/lib/server/v2Phase1Feature.ts','export function isV2Phase1PreviewEnabled(){return true;}');
await put('src/app/globals.css', (await readFile(path.join(repo, 'src/app/globals.css'), 'utf8')).replace(/^@import url\(.*\);\r?\n/gm, ''));
await put('package.json', JSON.stringify({ private: true, dependencies: { next: '16.2.4', react: '19.2.4', 'react-dom': '19.2.4' } }));
await put('tsconfig.json', await readFile(path.join(repo, 'tsconfig.json')));
await put('next.config.mjs', 'export default { devIndicators: false };');
await symlink(path.join(repo, 'node_modules'), path.join(root, 'node_modules'));
await put('src/app/layout.tsx', `import './globals.css'; export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}`);
await put('src/app/page.tsx', `import {V2LearningWorkspace} from '@/components/student/V2LearningWorkspace';
export const dynamic='force-dynamic';
export default async function Page(){const data=await(await fetch('http://127.0.0.1:${backend.address().port}/state',{cache:'no-store'})).json();return <main style={{maxWidth:1200,margin:'auto',padding:20}}><h1>Synthetic Full Course</h1><V2LearningWorkspace {...data}/></main>}`);
await put('src/app/library/page.tsx', `import {V2LearningLibrary} from '@/components/student/V2LearningLibrary';export const dynamic='force-dynamic';export default async function Page(){const data=await(await fetch('http://127.0.0.1:${backend.address().port}/state',{cache:'no-store'})).json();return <main style={{maxWidth:1000,margin:'auto',padding:24}}><V2LearningLibrary batches={[{publication:{...data.course,revision:1,state:'published',events:[]},learning:data.learning}]} studentName="Asha Verma" now={Date.parse('2026-11-23T06:00:00Z')} access={[{product_code:'full_batch',sections:['quant','verbal','di'],expires_at:'2027-01-01T00:00:00Z'}]}/></main>}`);
await put('src/app/header/page.tsx', `import {StudentHeader} from '@/components/student/StudentHeader';import '@/app/dashboard/dashboard.css';export default function Page(){return <div className="student-page"><StudentHeader studentName="Student"/><main className="student-main"><div className="student-container"><h1>Student navigation fixture</h1></div></main></div>}`);
// To review list: a stubbed browser client records practice-log saves in the page instead of reaching a database.
if (copied.has('src/utils/supabase/client.ts')) throw Error('The review fixture needs its own browser client stub');
copied.add('src/utils/supabase/client.ts');
await put('src/utils/supabase/client.ts', `export function createClient(){return {rpc:async(name:string,args:Record<string,unknown>)=>{const w=window as unknown as {__rpc?:unknown[]};(w.__rpc??=[]).push({name,...args});return {data:{id:args.p_question_id},error:null};}};}`);
await copySource('src/app/practice/v2/ReviewList.tsx');
const reviewSheets = JSON.stringify([
  { key: 'q1', href: '/schedule/v2/b/worksheet/s/i', title: 'QA 1 Worksheet', sessionTitle: 'QA 1: Fractions + Percentages', section: 'quant', batchId: id(1), sessionKey: id(2), itemKey: id(3),
    questions: [{ id: id(31), number: 7, comment: 'Ratio trap: re-read what the question asks for', seconds: 150, updatedAt: '2026-11-20T06:00:00Z' }, { id: id(32), number: 12, comment: null, seconds: null, updatedAt: '2026-11-21T06:00:00Z' }] },
  { key: 'v1', href: '/schedule/v2/b/worksheet/s/j', title: 'VA 4 Worksheet', sessionTitle: 'VA 4: RC Point of View', section: 'verbal', batchId: id(1), sessionKey: id(4), itemKey: id(5),
    questions: [{ id: id(51), number: 3, comment: 'Picked the extreme answer again', seconds: 95, updatedAt: '2026-11-22T06:00:00Z' }] },
]);
await put('src/app/review/page.tsx', `import {ReviewList} from '@/app/practice/v2/ReviewList';import '@/app/dashboard/dashboard.css';export default function Page(){return <main className="student-main"><div className="student-container" style={{paddingBlock:32}}><ReviewList worksheets={${reviewSheets}}/></div></main>}`);
await copySource('src/app/practice/v2/PracticeSummary.tsx');
await put('src/app/practice-summary/page.tsx', `import {PracticeOverview} from '@/app/practice/v2/PracticeSummary';import '@/app/dashboard/dashboard.css';import styles from '@/app/practice/v2/practice.module.css';
const sheet=(n:number,done:number[],review:number[])=>Array.from({length:n},(_,i)=>done.includes(i+1)?'done' as const:review.includes(i+1)?'review' as const:null);
const row=(t:string,s:string,c:ReturnType<typeof sheet>,paused=false)=>({href:'/w/'+t,title:t,sessionTitle:s,course:'Full Course',total:c.length,done:c.filter(x=>x==='done').length,review:c.filter(x=>x==='review').length,paused,cells:c});
const quant=[row('QA 1 Worksheet','QA 1: Fractions, Percentages, Ratios and Mixtures',sheet(20,[1,2,3,4,5,6,8,9,10,11,13],[7,12])),row('QA 2 Worksheet','QA 2: Pipes and Cisterns, Work and Time',sheet(18,[1,2,3],[4])),row('QA 3 Worksheet','QA 3: Probability, Permutation and Combination',sheet(24,[],[]))];
const verbal=[row('VA 4 Worksheet','VA 4: RC Point of View and CR Evaluate the Conclusion',sheet(15,[1,2],[3]),true)];
const sum=(rows:typeof quant)=>({done:rows.reduce((n,r)=>n+r.done,0),review:rows.reduce((n,r)=>n+r.review,0),total:rows.reduce((n,r)=>n+r.total,0)});
export default function Page(){return <main className="student-main"><div className={'student-container '+styles.page}><header className={styles.titleRow}><h1>Practice log</h1></header><PracticeOverview several={false} subjects={[{key:'quant',label:'Quant',...sum(quant)},{key:'verbal',label:'Verbal',...sum(verbal)}]} groups={[{key:'quant',label:'Quant',rows:quant},{key:'verbal',label:'Verbal',rows:verbal}]}/></div></main>}`);
await put('src/app/review-empty/page.tsx', `import {ReviewList} from '@/app/practice/v2/ReviewList';import '@/app/dashboard/dashboard.css';export default function Page(){return <main className="student-main"><div className="student-container"><ReviewList worksheets={[]}/></div></main>}`);
const reservation = createServer(); await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
const origin = `http://127.0.0.1:${port}`, next = path.join(repo, 'node_modules/next/dist/bin/next');
const env = { PATH: process.env.PATH, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' };
const log = createWriteStream(path.join(output, 'fixture-server.log'));
let browser, server;
const results = [], blocked = [], browserErrors = [];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, timeout = 15000) { const deadline = Date.now() + timeout; let last; do { try { return await check(); } catch (error) { last = error; } await wait(100); } while(Date.now() < deadline); throw last; }
async function test(name, run, mobile = false) {
  state = initial();
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) { blocked.push(url.origin); return route.abort(); }
    if (url.pathname !== '/api/v2/learning') return route.continue();
    const body = request.postDataJSON(); state.calls.push(body);
    if (body.action === 'progress') {
      if (state.rejectProgress) return route.fulfill({ status: 503, json: { error: 'Synthetic interruption' } });
      const existing = state.progress.find(p => p.sessionKey === body.sessionKey && p.itemKey === body.itemKey);
      const value = { sessionKey: body.sessionKey, itemKey: body.itemKey, status: body.state, lastOpenedAt: '2026-11-02T10:00:00Z', readAt: body.state === 'read' ? '2026-11-02T10:00:00Z' : null };
      if (existing) Object.assign(existing, existing.readAt && body.state === 'opened' ? {...value,status:'read',readAt:existing.readAt} : value); else state.progress.push(value);
      state.lastSessionKey = body.sessionKey;
      return route.fulfill({ json: { saved: true } });
    }
    if (body.action === 'watch-start') return route.fulfill({json:{watchId:id(970),due:false}});
    if (body.action === 'watch-sample') {
      const due = state.calls.filter(c=>c.action==='watch-sample').length >= 3;
      if (due) state.obligations = [obligation()];
      return route.fulfill({json:{due}});
    }
    if (body.action === 'watch-report') {
      if (state.feedbackAlreadyComplete) return route.fulfill({json:{due:false,obligationId:id(801)}});
      state.obligations = [obligation()]; return route.fulfill({json:{due:true,obligationId:state.obligations[0].id}});
    }
    if (body.action === 'feedback') {
      const replayed = state.submissions.some(s => s.requestId === body.requestId);
      if (!replayed) state.submissions.push(body);
      state.obligations = state.obligations.filter(o => o.id !== body.obligationId);
      if (state.interruptOnce) { state.interruptOnce = false; return route.abort(); }
      return route.fulfill({ json: { submitted: true, replayed } });
    }
    return route.fulfill({ status: 409, json: { error: 'Unsupported fixture operation' } });
  });
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  page.on('pageerror', error => browserErrors.push({ name, message: error.message }));
  try { await run(page); results.push({ name, status: 'passed' }); console.info(`PASS ${name}`); }
  catch (error) { results.push({ name, status: 'failed', error: error.message }); console.error(`FAIL ${name}: ${error.message}`); await page.screenshot({ path: path.join(output, `${name.replace(/\W+/g, '-')}.png`), fullPage: true }).catch(() => {}); }
  finally { await context.close(); }
}
async function noOverflow(page) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true); }
async function rating(page) {
  await page.getByRole('radiogroup', { name: 'How useful was this session?' }).getByRole('radio', { name: '4 out of 5', exact: true }).check();
  await page.getByRole('radiogroup', { name: 'How clear was this session?' }).getByRole('radio', { name: '4 out of 5', exact: true }).check();
}
async function runTests() {
  await test('Student navigation leads with study destinations and keeps account pages in the menu',async page=>{
    await page.goto(origin+'/header');const nav=page.getByRole('navigation',{name:'Student navigation'});
    assert.deepEqual(await nav.getByRole('link').allTextContents(),['Quant','Verbal','DI','Live classes','Mocks','Practice log']);
    for(const [label,href] of [['Quant','/schedule/v2?subject=quant'],['Verbal','/schedule/v2?subject=verbal'],['DI','/schedule/v2?subject=di'],['Live classes','/schedule/v2?view=live'],['Mocks','/mocks']])assert.equal(await nav.getByRole('link',{name:label,exact:true}).getAttribute('href'),href);
    assert.equal(await nav.getByRole('link',{name:'My learning'}).count(),0);
    await page.locator('summary[aria-label^="Account menu"]').focus();await page.keyboard.press('Enter');
    const account=page.getByRole('navigation',{name:'Account'});
    assert.equal(await page.getByRole('navigation',{name:'More pages'}).count(),0);assert.deepEqual(await account.getByRole('link').allTextContents(),['My access','Explore courses','Help']);
    for(const [area,label] of [[account,'My access'],[account,'Explore courses']]){const link=area.getByRole('link',{name:label,exact:true});await link.waitFor();assert.equal(await link.evaluate(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return el.contains(hit);}),true);}
    await noOverflow(page);await page.screenshot({path:path.join(output,'student-navigation-mobile.png'),fullPage:true});
  },true);
  await test('Library separates recordings from registered live classes without granting access',async page=>{
    await page.goto(origin+'/library');await page.getByRole('heading',{name:'My learning',exact:true}).waitFor();await page.screenshot({path:path.join(output,'student-library.png'),fullPage:true});
    await page.getByText('Hi Asha,',{exact:true}).waitFor();await page.getByText('Until 1 Jan 2027',{exact:true}).waitFor();
    assert.equal(await page.getByRole('link',{name:'Live classes',exact:true}).count(),0);assert.equal(await page.getByText('Live seat',{exact:true}).count(),0);
    state.liveRegistered=true;await page.reload();await page.getByText('Live seat',{exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'Live classes',exact:true}).getAttribute('href'),`/schedule/v2/${batchId}?view=live`);assert.equal(state.calls.length,0);
  });
  await test('Subjects and collapsible outline leave a full-width reading area',async page=>{
    await page.goto(origin);const outline=page.getByRole('complementary',{name:'Course outline'});assert.equal(await outline.getByRole('button',{name:/^Open /}).count(),2);const content=page.getByRole('region',{name:'Selected session'});const a=await outline.boundingBox(),b=await content.boundingBox();assert.ok(b.x>=a.x+a.width);assert.ok(b.width>700);
    await page.screenshot({path:path.join(output,'student-course-sidebar.png'),fullPage:false});
    await outline.getByRole('button',{name:'Hide Quant sessions',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Open Quant 5',exact:true}).count(),0);await until(async()=>assert.ok((await content.boundingBox()).width>900));await page.getByRole('article',{name:'Session content: Quant 4'}).waitFor();assert.equal(state.calls.length,0);await page.screenshot({path:path.join(output,'student-session.png'),fullPage:true});
    await outline.getByRole('button',{name:'Show Quant sessions',exact:true}).click();await page.getByRole('button',{name:'Open Quant 5',exact:true}).waitFor();await until(async()=>assert.ok(Math.abs((await outline.boundingBox()).width-300)<2));
  });
  await test('Quant 4 first and pre-read opening create only visual progress', async page => {
    await page.goto(origin); await page.getByRole('button', { name: 'Open Quant 4', exact: true }).click();
    assert.equal(await page.getByRole('link', { name: 'Open worksheet', exact: true }).getAttribute('href'), `/schedule/v2/${batchId}/worksheet/${quant4}/${id(404)}`);
    await page.getByRole('button', { name: 'Read here', exact: true }).first().click();
    await page.getByText('Inline reading is available for Notion pages.').waitFor();
    assert.equal(state.obligations.length, 0); assert.equal(state.submissions.length, 0);
    assert.ok(state.calls.every(c => c.action === 'progress'));
    assert.equal(await page.getByRole('button', { name: 'Open Quant 5', exact: true }).isEnabled(), true);
    await page.getByRole('button', { name: 'Open Quant 4', exact: true }).getByText('Last opened', { exact: true }).waitFor();
    await noOverflow(page);
  });
  await test('Quant feedback greys other Quant while current resources and other subjects remain available', async page => {
    state.obligations = [obligation()];
    await page.goto(origin);await page.screenshot({path:path.join(output,'student-feedback-gate.png'),fullPage:true});
    assert.equal(await page.getByRole('button', { name: 'Open Quant 5', exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Open Quant 4', exact: true }).isEnabled(), true);
    for (const title of ['Pre-class read', 'Recording', 'Post-class read', 'Worksheet']) await page.getByText(title, { exact: true }).first().waitFor();
    await page.getByRole('group',{name:'Course subjects',exact:true}).getByRole('button',{name:'Verbal',exact:true}).click();await page.getByRole('button', { name: 'Open Verbal 1', exact: true }).click();
    await page.getByRole('article', { name: 'Session content: Verbal 1' }).waitFor();
    await page.getByRole('group',{name:'Course subjects',exact:true}).getByRole('button',{name:'DI',exact:true}).click();await page.getByRole('button', { name: 'Open DI 1', exact: true }).click();
    await page.getByRole('article', { name: 'Session content: DI 1' }).waitFor();
    assert.equal(state.obligations.length, 1); await noOverflow(page);
  }, true);
  await test('Confirmed feedback releases the applicable subject gate', async page => {
    state.obligations = [obligation()]; await page.goto(origin);
    await page.getByRole('button', { name: 'Give feedback for Quant 4', exact: true }).click(); await rating(page);
    await page.screenshot({ path: path.join(output, 'student-feedback-form.png'), fullPage: true });
    await page.getByRole('button', { name: 'Send feedback', exact: true }).click();
    await until(async () => assert.equal(await page.getByRole('button', { name: 'Open Quant 5', exact: true }).isEnabled(), true));
    assert.equal(state.submissions.length, 1); assert.equal(state.submissions[0].response.attendance, 'recording');
  });
  await test('Interrupted feedback preserves its request identifier and avoids duplicate submissions', async page => {
    state.obligations = [obligation()]; state.interruptOnce = true; await page.goto(origin);
    await page.getByRole('button', { name: 'Give feedback for Quant 4', exact: true }).click(); await rating(page);
    await page.getByRole('button', { name: 'Send feedback', exact: true }).click(); await page.getByRole('form', { name: 'Feedback for Quant 4', exact: true }).getByRole('alert').waitFor();
    await page.getByRole('button', { name: 'Send feedback', exact: true }).click();
    await until(async () => assert.equal(await page.getByRole('button', { name: 'Open Quant 5', exact: true }).isEnabled(), true));
    const attempts = state.calls.filter(c => c.action === 'feedback'); assert.equal(attempts.length, 2); assert.equal(attempts[0].requestId, attempts[1].requestId); assert.equal(state.submissions.length, 1);
  });
  await test('Multiple current obligations remain independently visible after one response', async page => {
    state.obligations = [obligation(), obligation(quant5, 'recording', 2)]; await page.goto(origin);
    await page.getByRole('button', { name: 'Give feedback for Quant 4', exact: true }).click(); await rating(page);
    await page.getByRole('button', { name: 'Send feedback', exact: true }).click();
    await until(async () => assert.equal(state.obligations.length, 1));
    await page.getByRole('button', { name: 'Give feedback for Quant 5', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Open Quant 5', exact: true }).isEnabled(), true);
    await until(async () => assert.equal(await page.getByRole('button', { name: 'Open Quant 4', exact: true }).isDisabled(), true));
  });
  await test('Registered live classes separate what is on now, coming up and past', async page => {
    const at = minutes => new Date(Date.now() + minutes * 60000).toISOString();
    state.liveRegistered = true;
    state.liveEvents = [
      { key: id(951), title: 'Quant live now', section: 'quant', startsAt: at(-10), endsAt: at(110), completedAt: null, sessionKey: quant4 },
      { key: id(952), title: 'Verbal next week', section: 'verbal', startsAt: at(7 * 1440), endsAt: at(7 * 1440 + 120), completedAt: null, sessionKey: null },
      { key: id(953), title: 'Earlier DI class', section: 'di', startsAt: at(-3 * 1440), endsAt: at(-3 * 1440 + 120), completedAt: at(-3 * 1440 + 130), sessionKey: null },
    ];
    await page.goto(origin); await page.getByRole('button', { name: 'Live classes', exact: true }).click();
    for (const heading of ['Coming up', 'Past classes']) await page.getByRole('heading', { name: heading, exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Join class', exact: true }).getAttribute('href'), `/schedule/v2/${batchId}/live/${id(951)}`);
    assert.equal(await page.getByRole('link', { name: 'Class details', exact: true }).count(), 1);
    assert.equal(await page.getByRole('listitem').filter({ hasText: 'Earlier DI class' }).getByRole('link').count(), 0);
    await page.screenshot({ path: path.join(output, 'student-live-classes.png'), fullPage: true });
    assert.equal(state.calls.length, 0);
  });
  await test('Unregistered live route shows no meeting action and retains recording navigation', async page => {
    await page.goto(origin); await page.getByRole('button', { name: 'Live classes', exact: true }).click();
    await page.getByRole('heading', { name: 'You don’t have a live seat' }).waitFor();
    for (const name of ['Join class', 'Class details']) assert.equal(await page.getByRole('link', { name, exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Recordings & materials', exact: true }).click();
    await page.getByRole('button', { name: 'Open Quant 4', exact: true }).waitFor();
  });
  await test('Students without a live seat still see their batch’s class dates, but no join actions', async page => {
    state.liveSchedule = [
      { key: id(960), title: 'Quant live class', section: 'quant', startsAt: '2099-11-02T12:30:00Z', endsAt: '2099-11-02T14:00:00Z', completedAt: null },
      { key: id(961), title: 'Earlier live class', section: 'quant', startsAt: '2026-10-02T12:30:00Z', endsAt: '2026-10-02T14:00:00Z', completedAt: '2026-10-02T15:00:00Z' },
    ];
    await page.goto(origin); await page.getByRole('button', { name: 'Live classes', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Your live classes' });
    await panel.getByText('Quant live class', { exact: true }).waitFor(); await panel.getByText('Earlier live class', { exact: true }).waitFor();
    await panel.getByText(/Joining needs a live seat/).waitFor();
    assert.equal(await panel.getByText('You don’t have a live seat').count(), 0);
    for (const name of ['Join class', 'Class details']) assert.equal(await panel.getByRole('link', { name, exact: true }).count(), 0);
    assert.equal(await panel.getByRole('link', { name: /Add to calendar/ }).count(), 1, 'only the upcoming class');
    await noOverflow(page);
  }, true);
  await test('Missed live feedback requires no ratings or recording and makes no attendance claim', async page => {
    state.liveRegistered = true; state.noRecording = true; const due = obligation(quant4, 'live'); state.obligations = [due];
    state.liveEvents = [{ key: due.eventKey, title: 'Quant live class', section: 'quant', startsAt: '2026-11-02T08:00:00Z', endsAt: '2026-11-02T09:00:00Z', completedAt: '2026-11-02T10:00:00Z', sessionKey: quant4 }];
    await page.goto(origin);
    const pending = page.getByRole('listitem', { name: 'Recording' }).getByRole('status');
    await pending.getByText('The recording isn’t available yet', { exact: true }).waitFor();
    await pending.getByText(/If you missed the live class, choose “I didn’t attend”/).waitFor();
    await page.getByRole('button', { name: 'Live classes', exact: true }).click();
    for (const name of ['Join class', 'Class details']) assert.equal(await page.getByRole('link', { name, exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Give feedback or report a missed class', exact: true }).click();
    await page.getByRole('radio', { name: 'I didn’t attend', exact: true }).check();
    assert.equal(await page.getByLabel('How useful was this session?').count(), 0);
    await page.getByRole('button', { name: 'Send feedback', exact: true }).click();
    await until(async () => assert.equal(state.submissions.length, 1));
    assert.deepEqual(state.submissions[0].response, {usefulness:null,clarity:null,comment:'',attendance:'missed'});
    await page.getByRole('button', { name: 'Recordings & materials', exact: true }).click();
    await until(async () => assert.equal(await page.getByRole('button', { name: 'Open Quant 5', exact: true }).isEnabled(), true));
  }, true);
  await test('Unsupported recording uses an explicit self-report and only confirmed feedback state', async page => {
    state.externalRecording = true; await page.goto(origin);
    await page.getByRole('button', { name: 'Recording options', exact: true }).click();
    const confirm = page.getByRole('button', { name: 'I’ve watched this recording', exact: true });
    assert.equal(state.obligations.length, 0, 'opening the recording alone creates no feedback obligation');
    await confirm.click();
    await page.getByRole('button', { name: 'Give feedback for Quant 4', exact: true }).waitFor();
    assert.equal(state.calls.filter(c=>c.action==='watch-report').length,1);
    assert.equal(await page.getByRole('button', { name: 'Open Quant 5', exact: true }).isDisabled(),true);
  });
  await test('Supported player sends observed positions and waits for confirmed feedback due', async page => {
    await page.addInitScript(() => {
      window.__syntheticPlayback = {position:0,duration:10,playing:true,change:null};
      window.YT = {Player: class {
        constructor(element, options) { window.__syntheticPlayback.change = options.events.onStateChange; setTimeout(options.events.onReady,0); }
        getCurrentTime(){return window.__syntheticPlayback.position;}
        getDuration(){return window.__syntheticPlayback.duration;}
        getPlayerState(){return window.__syntheticPlayback.playing ? 1 : 2;}
        destroy(){}
      }};
    });
    await page.goto(origin); await page.getByRole('button',{name:'Watch here',exact:true}).click();
    await until(async()=>assert.equal(state.calls.filter(c=>c.action==='watch-sample').length,1));
    assert.equal(state.obligations.length,0);
    for (const position of [5,8]) {
      await page.evaluate(value=>{window.__syntheticPlayback.position=value;window.__syntheticPlayback.change();},position);
      await until(async()=>assert.ok(state.calls.some(c=>c.action==='watch-sample' && c.positionSeconds===position)));
    }
    await page.getByRole('button',{name:'Give feedback for Quant 4',exact:true}).waitFor();
    assert.equal(state.calls.filter(c=>c.action==='watch-start').length,1);
    assert.deepEqual(state.calls.filter(c=>c.action==='watch-sample').map(c=>c.positionSeconds),[0,5,8]);
    assert.equal(state.submissions.length,0);
    assert.equal(await page.getByRole('button',{name:'Open Quant 5',exact:true}).isDisabled(),true);
  });
  await test('Repeated watched self-report with completed feedback never creates a false gate', async page => {
    state.externalRecording=true; state.feedbackAlreadyComplete=true;
    await page.goto(origin); await page.getByRole('button',{name:'Recording options',exact:true}).click();
    await page.getByRole('button',{name:'I’ve watched this recording',exact:true}).click();
    await page.getByText('Marked as watched. You’ve already given feedback for this session.').waitFor();
    assert.equal(state.obligations.length,0); assert.equal(state.submissions.length,0);
    assert.equal(await page.getByRole('button',{name:'Open Quant 5',exact:true}).isEnabled(),true);
  });
  await test('Course page offers Mocks next to the learning routes and fits a narrow screen', async page => {
    await page.goto(origin);
    assert.equal(await page.getByRole('link', { name: 'Mocks', exact: true }).getAttribute('href'), '/mocks');
    assert.equal(await page.getByRole('button', { name: 'Focus mode' }).count(), 0);
    await noOverflow(page);
  }, true);
  await test('Long mobile outline stays bounded and supports keyboard selection of the last session', async page => {
    state.extraSessions=Array.from({length:27},(_,index)=>({key:id(1000+index),title:`Additional session ${index+1}`,section:'quant',content:content(2000+index)}));
    await page.goto(origin);
    const outline=page.getByRole('complementary',{name:'Course outline'});
    assert.equal(await outline.getByRole('button',{name:/^Open /}).count(),29);
    const dimensions=await outline.locator('ol').evaluate(element=>({height:element.getBoundingClientRect().height,scrollHeight:element.scrollHeight,clientHeight:element.clientHeight,viewport:innerHeight}));
    assert.ok(dimensions.height<=dimensions.viewport*0.46);assert.ok(dimensions.scrollHeight>dimensions.clientHeight);
    const last=outline.getByRole('button',{name:'Open Additional session 27',exact:true});await last.focus();await page.keyboard.press('Enter');
    const article=page.getByRole('article',{name:'Session content: Additional session 27'});await article.waitFor();
    assert.equal(await last.evaluate(element=>element===document.activeElement),true);
    const geometry=await outline.evaluate(element=>{const focus=document.activeElement.getBoundingClientRect(),box=element.getBoundingClientRect();return {visible:focus.top>=box.top&&focus.bottom<=box.bottom,outlineBottom:box.bottom,viewport:innerHeight};});
    assert.equal(geometry.visible,true);await page.screenshot({path:path.join(output,'student-mobile-outline.png'),fullPage:true});
    const box=await article.boundingBox();assert.ok(box.y<geometry.viewport*1.5);assert.ok(box.y-geometry.outlineBottom<200);
    await noOverflow(page);
  },true);
  await test('Visual-progress interruption never claims completion or blocks course content', async page => {
    state.rejectProgress = true; await page.goto(origin);
    await page.getByRole('group',{name:'Course subjects',exact:true}).getByRole('button',{name:'Verbal',exact:true}).click();await page.getByRole('button', { name: 'Open Verbal 1', exact: true }).click();
    await page.getByText('The learning reminder could not be saved.', { exact: false }).waitFor();
    await page.getByRole('article', { name: 'Session content: Verbal 1' }).waitFor();
    assert.equal(state.obligations.length, 0); assert.equal(state.submissions.length, 0);
  });
  await test('To review list filters by subject and clears a question with undo', async page => {
    await page.goto(origin + '/review');
    const chips = page.getByRole('group', { name: 'Filter by subject', exact: true }), all = chips.getByRole('button', { name: /^All/ });
    assert.deepEqual(await chips.getByRole('button').allTextContents(), ['All3', 'Quant2', 'Verbal1']);
    await chips.getByRole('button', { name: /^Verbal/ }).click(); assert.equal(await page.getByRole('heading', { level: 3 }).count(), 1);
    await all.click(); assert.equal(await page.getByRole('heading', { level: 3 }).count(), 2);
    await page.getByText('Took 2:30', { exact: true }).waitFor(); await page.getByText('Marked 20 Nov', { exact: true }).waitFor(); await page.getByText('No note added', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'student-review-list.png'), fullPage: true });
    await page.getByRole('button', { name: 'Mark question 7 of QA 1 Worksheet done', exact: true }).click();
    await page.getByText('Question 7 marked done.', { exact: false }).waitFor(); assert.equal(await all.textContent(), 'All2');
    await page.getByRole('button', { name: 'Undo', exact: true }).click(); await until(async () => assert.equal(await all.textContent(), 'All3'));
    const calls = await page.evaluate(() => window.__rpc);
    assert.deepEqual(calls.map(c => [c.name, c.p_question_id, c.p_status, c.p_time_taken_seconds, c.p_comment]), [
      ['update_my_v2_worksheet_log', id(31), 'done', 150, 'Ratio trap: re-read what the question asks for'],
      ['update_my_v2_worksheet_log', id(31), 'review', 150, 'Ratio trap: re-read what the question asks for']]);
    await page.goto(origin + '/review-empty'); await page.getByRole('heading', { name: 'Nothing to review yet', exact: true }).waitFor();
  });
  await test('Practice log draws each worksheet as an answer sheet with subject totals', async page => {
    await page.goto(origin + '/practice-summary');
    const table = page.getByRole('table', { name: 'Questions logged by subject', exact: true });
    assert.deepEqual(await table.locator('tbody tr').evaluateAll(rows => rows.map(r => r.textContent.replace(/\s+/g, ' ').trim())), ['Quant17 of 623', 'Verbal3 of 151']);
    assert.equal(await table.getByRole('link', { name: '3 Quant questions to review', exact: true }).getAttribute('href'), '/practice/v2?view=review');
    await page.getByRole('img', { name: '11 done, 2 to review, 7 not logged, of 20 questions', exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Continue QA 1 Worksheet', exact: true }).getAttribute('href'), '/w/QA 1 Worksheet');
    await page.getByRole('link', { name: 'Open QA 3 Worksheet', exact: true }).waitFor();
    await page.getByText('Opens again once you send your Verbal feedback', { exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: /VA 4 Worksheet/ }).count(), 0);
    await page.screenshot({ path: path.join(output, 'student-practice-summary.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page); await page.screenshot({ path: path.join(output, 'student-practice-summary-mobile.png'), fullPage: true });
  });
  await test('To review list fits a phone', async page => {
    await page.goto(origin + '/review'); await page.getByRole('button', { name: 'Mark question 3 of VA 4 Worksheet done', exact: true }).waitFor();
    await noOverflow(page); await page.screenshot({ path: path.join(output, 'student-review-list-mobile.png'), fullPage: true });
  }, true);
}
try {
  const build = spawn(process.execPath, [next, 'build', '--webpack'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  build.stdout.pipe(log, { end: false }); build.stderr.pipe(log, { end: false });
  const code = await new Promise((resolve, reject) => { const timer = setTimeout(() => { build.kill('SIGTERM'); reject(Error('Fixture build timed out')); }, 180000); build.on('error', reject); build.on('exit', value => { clearTimeout(timer); resolve(value); }); });
  assert.equal(code, 0, 'Fixture build failed; inspect fixture-server.log');
  server = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.pipe(log, { end: false }); server.stderr.pipe(log, { end: false });
  await until(async () => assert.equal((await fetch(origin)).status, 200), 20000);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
  await runTests();
  assert.deepEqual(browserErrors, [], 'Unexpected browser runtime errors');
  assert.deepEqual(blocked, [], 'Unexpected external requests');
} catch (error) { results.push({ name: 'Harness', status: 'failed', error: error.message }); console.error(error.message); }
finally {
  const sourceHashes = {};
  for (const file of [...copied].sort()) sourceHashes[file] = createHash('sha256').update(await readFile(path.join(root, file))).digest('hex');
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), mode: 'isolated UI fixture; synthetic learning state and mutation responses; not hosted or database authorization evidence', browser: browser?.version(), sourceHashes, results, blockedOrigins: [...new Set(blocked)], browserErrors }, null, 2) + '\n');
  await browser?.close();
  if (server) { const stopped = new Promise(resolve => server.once('exit', resolve)); server.kill('SIGTERM'); await stopped; }
  backend.closeAllConnections(); await new Promise(resolve => backend.close(resolve)); log.end(); await rm(root, { recursive: true, force: true });
}
console.info(`${results.filter(r => r.status === 'passed').length} passed; ${results.filter(r => r.status === 'failed').length} failed.`);
process.exitCode = results.some(r => r.status === 'failed') ? 1 : 0;
