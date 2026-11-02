import {randomUUID,createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {chromium} from 'playwright-core';
import {PROJECT,ORIGIN,check,readConfig} from '../phase1-hosted-closeout-config.mjs';
import {QA_CASES,createCoursePlan,buildSetupSql,buildCleanupSql} from './fixtures.mjs';
const mode=process.argv[2],modes=['prepare','accept-baseline','verify','accept-cleanup','cleanup-accounts'];
if(!modes.includes(mode)){console.log('Modes: prepare <Preview URL> <commit>; accept-baseline <setup JSON>; verify; accept-cleanup <cleanup JSON>; cleanup-accounts. SQL Editor setup and cleanup remain separate required actions.');process.exit(0);}
const privatePath='/tmp/ace-phase4-hosted-qa-state.json',output=resolve('deliverables/phase4-hosted-acceptance');
mkdirSync(output,{recursive:true});
function privateJson(path){const info=statSync(path);check(info.isFile()&&(info.mode&0o077)===0&&info.uid===process.getuid(),'Private QA state must be owned by the current user and chmod 600.');return JSON.parse(readFileSync(path,'utf8'));}
function parseReport(path){let result=JSON.parse(readFileSync(path,'utf8'));if(Array.isArray(result)&&result.length===1)result=result[0];if(!result.check&&Object.keys(result).length===1)result=Object.values(result)[0];return result;}
const validPreview=value=>{const url=new URL(value);return url.protocol==='https:'&&/^ace-club(?:-lms)?-[a-z0-9-]+-theadmitco-techs-projects\.vercel\.app$/.test(url.hostname)&&url.pathname==='/'&&!url.search&&!url.hash&&!url.username&&!url.password;};
let state=mode==='prepare'?null:privateJson(privatePath);
const save=()=>{writeFileSync(privatePath,JSON.stringify(state,null,2),{mode:0o600});const {password,...manifest}=state;void password;writeFileSync(`${output}/fixture-manifest.json`,JSON.stringify(manifest,null,2));};
const saveSql=()=>{writeFileSync(`${output}/01-SETUP-FIXTURES.sql`,buildSetupSql(state));writeFileSync(`${output}/02-CLEANUP-FIXTURES.sql`,buildCleanupSql(state));};
if(state)check(state.project===PROJECT&&validPreview(state.preview)&&/^[a-f0-9]{40}$/.test(state.commit),'QA state does not identify the designated staging Preview.');
if(mode==='accept-baseline'){
 const result=parseReport(process.argv[3]);check(state.status==='accounts-created-awaiting-sql'&&result.check==='phase4_qa_fixture_setup'&&result.run_id===state.runId&&result.qa_accounts===9&&result.batches===2&&result.purchases===7&&/^[a-f0-9]{32}$/.test(result.baseline?.md5)&&Number.isInteger(result.baseline.table_count)&&result.baseline.excluded_generated_profiles===9,'Setup report does not match this generated QA run.');
 state.baseline=result.baseline;state.status='ready-for-verification';save();saveSql();console.log(JSON.stringify({status:state.status,runId:state.runId}));process.exit(0);
}
if(mode==='accept-cleanup'){
 const result=parseReport(process.argv[3]);check(result.check==='phase4_qa_fixture_cleanup'&&result.run_id===state.runId&&result.baseline_restored===true&&result.fingerprint?.md5===state.baseline?.md5&&result.fingerprint?.table_count===state.baseline?.table_count,'Cleanup did not restore the recorded application baseline.');
 state.cleanup=result;state.status='sql-cleaned';save();console.log(JSON.stringify({status:state.status,runId:state.runId}));process.exit(0);
}
const config=readConfig('/tmp/ace-phase1-staging.env',{database:false});
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(20000)})}};
const service=createClient(ORIGIN,config.SUPABASE_SERVICE_ROLE_KEY,options);
const safe=(result,label)=>{check(!result.error,`${label} failed; private provider diagnostics withheld.`);return result.data;};
const rpc=async(client,name,args)=>safe(await client.rpc(name,args),name);
const verifyOwned=async u=>{const data=safe(await service.auth.admin.getUserById(u.id),'QA identity verification');check(data.user.email===u.email&&data.user.user_metadata.phase4_qa_run===state.runId,'Generated account ownership mismatch.');};
async function signIn(u){
 await verifyOwned(u);let cookies=[];
 const client=createServerClient(ORIGIN,config.SUPABASE_ANON_KEY,{...options,cookies:{getAll:()=>cookies,setAll:items=>{for(const c of items){cookies=cookies.filter(old=>old.name!==c.name);cookies.push(c);}}}});
 safe(await client.auth.signInWithPassword({email:u.email,password:state.password}),'Dedicated QA sign-in');return {...u,client,cookies};
}
if(mode==='prepare'){
 check(!existsSync(privatePath),'A Phase 4 QA state already exists; inspection and exact cleanup must precede another run.');
 check(validPreview(process.argv[3]??''),'An explicit LMS Preview URL is required.');check(/^[a-f0-9]{40}$/.test(process.argv[4]??''),'An exact candidate commit is required.');
 safe(await service.auth.admin.listUsers({page:1,perPage:1}),'Staging Auth preflight');
 state={project:PROJECT,runId:randomUUID(),preview:new URL(process.argv[3]).origin,commit:process.argv[4],createdAt:new Date().toISOString(),status:'creating-accounts',password:`Qa!${randomUUID()}Aa9`,users:[],courses:createCoursePlan(),databasePasswordUsed:false};save();
 try{
  for(const c of QA_CASES){
   const email=`ace-p4-${c.label}-${state.runId}@example.invalid`;
   const created=safe(await service.auth.admin.createUser({email,password:state.password,email_confirm:true,user_metadata:{full_name:`Phase 4 QA ${c.label}`,phase4_qa_run:state.runId}}),'Create dedicated QA identity');
   const u={id:created.user.id,label:c.label,email};state.users.push(u);save();await verifyOwned(u);
   safe(await service.from('profiles').upsert({id:u.id,email,full_name:`Phase 4 QA ${c.label}`,role:c.role??'student',is_active:true}),'Prepare dedicated QA profile');
  }
  state.status='accounts-created-awaiting-sql';save();saveSql();console.log(JSON.stringify({status:state.status,accounts:state.users.length,runId:state.runId}));
 }catch{
  state.status='prepare-failed';state.deletedAccountIds=[];
  for(const u of [...state.users].reverse()){try{await verifyOwned(u);safe(await service.auth.admin.deleteUser(u.id),'Remove partial QA identity');state.deletedAccountIds.push(u.id);}catch{break;}}
  if(state.deletedAccountIds.length===state.users.length)delete state.password;save();console.log(JSON.stringify({status:state.status,accountsRemoved:state.deletedAccountIds.length}));process.exitCode=1;
 }
}else if(mode==='cleanup-accounts'){
 check(state.status==='sql-cleaned'&&state.cleanup?.baseline_restored,'Verified SQL cleanup is required before deleting QA identities.');
 for(const u of state.users){const purchases=safe(await service.from('v2_purchases').select('id').eq('student_id',u.id).limit(1),'Purchase cleanup check');check(purchases.length===0,'Fixture purchases remain.');}
 state.deletedAccountIds??=[];
 for(const u of [...state.users].reverse()){if(state.deletedAccountIds.includes(u.id))continue;await verifyOwned(u);safe(await service.auth.admin.deleteUser(u.id),'Remove exact QA identity');state.deletedAccountIds.push(u.id);save();}
 state.status='cleaned';state.cleanedAt=new Date().toISOString();delete state.password;save();console.log(JSON.stringify({status:state.status,accountsRemoved:state.deletedAccountIds.length}));
}else{
 check(state.status==='ready-for-verification','A recorded setup baseline is required; previous attempts require review before rerunning.');
 const accessFile='/tmp/ace-phase4-preview-access',info=statSync(accessFile);check((info.mode&0o077)===0&&info.uid===process.getuid(),'Preview access link must remain private.');
 const accessUrl=readFileSync(accessFile,'utf8').trim(),access=new URL(accessUrl);check(access.origin===state.preview&&access.searchParams.has('_vercel_share'),'Preview protection link must match the candidate deployment.');
 const report={check:'phase4_hosted_acceptance',runId:state.runId,project:PROJECT,commit:state.commit,startedAt:new Date().toISOString(),status:'running',checks:[],limitations:[
  'Synthetic fixtures prove the learning and authorization workflow. Existing imported libraries are compared read-only; external recording playback requires separate provider checks.',
  'The temporary LMS form stores caller-authored feedback; no Tally or independent attendance verification is claimed.',
  'Automatic playback threshold and seek/replay behavior are rehearsed locally. Hosted synthetic recordings use the explicitly labelled unsupported-provider self-report.',
  'Synthetic material and reading HTTP denials are smoke checks only: these fixture references are unavailable even without a feedback gate. Gate isolation is established by hosted private-URL omission and caller RPC checks together with local route tests that reject before provider access.',
  'Exact SQL cleanup and generated Auth account removal remain required before final acceptance.',
 ]};
 const saveReport=()=>writeFileSync(`${output}/hosted-results.json`,JSON.stringify(report,null,2));
 const ok=(id,value,gates=[])=>{report.checks.push({id,status:value?'pass':'fail',gates});saveReport();check(value,`Hosted check failed: ${id}`);};
 let browser;const sessions={};state.status='verification-running';save();saveReport();
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const publicContext=await browser.newContext();const publicPage=await publicContext.newPage();await publicPage.goto(accessUrl,{waitUntil:'domcontentloaded'});
  await publicPage.goto(`${state.preview}/qa/phase1`,{waitUntil:'domcontentloaded'});
  const environment=await publicPage.evaluate(async()=>{const r=await fetch('/api/v2/phase1-verification',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});return r.json();});
  ok('exact-preview-and-staging',environment.commit===state.commit&&environment.stagingProject===PROJECT&&environment.overall!=='fail');
  const protectionCookies=(await publicContext.cookies()).filter(c=>!c.name.startsWith('sb-'));
  for(const u of state.users){const session=await signIn(u);sessions[u.label]=session;session.context=await browser.newContext();await session.context.addCookies([...protectionCookies,...session.cookies.map(({name,value})=>({name,value,url:state.preview,secure:true,sameSite:'Lax'}))]);session.page=await session.context.newPage();}
  const admin=sessions.admin,full=state.courses.find(c=>c.label==='full_course'),quant=state.courses.find(c=>c.label==='quant');
  const existing=async()=>{
   const [templates,batches,publications]=await Promise.all([rpc(admin.client,'list_v2_template_drafts'),rpc(admin.client,'list_v2_batch_drafts'),rpc(admin.client,'list_v2_batch_publications')]);
   const filtered={templates:templates.filter(t=>!state.courses.some(c=>c.templateId===t.id)),batches:batches.filter(b=>!state.courses.some(c=>c.batchId===b.id)),publications:publications.filter(p=>!state.courses.some(c=>c.batchId===p.batchId))};
   return createHash('sha256').update(JSON.stringify(filtered)).digest('hex');
  };
  const existingBefore=await existing();
  const course=(label,c)=>rpc(sessions[label].client,'get_my_v2_published_course',{p_batch_id:c.batchId});
  const learning=(label,c)=>rpc(sessions[label].client,'get_my_v2_learning_state',{p_batch_id:c.batchId});
  const meeting=(label,c,e=c.document.events[0])=>rpc(sessions[label].client,'get_my_v2_meeting',{p_batch_id:c.batchId,p_event_key:e.key});
  for(const label of ['quant','unregistered','expired','revoked','inactive','wrong_subject','empty','admin']){
   ok(`course-access:${label}`,Boolean(await course(label,quant))===['quant','unregistered'].includes(label),['P4-05','P4-11']);
   ok(`learning-access:${label}`,Boolean(await learning(label,quant))===['quant','unregistered'].includes(label),['P4-11']);
   ok(`meeting-access:${label}`,Boolean(await meeting(label,quant))===(label==='quant'),['P4-03','P4-11']);
  }
  const initialFull=await course('full',full);ok('full-course-three-subjects',new Set(initialFull.sessions.map(s=>s.section)).size===3,['P4-02']);
  ok('individual-course-scope',(await course('quant',quant)).sessions.every(s=>s.section==='quant'),['P4-05']);
  ok('unregistered-live-details-hidden',(await learning('unregistered',quant)).liveEvents.length===0&&!(await learning('unregistered',quant)).liveRegistered,['P4-03']);
  const privateNames=['v2_learning_progress','v2_session_feedback','v2_feedback_obligations','v2_live_session_mappings','v2_live_session_mapping_audit','v2_recording_watch_sessions','v2_recording_watch_samples'];
  for(const table of privateNames){const read=await sessions.quant.client.from(table).select('*').limit(1);ok(`private-table-denied:${table}`,Boolean(read.error),['P4-11']);}
  const f4=full.document.sessions[1],f5=full.document.sessions[2],q4=quant.document.sessions[1];
  ok('shared-recording-reference-retained',f4.content.recordings[0].url===q4.content.recordings[0].url,['P4-04']);
  const page=sessions.full.page;await page.goto(`${state.preview}/schedule/v2/${full.batchId}`,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:`Open ${f4.title}`,exact:true}).click();
  await page.getByRole('heading',{name:f4.title,exact:true}).last().waitFor();
  ok('arbitrary-session-order',await page.getByRole('button',{name:`Open ${f5.title}`,exact:true}).isEnabled(),['P4-06']);
  await page.setViewportSize({width:390,height:844});ok('student-mobile-fit',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));await page.setViewportSize({width:1280,height:900});
  const before=(await learning('full',full));ok('session-open-not-feedback',before.obligations.length===0,['P4-06']);
  await page.getByRole('button',{name:'Recording options',exact:true}).click();
  await page.getByLabel('The recording has been watched.',{exact:true}).check();
  await page.getByRole('button',{name:'Confirm watched · self-report',exact:true}).click();
  await page.getByRole('button',{name:`Give feedback for ${f4.title}`,exact:true}).waitFor({timeout:30000});
  const gated=await learning('full',full),obligation=gated.obligations.find(o=>o.sessionKey===f4.key);
  ok('recording-self-report-created-obligation',Boolean(obligation),['P4-07']);
  ok('subject-only-lock-with-current-session-open',gated.sessions.filter(s=>s.locked).map(s=>s.key).sort().join(',')===[full.document.sessions[0].key,f5.key].sort().join(','),['P4-07','P4-08']);
  const protectedCourse=await course('full',full);ok('locked-session-resource-urls-omitted',!protectedCourse.sessions.some(s=>s.key===f5.key)&&protectedCourse.sessions.some(s=>s.key===f4.key),['P4-08','P4-11']);
  const html=await sessions.full.context.request.get(`${state.preview}/schedule/v2/${full.batchId}`);const body=await html.text();
  ok('locked-resource-url-not-in-html',!body.includes(f5.content.recordings[0].url)&&!body.includes(f5.content.preSessionReads[0].url),['P4-11']);
  const foreign=await sessions.quant.client.rpc('submit_v2_session_feedback',{p_obligation_id:obligation.id,p_request_id:randomUUID(),p_response:{attendance:'recording',usefulness:5,clarity:5,comment:''}});ok('cross-student-feedback-denied',foreign.error?.code==='42501',['P4-11']);
  const lockedProgress=await sessions.full.client.rpc('mark_v2_learning_progress',{p_batch_id:full.batchId,p_session_key:f5.key,p_item_key:null,p_state:'opened',p_publication_revision:1});ok('locked-progress-write-denied',lockedProgress.error?.code==='42501',['P4-11']);
  const file=await sessions.full.context.request.get(`${state.preview}/api/v2/materials/file?batchId=${full.batchId}&sessionKey=${f5.key}&itemKey=${f5.content.materials[0].key}`);ok('synthetic-material-denial-smoke',file.status()===404);
  const reading=await sessions.full.context.request.get(`${state.preview}/api/v2/course-reading?batchId=${full.batchId}&sessionKey=${f5.key}&pageId=${'a'.repeat(32)}`);ok('synthetic-reading-denial-smoke',reading.status()===404);
  const anon=await publicContext.request.get(`${state.preview}/api/v2/meeting?batchId=${full.batchId}&eventKey=${full.document.events[0].key}`);ok('anonymous-meeting-route-denied',[401,403,404].includes(anon.status()),['P4-03','P4-11']);
  await page.getByRole('button',{name:`Give feedback for ${f4.title}`,exact:true}).click();
  const form=page.getByRole('form',{name:`Feedback for ${f4.title}`,exact:true});await form.getByLabel('How useful was this session?',{exact:true}).selectOption('4');await form.getByLabel('How clear was this session?',{exact:true}).selectOption('5');await form.getByRole('button',{name:'Send feedback',exact:true}).click();
  await page.getByRole('button',{name:`Open ${f5.title}`,exact:true}).waitFor();await page.waitForFunction(title=>{const b=document.querySelector(`button[aria-label="Open ${title}"]`);return b&&!b.disabled;},f5.title);
  ok('browser-feedback-confirmed-unlock',(await learning('full',full)).obligations.length===0,['P4-09']);
  const completion=await rpc(admin.client,'complete_v2_learning_live_class',{p_batch_id:full.batchId,p_event_key:full.document.events[1].key,p_publication_revision:1});
  ok('mapped-live-completion',Boolean(completion.completedAt),['P4-10']);
  await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Live classes',exact:true}).click();
  await page.getByRole('button',{name:'Give feedback or report a missed class',exact:true}).click();
  const missed=page.getByRole('form',{name:`Feedback for ${f5.title}`,exact:true});await missed.getByLabel('I didn’t attend',{exact:true}).check();ok('missed-live-does-not-request-invented-ratings',await missed.getByRole('combobox').count()===0,['P4-10']);
  await missed.getByRole('button',{name:'Send feedback',exact:true}).click();await page.getByText('Feedback confirmed. The latest subject access is being loaded.',{exact:true}).waitFor();
  ok('missed-live-unlocks-with-recording-preserved',(await learning('full',full)).obligations.length===0&&(await course('full',full)).sessions.some(s=>s.key===f5.key&&s.content.recordings.length===1),['P4-09','P4-10']);
  ok('completed-live-meeting-closed',await meeting('full',full,full.document.events[1])===null,['P4-03']);
  const current=await rpc(admin.client,'list_v2_batch_publications');const revision=current.find(p=>p.batchId===quant.batchId).revision;
  const publication={batchId:quant.batchId,batchRevision:1,expectedRevision:revision,requestId:randomUUID(),action:'unpublish'};
  const proposal=await rpc(admin.client,'preview_v2_batch_publication',{p_request:publication});await rpc(admin.client,'save_v2_batch_publication',{p_request:publication,p_fingerprint:proposal.fingerprint});
  ok('unpublished-course-and-learning-denied',await course('quant',quant)===null&&await learning('quant',quant)===null,['P4-11']);
  ok('existing-real-libraries-unchanged',await existing()===existingBefore,['P4-04','P4-12']);
  report.status='hosted-fixture-checks-passed';state.status='verification-completed';
 }catch(error){writeFileSync('/tmp/ace-phase4-hosted-qa-debug.json',JSON.stringify({message:error instanceof Error?error.message:'Unknown failure',stack:error instanceof Error?error.stack:null,lastCheck:report.checks.at(-1)?.id},null,2),{mode:0o600});report.status='failed';report.failure='Hosted verification stopped at the last recorded check; private provider and browser diagnostics withheld.';state.status='verification-failed';process.exitCode=1;}
 finally{report.finishedAt=new Date().toISOString();saveReport();save();await browser?.close();}
 console.log(JSON.stringify({status:report.status,checks:report.checks.length,passed:report.checks.filter(c=>c.status==='pass').length,runId:state.runId}));
}
