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
const output = path.resolve(process.env.V2_PHASE5_BROWSER_OUTPUT || path.join(tmpdir(), 'ace-v2-phase5-browser-results'));
await mkdir(output, { recursive: true });
const root = await mkdtemp(path.join(tmpdir(), 'ace-v2-phase5-browser-'));
const id = n => `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const batchId = id(1), quant4 = id(4), quant5 = id(5), verbal = id(6), di = id(7);
const existingEvent = { key: id(80), kind: 'live', localDate: '2026-11-12', localStartTime: '18:00', durationMinutes: 60, instructor: '', capacity: 8 };
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
function editorCourses() {
  return [{batchId:id(999),title:'Synthetic Full Course',productCode:'full_course',publicationRevision:1,sessions:sourceSessions,anchors:sourceSessions},
    ...['quant','verbal','di'].map((productCode,n)=>({batchId:n===0?batchId:id(10+n),title:`Synthetic ${productCode}`,productCode,publicationRevision:1,sessions:sourceSessions.filter(s=>s.section===productCode),anchors:sourceSessions.filter(s=>s.section===productCode).map(s=>({...s,title:state.editorItems.find(i=>i.visible&&i.document.kind==='heading'&&i.document.targets.some(t=>t.batchId===(n===0?batchId:id(10+n))&&t.sessionKey===s.key))?.document.title??s.title}))}))];
}
function initial() {
  return { obligations: [], progress: [], lastSessionKey: null, liveRegistered: false, liveEvents: [], calls: [], submissions: [], interruptOnce: false, rejectProgress: false, noRecording: false, externalRecording: false, feedbackAlreadyComplete: false, extraSessions: [], placements: [], preview: false, placedItems: [], editorItems: [], editorCalls: [], failSave:false, conflictConfirm:false, sessionCalls:[], pendingSession:false, failSessionSave:false, staleSessionList:false };
}
let state = initial();
function view() {
  const allSessions = [...sourceSessions, ...state.extraSessions];
  const sessions = allSessions.map(({ key, title, section }) => ({ key, title, section,
    locked: state.obligations.some(o => o.section === section) && !state.obligations.some(o => o.batchId === batchId && o.sessionKey === key),
  }));
  return { course: { batchId, publicationRevision: 1, batchRevision: 1, title: 'Synthetic Full Course', productCode: 'full_course', sessions: allSessions.filter(s => !sessions.find(item => item.key === s.key).locked).map(s => ({...s, content: {...s.content,preSessionReads:[...s.content.preSessionReads,...(s.key===quant4?state.placedItems:[])], recordings: state.noRecording ? [] : state.externalRecording ? s.content.recordings.map(item => ({...item,url:'https://recordings.example.test/player/session'})) : s.content.recordings}})) },
    placements:state.placements,preview:state.preview,
    learning: { batchId, publicationRevision: 1, sessions, obligations: state.obligations, progress: state.progress, lastSessionKey: state.lastSessionKey, liveRegistered: state.liveRegistered, liveEvents: state.liveEvents },
  };
}
function obligation(key = quant4, source = 'recording', count = 1) {
  return { id: id(800 + count), batchId, sessionKey: key, sessionTitle: sourceSessions.find(s => s.key === key).title,
    section: sourceSessions.find(s => s.key === key).section, source, eventKey: source === 'live' ? id(900 + count) : null, createdAt: '2026-11-02T10:00:00Z' };
}
const backend = createServer((request, response) => {
  if(request.url==='/workspace'){response.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({items:state.editorItems,courses:editorCourses()}));return;}
  if (request.url !== '/state') { response.writeHead(404).end(); return; }
  response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(view()));
});
await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
const put = async (file, body) => { await mkdir(path.dirname(path.join(root, file)), { recursive: true }); await writeFile(path.join(root, file), body); };
const copied = new Set();
async function copySource(file) {
  if (copied.has(file)) return;
  copied.add(file);
  if(file==='src/app/admin/v2/content/session-actions.ts') {await put(file,`export async function loadSessionDraftAction(batchId:string){return (await fetch('/api/fixture/sessions',{method:'POST',body:JSON.stringify({action:'load',batchId})})).json()}`);return;}
  if(file==='src/app/admin/v2/batches/actions.ts') {await put(file,`export async function previewBatchDraftAction(input:unknown){return (await fetch('/api/fixture/sessions',{method:'POST',body:JSON.stringify({action:'preview',input})})).json()} export async function saveBatchDraftAction(input:unknown,fingerprint:string){return (await fetch('/api/fixture/sessions',{method:'POST',body:JSON.stringify({action:'save',input,fingerprint})})).json()}`);return;}
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
await copySource('src/app/admin/v2/content/ContentEditor.tsx');
await copySource('src/app/admin/AdminShell.tsx');
await copySource('public/5.svg');
await copySource('public/6.svg');
await put('src/lib/AuthContext.tsx', `'use client'; export function useAuth(){return {user:{id:'synthetic-admin',role:'admin',full_name:'Course administrator',email:'admin@example.test'},isLoading:false,logout:async()=>{}};}`);
await put('src/app/globals.css', (await readFile(path.join(repo, 'src/app/globals.css'), 'utf8')).replace(/^@import url\(.*\);\r?\n/gm, ''));
await put('package.json', JSON.stringify({ private: true, dependencies: { next: '16.2.4', react: '19.2.4', 'react-dom': '19.2.4' } }));
await put('tsconfig.json', await readFile(path.join(repo, 'tsconfig.json')));
await put('next.config.mjs', 'export default { devIndicators: false };');
await symlink(path.join(repo, 'node_modules'), path.join(root, 'node_modules'));
await put('src/app/layout.tsx', `import './globals.css'; export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}`);
await put('src/app/page.tsx', `import {V2LearningWorkspace} from '@/components/student/V2LearningWorkspace';
export const dynamic='force-dynamic';
export default async function Page(){const data=await(await fetch('http://127.0.0.1:${backend.address().port}/state',{cache:'no-store'})).json();return <main style={{maxWidth:1200,margin:'auto',padding:20}}><h1>Synthetic Full Course</h1><V2LearningWorkspace {...data}/></main>}`);
await put('src/app/admin/v2/content/page.tsx',`import ContentEditor from '@/app/admin/v2/content/ContentEditor'; import AdminShell from '@/app/admin/AdminShell'; export const dynamic='force-dynamic'; export default async function Page(){const data=await(await fetch('http://127.0.0.1:${backend.address().port}/workspace',{cache:'no-store'})).json();return <AdminShell workflowEnabled><ContentEditor initial={data}/></AdminShell>}`);
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
    if(url.pathname==='/api/fixture/sessions'){
      const body=request.postDataJSON();state.sessionCalls.push(body);
      if(body.action==='load')return route.fulfill({json:state.pendingSession?{status:'pending',message:'Existing draft needs review.'}:{status:'ready',draft:{id:batchId,templateId:id(90),templateRevision:2,revision:3,productCode:'quant',title:'Synthetic quant',startDate:'2026-11-01',timeZone:'Asia/Kolkata',sessions:state.staleSessionList?sourceSessions.filter(s=>s.section==='quant').slice().reverse():sourceSessions.filter(s=>s.section==='quant'),events:[existingEvent]}}});
      if(body.action==='preview')return route.fulfill({json:{status:'ready',proposal:{fingerprint:'a'.repeat(32)}}});
      if(state.failSessionSave){state.failSessionSave=false;return route.fulfill({json:{status:'error',message:'Synthetic save interruption'}});}
      return route.fulfill({json:{status:'ready'}});
    }
    if(url.pathname==='/api/admin/v2/content'){
      const {action,input}=request.postDataJSON();state.editorCalls.push({action,input});
      if(action==='workspace')return route.fulfill({json:{items:state.editorItems,courses:editorCourses()}});
      if(action==='save'&&state.failSave){state.failSave=false;return route.fulfill({status:503,json:{error:'Synthetic save interruption'}});}
      if(action==='confirm'&&state.conflictConfirm){state.conflictConfirm=false;return route.fulfill({status:409,json:{error:'The content or course scope changed. Reload and review again.'}});}
      if(action==='save'){let item=state.editorItems.find(i=>i.id===input.id);if(!item){item={id:input.id,published_revision:null,visible:false,deleted:false,publication_version:0};state.editorItems.push(item);}Object.assign(item,{document:input.document,draft_revision:input.revision+1});return route.fulfill({json:{id:item.id,revision:item.draft_revision}});}
      if(action==='scope')return route.fulfill({json:{...input,fingerprint:'a'.repeat(64),targets:state.editorItems.find(i=>i.id===input.id).document.targets.map(t=>({...t,courseTitle:editorCourses().find(c=>c.batchId===t.batchId).title,sessionTitle:sourceSessions.find(s=>s.key===t.sessionKey).title}))}});
      if(action==='confirm'){const item=state.editorItems.find(i=>i.id===input.id);item.visible=input.action==='publish';item.deleted=input.action==='delete';item.published_revision=item.draft_revision;return route.fulfill({json:{confirmed:true}});}
      return route.fulfill({status:400,json:{error:'Synthetic action unsupported'}});
    }
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
function fivePlacements(){
 state.placements=['before_course','area_top','before_video','after_video','after_course'].map((placement,n)=>({key:id(5000+n),sessionKey:quant4,placement,anchorKey:placement.includes('video')?id(204):null,order:10+n}));
 state.placedItems=state.placements.map(p=>({key:p.key,title:`Reading ${p.placement}`,url:'https://example.test/reading'}));
}
async function runTests() {
 await test('Keyboard reordering announces moves, preserves focus, undoes and saves exact order',async page=>{
  await page.goto(origin+'/admin/v2/content');await page.getByRole('button',{name:'Reorder sessions',exact:true}).click();const handle=page.getByRole('button',{name:'Move Quant 4',exact:true});await handle.press('End');await page.getByRole('status').filter({hasText:'Quant 4 moved to position 2 of 2.'}).waitFor();assert.equal(await handle.evaluate(el=>el===document.activeElement),true);assert.deepEqual(await page.getByRole('list',{name:'Session order'}).getByRole('listitem').locator('[class*=orderTitle]').allTextContents(),['Quant 5','Quant 4']);await page.getByRole('button',{name:'Undo move',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Save order',exact:true}).isDisabled(),true);await handle.press('ArrowDown');await page.screenshot({path:path.join(output,'reorder-desktop.png'),fullPage:true});await page.getByRole('button',{name:'Save order',exact:true}).click();await page.getByRole('heading',{name:'Session order saved',exact:true}).waitFor();const input=state.sessionCalls.find(c=>c.action==='save').input;assert.deepEqual(input.sessions,sourceSessions.filter(s=>s.section==='quant').slice().reverse());assert.deepEqual(input.events,[existingEvent]);assert.equal(state.editorCalls.length,0);await page.getByRole('button',{name:'Done',exact:true}).click();await page.getByText('Session changes saved as a draft',{exact:true}).waitFor();await until(async()=>assert.equal(await page.getByRole('button',{name:'Reorder sessions',exact:true}).evaluate(el=>el===document.activeElement),true));
 });
 await test('Mouse drag reorders through a visible drop target without saving automatically',async page=>{
  await page.goto(origin+'/admin/v2/content');await page.getByRole('button',{name:'Reorder sessions',exact:true}).click();const source=page.getByRole('button',{name:'Move Quant 5',exact:true}),target=page.locator('[data-session-key="'+quant4+'"]');await source.dragTo(target,{targetPosition:{x:80,y:3}});await page.getByRole('status').filter({hasText:'Quant 5 moved to position 1 of 2.'}).waitFor();assert.equal(state.sessionCalls.length,0);await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(state.sessionCalls.length,0);await page.getByRole('heading',{name:'Quant 4',exact:true}).waitFor();
 });
 await test('Mobile move buttons and retry preserve the same session request',async page=>{
  state.failSessionSave=true;await page.goto(origin+'/admin/v2/content');await page.getByRole('button',{name:'Reorder sessions',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Move Quant 4 up',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'Move Quant 4 down',exact:true}).click();await noOverflow(page);await page.screenshot({path:path.join(output,'reorder-mobile.png'),fullPage:true});await page.getByRole('button',{name:'Save order',exact:true}).click();await page.getByText('Synthetic save interruption',{exact:true}).waitFor();await page.getByRole('button',{name:'Retry saving order',exact:true}).click();await page.getByRole('heading',{name:'Session order saved',exact:true}).waitFor();const saves=state.sessionCalls.filter(c=>c.action==='save');assert.equal(saves.length,2);assert.deepEqual(saves[0],saves[1]);assert.equal(await page.getByRole('link',{name:'Review & publish order',exact:true}).getAttribute('href'),'/admin/v2/batches?batch='+batchId+'&review=1');
 },true);
 await test('A stale session list cannot overwrite the current course order',async page=>{
  state.staleSessionList=true;await page.goto(origin+'/admin/v2/content');await page.getByRole('button',{name:'Reorder sessions',exact:true}).click();await page.getByRole('button',{name:'Move Quant 4 down',exact:true}).click();await page.getByRole('button',{name:'Save order',exact:true}).click();await page.getByText('The session list changed. Close this editor and reload the course before reordering.',{exact:true}).waitFor();assert.deepEqual(state.sessionCalls.map(c=>c.action),['load']);
 });
 await test('Existing unpublished changes block reordering without new writes',async page=>{
  state.pendingSession=true;await page.goto(origin+'/admin/v2/content');await page.getByRole('button',{name:'Reorder sessions',exact:true}).click();await page.getByRole('button',{name:'Move Quant 4 down',exact:true}).click();await page.getByRole('button',{name:'Save order',exact:true}).click();await page.getByRole('link',{name:'Review saved draft changes',exact:true}).waitFor();assert.deepEqual(state.sessionCalls.map(c=>c.action),['load']);
 });
 await test('Narrow layouts retain readable titles, touch targets and reduced-motion behavior',async page=>{
  const original=sourceSessions[0].title;sourceSessions[0].title='Ratios, percentages, mixtures and extended quantitative problem solving';
  try {await page.setViewportSize({width:320,height:900});await page.goto(origin+'/admin/v2/content');await page.getByRole('button',{name:'Reorder sessions',exact:true}).click();const down=page.getByRole('button',{name:'Move '+sourceSessions[0].title+' down',exact:true});await down.click();await noOverflow(page);assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);assert.equal(await page.locator('[data-session-key]').evaluateAll(rows=>rows.reduce((sum,row)=>sum+row.getAnimations().length,0)),0);for(const button of await page.locator('[class*=moveButtons] button').all()){const box=await button.boundingBox();assert.ok(box.width>=44&&box.height>=44);}await page.screenshot({path:path.join(output,'reorder-narrow.png'),fullPage:true});}finally{sourceSessions[0].title=original;}
 },true);
 await test('Automated accessibility checks pass for browsing, reordering, adding and renaming',async page=>{
  await page.goto(origin+'/admin/v2/content');await page.addScriptTag({path:path.join(repo,'node_modules/axe-core/axe.min.js')});
  async function audit(){const result=await page.evaluate(async()=>window.axe.run(document.querySelector('[aria-label="Course resources"]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);}
  await audit();await page.getByRole('button',{name:'Reorder sessions',exact:true}).click();await audit();await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'+ Add session',exact:true}).click();await audit();await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Rename session',exact:true}).click();await audit();
 });
 await test('Name review can return to editing and closing restores focus',async page=>{
  await page.goto(origin+'/admin/v2/content');await page.getByRole('button',{name:'Rename session',exact:true}).click();await page.getByLabel('Session name',{exact:true}).fill('First draft');await page.getByRole('button',{name:'Review name',exact:true}).click();await page.getByRole('button',{name:'Edit name',exact:true}).click();await page.getByLabel('Session name',{exact:true}).fill('Revised draft');await page.getByRole('button',{name:'Review name',exact:true}).click();await page.getByRole('button',{name:'Publish name',exact:true}).waitFor();assert.equal(state.editorItems[0].draft_revision,2);assert.equal(state.editorItems[0].document.title,'Revised draft');await page.getByRole('button',{name:'Close — keep name draft',exact:true}).click();await page.getByRole('button',{name:'Name draft · Continue editing →',exact:true}).waitFor();await until(async()=>assert.equal(await page.getByRole('button',{name:'Rename session',exact:true}).evaluate(el=>el===document.activeElement),true));
 });
 await test('Inline rename supports double click, cancellation and reviewed publication',async page=>{
  await page.goto(origin+'/admin/v2/content');await page.getByRole('heading',{name:'Quant 4',exact:true}).getByRole('button').dblclick();await page.getByLabel('Session name',{exact:true}).fill('Cancelled name');await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(state.editorCalls.length,0);
  await page.getByRole('button',{name:'Rename session',exact:true}).click();await page.getByLabel('Session name',{exact:true}).fill('Renamed Quant');await page.getByRole('button',{name:'Review name',exact:true}).click();await page.getByRole('button',{name:'Publish name',exact:true}).waitFor();assert.equal(state.editorItems[0].visible,false);assert.equal(state.editorItems[0].document.targets[0].sessionKey,quant4);
  await page.getByRole('button',{name:'Publish name',exact:true}).click();await page.getByRole('heading',{name:'Renamed Quant',exact:true}).waitFor();assert.equal(state.editorItems[0].visible,true);await page.screenshot({path:path.join(output,'renamed-session.png'),fullPage:true});await noOverflow(page);
 });
 await test('Keyboard rename preserves the request on interrupted save and rejects stale publication',async page=>{
  state.failSave=true;await page.goto(origin+'/admin/v2/content');await page.getByRole('heading',{name:'Quant 4',exact:true}).getByRole('button').press('F2');await page.getByLabel('Session name',{exact:true}).fill('Retry name');await page.getByRole('button',{name:'Review name',exact:true}).click();await page.getByRole('alert').filter({hasText:/interruption|course scope changed|course changed/}).waitFor();await page.getByRole('button',{name:'Retry name review',exact:true}).click();await page.getByRole('button',{name:'Publish name',exact:true}).waitFor();const saves=state.editorCalls.filter(c=>c.action==='save');assert.equal(saves.length,2);assert.deepEqual(saves[0],saves[1]);state.conflictConfirm=true;await page.getByRole('button',{name:'Publish name',exact:true}).click();await page.getByRole('alert').filter({hasText:/interruption|course scope changed|course changed/}).waitFor();assert.equal(state.editorItems[0].visible,false);assert.equal(await page.getByRole('heading',{name:'Retry name',exact:true}).count(),0);
 });
 await test('Shared heading edits retain every target for review',async page=>{
  const targets=[quant4,quant5].map(sessionKey=>({batchId,sessionKey,publicationRevision:1,placement:'session',anchorKey:null,replaceKey:null,order:100}));
  state.editorItems=[{id:id(81),draft_revision:1,published_revision:1,visible:true,deleted:false,publication_version:1,document:{title:'Shared heading',kind:'heading',url:null,targets}}];
  await page.goto(origin+'/admin/v2/content');await page.getByRole('button',{name:'Rename session',exact:true}).click();await page.getByLabel('Session name',{exact:true}).fill('Reviewed shared heading');await page.getByRole('button',{name:'Review name',exact:true}).click();await page.getByRole('button',{name:'Publish name',exact:true}).waitFor();assert.equal(await page.getByRole('form',{name:'Rename session',exact:true}).getByRole('listitem').count(),2);assert.deepEqual(state.editorItems[0].document.targets,targets);assert.equal(state.editorCalls.filter(c=>c.action==='confirm').length,0);
 });
 await test('Mobile rename rejects empty names and Escape leaves no draft',async page=>{
  await page.goto(origin+'/admin/v2/content');await page.getByRole('button',{name:'Rename session',exact:true}).click();await page.getByLabel('Session name',{exact:true}).fill('   ');await page.getByRole('button',{name:'Review name',exact:true}).click();await page.getByText('Enter a session name of up to 120 characters.',{exact:true}).waitFor();assert.equal(state.editorCalls.length,0);await noOverflow(page);await page.getByLabel('Session name',{exact:true}).press('Escape');await page.getByRole('heading',{name:'Quant 4',exact:true}).getByRole('button').press('Space');await page.getByLabel('Session name',{exact:true}).waitFor();await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(state.editorCalls.length,0);
 },true);
 await test('Adding a session keeps existing content and retries the same private draft',async page=>{
  state.failSessionSave=true;await page.goto(origin+'/admin/v2/content');await page.getByRole('button',{name:'+ Add session',exact:true}).click();await page.getByLabel('New session name',{exact:true}).fill('Quant follow-up');await page.getByRole('button',{name:'Add session',exact:true}).click();await page.getByRole('alert').filter({hasText:/interruption|course scope changed|course changed/}).waitFor();await page.getByRole('button',{name:'Retry saving session',exact:true}).click();await page.getByRole('heading',{name:'Session draft saved',exact:true}).waitFor();const saves=state.sessionCalls.filter(c=>c.action==='save');assert.equal(saves.length,2);assert.deepEqual(saves[0],saves[1]);assert.deepEqual(saves[0].input.sessions.slice(0,2),sourceSessions.filter(s=>s.section==='quant'));assert.deepEqual(saves[0].input.events,[existingEvent]);assert.equal(saves[0].input.sessions[2].section,'quant');assert.equal(saves[0].input.sessions[2].title,'Quant follow-up');assert.equal(state.editorCalls.length,0);assert.equal(await page.getByRole('link',{name:'Review & publish session',exact:true}).getAttribute('href'),'/admin/v2/batches?batch='+batchId+'&review=1');await page.screenshot({path:path.join(output,'add-session-mobile.png'),fullPage:true});await noOverflow(page);
 },true);
 await test('Existing course drafts must be reviewed before another session is added',async page=>{
  state.pendingSession=true;await page.goto(origin+'/admin/v2/content');await page.getByRole('button',{name:'+ Add session',exact:true}).click();await page.getByLabel('New session name',{exact:true}).fill('Another session');await page.getByRole('button',{name:'Add session',exact:true}).click();await page.getByRole('link',{name:'Review saved draft changes',exact:true}).waitFor();assert.deepEqual(state.sessionCalls.map(c=>c.action),['load']);
 });
 await test('Five reading placements render once and follow the video order',async page=>{
  fivePlacements();await page.goto(origin);
  for(const placement of state.placements){assert.equal(await page.getByRole('heading',{name:`Reading ${placement.placement}`,exact:true}).count(),1);}
  const positions=await page.locator('h5').allTextContents();
  assert(positions.indexOf('Reading before_video')<positions.indexOf('Shared recording'));
  assert(positions.indexOf('Reading after_video')>positions.indexOf('Shared recording'));
  assert(positions.indexOf('Reading before_course')<positions.indexOf('Reading area_top'));
  assert(positions.indexOf('Reading after_course')>positions.indexOf('Practice worksheet'));
  await noOverflow(page);
 },true);
 await test('Universal outer readings appear once across authorized session targets',async page=>{
  fivePlacements();const outer=state.placements.find(p=>p.placement==='before_course');state.placements.push({...outer,sessionKey:quant5});
  state.extraSessions=[{key:id(1001),title:'Another Quant session',section:'quant',content:{...content(1001),preSessionReads:[state.placedItems[0]]}}];state.placements.push({...outer,sessionKey:id(1001)});
  await page.goto(origin);assert.equal(await page.getByRole('heading',{name:'Reading before_course',exact:true}).count(),1);
 });
 await test('Admin preview navigation and readings make no learning requests',async page=>{
  fivePlacements();state.preview=true;await page.goto(origin);
  await page.getByRole('button',{name:'Read here',exact:true}).first().click();
  await page.getByRole('group',{name:'Course subjects',exact:true}).getByRole('button',{name:'Verbal',exact:true}).click();await page.getByRole('button',{name:'Open Verbal 1',exact:true}).click();
  await page.getByRole('group',{name:'Course subjects',exact:true}).getByRole('button',{name:'Quant',exact:true}).click();await page.getByRole('button',{name:'Open Quant 4',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Mark as read',exact:true}).count(),0);
  assert.equal(state.calls.length,0);await noOverflow(page);
 });
 await test('Locked subject resources are absent including all outer reading placements',async page=>{
  fivePlacements();state.obligations=[obligation(quant5)];await page.goto(origin);
  for(const p of state.placements)assert.equal(await page.getByRole('heading',{name:`Reading ${p.placement}`,exact:true}).count(),0);
  await page.getByRole('group',{name:'Course subjects',exact:true}).getByRole('button',{name:'Verbal',exact:true}).click();await page.getByRole('button',{name:'Open Verbal 1',exact:true}).click();await page.getByRole('article',{name:'Session content: Verbal 1'}).waitFor();
 });
 await test('Admin creates universal content and reviews affected sessions before confirmation',async page=>{
  await page.goto(origin+'/admin/v2/content');await page.getByRole('button',{name:'Add pre-class read',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Universal reading');await page.getByLabel(/^Resource URL/).fill('https://example.test/reading');
  await page.getByText('Add another course or session',{exact:true}).click();for(const checkbox of await page.getByRole('checkbox').all())await checkbox.check();
  await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByText('Draft saved.',{exact:false}).waitFor();
  assert.equal(state.editorItems[0].visible,false);assert.equal(state.editorItems[0].document.targets.length,4);
  assert.equal(await page.getByRole('link',{name:'Preview as student: Synthetic quant ↗'}).getAttribute('target'),'_blank');
  await page.getByRole('button',{name:'Review changes',exact:true}).click();const scope=page;await page.getByRole('heading',{name:'Check the resource update'}).waitFor();
  assert.equal(await scope.getByRole('listitem').count(),4);assert.equal(state.editorCalls.filter(c=>c.action==='confirm').length,0);
  await scope.getByRole('button',{name:'Publish update',exact:true}).click();await page.getByText('The resource update is published.').waitFor();assert.equal(state.editorItems[0].visible,true);
  await noOverflow(page);
 },true);
 await test('Admin editing an original item preserves its replacement identity and order',async page=>{
  await page.goto(origin+'/admin/v2/content');await page.getByRole('button',{name:'Quant',exact:true}).click();await page.getByRole('button',{name:'Edit Shared recording',exact:true}).click();
  await page.getByLabel('Title',{exact:true}).fill('Replaced recording');await page.getByLabel(/^Resource URL/).fill('https://example.test/new.mp4');
  await page.getByLabel('Position in this location',{exact:true}).selectOption('0');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByText('Draft saved.',{exact:false}).waitFor();
  assert.equal(state.editorItems[0].document.targets[0].replaceKey,id(204));assert.equal(state.editorItems[0].document.targets[0].order,0);
  await noOverflow(page);
 });

 await test('Subject navigation retains the selected session after editing',async page=>{
  await page.goto(origin+'/admin/v2/content');await page.screenshot({path:path.join(output,'subject-navigation.png'),fullPage:true});assert.equal(await page.getByText('Synthetic Full Course',{exact:true}).count(),0);await page.getByRole('button',{name:'Quant',exact:true}).click();await page.getByRole('button',{name:'02 Quant 5',exact:true}).click();await page.getByRole('button',{name:'Edit Shared recording',exact:true}).click();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'← Course content',exact:true}).click();assert.equal(await page.getByRole('button',{name:'02 Quant 5',exact:true}).getAttribute('aria-current'),'true');for(const label of ['Shared library','Session options','Course templates'])assert.equal(await page.getByText(label,{exact:true}).count(),0);assert.equal(state.editorCalls.length,0);
 });
 await test('Only three subjects are offered and switching opens the matching library',async page=>{
  await page.goto(origin+'/admin/v2/content');const subjects=page.getByRole('group',{name:'Subjects',exact:true});assert.deepEqual(await subjects.getByRole('button').allTextContents(),['Quant','Verbal','DI']);
  await page.getByRole('region',{name:'Session resources: Quant 4',exact:true}).waitFor();
  await page.getByLabel('Find a session',{exact:true}).fill('5');assert.equal(await page.getByRole('button',{name:'01 Quant 4',exact:true}).count(),0);await page.getByRole('button',{name:'02 Quant 5',exact:true}).click();
  await subjects.getByRole('button',{name:'Verbal',exact:true}).click();await page.getByRole('region',{name:'Session resources: Verbal 1',exact:true}).waitFor();
  await subjects.getByRole('button',{name:'DI',exact:true}).click();await page.getByRole('region',{name:'Session resources: DI 1',exact:true}).waitFor();assert.equal(await page.getByText('Synthetic Full Course',{exact:true}).count(),0);assert.equal(state.editorCalls.length,0);
 });
 await test('Mobile subject and session selection stays compact and editable',async page=>{
  await page.goto(origin+'/admin/v2/content');await page.getByLabel('Choose a session',{exact:true}).selectOption(quant5);await page.getByRole('region',{name:'Session resources: Quant 5',exact:true}).waitFor();await page.screenshot({path:path.join(output,'mobile-sessions.png'),fullPage:true});await noOverflow(page);
 },true);
 await test('Multiple readings offer named ordering without immediate publication',async page=>{
  sourceSessions[0].content.preSessionReads.push({key:id(777),title:'Second reading',url:'https://example.test/second'});
  try{await page.goto(origin+'/admin/v2/content');await page.getByRole('button',{name:'Quant',exact:true}).click();await page.getByRole('button',{name:'Edit Preparation reading',exact:true}).click();await page.getByLabel('Position in this location',{exact:true}).selectOption({label:'After Second reading'});const order=page.getByRole('list',{name:'Draft resource order'});assert.match(await order.innerText(),/Second reading[\s\S]*Preparation reading/);await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByText('Draft saved.',{exact:false}).waitFor();await page.screenshot({path:path.join(output,'reading-order.png'),fullPage:true});assert.equal(state.editorItems[0].document.targets[0].order,300);assert.equal(state.editorItems[0].visible,false);await page.getByText('Remove or unpublish this resource',{exact:true}).click();await page.getByRole('button',{name:'Review deletion',exact:true}).click();assert.equal(state.editorCalls.filter(item=>item.action==='confirm').length,0);await page.getByRole('button',{name:'Cancel review',exact:true}).click();assert.equal(state.editorItems[0].deleted,false);}finally{sourceSessions[0].content.preSessionReads.pop();}
 });

 await test('Failed save retains values and never publishes',async page=>{
  state.failSave=true;await page.goto(origin+'/admin/v2/content');await page.getByRole('button',{name:'Quant',exact:true}).click();await page.getByRole('button',{name:'Edit Shared recording',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Retained recording');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('heading',{name:'The action could not be completed',exact:true}).waitFor();assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'Retained recording');assert.equal(state.editorItems.length,0);await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByText('Draft saved.',{exact:false}).waitFor();assert.equal(state.editorItems[0].visible,false);
 });
 await test('Conflict removes confirmation and requires latest-version review plus a fresh save',async page=>{
  await page.goto(origin+'/admin/v2/content');await page.getByRole('button',{name:'Quant',exact:true}).click();await page.getByRole('button',{name:'Edit Shared recording',exact:true}).click();await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('button',{name:'Review changes',exact:true}).click();state.conflictConfirm=true;await page.getByRole('button',{name:'Publish update',exact:true}).click();await page.getByRole('heading',{name:'A newer version needs review'}).waitFor();assert.equal(await page.getByRole('button',{name:'Publish update',exact:true}).count(),0);assert.equal(state.editorItems[0].visible,false);await page.getByRole('button',{name:'Load latest version',exact:true}).click();await page.getByRole('button',{name:'Keep edits against this version',exact:true}).click();await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('button',{name:'Review changes',exact:true}).click();await page.getByRole('button',{name:'Publish update',exact:true}).click();await page.getByText('The resource update is published.').waitFor();assert.equal(state.editorItems[0].visible,true);
 });
 await test('Leaving a changed resource can be cancelled without losing edits',async page=>{
  await page.goto(origin+'/admin/v2/content');await page.getByRole('button',{name:'Quant',exact:true}).click();await page.getByRole('button',{name:'Edit Shared recording',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Unsaved title');page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'← Course content',exact:true}).click();assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'Unsaved title');assert.equal(state.editorCalls.length,0);page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'← Course content',exact:true}).click();await page.getByRole('heading',{name:'Course content',exact:true}).waitFor();
 },true);
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
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), mode: 'isolated UI fixture; synthetic learning state and mutation responses; session and batch Server Actions replaced by fixture HTTP adapters; not hosted or database authorization evidence', browser: browser?.version(), sourceHashes, results, blockedOrigins: [...new Set(blocked)], browserErrors }, null, 2) + '\n');
  await browser?.close();
  if (server) { const stopped = new Promise(resolve => server.once('exit', resolve)); server.kill('SIGTERM'); await stopped; }
  backend.closeAllConnections(); await new Promise(resolve => backend.close(resolve)); log.end(); await rm(root, { recursive: true, force: true });
}
console.info(`${results.filter(r => r.status === 'passed').length} passed; ${results.filter(r => r.status === 'failed').length} failed.`);
process.exitCode = results.some(r => r.status === 'failed') ? 1 : 0;
