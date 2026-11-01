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
const save=()=>{writeFileSync(`${output}/legacy-hosted-results.json`,JSON.stringify(report,null,2));writeFileSync(`${output}/legacy-fixture-manifest.json`,JSON.stringify(manifest,null,2));};
const ok=(id,passed)=>{report.checks.push({id,status:passed?'pass':'fail'});save();check(passed,`Check failed: ${id}`);};
const safe=(r,stage)=>{check(!r.error,`${stage} failed (provider details withheld).`);return r.data;};
const service=createClient(ORIGIN,config.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const insert=async(table,row)=>safe(await service.from(table).insert(row).select('id').single(),`Create QA ${table}`).id;
const title=`Phase 1 closeout QA ${state.runId}`;
const accessUrl=readFileSync('/tmp/ace-phase1-preview-access','utf8').trim();check(new URL(accessUrl).origin===PREVIEW,'Wrong Preview access');
let browser,profileBefore;
const sessions={};
function pdf(){
  const objs=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',null,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const stream='BT /F1 14 Tf 20 100 Td (Phase 1 synthetic worksheet) Tj ET';objs[3]=`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let text='%PDF-1.4\n';const offsets=[0];for(let i=0;i<objs.length;i++){offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${objs[i]}\nendobj\n`;}
  const xref=Buffer.byteLength(text);text+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return Buffer.from(text);
}
try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  for(const label of ['admin','q','v']){
    const user=state.users.find(u=>u.label===label);const identity=safe(await service.auth.admin.getUserById(user.id),'Confirm QA ownership');
    check(identity.user.user_metadata.phase1_qa_run===state.runId&&identity.user.email===user.email,'QA ownership mismatch');
    let cookies=[];const client=createServerClient(ORIGIN,config.SUPABASE_ANON_KEY,{auth:{autoRefreshToken:false},cookies:{getAll:()=>cookies,setAll:items=>{for(const c of items){cookies=cookies.filter(x=>x.name!==c.name);cookies.push(c);}}}});
    safe(await client.auth.signInWithPassword({email:user.email,password:state.password}),'QA sign-in');
    const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);await page.goto(accessUrl,{waitUntil:'domcontentloaded'});
    await context.addCookies(cookies.map(({name,value})=>({name,value,url:PREVIEW,secure:true,sameSite:'Lax'})));
    sessions[label]={...user,client,context,page};
  }
  const admin=sessions.admin,student=sessions.q,foreign=sessions.v;
  await admin.page.goto(`${PREVIEW}/qa/phase1`,{waitUntil:'domcontentloaded'});
  const diagnostic=await admin.page.evaluate(async()=>{const r=await fetch('/api/v2/phase1-verification',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});return r.json();});
  ok('candidate-and-admin-session',diagnostic.commit===COMMIT&&diagnostic.role==='admin'&&diagnostic.stagingProject===PROJECT);
  profileBefore=safe(await service.from('profiles').select('full_name,role,is_active,invited_at').eq('id',student.id).single(),'Read generated profile baseline');
  manifest.course=await insert('courses',{name:title,is_active:true});save();
  const enrollment=await admin.page.evaluate(async({email,courseId})=>{const r=await fetch('/api/admin/bulk-enroll',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({emails:[email],courseId})});const d=await r.json();return {status:r.status,success:d.success,failed:d.failed,stages:d.failures?.map(x=>x.stage)};},{email:student.email,courseId:manifest.course});
  report.enrollment=enrollment;save();
  ok('existing-student-bulk-enrollment',enrollment.status===200&&enrollment.success===1&&enrollment.failed===0);
  ok('enrollment-persisted',safe(await service.from('enrollments').select('id').eq('user_id',student.id).eq('course_id',manifest.course),'Verify QA enrollment').length===1);
  manifest.masterSession=await insert('master_sessions',{title,session_number:1,class_type:'QA',week_number:0});save();
  const session=await insert('sessions',{course_id:manifest.course,master_session_id:manifest.masterSession,title,session_number:1,session_date:new Date(Date.now()-86400000).toISOString(),session_end_at:new Date(Date.now()-82800000).toISOString(),class_type:'QA',is_published:true});
  const draft=await insert('sessions',{course_id:manifest.course,title:title+' draft',session_number:2,session_date:new Date(Date.now()+86400000).toISOString(),class_type:'QA',is_published:false});
  const materials=[];
  for(const released of [true,false]){
    const master=await insert('master_materials',{master_session_id:manifest.masterSession,type:'worksheet',title:released?'QA released worksheet':'QA future worksheet',question_count:2});
    const path=`worksheets/${manifest.masterSession}/${master}.pdf`;
    safe(await service.storage.from('course-materials').upload(path,pdf(),{contentType:'application/pdf',upsert:false}),'Upload synthetic worksheet');manifest.files.push(path);save();
    const fileUrl='/api/materials/file?path='+encodeURIComponent(path);
    safe(await service.from('master_materials').update({file_url:fileUrl}).eq('id',master),'Associate synthetic worksheet');
    const id=await insert('materials',{session_id:session,course_id:manifest.course,master_material_id:master,type:'worksheet',title:released?'QA released worksheet':'QA future worksheet',question_count:2,file_url:fileUrl,available_from:new Date(Date.now()+(released?-86400000:86400000)).toISOString()});
    materials.push({id,released,fileUrl});
  }
  const released=materials.find(x=>x.released),future=materials.find(x=>!x.released);
  const timelineProbe=await student.client.rpc('get_student_timeline');
  report.dashboardDiagnostic={rpcCode:timelineProbe.error?.code??null,rpcCourseMatches:timelineProbe.data?.course?.id===manifest.course};save();
  await student.page.goto(`${PREVIEW}/dashboard`,{waitUntil:'domcontentloaded'});
  await student.page.getByRole('heading',{name:/Welcome back/}).waitFor();
  await student.page.screenshot({path:`${output}/legacy-dashboard.png`,fullPage:true,timeout:10000});
  report.dashboardDiagnostic.path=new URL(student.page.url()).pathname;
  report.dashboardDiagnostic.heading=await student.page.locator('h1').first().innerText();save();
  ok('enrolled-dashboard', (await student.page.locator('main:visible').last().innerText()).toLowerCase().includes(title.toLowerCase()));
  const draftRows=safe(await student.client.from('sessions').select('id').eq('id',draft),'Draft metadata visibility');
  report.legacyObservations={draftMetadataReadableToEnrolledStudent:draftRows.length===1,explanation:'Existing baseline sessions policy permits enrolled-course metadata; timeline projection filters unpublished sessions. No Phase 1 policy change.'};save();
  ok('draft-session-hidden-from-student-timeline',!timelineProbe.data.sessions.some(row=>row.id===draft));
  ok('unenrolled-material-hidden',safe(await foreign.client.from('materials').select('id').eq('id',released.id),'Unenrolled visibility').length===0);
  ok('future-worksheet-rpc-denied',(await student.client.rpc('get_student_worksheet_log',{p_material_id:future.id})).error?.code==='42501');
  const fileStatus=async(page,url)=>page.evaluate(async url=>(await fetch(url,{headers:{Accept:'application/json'}})).status,url);
  ok('future-file-route-denied',await fileStatus(student.page,future.fileUrl)===404);
  await foreign.page.goto(`${PREVIEW}/dashboard`,{waitUntil:'domcontentloaded'});
  ok('unenrolled-file-route-denied',await fileStatus(foreign.page,released.fileUrl)===404);
  report.stage='released-file';save();
  const signed=await student.page.evaluate(async url=>{const r=await fetch(url,{headers:{Accept:'application/json'}});if(!r.ok)return {status:r.status};const d=await r.json();const file=await fetch(d.signedUrl,{signal:AbortSignal.timeout(20000)});return {status:r.status,fileStatus:file.status,type:file.headers.get('content-type')};},released.fileUrl);
  ok('released-protected-pdf-opens',signed.status===200&&signed.fileStatus===200&&signed.type?.includes('pdf'));
  const draftPage=await student.page.goto(`${PREVIEW}/session/${draft}`,{waitUntil:'domcontentloaded'});ok('draft-session-page-denied',draftPage.status()===404);
  await student.page.goto(`${PREVIEW}/schedule`,{waitUntil:'domcontentloaded'});ok('student-schedule-published-session',(await student.page.locator('main:visible').last().innerText()).toLowerCase().includes(title.toLowerCase()));
  const path=`${PREVIEW}/session/${session}/material/${released.id}`;
  report.stage='worksheet-persistence';save();
  const worksheetProbe=await student.client.rpc('get_student_worksheet_log',{p_material_id:released.id});report.worksheetDiagnostic={rpcCode:worksheetProbe.error?.code,questions:worksheetProbe.data?.questions?.length};save();
  await student.page.goto(path,{waitUntil:'domcontentloaded'});
  await student.page.getByRole('heading',{name:'QA released worksheet',exact:true}).waitFor();
  report.worksheetDiagnostic.pageText=(await student.page.locator('main:visible').last().innerText()).slice(0,3500);save();
  await student.page.getByRole('button',{name:'Done',exact:true}).first().click();
  await student.page.getByText('Saved',{exact:true}).first().waitFor();
  const comment=student.page.getByLabel('Comment for question 1');await comment.fill('Synthetic Phase 1 persistence check');await comment.blur();
  for(let attempt=0;attempt<30;attempt++){const r=await student.client.rpc('get_student_worksheet_log',{p_material_id:released.id});if(r.data?.questions?.[0]?.comment==='Synthetic Phase 1 persistence check')break;await new Promise(resolve=>setTimeout(resolve,200));}
  await student.page.getByText('Saved',{exact:true}).first().waitFor();
  await student.page.reload({waitUntil:'domcontentloaded'});
  ok('worksheet-status-persists',await student.page.getByRole('button',{name:'Done',exact:true}).first().getAttribute('aria-pressed')==='true');
  ok('worksheet-comment-persists',await student.page.getByLabel('Comment for question 1').inputValue()==='Synthetic Phase 1 persistence check');
  const log=safe(await student.client.rpc('get_student_worksheet_log',{p_material_id:released.id}),'Reload worksheet RPC');
  ok('worksheet-save-reached-database',log.questions[0].status==='done'&&log.questions[0].comment==='Synthetic Phase 1 persistence check');
  await student.page.goto(`${PREVIEW}/practice`,{waitUntil:'domcontentloaded'});ok('practice-overview-retains-worksheet',(await student.page.locator('main:visible').last().innerText()).includes('QA released worksheet'));
  safe(await service.from('courses').update({is_active:false}).eq('id',manifest.course),'Set QA batch operationally inactive');
  const timeline=safe(await student.client.rpc('get_student_timeline'),'Inactive batch timeline');ok('enrolled-inactive-batch-stays-accessible',timeline.course?.id===manifest.course);
  await student.page.goto(path,{waitUntil:'domcontentloaded'});ok('inactive-batch-worksheet-stays-accessible',await student.page.getByLabel('Comment for question 1').inputValue()==='Synthetic Phase 1 persistence check');
  report.stage='admin-editor';save();
  await admin.page.goto(`${PREVIEW}/admin/curriculum/worksheets/${manifest.masterSession}`,{waitUntil:'domcontentloaded'});
  await admin.page.getByRole('button',{name:'+ Add Question',exact:true}).click();
  await admin.page.getByLabel('Question Prompt',{exact:true}).fill('Synthetic QA: 1 + 1 = ?');
  await admin.page.getByLabel('Options',{exact:true}).fill('1\n2\n3');await admin.page.getByLabel('Correct Answer',{exact:true}).fill('2');
  await admin.page.getByRole('button',{name:'Add Question',exact:true}).click();await admin.page.getByRole('heading',{name:'Questions (1)',exact:true}).waitFor();
  ok('admin-editor-add-refresh',true);
  await admin.page.getByRole('button',{name:'Edit',exact:true}).click();await admin.page.getByLabel('Question Prompt',{exact:true}).fill('Synthetic QA: 2 + 2 = ?');
  await admin.page.getByRole('button',{name:'Save',exact:true}).click();await admin.page.getByText('Synthetic QA: 2 + 2 = ?',{exact:true}).waitFor();
  await admin.page.reload({waitUntil:'domcontentloaded'});await admin.page.getByText('Synthetic QA: 2 + 2 = ?',{exact:true}).waitFor();ok('admin-editor-edit-persists',true);
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
  try{for(const [label,s] of Object.entries(sessions)){await s.page.screenshot({path:`${output}/legacy-failure-${label}.png`,fullPage:true,timeout:10000});if(label==='q')report.studentPageText=(await s.page.locator('main:visible').last().innerText()).slice(0,4000);}}catch{}
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
