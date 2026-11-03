import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {chromium} from 'playwright-core';
import {privateFile} from './private-files.mjs';
import {PROJECT,ORIGIN,readConfig,check} from '../phase1-hosted-closeout-config.mjs';
import {buildCleanupSql} from './fixtures.mjs';

// The continuation reconciles the exact eight recorded items before proceeding past the completed access matrix.
const privatePath=privateFile('hosted-qa-state.json'),output='deliverables/phase5-hosted-acceptance';
const state=JSON.parse(readFileSync(privatePath,'utf8'));
const report=JSON.parse(readFileSync(`${output}/hosted-results.json`,'utf8'));
check(state.preview==='https://ace-club-1sdmvilq3-theadmitco-techs-projects.vercel.app'&&state.commit==='b181d91635248c196313c421cd1b1b5b545e5a90'&&state.project===PROJECT&&state.runId==='93a9ab13-1986-4124-9370-ea86b4355823'&&state.status==='verification-failed'
 &&report.commit===state.commit&&report.runId===state.runId&&report.checks.length===32&&report.checks.every(c=>c.status==='pass')
 &&state.contentIds.length===8&&state.passwordRestoredFor?.includes('admin')&&state.passwordRestoredFor?.includes('full'),'Recorded continuation state differs; inspection required.');
const candidatePreview=process.argv[2],candidateCommit=process.argv[3];
check(typeof candidatePreview==='string'&&/^https:\/\/ace-club-[a-z0-9]+-theadmitco-techs-projects\.vercel\.app$/.test(candidatePreview)&&/^[a-f0-9]{40}$/.test(candidateCommit??''),'An exact reviewed candidate Preview and commit are required.');
const config=readConfig(privateFile('staging.env'),{database:false});
const service=createClient(ORIGIN,config.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const save=()=>{writeFileSync(privatePath,JSON.stringify(state,null,2)+'\n',{mode:0o600});const {password,...manifest}=state;void password;writeFileSync(`${output}/fixture-manifest.json`,JSON.stringify(manifest,null,2)+'\n');};
const saveSql=()=>writeFileSync(`${output}/02-CLEANUP-FIXTURES.sql`,buildCleanupSql(state));
const saveReport=()=>writeFileSync(`${output}/hosted-results.json`,JSON.stringify(report,null,2)+'\n');
const ok=(id,passed)=>{check(!report.checks.some(c=>c.id===id),'Duplicate acceptance identifier');report.checks.push({id,status:passed?'pass':'fail',commit:candidateCommit});saveReport();check(passed,id);};
const rpc=async(client,name,args)=>{let r;for(let n=0;n<3;n++){r=await client.rpc(name,args);if(!r.error||r.status!==0||!/^(get_|list_|read_)/.test(name))break;}check(!r.error,`${name} failed; private provider diagnostics withheld`);return r.data;};
async function signIn(label){const u=state.users.find(u=>u.label===label);let cookies=[];const client=createServerClient(ORIGIN,config.SUPABASE_ANON_KEY,{cookies:{getAll:()=>cookies,setAll:items=>{for(const item of items){cookies=cookies.filter(c=>c.name!==item.name);cookies.push(item);}}}});let r;for(let attempt=0;attempt<3;attempt++){r=await client.auth.signInWithPassword({email:u.email,password:state.password});if(!r.error||r.error.name!=='AuthRetryableFetchError')break;}check(!r.error&&r.data.user.id===u.id&&r.data.user.user_metadata.phase5_qa_run===state.runId,'Recovered QA sign-in failed');return {client,cookies};}
let browser;report.status='running';delete report.failure;report.resumedFromPassingAssertions=32;state.status='continuation-running';save();saveReport();
try{
 const admin=await signIn('admin'),student=await signIn('full');
 const original=await rpc(admin.client,'list_v2_content_workspace',{});
 const managed=original.items.filter(i=>state.contentIds.includes(i.id));
 check(managed.length===8&&managed.every(i=>!i.deleted&&i.draft_revision===(i.id===state.contentIds[7]?2:1)),'Recorded QA items changed before continuation.');
 const existingRecording=managed.find(i=>i.id===state.contentIds[6]);
 check(existingRecording.visible&&existingRecording.published_revision===1&&existingRecording.document.title==='QA private recording','Recording state changed before continuation.');
 const pending=managed.find(i=>i.id===state.contentIds[7]);check(!pending.visible&&pending.published_revision===null&&pending.document.title==='QA pending scope edit resumed','Pending scope item differs.');
 const originalHash=createHash('sha256').update(JSON.stringify(original.courses.filter(c=>!state.courses.some(f=>f.batchId===c.batchId)))).digest('hex');
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const protection=await browser.newContext();protection.setDefaultNavigationTimeout(60000);protection.setDefaultTimeout(30000);const publicPage=await protection.newPage();
 const accessUrl=readFileSync(privateFile('preview-access'),'utf8').trim();check(new URL(accessUrl).origin===candidatePreview&&new URL(accessUrl).searchParams.has('_vercel_share'),'Exact candidate access required');
 await publicPage.goto(accessUrl,{waitUntil:'domcontentloaded'});
 await publicPage.goto(`${candidatePreview}/qa/phase1`,{waitUntil:'domcontentloaded'});
 const environment=await publicPage.evaluate(async()=>{const r=await fetch('/api/v2/phase1-verification',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});return r.json();});
 check(environment.commit===candidateCommit&&environment.stagingProject===PROJECT&&environment.checks?.find(c=>c.id==='environment')?.status==='pass','Candidate environment does not match');
 report.initialCommit=report.commit;for(const entry of report.checks)entry.commit??=report.initialCommit;report.commit=candidateCommit;report.preview=candidatePreview;state.commit=candidateCommit;state.preview=candidatePreview;save();ok('continuation-exact-preview-commit-and-staging',true);
 const protectionCookies=(await protection.cookies()).filter(c=>!c.name.startsWith('sb-'));
 for(const session of [admin,student]){session.context=await browser.newContext();session.context.setDefaultNavigationTimeout(60000);session.context.setDefaultTimeout(30000);await session.context.addCookies([...protectionCookies,...session.cookies.map(({name,value})=>({name,value,url:state.preview,secure:true,sameSite:'Lax'}))]);session.page=await session.context.newPage();session.page.on('dialog',d=>d.accept());}
 await admin.page.goto(`${state.preview}/admin/v2/content`,{waitUntil:'domcontentloaded'});await admin.page.getByLabel(/^Content type/).waitFor();ok('continuation-admin-editor-rendered',true);
 await student.page.goto(`${state.preview}/schedule/v2/${state.courses[0].batchId}`,{waitUntil:'domcontentloaded'});
 const full=state.courses[0],first=full.document.sessions[0],second=full.document.sessions[1];
 const target=(placement='session',session=first)=>({batchId:full.batchId,sessionKey:session.key,publicationRevision:1,placement,anchorKey:placement.includes('video')?session.content.recordings[0].key:null,replaceKey:null,order:20});
 const fetchFrom=async(page,path,body)=>page.evaluate(async({path,body})=>{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});const text=await r.text();let data;try{data=JSON.parse(text);}catch{data={error:'Non-JSON server response'};}return {status:r.status,body:data};},{path,body});
 const operate=async(action,input)=>{const r=await fetchFrom(admin.page,'/api/admin/v2/content',{action,input});check(r.status===200,`Admin ${action} returned status ${r.status}`);return r.body;};
 const create=async document=>{const id=randomUUID();state.contentIds.push(id);save();saveSql();await operate('save',{id,revision:0,requestId:randomUUID(),document});return id;};
 const publish=async(id,revision=1,action='publish')=>{const scope=await operate('scope',{id,revision,action});await operate('confirm',{...scope,requestId:randomUUID()});return scope;};
 const delivered=()=>rpc(student.client,'get_my_v2_published_course',{p_batch_id:full.batchId});
 const readingId=state.contentIds[0],recordingId=existingRecording.id,recordingDoc=existingRecording.document;
 let recording=(await delivered()).sessions[0].content.recordings.find(i=>i.title===recordingDoc.title);check(recording,'Published QA recording missing.');
 const filePath=key=>`/api/v2/content/file?batchId=${full.batchId}&sessionKey=${first.key}&itemKey=${key}&format=mp4`;
 const fileRequest=async(page,key)=>page.evaluate(async path=>{const r=await fetch(path,{headers:{Range:'bytes=0-255'},signal:AbortSignal.timeout(60000)});return {status:r.status,size:(await r.arrayBuffer()).byteLength};},filePath(key));
 const staleScope=await operate('scope',{id:recordingId,revision:1,action:'publish'});
 await operate('save',{id:pending.id,revision:pending.draft_revision,requestId:randomUUID(),document:{...pending.document,title:'QA pending scope edit after conflict repair'}});
 ok('stale-confirmation-rejected',(await fetchFrom(admin.page,'/api/admin/v2/content',{action:'confirm',input:{...staleScope,requestId:randomUUID()}})).status===409);
  await operate('save',{id:recordingId,revision:1,requestId:randomUUID(),document:{...recordingDoc,title:'QA revised private recording'}});await publish(recordingId,2);
  const newer=(await delivered()).sessions[0].content.recordings.find(i=>i.title==='QA revised private recording');
  ok('replacement-denies-old-resource-key',newer.key!==recording.key&&(await fileRequest(student.page,recording.key)).status===404&&(await fileRequest(student.page,newer.key)).status===206);
  recording=newer;await publish(recordingId,2,'unpublish');ok('unpublish-denies-file-without-restoring-original',(await fileRequest(student.page,recording.key)).status===404&&(await delivered()).sessions[0].content.recordings.length===0);
  await publish(recordingId,2);await publish(recordingId,2,'delete');ok('deletion-denies-file',(await fileRequest(student.page,recording.key)).status===404);
  await student.page.goto(`${state.preview}/schedule/v2/${full.batchId}`,{waitUntil:'domcontentloaded'});
  for(const action of ['workspace','upload']){const r=await fetchFrom(student.page,'/api/admin/v2/content',{action,input:action==='upload'?{extension:'mp4',type:'video/mp4',size:100}:{}});ok(`student-admin-${action}-denied`,r.status!==200);}
  ok('student-preview-rpc-denied',!!(await student.client.rpc('read_v2_content_preview',{p_batch_id:full.batchId,p_item_id:readingId,p_revision:1})).error);
  for(const table of ['v2_content_items','v2_content_item_revisions','v2_content_publication_audit'])ok(`${table}-direct-read-denied`,!!(await student.client.from(table).select('*').limit(1)).error);
  await admin.page.goto(`${state.preview}/admin/v2/content`,{waitUntil:'domcontentloaded'});await admin.page.getByLabel(/^Content type/).selectOption('materials');
  const pdfObjects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const stream='BT /F1 16 Tf 20 160 Td (Synthetic QA worksheet) Tj ET';pdfObjects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  let pdf='%PDF-1.4\n',offsets=[0];pdfObjects.forEach((object,index)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${index+1} 0 obj\n${object}\nendobj\n`;});const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  await admin.page.locator('input[type=file]').setInputFiles({name:'synthetic-worksheet.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf)});await admin.page.getByText('Private upload complete.',{exact:false}).waitFor();
  const pdfUrl=await admin.page.getByLabel(/^Resource URL/).inputValue(),pdfPath=pdfUrl.split('/').at(-1);check(pdfUrl===`${ORIGIN}/storage/v1/object/authenticated/v2-course-content/${pdfPath}`&&/^[a-f0-9-]{36}\.pdf$/.test(pdfPath),'Private PDF reference mismatch');state.uploads.push(pdfPath);save();
  const pdfId=await create({title:'QA private worksheet',kind:'materials',url:pdfUrl,targets:[target()]});await publish(pdfId);
  const pdfItem=(await delivered()).sessions[0].content.materials.find(i=>i.title==='QA private worksheet');
  const pdfRequest=async()=>student.page.evaluate(async path=>{const r=await fetch(path);return {status:r.status,type:r.headers.get('content-type'),signature:(await r.text()).slice(0,8)};},`/api/v2/content/file?batchId=${full.batchId}&sessionKey=${first.key}&itemKey=${pdfItem.key}&format=pdf`);
  const pdfResponse=await pdfRequest();ok('browser-pdf-upload-and-protected-delivery',pdfResponse.status===200&&pdfResponse.type==='application/pdf'&&pdfResponse.signature.startsWith('%PDF-1.4'));
  await rpc(student.client,'report_v2_recording_watched',{p_batch_id:full.batchId,p_session_key:second.key,p_recording_key:second.content.recordings[0].key,p_publication_revision:1});
  ok('subject-feedback-removes-independent-reading-placements',!(await rpc(student.client,'get_my_v2_content_placements',{p_batch_id:full.batchId})).some(p=>p.sessionKey===first.key));
  ok('subject-feedback-denies-private-worksheet',(await pdfRequest()).status===404);
  ok('other-subject-remains-accessible',(await delivered()).sessions.some(s=>s.section==='verbal'));
  const current=await rpc(admin.client,'list_v2_content_workspace',{});ok('original-course-publications-unchanged-during-continuation',createHash('sha256').update(JSON.stringify(current.courses.filter(c=>!state.courses.some(f=>f.batchId===c.batchId)))).digest('hex')===originalHash);
  // Private test objects are removed only from the exact generated upload list after access denial checks.
  for(const path of state.uploads){check(/^[a-f0-9-]{36}\.(mp4|pdf)$/.test(path),'Unexpected QA upload path');const removed=await service.storage.from('v2-course-content').remove([path]);check(!removed.error,'Synthetic upload cleanup failed');}
  state.uploadsCleaned=true;report.status='passed';state.status='verified-awaiting-sql-cleanup';state.verifiedAt=new Date().toISOString();save();saveSql();saveReport();
  console.log(JSON.stringify({status:report.status,checks:report.checks.length,runId:state.runId,cleanupPending:true}));
 }catch(error){report.status='failed';report.failure='Hosted verification interrupted; private diagnostics retained outside Git.';state.status='verification-failed';save();saveSql();saveReport();writeFileSync(privateFile('hosted-error.log'),String(error?.stack??error),{mode:0o600});console.error(report.failure);process.exitCode=1;}
 finally{await browser?.close();}
