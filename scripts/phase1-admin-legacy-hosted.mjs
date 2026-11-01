import {resolve} from 'node:path';
// Runs only after the named Phase 1 SQL fixtures exist. Owns every created row.
import {readFileSync,writeFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {chromium} from 'playwright-core';
import {ORIGIN,PROJECT,PREVIEW,COMMIT,check,readConfig} from './phase1-hosted-closeout-config.mjs';

if(!process.argv.includes('--execute')){console.log('Prepared legacy QA runner. --execute requires the named staging fixture run and protected Preview access.');process.exit(0);}
const state=JSON.parse(readFileSync('/tmp/ace-phase1-passwordless-qa-state.json','utf8'));
check(state.project===PROJECT&&state.commit===COMMIT,'Wrong QA candidate');
const config=readConfig('/tmp/ace-phase1-staging.env',{database:false});
const output=resolve('deliverables/phase1-closeout-2026-11-01/passwordless-qa');
const report={runId:state.runId,commit:COMMIT,project:PROJECT,startedAt:new Date().toISOString(),checks:[],status:'running',cleanup:'pending'};
const manifest={runId:state.runId,course:null,masterSession:null,files:[],student:state.users.find(u=>u.label==='q').id,cleanup:'pending'};
const save=()=>{writeFileSync(`${output}/admin-legacy-results.json`,JSON.stringify(report,null,2));writeFileSync(`${output}/admin-legacy-fixture-manifest.json`,JSON.stringify(manifest,null,2));};
const ok=(id,passed)=>{report.checks.push({id,status:passed?'pass':'fail'});save();check(passed,`Check failed: ${id}`);};
const safe=(r,stage)=>{check(!r.error,`${stage} failed (provider details withheld).`);return r.data;};
const service=createClient(ORIGIN,config.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const insert=async(table,row)=>safe(await service.from(table).insert(row).select('id').single(),`Create QA ${table}`).id;
const title=`Phase 1 closeout QA ${state.runId}`;
const accessUrl=readFileSync('/tmp/ace-phase1-preview-access','utf8').trim();check(new URL(accessUrl).origin===PREVIEW,'Wrong Preview access');
let browser,profileBefore;
const sessions={};

try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  for(const label of ['admin']){
    const user=state.users.find(u=>u.label===label);const identity=safe(await service.auth.admin.getUserById(user.id),'Confirm QA ownership');
    check(identity.user.user_metadata.phase1_qa_run===state.runId&&identity.user.email===user.email,'QA ownership mismatch');
    let cookies=[];const client=createServerClient(ORIGIN,config.SUPABASE_ANON_KEY,{auth:{autoRefreshToken:false},cookies:{getAll:()=>cookies,setAll:items=>{for(const c of items){cookies=cookies.filter(x=>x.name!==c.name);cookies.push(c);}}}});
    safe(await client.auth.signInWithPassword({email:user.email,password:state.password}),'QA sign-in');
    const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);await page.goto(accessUrl,{waitUntil:'domcontentloaded'});
    await context.addCookies(cookies.map(({name,value})=>({name,value,url:PREVIEW,secure:true,sameSite:'Lax'})));
    sessions[label]={...user,client,context,page};
  }
  const admin=sessions.admin;
  report.responses=[];admin.page.on('response',async r=>{if(r.url().includes('/rest/v1/')&&['POST','PATCH','DELETE'].includes(r.request().method())){let code=null;try{if(!r.ok())code=(await r.json()).code;}catch{}report.responses.push({table:new URL(r.url()).pathname.split('/').pop(),method:r.request().method(),status:r.status(),code});save();}});
  await admin.page.goto(`${PREVIEW}/qa/phase1`,{waitUntil:'domcontentloaded'});
  const diagnostic=await admin.page.evaluate(async()=>{const r=await fetch('/api/v2/phase1-verification',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});return r.json();});
  ok('candidate-and-admin-session',diagnostic.commit===COMMIT&&diagnostic.role==='admin'&&diagnostic.stagingProject===PROJECT);
  manifest.masterSession=await insert('master_sessions',{title,session_number:1,class_type:'QA',week_number:0});save();
  report.stage='admin-editor';save();
  await admin.page.goto(`${PREVIEW}/admin/curriculum/worksheets/${manifest.masterSession}`,{waitUntil:'domcontentloaded'});
  await admin.page.getByRole('button',{name:'+ Add Question',exact:true}).click();
  await admin.page.getByLabel('Question Prompt',{exact:true}).fill('Synthetic QA: 1 + 1 = ?');
  await admin.page.getByLabel('Options',{exact:true}).fill('1\n2\n3');await admin.page.getByLabel('Correct Answer',{exact:true}).fill('2');
  await admin.page.getByRole('button',{name:'Add Question',exact:true}).click();await admin.page.getByRole('heading',{name:'Questions (1)',exact:true}).waitFor();
  ok('admin-editor-add-refresh',true);
  await admin.page.getByRole('button',{name:'Edit',exact:true}).click();await admin.page.getByLabel('Question Prompt',{exact:true}).fill('Synthetic QA: 2 + 2 = ?');
  await admin.page.getByRole('button',{name:'Save',exact:true}).click();await admin.page.getByRole('button',{name:'Edit',exact:true}).waitFor();await admin.page.getByText('Synthetic QA: 2 + 2 = ?',{exact:true}).waitFor();
  await admin.page.reload({waitUntil:'domcontentloaded'});await admin.page.getByRole('button',{name:'Edit',exact:true}).waitFor();await admin.page.getByText('Synthetic QA: 2 + 2 = ?',{exact:true}).waitFor();ok('admin-editor-edit-persists',true);
  await admin.page.getByRole('button',{name:'Remove',exact:true}).click();await admin.page.getByRole('heading',{name:'Questions (0)',exact:true}).waitFor();ok('admin-editor-delete-refresh',true);
  await admin.page.getByRole('button',{name:'Upload questions',exact:true}).click();
  await admin.page.getByLabel('CSV file',{exact:true}).setInputFiles({name:'phase1-qa.csv',mimeType:'text/csv',buffer:Buffer.from('question_text,correct_answer,option_a,option_b\nSynthetic CSV 3 + 3 = ?,6,5,6\n')});
  await admin.page.getByRole('button',{name:'Import 1 questions',exact:true}).click();
  await admin.page.getByText('Synthetic CSV 3 + 3 = ?',{exact:true}).waitFor();
  await admin.page.reload({waitUntil:'domcontentloaded'});await admin.page.getByText('Synthetic CSV 3 + 3 = ?',{exact:true}).waitFor();ok('admin-editor-csv-import-persists',true);
  await admin.page.route('**/rest/v1/master_practice_questions*',route=>route.request().method()==='DELETE'?route.abort('failed'):route.continue());
  await admin.page.getByRole('button',{name:'Remove',exact:true}).click();await admin.page.getByText('Failed to delete question.',{exact:true}).waitFor();
  ok('admin-editor-failed-delete-retains-question',await admin.page.getByText('Synthetic CSV 3 + 3 = ?',{exact:true}).isVisible());
  await admin.page.unroute('**/rest/v1/master_practice_questions*');
  await admin.page.getByRole('button',{name:'Remove',exact:true}).click();await admin.page.getByRole('heading',{name:'Questions (0)',exact:true}).waitFor();ok('admin-editor-retry-after-network-failure',true);
  const batches=await admin.page.evaluate(async()=>{const r=await fetch('/api/register/batches');return {status:r.status,body:await r.json()};});ok('legacy-public-batch-list-responds',batches.status===200&&Array.isArray(batches.body.batches));
  report.status='passed-scoped-legacy-checks';report.stage='complete';
}catch(error){
  report.status='failed';report.errorType=error?.name;report.failureHint=String(error?.message??'').split('\n')[0].replace(/https?:\/\/\S+/g,'[URL withheld]').slice(0,200);save();
  try{for(const [label,s] of Object.entries(sessions)){await s.page.screenshot({path:`${output}/legacy-failure-${label}.png`,fullPage:true,timeout:10000});if(label==='admin')report.adminPageText=(await s.page.locator('main:visible').last().innerText()).slice(0,4000);}}catch{}
  report.status='failed';report.failure=error?.message?.startsWith('Check failed:')?error.message:'Legacy execution failed; inspect completed check IDs and fixture manifest. Provider/browser details withheld.';process.exitCode=1;}
finally{
  if(browser)await browser.close();
  try{
    if(manifest.course){const row=safe(await service.from('courses').select('name').eq('id',manifest.course).single(),'Verify QA course ownership');check(row.name===title,'QA course ownership mismatch');safe(await service.from('courses').delete().eq('id',manifest.course),'Remove QA course');}
    if(manifest.masterSession){const row=safe(await service.from('master_sessions').select('title').eq('id',manifest.masterSession).single(),'Verify QA master ownership');check(row.title===title,'QA master ownership mismatch');safe(await service.from('master_sessions').delete().eq('id',manifest.masterSession),'Remove QA master session');}
    if(manifest.files.length)safe(await service.storage.from('course-materials').remove(manifest.files),'Remove synthetic PDFs');
    if(profileBefore)safe(await service.from('profiles').update(profileBefore).eq('id',manifest.student),'Restore only generated QA profile baseline');
    report.cleanup=manifest.cleanup='complete';
  }catch{report.cleanup=manifest.cleanup='incomplete; exact fixture manifest retained';report.status='failed';process.exitCode=1;}
  report.finishedAt=new Date().toISOString();save();console.log(JSON.stringify({status:report.status,checks:report.checks.length,failure:report.failure,enrollment:report.enrollment,cleanup:report.cleanup}));
}
