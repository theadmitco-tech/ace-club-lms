import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {createWriteStream} from 'node:fs';
import {mkdir,readFile,writeFile,rm,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
import {createFixtureApp,repo,sources} from '../v2-phase2/fixture-app.mjs';
import {initialState,respond,id} from '../v2-phase2/fixtures.mjs';
const output=path.resolve(process.env.ADMIN_WORKFLOW_OUTPUT||path.join(tmpdir(),'ace-admin-workflow-browser'));
await mkdir(output,{recursive:true});let state=initialState();
function studentDirectory(pattern='',from=0,to=25) {
 const query=pattern.slice(1,-1).replace(/\\([\\%_])/g,'$1').toLowerCase();
 if(query==='unavailable')return {data:null,error:{message:'Synthetic directory failure'}};
 const data=Array.from({length:26},(_,index)=>({id:id(601+index),full_name:'Synthetic Student '+String(index+1).padStart(2,'0'),email:'student'+(index+1)+'@example.test',is_active:index%3!==1})).filter(row=>!query||row.full_name.toLowerCase().includes(query));
 return {data:data.slice(from,to+1),error:null};
}
const backend=createServer(async(req,res)=>{try{let body='';for await(const part of req)body+=part;const method=req.url.slice(1),args=JSON.parse(body);const result=method==='fixtureContentWorkspace'?{items:[],courses:state.drafts.filter(d=>!d.events.some(e=>e.kind==='live')).map(d=>({batchId:d.id,title:d.title,productCode:d.productCode,publicationRevision:1,sessions:d.sessions,anchors:d.sessions}))}:method==='fixtureStudentDirectory'?studentDirectory(...args):await respond(state,method,args);res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(result));}catch{res.writeHead(500).end('Synthetic interruption');}});
await new Promise(resolve=>backend.listen(0,'127.0.0.1',resolve));
const root=await createFixtureApp(backend.address().port,true);
const put=async(file,body)=>{await mkdir(path.dirname(path.join(root,file)),{recursive:true});await writeFile(path.join(root,file),body);};
const extra=['src/app/admin/v2/students/[studentId]/StudentAccessTabs.tsx','src/app/admin/v2/students/page.tsx','src/app/admin/v2/students/students.module.css','src/app/admin/page.tsx','src/app/admin/v2/students/[studentId]/page.tsx','src/app/admin/v2/students/[studentId]/studentAccess.module.css'];
const testedSourceHashes={};for(const file of [...sources,...extra])testedSourceHashes[file]=createHash('sha256').update(await readFile(path.join(repo,file))).digest('hex');
for(const file of extra){await mkdir(path.dirname(path.join(root,file)),{recursive:true});await copyFile(path.join(repo,file),path.join(root,file));}
await put('src/app/admin/page.tsx',`import {redirect} from 'next/navigation';export default function Page(){redirect('/admin/v2/content');}`);
await put('src/app/admin/v2/content/page.tsx',`export default function Page(){return <h1>Course content</h1>}`);
await put('src/lib/server/v2ContentPublishing.ts',`import {call} from '@/lib/server/fixture';export function isV2ContentPublishingEnabled(){return true;}export async function readContentWorkspace():Promise<{items:{id:string;deleted:boolean;draft_revision:number;published_revision:number|null;document:{title:string}}[];courses:import('@/lib/v2ContentPublishing').ContentCourse[]}>{return call('fixtureContentWorkspace');}`);
await put('src/utils/supabase/server.ts',`import {call} from '@/lib/server/fixture';
export async function createClient(){return {from(table:string){if(table!=='profiles')throw Error('Unexpected fixture table');let pattern='';const query={select(_fields:string){return query;},eq(_field:string,_value:string){return query;},ilike(_field:string,value:string){pattern=value;return query;},order(_field:string){return query;},async range(from:number,to:number):Promise<{data:{id:string;full_name:string;email:string;is_active:boolean}[]|null;error:{message:string}|null}>{return call('fixtureStudentDirectory',pattern,from,to);}};return query;}};}`);
await put('src/lib/server/v2CourseWorkspace.ts',`export function historyPage(value:unknown){return typeof value==='string'&&/^[1-9]\\d{0,4}$/.test(value)?Number(value):1;}`);
await put('src/lib/server/adminStudentAccess.ts',`export async function readAdminStudentAccess(studentId:string){const expired=studentId.endsWith('602'),failed=studentId.endsWith('603'),empty=studentId.endsWith('604'),batchFailed=studentId.endsWith('605');return {
profile:{error:null,data:{full_name:'Synthetic Student',is_active:true}},purchases:{error:failed?'Unavailable':null,data:[{id:'purchase',confirmed_at:'2026-01-01T00:00:00Z',expires_at:expired?'2026-02-01T00:00:00Z':'2027-01-01T00:00:00Z',revoked_at:null,v2_product_grants:[{product_code:'full_batch'}]}]},
enrollments:{error:batchFailed?'Unavailable':null,data:[{batch_id:'${id(10)}',active:true}]},registrations:{error:null,data:[{batch_id:'${id(10)}',active:false}]},batches:{status:'ready',drafts:(empty?[]:[
{id:'${id(10)}',productCode:'full_course',title:'Synthetic live batch',events:[{kind:'live'}]},
{id:'${id(11)}',productCode:'full_course',title:'Full Course · Learning library',events:[]},
{id:'${id(12)}',productCode:'di',title:'DI · Learning library',events:[{kind:'outline'}]},
{id:'${id(13)}',productCode:'verbal',title:'Verbal · Learning library',events:[]},
{id:'${id(14)}',productCode:'quant',title:'Quant · Learning library',events:[]},
{id:'${id(15)}',productCode:'quant',title:'Quant live batch',events:[{kind:'live'}]}
]) as import('@/lib/v2Batches').V2BatchDraft[]},checkedAt:Date.parse('2026-11-04T00:00:00Z')};}`);
const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
const origin=`http://127.0.0.1:${port}`,next=path.join(repo,'node_modules/next/dist/bin/next'),env={PATH:process.env.PATH,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1'};
const log=createWriteStream(path.join(output,'fixture-server.log'));const results=[],errors=[],blocked=[];let browser,server;
const until=async(check)=>{for(let n=0;n<100;n++){try{return await check();}catch{await new Promise(r=>setTimeout(r,150));}}throw Error('Condition timed out');};
async function test(name,fn,width=1440,timeZone='Asia/Kolkata'){if(process.env.ADMIN_WORKFLOW_FILTER&&!new RegExp(process.env.ADMIN_WORKFLOW_FILTER).test(name))return;state=initialState();state.templates[0].productCode='quant';state.templates[0].document.title='Synthetic Quant';state.drafts[0].productCode='quant';const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',timezoneId:timeZone});await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===origin)return route.continue();blocked.push(url.origin);return route.abort();});const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));try{await fn(page);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);results.push({name,status:'passed'});await page.screenshot({path:path.join(output,name.replace(/\W/g,'-')+'.png'),fullPage:true});console.info('PASS '+name);}catch(error){results.push({name,status:'failed',error:error.message});await writeFile(path.join(output,'failed-'+name.replace(/\W/g,'-')+'.json'),JSON.stringify({calls:state.calls,stack:error.stack,recovery:await page.evaluate(()=>Object.fromEntries(Object.entries(sessionStorage)))},null,2));console.error('FAIL '+name+': '+error.message);await page.screenshot({path:path.join(output,'failed-'+name.replace(/\W/g,'-')+'.png'),fullPage:true});}finally{await context.close();}}
function seedCurriculum() {
 const empty={recordings:[],materials:[],preSessionReads:[],postSessionReads:[]};
 const base=structuredClone(state.drafts[0]);
 const libraries=['quant','verbal','di'].map((subject,index)=>({...base,id:id(800+index),productCode:subject,title:subject+' library',events:[],sessions:[
 {key:'ace00001'+id(800+index).slice(8),title:'Read before the course',section:subject,content:structuredClone(empty)},
 {key:id(900+index),title:subject+' foundations',section:subject,content:structuredClone(empty)},
 {key:'ace00002'+id(800+index).slice(8),title:'Read after the course',section:subject,content:structuredClone(empty)}]}));
 state.drafts.push(...libraries);return libraries;
}
const button=(page,name)=>page.getByRole('button',{name:name==='Open batch'?/^Open batch:/:name,exact:true});
try{
 const build=spawn(process.execPath,[next,'build','--webpack'],{cwd:root,env,stdio:['ignore','pipe','pipe']});build.stdout.pipe(log,{end:false});build.stderr.pipe(log,{end:false});assert.equal(await new Promise(resolve=>build.on('exit',resolve)),0,'Fixture build failed');
 server=spawn(process.execPath,[next,'start','--hostname','127.0.0.1','--port',String(port)],{cwd:root,env,stdio:['ignore','pipe','pipe']});server.stdout.pipe(log,{end:false});server.stderr.pipe(log,{end:false});await until(async()=>assert.equal((await fetch(origin+'/admin')).status,200));browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium'});
 await test('Batch archive cancellation and restoration preserve the active list',async page=>{
  await page.goto(origin+'/admin/v2/batches');
  page.once('dialog',dialog=>dialog.dismiss());
  await page.getByRole('button',{name:'Archive batch: Synthetic batch',exact:true}).click();
  assert.equal((state.archives??[]).length,0);
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Archive batch: Synthetic batch',exact:true}).click();
  await until(async()=>assert.equal(await page.getByRole('button',{name:'Open batch: Synthetic batch',exact:true}).count(),0));
  await button(page,'Archived').click();
  await page.getByRole('button',{name:'Restore batch: Synthetic batch',exact:true}).waitFor();
  await page.screenshot({path:path.join(output,'batch-archived.png'),fullPage:true});
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Restore batch: Synthetic batch',exact:true}).click();
  await page.getByRole('button',{name:'Archive batch: Synthetic batch',exact:true}).waitFor();
  assert.equal(state.archives[0].archived,false);
 });
 await test('Student directory searches, clears and paginates without claiming course access',async page=>{
  await page.goto(origin+'/admin/v2/students');
  assert.equal(await page.getByRole('link',{name:/^View access:/}).count(),25);
  await page.getByRole('heading',{name:'Students',exact:true}).waitFor();
  await page.addScriptTag({path:path.join(repo,'node_modules/axe-core/axe.min.js')});
  assert.deepEqual(await page.evaluate(async()=>{const r=await window.axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>v.id);}),[]);
  await page.screenshot({path:path.join(output,'students-directory-desktop.png'),fullPage:true});
  await page.getByRole('link',{name:'Next page',exact:true}).click();await until(async()=>assert.equal(await page.getByRole('link',{name:/^View access:/}).count(),1));
  await page.getByLabel('Search student name',{exact:true}).fill('Student 02');await button(page,'Search').click();
  assert.equal(new URL(page.url()).searchParams.has('page'),false);assert.equal(await page.getByRole('link',{name:/^View access:/}).count(),1);
  await page.getByText('Inactive account',{exact:true}).waitFor();assert.equal(await page.getByText('Active access',{exact:true}).count(),0);
  await page.getByRole('link',{name:'Clear search',exact:true}).click();await until(async()=>assert.equal(await page.getByRole('link',{name:/^View access:/}).count(),25));assert.equal(await page.getByLabel('Search student name',{exact:true}).inputValue(),'');
  await page.getByRole('link',{name:'View access: Synthetic Student 01',exact:true}).click();await page.getByRole('heading',{name:'Synthetic Student',exact:true}).waitFor();
 });
 await test('Student directory empty and failure states offer distinct recovery',async page=>{
  await page.goto(origin+'/admin/v2/students?q=nobody');await page.getByRole('heading',{name:'No students found',exact:true}).waitFor();
  await page.getByRole('link',{name:'Clear search',exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:/^View access:/}).count(),0);
  await page.goto(origin+'/admin/v2/students?q=unavailable');await page.getByRole('alert').filter({hasText:'Students could not be loaded'}).waitFor();
  await page.getByRole('link',{name:'Try again',exact:true}).waitFor();assert.equal(await page.getByText(/students shown/).count(),0);
  await page.goto(origin+'/admin/v2/students?page=99');await page.getByRole('link',{name:'Go to the first page',exact:true}).click();await until(async()=>assert.equal(await page.getByRole('link',{name:/^View access:/}).count(),25));
 });
 await test('Student directory stays readable at narrow browser widths',async page=>{
  await page.goto(origin+'/admin/v2/students');await page.getByRole('link',{name:/^View access:/}).first().waitFor();
  for(const width of [750,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}
 });
 await test('Batch search clears with keyboard focus and preserves the status filter',async page=>{
  await page.goto(origin+'/admin/v2/batches');await button(page,'Not published').click();
  const search=page.getByRole('searchbox',{name:'Find a batch'});await search.fill('No matching course');
  await page.getByRole('heading',{name:'No matching batches',exact:true}).waitFor();
  await button(page,'Clear batch search').click();assert.equal(await search.inputValue(),'');
  assert.equal(await search.evaluate(el=>el===document.activeElement),true);
  assert.equal(await button(page,'Not published').getAttribute('aria-pressed'),'true');
  await button(page,'Open batch').waitFor();
  await page.addScriptTag({path:path.join(repo,'node_modules/axe-core/axe.min.js')});
  const violations=await page.evaluate(async()=>{const r=await window.axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>v.id);});assert.deepEqual(violations,[]);
  await page.screenshot({path:path.join(output,'batch-list-desktop.png'),fullPage:true});
 });
 await test('Batch form keeps seven long curriculum titles and scheduling controls readable',async page=>{
  const [library]=seedCurriculum();const lesson=structuredClone(library.sessions[1]);
  library.sessions.splice(1,1,...Array.from({length:7},(_,index)=>({...structuredClone(lesson),key:id(910+index),title:`QA ${index+1}: Fractions + Percentages + Ratios & Mixtures + Simple and Compound Interest`})));
  await page.goto(origin+'/admin/v2/batches');await button(page,'Create batch').click();
  assert.equal(await page.getByLabel('Date',{exact:true}).count(),7);
  assert.equal(await page.getByRole('button',{name:/^Remove class [1-7]$/}).count(),7);
  await page.getByLabel('Date',{exact:true}).first().fill('2026-12-10');
  await page.addScriptTag({path:path.join(repo,'node_modules/axe-core/axe.min.js')});
  const violations=await page.evaluate(async()=>{const r=await window.axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>v.id);});assert.deepEqual(violations,[]);
  await page.screenshot({path:path.join(output,'batch-seven-classes.png'),fullPage:true});
 });
 await test('Schedule dates can be cleared and undone and recovery can be kept or discarded',async page=>{
  seedCurriculum();await page.goto(origin+'/admin/v2/batches');await button(page,'Create batch').click();
  await page.getByLabel('Batch name',{exact:true}).fill('Recovery walkthrough');
  await page.getByLabel('Date',{exact:true}).fill('2026-12-10');
  await button(page,'Clear date').click();assert.equal(await page.getByLabel('Date',{exact:true}).inputValue(),'');
  await button(page,'Undo last change').click();assert.equal(await page.getByLabel('Date',{exact:true}).inputValue(),'2026-12-10');
  await page.getByLabel('Start time (IST)',{exact:true}).fill('20:30');await button(page,'Undo last change').click();assert.equal(await page.getByLabel('Start time (IST)',{exact:true}).inputValue(),'19:00');
  page.on('dialog',dialog=>dialog.accept());await page.reload();await button(page,'Create batch').click();
  await page.getByRole('heading',{name:'Continue where you left off'}).waitFor();
  await page.screenshot({path:path.join(output,'recovery-panel.png'),fullPage:true});
  await button(page,'Restore edits').click();assert.equal(await page.getByLabel('Batch name',{exact:true}).inputValue(),'Recovery walkthrough');assert.equal(await page.getByLabel('Date',{exact:true}).inputValue(),'2026-12-10');
  await page.screenshot({path:path.join(output,'schedule-undo.png'),fullPage:true});
  await page.reload();await button(page,'Create batch').click();await button(page,'Start fresh').click();await button(page,'Keep edits').click();await button(page,'Restore edits').waitFor();
  await button(page,'Start fresh').click();await button(page,'Discard edits').click();assert.equal(await page.getByLabel('Batch name',{exact:true}).inputValue(),'');assert.equal(await page.getByLabel('Date',{exact:true}).inputValue(),'');
  await page.reload();await button(page,'Create batch').click();assert.equal(await button(page,'Restore edits').count(),0);assert.equal(state.calls.filter(call=>/saveV2/.test(call.method)).length,0);
 });
 await test('Adding a class focuses its name and Undo restores removed class details',async page=>{
  seedCurriculum();await page.goto(origin+'/admin/v2/batches');await button(page,'Create batch').click();
  await page.getByLabel('Date',{exact:true}).fill('2026-12-10');await page.getByLabel('Start time (IST)',{exact:true}).fill('20:30');await button(page,'+ Add extra class').click();
  assert.equal(await page.getByLabel('Class name',{exact:true}).evaluate(el=>el===document.activeElement),true);await page.getByLabel('Class name',{exact:true}).fill('Extra class');
  await button(page,'Remove class 1').click();await button(page,'Undo').click();
  await page.getByRole('heading',{name:'quant foundations',exact:true}).waitFor();assert.equal(await page.getByLabel('Class name',{exact:true}).inputValue(),'Extra class');
  assert.equal(await page.getByLabel('Date',{exact:true}).first().inputValue(),'2026-12-10');assert.equal(await page.getByLabel('Start time (IST)',{exact:true}).first().inputValue(),'20:30');
  assert.equal(await page.getByRole('heading',{name:'quant foundations',exact:true}).evaluate(el=>el===document.activeElement),true);assert.equal(state.calls.filter(call=>/saveV2/.test(call.method)).length,0);
 });
 await test('Three primary destinations open directly in course content',async page=>{await page.goto(origin+'/admin');await page.getByRole('heading',{name:'Course content'}).waitFor();assert.equal(new URL(page.url()).pathname,'/admin/v2/content');const nav=page.getByRole('navigation',{name:'Admin navigation',exact:true});assert.equal(await nav.getByRole('button').count(),3);for(const label of ['Course content','Batches','Students'])await nav.getByRole('button',{name:label,exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Account management',exact:true}).isVisible(),false);await page.getByText('More tools',{exact:true}).click();await button(page,'Account management').waitFor();assert.equal(await nav.getByRole('button',{name:'Students',exact:true}).evaluate(el=>{const box=el.getBoundingClientRect();return box.bottom<=el.parentElement.getBoundingClientRect().bottom;}),true);await page.getByText('More tools',{exact:true}).click();});
 await test('Live batches include combined subjects while content libraries stay separate',async page=>{
  const original=structuredClone(state.templates[0]);state.templates.push({...original,id:id(999),productCode:'full_course',document:{...original.document,title:'Retained combined template'}});state.drafts.push({...structuredClone(state.drafts[0]),id:id(998),productCode:'full_course',title:'Retained combined batch'});
  await page.goto(origin+'/admin/v2/templates');for(const subject of ['Quant','Verbal','DI'])await button(page,subject).waitFor();assert.equal(await button(page,'Full Course').count(),0);assert.equal(await page.getByText(/Retained combined template/).count(),0);
  state.drafts.push({...structuredClone(state.drafts[0]),id:id(997),title:'Recording library',events:[]});await page.goto(origin+'/admin/v2/batches');await page.getByRole('heading',{name:'Retained combined batch',exact:true}).waitFor();assert.equal(await page.getByText('Recording library',{exact:true}).count(),0);assert.equal(await page.getByText('Other batch tools',{exact:true}).count(),0);await page.getByRole('link',{name:'Open course content →',exact:true}).waitFor();assert.equal(state.templates.some(t=>t.id===id(999)),true);assert.equal(state.drafts.some(b=>b.id===id(998)),true);
 });
 await test('Batch overview keeps schedule readable and management actions discoverable',async page=>{
  await page.goto(origin+'/admin/v2/batches');await button(page,'Open batch').click();
  await page.getByRole('heading',{name:'Live classes',exact:true,level:2}).waitFor();await page.getByText('Synthetic live lesson',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('Date',{exact:true}).count(),0);
  const management=page.getByRole('navigation',{name:'Manage this batch',exact:true});
  for(const [name,suffix] of [['Students','students'],['Meeting links','meeting'],['Class completion','live']])assert.ok((await management.getByRole('link',{name,exact:true}).getAttribute('href')).endsWith('/'+suffix));
  await page.addScriptTag({path:path.join(repo,'node_modules/axe-core/axe.min.js')});
  const violations=await page.evaluate(async()=>{const r=await window.axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>v.id);});assert.deepEqual(violations,[]);
  await page.screenshot({path:path.join(output,'batch-overview-desktop.png'),fullPage:true});
  await button(page,'Edit schedule').click();await page.getByLabel('Batch name',{exact:true}).fill('Unsaved batch name');
  page.once('dialog',dialog=>dialog.dismiss());await button(page,'Live schedule').click();assert.equal(await page.getByLabel('Batch name',{exact:true}).inputValue(),'Unsaved batch name');
  page.once('dialog',dialog=>dialog.accept());await button(page,'Live schedule').click();await page.getByRole('heading',{name:'Live classes',exact:true,level:2}).waitFor();
  assert.equal(state.calls.filter(call=>/saveV2/.test(call.method)).length,0);
 });
 await test('Mobile navigation closes with Escape',async page=>{await page.goto(origin+'/admin');await button(page,'Open admin navigation').click();await button(page,'Batches').waitFor();await page.keyboard.press('Escape');assert.equal(await button(page,'Open admin navigation').getAttribute('aria-expanded'),'false');},390);
 await test('Tablet navigation remains hidden until opened',async page=>{await page.goto(origin+'/admin');assert.equal(await button(page,'Batches').isVisible(),false);await button(page,'Open admin navigation').click();await button(page,'Batches').waitFor();await page.keyboard.press('Escape');assert.equal(await button(page,'Batches').isVisible(),false);},820);
 await test('Batch calendar cancel preserves date and explicit save is required',async page=>{await page.goto(origin+'/admin/v2/batches');await button(page,'Open batch').click();await button(page,'Edit schedule').click();await page.getByRole('button',{name:'Open calendar for Date',exact:true}).click();let modal=page.getByRole('dialog');await modal.getByRole('button',{name:/Tuesday, 3 November 2026/}).click();await button(modal,'Cancel').click();assert.equal(await page.getByLabel('Date',{exact:true}).inputValue(),'2026-11-02');await page.getByRole('button',{name:'Open calendar for Date',exact:true}).click();modal=page.getByRole('dialog');await modal.getByRole('button',{name:/Tuesday, 3 November 2026/}).click();await modal.getByLabel('Start time (IST)',{exact:true}).fill('20:15');await button(modal,'Use date & time').click();assert.equal(state.drafts[0].events[0].localDate,'2026-11-02');await button(page,'Save changes').click();await page.getByRole('status').filter({hasText:'Draft saved.'}).waitFor();assert.equal(state.drafts[0].events[0].localDate,'2026-11-03');assert.equal(state.drafts[0].events[0].localStartTime,'20:15');assert.equal(state.publications.length,0);},390);
 await test('Calendar keyboard navigation and Escape preserve the draft and return focus',async page=>{
  await page.goto(origin+'/admin/v2/batches');await button(page,'Open batch').click();await button(page,'Edit schedule').click();const trigger=page.getByRole('button',{name:'Open calendar for Date',exact:true});await trigger.click();const modal=page.getByRole('dialog',{name:'Choose a class date',exact:true});await modal.waitFor();const selected=modal.getByRole('button',{name:/Monday, 2 November 2026/});await selected.focus();await page.keyboard.press('ArrowRight');assert.match(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),/Tuesday, 3 November 2026/);await page.keyboard.press('Enter');assert.equal(state.drafts[0].events[0].localDate,'2026-11-02');await page.keyboard.press('Escape');await until(async()=>assert.equal(await trigger.evaluate(el=>el===document.activeElement),true));assert.equal(await page.getByLabel('Date',{exact:true}).inputValue(),'2026-11-02');assert.equal(state.calls.filter(call=>/saveV2/.test(call.method)).length,0);await trigger.click();await modal.getByRole('button',{name:/Monday, 2 November 2026/}).waitFor();await button(modal,'Cancel').click();
 });
 await test('Calendar shows scheduled classes and selected times without background submission',async page=>{
  await page.goto(origin+'/admin/v2/batches');await button(page,'Open batch').click();await button(page,'Edit schedule').click();await page.getByRole('button',{name:'Open calendar for Date',exact:true}).click();const modal=page.getByRole('dialog',{name:'Choose a class date',exact:true});await modal.getByRole('region',{name:'Classes on selected date'}).getByText('Synthetic live lesson',{exact:true}).waitFor();await modal.getByRole('button',{name:'20:00',exact:true}).click();assert.equal(await modal.getByLabel('Start time (IST)',{exact:true}).inputValue(),'20:00');await modal.getByLabel('Start time (IST)',{exact:true}).press('Enter');assert.equal(state.calls.filter(call=>/saveV2/.test(call.method)).length,0);await modal.screenshot({path:path.join(output,'calendar-desktop.png')});await button(modal,'Cancel').click();assert.equal(await page.getByLabel('Start time (IST)',{exact:true}).inputValue(),'18:00');
 });
 await test('Mobile calendar is accessible and month year navigation preserves unconfirmed dates',async page=>{
  await page.goto(origin+'/admin/v2/batches');await button(page,'Open batch').click();await button(page,'Edit schedule').click();await page.getByRole('button',{name:'Open calendar for Date',exact:true}).click();const modal=page.getByRole('dialog',{name:'Choose a class date',exact:true});await modal.waitFor();await page.addScriptTag({path:path.join(repo,'node_modules/axe-core/axe.min.js')});const violations=await page.evaluate(async()=>{const r=await window.axe.run(document.querySelector('dialog[open]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>v.id);});assert.deepEqual(violations,[]);assert.equal(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);await modal.screenshot({path:path.join(output,'calendar-mobile.png')});await modal.getByRole('combobox',{name:/month/i}).selectOption('1');await modal.getByRole('combobox',{name:/year/i}).selectOption('2028');await modal.getByRole('button',{name:/Tuesday, 29 February 2028/}).click();await button(modal,'Use date & time').click();assert.equal(await page.getByLabel('Date',{exact:true}).inputValue(),'2028-02-29');assert.equal(state.drafts[0].events[0].localDate,'2026-11-02');
 },390);
 await test('Calendar today and tomorrow follow IST from another browser time zone',async page=>{
  await page.clock.setFixedTime(new Date('2026-11-11T20:00:00Z'));await page.goto(origin+'/admin/v2/batches');await button(page,'Open batch').click();await button(page,'Edit schedule').click();await page.getByRole('button',{name:'Open calendar for Date',exact:true}).click();let modal=page.getByRole('dialog',{name:'Choose a class date',exact:true});await button(modal,'Today').click();await button(modal,'Use date & time').click();assert.equal(await page.getByLabel('Date',{exact:true}).inputValue(),'2026-11-12');await page.getByRole('button',{name:'Open calendar for Date',exact:true}).click();modal=page.getByRole('dialog',{name:'Choose a class date',exact:true});await button(modal,'Tomorrow').click();await button(modal,'Use date & time').click();assert.equal(await page.getByLabel('Date',{exact:true}).inputValue(),'2026-11-13');assert.equal(state.drafts[0].events[0].localDate,'2026-11-02');
 },1440,'America/Los_Angeles');
 await test('Batch publication requires explicit review then confirmation',async page=>{await page.goto(origin+'/admin/v2/batches');await button(page,'Open batch').click();await button(page,'Edit schedule').click();await button(page,'Review & publish').click();assert.equal(state.publications.length,0);await button(page,'Publish batch').waitFor();await button(page,'Publish batch').waitFor();assert.equal(state.publications.length,0);await button(page,'Cancel review').click();assert.equal(state.publications.length,0);await button(page,'Review & publish').click();await button(page,'Publish batch').waitFor();await button(page,'Publish batch').click();await until(()=>assert.equal(state.publications.length,1));});
 await test('Simple publication review recovers interrupted saves and confirms hiding separately',async page=>{
  await page.goto(origin+'/admin/v2/batches');await button(page,'Open batch').click();await button(page,'Review & publish').click();await button(page,'Publish batch').waitFor();
  assert.equal(await button(page,'Review batch').count(),0);await page.getByRole('heading',{name:'Ready to publish?',exact:true}).waitFor();
  await page.addScriptTag({path:path.join(repo,'node_modules/axe-core/axe.min.js')});
  const violations=await page.evaluate(async()=>{const r=await window.axe.run(document.querySelector('[aria-labelledby="publication-heading"]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>v.id);});assert.deepEqual(violations,[]);
  await page.screenshot({path:path.join(output,'simple-publication-review.png'),fullPage:true});
  state.faults.saveV2BatchPublication={interruptAfterSave:true};await button(page,'Publish batch').click();await page.getByRole('alert').filter({hasText:'Confirmation was interrupted'}).waitFor();
  await button(page,'Publish batch').click();await button(page,'View schedule').waitFor();const saves=state.calls.filter(call=>call.method==='saveV2BatchPublication');assert.deepEqual(saves[0].args,saves[1].args);assert.equal(state.publications[0].revision,1);
  await button(page,'View schedule').click();await button(page,'Review & publish').click();await page.getByRole('heading',{name:'This batch is published',exact:true}).waitFor();assert.equal(await button(page,'Review batch').count(),0);
  await page.getByText('Unpublish batch',{exact:true}).click();await button(page,'Review unpublish').click();await button(page,'Unpublish batch').waitFor();assert.equal(state.publications[0].state,'published');
  await button(page,'Cancel review').click();assert.equal(state.publications[0].state,'published');await button(page,'Review & publish').click();await page.getByText('Unpublish batch',{exact:true}).click();await button(page,'Review unpublish').click();await button(page,'Unpublish batch').click();await button(page,'View schedule').waitFor();assert.equal(state.publications[0].state,'unpublished');
 });
 await test('Curriculum prefills classes and preserves originals through batch publication',async page=>{
  const libraries=seedCurriculum(),originals=structuredClone(libraries);
  await page.goto(origin+'/admin/v2/batches');await button(page,'Create batch').click();
  await page.getByRole('heading',{name:'quant foundations',exact:true}).waitFor();
  assert.equal(await page.getByLabel('Class name',{exact:true}).count(),0);
  assert.equal(await page.getByLabel('Date',{exact:true}).count(),1);
  await page.getByLabel('Batch name',{exact:true}).fill('Weekend Quant');await page.getByLabel('Date',{exact:true}).fill('2026-12-10');
  await page.getByRole('button',{name:'Remove class 1',exact:true}).click();await button(page,'Undo').click();
  assert.equal(await page.getByLabel('Date',{exact:true}).inputValue(),'2026-12-10');
  await page.screenshot({path:path.join(output,'curriculum-create.png'),fullPage:true});
  await button(page,'Save batch draft').click();await page.getByRole('heading',{name:'Live classes',exact:true,level:2}).waitFor();
  const linkedCall=state.calls.find(call=>call.method==='saveV2BatchDraft');assert(linkedCall);assert.equal(linkedCall.args[2][0].batchId,libraries[0].id);
  const created=state.drafts.find(item=>item.title==='Weekend Quant');assert.equal(created.events.length,1);assert.equal(created.events[0].title,'quant foundations');assert.equal(created.events[0].durationMinutes,120);assert.equal(created.sessions.length,1);assert.equal(created.sessions[0].key,id(900));assert.equal(state.publications.length,0);
  for(const original of originals)assert.deepEqual(state.drafts.find(item=>item.id===original.id),original);
  await button(page,'Review & publish').click();await button(page,'Publish batch').click();await button(page,'View schedule').waitFor();assert.equal(state.publications[0].state,'published');
 });
 await test('Curriculum supports all subjects without scheduling fixed reading pages',async page=>{
  seedCurriculum();await page.goto(origin+'/admin/v2/batches');await button(page,'Create batch').click();await page.getByLabel('Subject',{exact:true}).selectOption('full_course');
  assert.equal(await page.getByLabel('Class name',{exact:true}).count(),0);assert.equal(await page.getByLabel('Date',{exact:true}).count(),3);
  await page.getByLabel('Batch name',{exact:true}).fill('Mixed batch');for(let i=0;i<3;i++)await page.getByLabel('Date',{exact:true}).nth(i).fill('2026-12-'+(10+i));
  await page.addScriptTag({path:path.join(repo,'node_modules/axe-core/axe.min.js')});assert.deepEqual(await page.evaluate(async()=>{const r=await window.axe.run(document.querySelector('[aria-label="New live batch setup"]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>v.id);}),[]);
  await button(page,'Save batch draft').click();await page.getByRole('heading',{name:'Live classes',exact:true,level:2}).waitFor();const created=state.drafts.find(item=>item.title==='Mixed batch');assert.deepEqual(created.events.map(e=>e.section),['quant','verbal','di']);assert.equal(created.sessions.length,3);
 });
 await test('Curriculum missing state directs administrators to course content',async page=>{
  state.drafts=[];state.templates=[];await page.goto(origin+'/admin/v2/batches');await button(page,'Create batch').click();await page.getByText('No course sessions are available for this subject.',{exact:false}).waitFor();assert.equal(await button(page,'Save batch draft').isDisabled(),true);assert.equal(await page.getByLabel('Class name',{exact:true}).count(),0);
 });
 for(const method of ['saveV2TemplateDraft','saveV2BatchDraft'])await test('Curriculum retry preserves the same '+method,async page=>{
  seedCurriculum();const before=state.drafts.length,templatesBefore=state.templates.length;await page.goto(origin+'/admin/v2/batches');await button(page,'Create batch').click();await page.getByLabel('Batch name',{exact:true}).fill('Retry batch');await page.getByLabel('Date',{exact:true}).fill('2026-12-10');state.faults[method]={interruptAfterSave:true};await button(page,'Save batch draft').click();await page.getByRole('alert').filter({hasText:'The save was interrupted'}).waitFor();
  page.on('dialog',d=>d.accept());await page.reload();await button(page,'Create batch').click();await button(page,'Restore edits').click();await button(page,'Retry saving batch').click();await page.getByRole('heading',{name:'Live classes',exact:true,level:2}).waitFor();assert.equal(state.templates.length,templatesBefore+1);assert.equal(state.drafts.length,before+1);const calls=state.calls.filter(item=>item.method===method);assert.deepEqual(calls[0].args,calls[1].args);
 });
 await test('Course review stays in content and publishes without schedule controls',async page=>{
  const [library]=seedCurriculum();await page.goto(origin+'/admin/v2/batches?batch='+library.id+'&review=1');
  await page.waitForURL('**/admin/v2/content/course/'+library.id);
  await button(page,'Publish course changes').waitFor();assert.equal(await button(page,'Publish batch').count(),0);assert.equal(await page.getByRole('button',{name:'Live schedule',exact:true}).count(),0);
  await page.screenshot({path:path.join(output,'course-review.png'),fullPage:true});
  await button(page,'Publish course changes').click();await button(page,'Back to course content').waitFor();assert.equal(state.publications[0].batchId,library.id);
  await page.goto(origin+'/admin/v2/content/course/'+library.id+'?edit=1&session='+library.sessions[0].key);
  assert.equal(await page.getByLabel('Date',{exact:true}).count(),0);await page.getByRole('heading',{name:'Edit course draft',exact:true}).waitFor();
  assert.equal(await page.getByLabel('Session title',{exact:true}).inputValue(),'Read before the course');assert.equal(await page.getByLabel('Session title',{exact:true}).getAttribute('readonly'),'');
  await page.screenshot({path:path.join(output,'course-readme-edit.png'),fullPage:true});
 });
 await test('Saved classes support rename add remove and undo before a private save',async page=>{
  const original=structuredClone(state.drafts[0]);await page.goto(origin+'/admin/v2/batches');await button(page,'Open batch').click();await button(page,'Edit schedule').click();await page.getByLabel('Class name',{exact:true}).fill('Renamed lesson');await button(page,'+ Add class').click();await page.getByLabel('Class name',{exact:true}).nth(1).fill('Second lesson');await page.getByLabel('Date',{exact:true}).nth(1).fill('2026-12-10');
  await page.getByRole('button',{name:'Remove class 1',exact:true}).click();await button(page,'Keep class').click();assert.equal(await page.getByLabel('Class name',{exact:true}).count(),2);
  await page.getByRole('button',{name:'Remove class 1',exact:true}).click();await button(page,'Remove from draft').click();await button(page,'Undo').click();assert.equal(await page.getByLabel('Class name',{exact:true}).count(),2);assert.deepEqual(state.drafts[0],original);
  assert.equal(await page.getByLabel('Class name',{exact:true}).nth(0).inputValue(),'Renamed lesson');await button(page,'Save changes').click();await page.getByRole('heading',{name:'Live classes',exact:true,level:2}).waitFor();assert.equal(state.drafts[0].events.filter(e=>e.kind==='live').length,2);assert.ok(state.drafts[0].events.some(e=>e.title==='Renamed lesson'));assert.deepEqual(state.drafts[0].events.find(e=>e.kind==='outline'),original.events.find(e=>e.kind==='outline'));assert.equal(state.publications.length,0);
  await button(page,'Edit schedule').click();await page.getByRole('button',{name:'Remove class 1',exact:true}).click();await button(page,'Remove from draft').click();await button(page,'Save changes').click();await page.getByRole('heading',{name:'Live classes',exact:true,level:2}).waitFor();assert.equal(state.drafts[0].events.filter(e=>e.kind==='live').length,1);
 });
 await test('New session deep link opens the saved draft and keeps four resources editable',async page=>{
  const key=id(970);state.drafts[0].sessions=[{key:id(969),title:'Earlier session',section:'quant',content:{preSessionReads:[],recordings:[],postSessionReads:[],materials:[]}},{key,title:'Ratios workshop',section:'quant',content:Object.fromEntries(['preSessionReads','recordings','postSessionReads','materials'].map((kind,index)=>[kind,[{key:id(980+index),title:'Workshop '+kind,url:'https://example.test/'+kind}]]))}];
  await page.goto(origin+'/admin/v2/batches?batch='+state.drafts[0].id+'&outline=1&session='+key);await page.getByLabel('Session title',{exact:true}).waitFor();assert.equal(await page.getByLabel('Session title',{exact:true}).inputValue(),'Ratios workshop');assert.equal(await page.getByLabel('Choose a session',{exact:false}).inputValue(),key);
  const editor=page.getByRole('region',{name:'Course sessions and content',exact:true});for(const group of await editor.locator('details[role=group]').all()){await group.locator('summary').click();assert.equal(await group.getByLabel('HTTPS link or stored PDF',{exact:true}).isEditable(),true);}assert.equal(await editor.getByLabel('Title',{exact:true}).count(),4);await editor.getByLabel('Title',{exact:true}).first().fill('Updated workshop reading');assert.equal(state.drafts[0].sessions[1].content.preSessionReads[0].title,'Workshop preSessionReads');await button(page,'Save changes').click();await page.getByText('Batch draft saved.',{exact:true}).waitFor();assert.equal(state.drafts[0].sessions[1].content.preSessionReads[0].title,'Updated workshop reading');assert.equal(state.publications.length,0);
 });
 for(const sameHref of [false,true]) await test(`Publication recovery link ${sameHref?'same URL':'changed query'} supports cancel and opens course editing`,async page=>{
  state.drafts[0].sessions=[];await page.goto(origin+'/admin/v2/batches?batch='+state.drafts[0].id+(sameHref?'&outline=1':'&review=1'));if(sameHref)await button(page,'Review & publish').click();await button(page,'Publish batch').waitFor();const link=page.getByRole('link',{name:'Add a course session',exact:true});let confirmations=0;page.once('dialog',async dialog=>{assert.equal(dialog.type(),'beforeunload');confirmations++;await dialog.dismiss()});await link.click();assert.equal(await page.getByRole('heading',{name:'Ready to publish?',exact:true}).isVisible(),true);assert.equal(state.publications.length,0);
  page.once('dialog',async dialog=>{assert.equal(dialog.type(),'beforeunload');confirmations++;await dialog.accept()});await link.click();await page.getByRole('heading',{name:'Edit schedule',exact:true}).waitFor();assert.equal(confirmations,2);await button(page,'Add course session').click();await page.getByLabel('Session title',{exact:true}).fill('Feedback preparation');await button(page,'Save changes').click();await page.getByText('Batch draft saved.',{exact:true}).waitFor();assert.equal(await button(page,'Live schedule').getAttribute('aria-pressed'),'true');assert.equal(await page.getByLabel('Session title',{exact:true}).inputValue(),'Feedback preparation');assert.equal(state.publications.length,0);
 });
 await test('Batch filters clear cleanly and creation remains available',async page=>{await page.goto(origin+'/admin/v2/batches');await page.getByLabel('Find a batch',{exact:true}).fill('missing-batch');await page.getByRole('heading',{name:'No matching batches',exact:true}).waitFor();await button(page,'Clear filters').click();await button(page,'Open batch').waitFor();await button(page,'Create batch').waitFor();});
 await test('Every saved live class has independent date and time controls',async page=>{const extra=structuredClone(state.drafts[0].events[0]);extra.key=id(998);extra.title='Second synthetic class';extra.localDate='2026-11-04';state.drafts[0].events.push(extra);await page.goto(origin+'/admin/v2/batches');await button(page,'Open batch').click();await button(page,'Edit schedule').click();assert.equal(await page.getByLabel('Date',{exact:true}).count(),2);assert.equal(await page.locator('input[type=time]:visible').count(),2);});
 await test('Subject libraries replace the combined library while live batches retain separate controls',async page=>{
  await page.goto(origin+'/admin/v2/students/'+id(601));await page.getByText('Active access',{exact:true}).waitFor();
  const panel=page.getByRole('region',{name:'Libraries & live batches',exact:true});
  const libraries=panel.getByRole('region',{name:'Subject libraries',exact:true}), live=panel.getByRole('region',{name:'Live batches',exact:true});
  assert.deepEqual(await libraries.getByRole('heading',{level:4}).allTextContents(),['Quant · Learning library','Verbal · Learning library','DI · Learning library']);
  assert.equal(await panel.getByText('Full Course · Learning library',{exact:true}).count(),0);
  await page.getByText('Full Course',{exact:true}).waitFor();
  assert.equal(await libraries.getByRole('link',{name:/live registration/i}).count(),0);
  assert.equal(await live.isVisible(),false);
  await page.screenshot({path:path.join(output,'student-libraries-desktop.png'),fullPage:true});
  await page.getByRole('tab',{name:'Live batches',exact:true}).click();
  assert.equal(await libraries.isVisible(),false);
  await live.getByText('Enrolled',{exact:true}).waitFor();assert.equal(await live.getByText('Not registered for live classes',{exact:true}).count(),2);
  assert.equal(await live.getByRole('link',{name:'Manage enrollment: Synthetic live batch',exact:true}).getAttribute('href'),'/admin/v2/batches/'+id(10)+'/students');
  assert.equal(await live.getByRole('link',{name:'Manage live registration: Synthetic live batch',exact:true}).getAttribute('href'),'/admin/v2/batches/'+id(10)+'/live');
 });
 await test('Student access tabs work by keyboard and purchase details stay secondary',async page=>{
  await page.goto(origin+'/admin/v2/students/'+id(601));
  const libraries=page.getByRole('tab',{name:'Subject libraries',exact:true}),live=page.getByRole('tab',{name:'Live batches',exact:true});
  assert.equal(await libraries.getAttribute('aria-selected'),'true');
  assert.equal(await page.getByText('Confirmed 1 Jan 2026',{exact:true}).isVisible(),false);
  await page.getByText('Expires 1 Jan 2027',{exact:true}).waitFor();
  await libraries.focus();await page.keyboard.press('ArrowRight');
  await until(async()=>assert.equal(await live.getAttribute('aria-selected'),'true'));
  assert.equal(await live.evaluate(el=>el===document.activeElement),true);
  await page.addScriptTag({path:path.join(repo,'node_modules/axe-core/axe.min.js')});
  assert.deepEqual(await page.evaluate(async()=>{const r=await window.axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>v.id);}),[]);
  await page.keyboard.press('ArrowLeft');await until(async()=>assert.equal(await libraries.getAttribute('aria-selected'),'true'));
  const details=page.locator('details').filter({hasText:'Confirmed 1 Jan 2026'});
  await details.locator('summary').focus();await page.keyboard.press('Enter');
  await page.getByText('Confirmed 1 Jan 2026',{exact:true}).waitFor();
  await page.keyboard.press('Enter');assert.equal(await page.getByText('Confirmed 1 Jan 2026',{exact:true}).isVisible(),false);
 });
 await test('Mobile batch access has accessible actions and no horizontal overflow',async page=>{
  await page.goto(origin+'/admin/v2/students/'+id(601));const panel=page.getByRole('region',{name:'Libraries & live batches',exact:true});
  await panel.waitFor();await page.addScriptTag({path:path.join(repo,'node_modules/axe-core/axe.min.js')});
  const violations=await page.evaluate(async()=>{const result=await window.axe.run(document.querySelector('[aria-labelledby="batch-access-heading"]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return result.violations.map(v=>v.id);});assert.deepEqual(violations,[]);
  for(const link of await panel.getByRole('link').all()){const size=await link.boundingBox();assert.ok(size.height>=44);}
  const first=panel.getByRole('link').first();await first.focus();await page.keyboard.press('Tab');assert.equal(await panel.getByRole('link').nth(1).evaluate(el=>el===document.activeElement),true);
 },390);
 await test('Empty batches show honest group empty states',async page=>{await page.goto(origin+'/admin/v2/students/'+id(604));await page.getByText('No subject libraries are available yet.',{exact:true}).waitFor();await page.getByRole('tab',{name:'Live batches',exact:true}).click();await page.getByText('No live batches are available yet.',{exact:true}).waitFor();assert.equal(await page.getByRole('region',{name:'Libraries & live batches',exact:true}).getByRole('link').count(),0);});
 await test('Unavailable enrollment records never display missing-access statuses',async page=>{await page.goto(origin+'/admin/v2/students/'+id(605));await page.getByText('Batch access could not be loaded. Reload before making changes.',{exact:true}).waitFor();const panel=page.getByRole('region',{name:'Libraries & live batches',exact:true});assert.equal(await panel.getByText('Not enrolled',{exact:true}).count(),0);assert.equal(await panel.getByRole('link').count(),0);});
 await test('Expired purchases do not imply renewed course access',async page=>{await page.goto(origin+'/admin/v2/students/'+id(602));await page.getByText('Expired',{exact:true}).waitFor();assert.equal(await page.getByText('Active access',{exact:true}).count(),0);await page.locator('details').filter({hasText:'Expired'}).locator('summary').click();await page.getByText('Enrollment does not renew an expired or revoked purchase.',{exact:false}).waitFor();},390);
 await test('Access load failure is shown instead of an empty entitlement state',async page=>{await page.goto(origin+'/admin/v2/students/'+id(603));await page.getByRole('alert').filter({hasText:'Some access records'}).waitFor();assert.equal(await page.getByText('No V2 purchase is recorded.',{exact:false}).count(),0);});
 assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
}catch(error){results.push({name:'Harness',status:'failed',error:error.message});console.error(error.message);}finally{await writeFile(path.join(output,'results.json'),JSON.stringify({baseCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),scope:'Actual UI components with synthetic server adapters; not hosted authorization acceptance.',sourceHashes:testedSourceHashes,results,browserErrors:errors,blockedOrigins:blocked},null,2)+'\n');await browser?.close();if(server){const closed=new Promise(r=>server.once('exit',r));server.kill('SIGTERM');await closed;}backend.closeAllConnections();await new Promise(r=>backend.close(r));log.end();await rm(root,{recursive:true,force:true});}
console.info(`${results.filter(item=>item.status==='passed').length} passed; ${results.filter(item=>item.status==='failed').length} failed.`);process.exitCode=results.some(item=>item.status==='failed')?1:0;
