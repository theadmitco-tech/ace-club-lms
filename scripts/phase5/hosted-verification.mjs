import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,statSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {chromium} from 'playwright-core';
import {PROJECT,ORIGIN,check} from '../phase1-hosted-closeout-config.mjs';
export async function verifyPhase5Hosted({state,save,saveSql,output,signIn,rpc,service,config}){
 const report={check:'phase5_hosted_acceptance',project:PROJECT,commit:state.commit,runId:state.runId,status:'running',checks:[],limitations:['Dedicated synthetic accounts and batches are used. Hosted cleanup and account removal remain separate gates.','Private recording streaming is verified; previously copied external provider links remain controlled by their providers.']};
 const saveReport=()=>writeFileSync(`${output}/hosted-results.json`,JSON.stringify(report,null,2)+'\n');
 const ok=(id,value)=>{report.checks.push({id,status:value?'pass':'fail'});saveReport();check(value,`Hosted check failed: ${id}`);};
 const sessions={};let browser;state.contentIds??=[];state.uploads??=[];state.status='verification-running';save();saveReport();
 try{
  const accessFile='/tmp/ace-phase5-preview-access';check(existsSync(accessFile),'Private Preview access has not been prepared.');const info=statSync(accessFile);check((info.mode&0o077)===0,'Preview access must remain private.');
  const accessUrl=readFileSync(accessFile,'utf8').trim(),access=new URL(accessUrl);check(access.origin===state.preview&&access.searchParams.has('_vercel_share'),'Preview access must identify the exact deployment.');
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const publicContext=await browser.newContext(),publicPage=await publicContext.newPage();await publicPage.goto(accessUrl,{waitUntil:'domcontentloaded'});
  await publicPage.goto(`${state.preview}/qa/phase1`,{waitUntil:'domcontentloaded'});
  const environment=await publicPage.evaluate(async()=>{const r=await fetch('/api/v2/phase1-verification',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});return r.json();});
  ok('exact-preview-commit-and-staging',environment.commit===state.commit&&environment.stagingProject===PROJECT&&environment.overall!=='fail');
  const protectionCookies=(await publicContext.cookies()).filter(c=>!c.name.startsWith('sb-'));
  for(const u of state.users){const session=await signIn(u);sessions[u.label]=session;session.context=await browser.newContext();await session.context.addCookies([...protectionCookies,...session.cookies.map(({name,value})=>({name,value,url:state.preview,secure:true,sameSite:'Lax'}))]);session.page=await session.context.newPage();session.page.on('dialog',dialog=>dialog.accept());}
  const admin=sessions.admin,student=sessions.full,full=state.courses[0],quant=state.courses[1],first=full.document.sessions[0],second=full.document.sessions[1];
  const target=(placement='session',session=first)=>({batchId:full.batchId,sessionKey:session.key,publicationRevision:1,placement,anchorKey:placement.includes('video')?session.content.recordings[0].key:null,replaceKey:null,order:20});
  const fetchFrom=async(page,path,body)=>page.evaluate(async({path,body})=>{const r=await fetch(path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};},{path,body});
  await admin.page.goto(`${state.preview}/admin/v2/content`,{waitUntil:'domcontentloaded'});await admin.page.getByRole('heading',{name:'Readings, recordings & materials',exact:true}).waitFor();
  ok('admin-content-workspace-visible',true);
  const operate=async(action,input)=>{const r=await fetchFrom(admin.page,'/api/admin/v2/content',{action,input});check(r.status===200,'Admin content request failed');return r.body;};
  const original=await rpc(admin.client,'list_v2_content_workspace',{});
  const originalHash=createHash('sha256').update(JSON.stringify(original.courses.filter(c=>!state.courses.some(f=>f.batchId===c.batchId)))).digest('hex');
  const create=async document=>{const id=randomUUID();state.contentIds.push(id);save();saveSql();await operate('save',{id,revision:0,requestId:randomUUID(),document});return id;};
  const publish=async(id,revision=1,action='publish')=>{const scope=await operate('scope',{id,revision,action});await operate('confirm',{...scope,requestId:randomUUID()});return scope;};
  const delivered=()=>rpc(student.client,'get_my_v2_published_course',{p_batch_id:full.batchId});
  const notionSource=original.courses.filter(c=>!state.courses.some(f=>f.batchId===c.batchId)).flatMap(c=>c.sessions).flatMap(s=>[...s.content.preSessionReads,...s.content.postSessionReads]).find(i=>/notion\.(so|site)|notion\.com/.test(i.url));
  const reading={title:'QA independent reading',kind:'preSessionReads',url:'https://example.test/phase5/reading',targets:[target('before_course'),{...target('before_course'),batchId:quant.batchId,sessionKey:quant.document.sessions[0].key}]};
  const readingId=await create(reading);
  ok('draft-is-not-student-visible',!JSON.stringify(await delivered()).includes(reading.title));
  const beforePreview=await rpc(student.client,'get_my_v2_learning_state',{p_batch_id:full.batchId});
  let learningRequests=0;admin.page.on('request',request=>{if(new URL(request.url()).pathname==='/api/v2/learning')learningRequests++;});
  await admin.page.goto(`${state.preview}/admin/v2/content/preview/${full.batchId}?item=${readingId}&revision=1`,{waitUntil:'domcontentloaded'});
  await admin.page.getByRole('heading',{name:reading.title,exact:true}).waitFor();await admin.page.getByRole('button',{name:'Read here',exact:true}).first().click();
  await admin.page.getByRole('button',{name:`Open ${second.title}`,exact:true}).click();
  ok('preview-uses-student-outline-without-writes',learningRequests===0&&JSON.stringify(await rpc(student.client,'get_my_v2_learning_state',{p_batch_id:full.batchId}))===JSON.stringify(beforePreview));
  const scope=await publish(readingId);ok('universal-scope-names-both-offerings',scope.targets.length===2&&scope.targets.every(t=>t.courseTitle&&t.sessionTitle));
  ok('universal-publication-reaches-authorized-students',JSON.stringify(await delivered()).includes(reading.title)&&JSON.stringify(await rpc(sessions.quant.client,'get_my_v2_published_course',{p_batch_id:quant.batchId})).includes(reading.title));
  for(const placement of ['area_top','before_video','after_video','after_course']){const id=await create({...reading,title:`QA ${placement}`,kind:placement==='after_video'?'postSessionReads':'preSessionReads',url:placement==='after_video'&&notionSource?notionSource.url:reading.url,targets:[target(placement)]});await publish(id);}
  await student.page.goto(`${state.preview}/schedule/v2/${full.batchId}`,{waitUntil:'domcontentloaded'});
  for(const title of [reading.title,'QA area_top','QA before_video','QA after_video','QA after_course']){await student.page.getByRole('heading',{name:title,exact:true}).waitFor();ok(`placement-${title.replaceAll(' ','-')}`,true);}
  if(notionSource){
   const card=student.page.getByRole('heading',{name:'QA after_video',exact:true}).locator('..');await card.getByRole('button',{name:'Read here',exact:true}).click();
   await card.locator('.notion,iframe,[role=alert]').first().waitFor({state:'visible',timeout:30000});
   const displayed=await card.locator('.notion,iframe').count()>0;
   const explicitFailure=await card.getByRole('alert').count()>0;
   ok('notion-reading-renders-or-explains-provider-failure',displayed||explicitFailure);
   await card.getByRole('link',{name:/Open QA after_video/}).waitFor();ok('notion-original-source-retained',true);
  }else{throw new Error('Existing Notion reading fixture unavailable');}
  const order=await student.page.locator('h5').allTextContents();ok('video-readings-surround-the-recording',order.indexOf('QA before_video')<order.indexOf(first.content.recordings[0].title)&&order.indexOf('QA after_video')>order.indexOf(first.content.recordings[0].title));
  await student.page.getByRole('button',{name:'Mark as read',exact:true}).first().click();
  const afterReading=await rpc(student.client,'get_my_v2_learning_state',{p_batch_id:full.batchId});ok('reading-reminder-never-creates-feedback',afterReading.obligations.length===0);
  const heading=await create({title:'QA independently edited heading',kind:'heading',url:null,targets:[target()]});await publish(heading);ok('independent-heading-edit-delivered',(await delivered()).sessions[0].title==='QA independently edited heading');
  await publish(heading,1,'unpublish');ok('heading-unpublish-restores-original-label',(await delivered()).sessions[0].title===first.title);
  await admin.page.goto(`${state.preview}/admin/v2/content`,{waitUntil:'domcontentloaded'});
  await admin.page.getByLabel('Content type',{exact:true}).selectOption('recordings');
  const videoPath='/tmp/ace-phase5-synthetic-recording.mp4';execFileSync('ffmpeg',['-y','-f','lavfi','-i','color=c=green:s=320x180:r=10','-t','12','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',videoPath],{stdio:'ignore'});
  await admin.page.locator('input[type=file]').setInputFiles(videoPath);
  await admin.page.getByText('Private upload complete.',{exact:false}).waitFor();
  const recordingUrl=await admin.page.getByLabel(/^Resource URL/).inputValue(),uploadPath=recordingUrl.split('/').at(-1);
  check(recordingUrl===`${ORIGIN}/storage/v1/object/authenticated/v2-course-content/${uploadPath}`&&/^[a-f0-9-]{36}\.mp4$/.test(uploadPath),'Private upload reference mismatch');
  state.uploads.push(uploadPath);save();
  ok('browser-private-recording-upload',true);
  const recordingDoc={title:'QA private recording',kind:'recordings',url:recordingUrl,targets:[{...target(),replaceKey:first.content.recordings[0].key},{...target(),batchId:quant.batchId,sessionKey:quant.document.sessions[0].key,replaceKey:quant.document.sessions[0].content.recordings[0].key}]};
  const recordingId=await create(recordingDoc);await publish(recordingId);
  let recording=(await delivered()).sessions[0].content.recordings.find(i=>i.title===recordingDoc.title);
  const filePath=(key,course=full)=>`/api/v2/content/file?batchId=${course.batchId}&sessionKey=${course.document.sessions[0].key}&itemKey=${key}&format=mp4`;
  const fileRequest=async(page,key,course=full)=>page.evaluate(async path=>{const r=await fetch(path,{headers:{Range:'bytes=0-255'}});return {status:r.status,size:(await r.arrayBuffer()).byteLength,type:r.headers.get('content-type'),cache:r.headers.get('cache-control'),location:r.headers.get('location')};},filePath(key,course));
  const file=await fileRequest(student.page,recording.key);ok('private-recording-streams-range-without-token-redirect',file.status===206&&file.size===256&&file.type==='video/mp4'&&file.cache==='private, no-store'&&file.location===null);
  const anon=createClient(ORIGIN,config.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  ok('direct-storage-browser-download-denied',!!(await anon.storage.from('v2-course-content').download(uploadPath)).error);
  await sessions.quant.page.goto(`${state.preview}/schedule/v2/${quant.batchId}`,{waitUntil:'domcontentloaded'});
  ok('eligible-quant-private-file-available',(await fileRequest(sessions.quant.page,recording.key,quant)).status===206);
  for(const label of ['empty','expired','revoked','inactive','wrong_subject']){
   const r=await sessions[label].client.rpc('get_my_v2_published_course',{p_batch_id:quant.batchId});ok(`${label}-course-denied`,!r.data);
   await sessions[label].page.goto(`${state.preview}/schedule/v2`,{waitUntil:'domcontentloaded'});
   ok(`${label}-protected-file-denied`,(await fileRequest(sessions[label].page,recording.key,quant)).status===404);
  }
  ok('anonymous-file-denied',(await fileRequest(publicPage,recording.key)).status===404);
  const staleScope=await operate('scope',{id:recordingId,revision:1,action:'publish'});
  await create({...reading,title:'QA pending scope edit',targets:[target('session',second)]});
  ok('stale-confirmation-rejected',(await fetchFrom(admin.page,'/api/admin/v2/content',{action:'confirm',input:{...staleScope,requestId:randomUUID()}})).status===400);
  await operate('save',{id:recordingId,revision:1,requestId:randomUUID(),document:{...recordingDoc,title:'QA revised private recording'}});await publish(recordingId,2);
  const newer=(await delivered()).sessions[0].content.recordings.find(i=>i.title==='QA revised private recording');
  ok('replacement-denies-old-resource-key',newer.key!==recording.key&&(await fileRequest(student.page,recording.key)).status===404&&(await fileRequest(student.page,newer.key)).status===206);
  recording=newer;await publish(recordingId,2,'unpublish');ok('unpublish-denies-file-without-restoring-original',(await fileRequest(student.page,recording.key)).status===404&&(await delivered()).sessions[0].content.recordings.length===0);
  await publish(recordingId,2);await publish(recordingId,2,'delete');ok('deletion-denies-file',(await fileRequest(student.page,recording.key)).status===404);
  await student.page.goto(`${state.preview}/schedule/v2/${full.batchId}`,{waitUntil:'domcontentloaded'});
  for(const action of ['workspace','upload']){const r=await fetchFrom(student.page,'/api/admin/v2/content',{action,input:action==='upload'?{extension:'mp4',type:'video/mp4',size:100}:{}});ok(`student-admin-${action}-denied`,r.status!==200);}
  ok('student-preview-rpc-denied',!!(await student.client.rpc('read_v2_content_preview',{p_batch_id:full.batchId,p_item_id:readingId,p_revision:1})).error);
  for(const table of ['v2_content_items','v2_content_item_revisions','v2_content_publication_audit'])ok(`${table}-direct-read-denied`,!!(await student.client.from(table).select('*').limit(1)).error);
  await admin.page.goto(`${state.preview}/admin/v2/content`,{waitUntil:'domcontentloaded'});await admin.page.getByLabel('Content type',{exact:true}).selectOption('materials');
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
  const current=await rpc(admin.client,'list_v2_content_workspace',{});ok('original-course-publications-unchanged',createHash('sha256').update(JSON.stringify(current.courses.filter(c=>!state.courses.some(f=>f.batchId===c.batchId)))).digest('hex')===originalHash);
  // Private test objects are removed only from the exact generated upload list after access denial checks.
  for(const path of state.uploads){check(/^[a-f0-9-]{36}\.(mp4|pdf)$/.test(path),'Unexpected QA upload path');const removed=await service.storage.from('v2-course-content').remove([path]);check(!removed.error,'Synthetic upload cleanup failed');}
  state.uploadsCleaned=true;report.status='passed';state.status='verified-awaiting-sql-cleanup';state.verifiedAt=new Date().toISOString();save();saveSql();saveReport();
  console.log(JSON.stringify({status:report.status,checks:report.checks.length,runId:state.runId,cleanupPending:true}));
 }catch(error){report.status='failed';report.failure='Hosted verification interrupted; private diagnostics retained outside Git.';state.status='verification-failed';save();saveSql();saveReport();writeFileSync('/tmp/ace-phase5-hosted-error.private.log',String(error?.stack??error),{mode:0o600});console.error(report.failure);process.exitCode=1;}
 finally{await browser?.close();}
}
