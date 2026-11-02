import { randomUUID,createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { existsSync,mkdirSync,readFileSync,writeFileSync,statSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { chromium } from 'playwright-core';
import { PROJECT,ORIGIN,check,readConfig } from './phase1-hosted-closeout-config.mjs';
import { canonicalCourseSessions,prepareRealCourseAttachment,verifyRealCourse } from './phase2-real-course-acceptance.mjs';
import { QA_CASES,createQaCoursePlan,buildPhase2SetupSql,buildPhase2CleanupSql } from './phase2-hosted-qa-fixtures.mjs';

const mode=process.argv[2];
if(!['prepare','attach-real-course','accept-baseline','verify','accept-cleanup','cleanup-accounts'].includes(mode)){
  console.log('Modes: prepare <Preview URL> <40-character commit>, attach-real-course <batch UUID> <private publication report> <private approved plan>, accept-baseline <setup JSON path>, verify, accept-cleanup <cleanup JSON path>, cleanup-accounts. Staging API keys only; SQL Editor setup/cleanup remain required.');process.exit(0);
}
const privatePath='/tmp/ace-phase2-hosted-qa-state.json',output=resolve('deliverables/phase2-hosted-acceptance');
mkdirSync(output,{recursive:true});
const safe=(result,stage)=>{check(!result.error,`${stage} failed; provider details withheld.`);return result.data;};
const privateJson=path=>{const info=statSync(path);check(info.isFile()&&(info.mode&0o077)===0&&info.uid===process.getuid(),'Private QA files must be owned by the current user and chmod 600.');return JSON.parse(readFileSync(path,'utf8'));};
let state=mode==='prepare'?null:privateJson(privatePath);
const save=()=>{writeFileSync(privatePath,JSON.stringify(state,null,2),{mode:0o600});const {password,privateInputs,...manifest}=state;void password;void privateInputs;writeFileSync(`${output}/fixture-manifest.json`,JSON.stringify(manifest,null,2));};
const saveSql=()=>{writeFileSync(`${output}/01-SETUP-FIXTURES.sql`,buildPhase2SetupSql(state));writeFileSync(`${output}/02-CLEANUP-FIXTURES.sql`,buildPhase2CleanupSql(state));};
if(state){
  const candidate=new URL(state.preview);
  check(state.project===PROJECT&&/^[a-f0-9]{40}$/.test(state.commit)&&candidate.protocol==='https:'
    &&/^ace-club(?:-lms)?-[a-z0-9-]+-theadmitco-techs-projects\.vercel\.app$/.test(candidate.hostname)
    &&candidate.origin===state.preview&&!candidate.username&&!candidate.password,'Wrong staging QA state.');
}
if(mode==='attach-real-course'){
  const batchId=process.argv[3],publication=privateJson(process.argv[4]),plan=privateJson(process.argv[5]);
  Object.assign(state,prepareRealCourseAttachment(state,batchId,publication,plan));
  state.privateInputs={approvedPlanPath:resolve(process.argv[5]),approvedPlanSha256:createHash('sha256').update(readFileSync(process.argv[5])).digest('hex')};
  save();saveSql();console.log(JSON.stringify({status:'real-course-attached-before-fixture-setup',batchId,resourceCount:state.realCourseReview.itemCount}));process.exit(0);
}
if(mode==='accept-baseline'){
  const result=JSON.parse(readFileSync(process.argv[3],'utf8'));
  check(result.check==='phase2_qa_fixture_setup'&&result.run_id===state.runId&&result.qa_accounts===9&&result.batches===5&&result.purchases===7
    &&(result.real_course_enrollments??0)===(state.realFullCourseBatchId?1:0)&&/^[a-f0-9]{32}$/.test(result.baseline?.md5)&&Number.isInteger(result.baseline?.table_count),'Setup report does not match the generated fixture run.');
  check(state.status==='accounts-created-awaiting-sql','QA setup report is not expected in the current state.');
  state.baseline=result.baseline;state.status='ready-for-verification';save();saveSql();console.log(JSON.stringify({status:state.status,runId:state.runId}));process.exit(0);
}
if(mode==='accept-cleanup'){
  const result=JSON.parse(readFileSync(process.argv[3],'utf8'));
  check(result.check==='phase2_qa_fixture_cleanup'&&result.run_id===state.runId&&result.baseline_restored===true&&result.fingerprint?.md5===state.baseline?.md5,'Cleanup report does not restore the recorded baseline.');
  state.cleanup=result;state.status='sql-cleaned';save();console.log(JSON.stringify({status:state.status,runId:state.runId}));process.exit(0);
}
const config=readConfig('/tmp/ace-phase1-staging.env',{database:false});
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(20000)})}};
const service=createClient(ORIGIN,config.SUPABASE_SERVICE_ROLE_KEY,options);
const rpc=async(client,name,args)=>safe(await client.rpc(name,args),name);
const verifyOwned=async(u)=>{const data=safe(await service.auth.admin.getUserById(u.id),'Verify dedicated QA ownership');check(data.user.email===u.email&&data.user.user_metadata.phase2_qa_run===state.runId,'Generated account ownership mismatch.');};
const signIn=async(u)=>{
  await verifyOwned(u);let cookies=[];
  const client=createServerClient(ORIGIN,config.SUPABASE_ANON_KEY,{...options,cookies:{getAll:()=>cookies,setAll:items=>{for(const c of items){cookies=cookies.filter(v=>v.name!==c.name);cookies.push(c);}}}});
  safe(await client.auth.signInWithPassword({email:u.email,password:state.password}),'Sign in dedicated QA identity');return {...u,client,cookies};
};
if(mode==='prepare'){
  check(!existsSync(privatePath),'A Phase 2 QA state already exists; inspection or cleanup must precede another run.');
  const preview=new URL(process.argv[3]);
  check(preview.protocol==='https:'&&/^ace-club(?:-lms)?-[a-z0-9-]+-theadmitco-techs-projects\.vercel\.app$/.test(preview.hostname)&&preview.pathname==='/'&&!preview.search&&!preview.hash,'An explicit LMS Preview deployment URL is required.');
  check(/^[a-f0-9]{40}$/.test(process.argv[4]??''),'An explicit candidate commit is required.');
  safe(await service.auth.admin.listUsers({page:1,perPage:1}),'Staging Auth preflight');
  state={project:PROJECT,runId:randomUUID(),preview:preview.origin,commit:process.argv[4],createdAt:new Date().toISOString(),status:'creating-accounts',password:`Qa!${randomUUID()}Aa9`,users:[],courses:createQaCoursePlan(),databasePasswordUsed:false};save();
  try{
    for(const c of QA_CASES){
      const email=`ace-p2-${c.label}-${state.runId}@example.invalid`;
      const created=safe(await service.auth.admin.createUser({email,password:state.password,email_confirm:true,user_metadata:{full_name:`Phase 2 QA ${c.label}`,phase2_qa_run:state.runId}}),'Create dedicated QA account');
      const u={id:created.user.id,label:c.label,email};state.users.push(u);save();await verifyOwned(u);
      safe(await service.from('profiles').upsert({id:u.id,email,full_name:`Phase 2 QA ${c.label}`,role:c.role??'student',is_active:true}),'Prepare dedicated QA profile');
    }
    state.status='accounts-created-awaiting-sql';save();saveSql();console.log(JSON.stringify({status:state.status,accounts:state.users.length,runId:state.runId}));
  }catch{
    state.status='prepare-failed';state.deletedAccountIds=[];
    for(const u of [...state.users].reverse()){try{await verifyOwned(u);safe(await service.auth.admin.deleteUser(u.id),'Remove partial QA account');state.deletedAccountIds.push(u.id);}catch{break;}}
    if(state.deletedAccountIds.length===state.users.length)delete state.password;save();console.log(JSON.stringify({status:state.status,accountsRemoved:state.deletedAccountIds.length}));process.exitCode=1;
  }
}else if(mode==='cleanup-accounts'){
  check(state.status==='sql-cleaned'&&state.cleanup?.baseline_restored,'Verified SQL cleanup is required before account deletion.');
  for(const u of state.users){const rows=safe(await service.from('v2_purchases').select('id').eq('student_id',u.id).limit(1),'Check fixture purchase cleanup');check(rows.length===0,'Fixture purchases remain.');}
  state.deletedAccountIds??=[];
  for(const u of [...state.users].reverse()){
    if(state.deletedAccountIds.includes(u.id))continue;await verifyOwned(u);safe(await service.auth.admin.deleteUser(u.id),'Remove exact generated QA account');state.deletedAccountIds.push(u.id);save();
  }
  state.status='cleaned';state.cleanedAt=new Date().toISOString();delete state.password;save();console.log(JSON.stringify({status:state.status,accountsRemoved:state.deletedAccountIds.length}));
}else{
  check(state.status==='ready-for-verification','A recorded SQL setup baseline is required; a failed or completed verification must be reviewed before another run.');
  const accessFile='/tmp/ace-phase2-preview-access';const accessInfo=statSync(accessFile);
  check((accessInfo.mode&0o077)===0&&accessInfo.uid===process.getuid(),'Preview access link must remain private.');
  const accessUrl=readFileSync(accessFile,'utf8').trim();check(new URL(accessUrl).origin===state.preview&&new URL(accessUrl).searchParams.has('_vercel_share'),'Preview protection link does not match the candidate.');
  const report={runId:state.runId,project:PROJECT,commit:state.commit,startedAt:new Date().toISOString(),status:'running',checks:[],limitations:[
    'Synthetic fixtures prove application and authorization behavior; real-material import fidelity requires separate source mapping and comparison evidence.',
    'External source sharing and private storage objects require actual imported-resource checks; synthetic resource URLs are not downloaded.',
    'Existing legacy mock and worksheet content is protected by the SQL setup/cleanup fingerprint; authenticated legacy browser journeys remain separate.',
    'Cleanup is required before final acceptance. Manual live registration does not establish a live-fee payment.',
  ]};
  const saveReport=()=>writeFileSync(`${output}/hosted-results.json`,JSON.stringify(report,null,2));
  const ok=(id,value,gates=[])=>{report.checks.push({id,status:value?'pass':'fail',gates});saveReport();check(value,`Hosted check failed: ${id}`);};
  let browser;const sessions={};state.status='verification-running';save();saveReport();
  try{
    browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
    const publicContext=await browser.newContext();const page=await publicContext.newPage();await page.goto(accessUrl,{waitUntil:'domcontentloaded'});
    await page.goto(`${state.preview}/qa/phase1`,{waitUntil:'domcontentloaded'});
    const environment=await page.evaluate(async()=>{const r=await fetch('/api/v2/phase1-verification',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});return r.json();});
    ok('exact-preview-and-staging',environment.commit===state.commit&&environment.stagingProject===PROJECT&&environment.overall!=='fail');
    const protectionCookies=(await publicContext.cookies()).filter(c=>!c.name.startsWith('sb-'));
    const anonymous=await publicContext.request.get(`${state.preview}/api/v2/course-reading?batchId=${state.courses[0].batchId}&pageId=${'a'.repeat(32)}`);ok('anonymous-reading-denied',anonymous.status()===404,['P2-17']);
    await publicContext.close();
    for(const u of state.users){const session=await signIn(u);sessions[u.label]=session;session.context=await browser.newContext();await session.context.addCookies([...protectionCookies,...session.cookies.map(({name,value})=>({name,value,url:state.preview,secure:true,sameSite:'Lax'}))]);session.page=await session.context.newPage();}
    const admin=sessions.admin,quant=state.courses.find(c=>c.label==='quant'),draft=state.courses.find(c=>c.label==='quant_draft'),full=state.courses.find(c=>c.label==='full_course');
    const templates=await rpc(admin.client,'list_v2_template_drafts');const batches=await rpc(admin.client,'list_v2_batch_drafts');
    ok('all-offerings-authored',state.courses.every(c=>templates.some(t=>t.id===c.templateId&&t.productCode===c.product)),['P2-01','P2-03']);
    ok('undated-offerings-retained',state.courses.filter(c=>!c.live).every(c=>batches.some(b=>b.id===c.batchId&&b.events.length===0&&b.sessions.length>0)),['P2-06']);
    for(const label of ['eligible','unregistered','expired','revoked','inactive','wrong_subject','empty','admin']){
      const session=sessions[label];const course=await rpc(session.client,'get_my_v2_published_course',{p_batch_id:quant.batchId});
      ok(`course-access:${label}`,Boolean(course)===['eligible','unregistered'].includes(label),['P2-17']);
      const meeting=await rpc(session.client,'get_my_v2_meeting',{p_batch_id:quant.batchId,p_event_key:quant.eventKey});
      ok(`meeting-access:${label}`,Boolean(meeting)===(label==='eligible'),['P2-13']);
      const hidden=await rpc(session.client,'get_my_v2_published_course',{p_batch_id:draft.batchId});ok(`unpublished-hidden:${label}`,hidden===null,['P2-17']);
    }
    const fullCourse=await rpc(sessions.full.client,'get_my_v2_published_course',{p_batch_id:full.batchId});ok('full-course-programme-content',fullCourse.sessions.some(s=>s.section==='programme'),['P2-02','P2-17']);
    const selected=await rpc(sessions.eligible.client,'get_my_v2_published_course',{p_batch_id:quant.batchId});
    ok('exact-pinned-session-content',JSON.stringify(canonicalCourseSessions(selected.sessions))===JSON.stringify(canonicalCourseSessions(quant.document.sessions)),['P2-03','P2-10','P2-11']);
    for(const table of ['v2_course_templates','v2_course_template_revisions','v2_course_batches','v2_course_batch_revisions','v2_batch_meeting_revisions','v2_batch_publication_revisions','v2_batch_enrollments','v2_published_meetings','v2_live_registrations','v2_live_registration_audit','v2_live_class_completions','v2_shared_content_assets','v2_content_imports','v2_content_asset_placements','v2_publication_scope_requests']){
      const result=await sessions.eligible.client.from(table).select('*').limit(1);ok(`private-table-hidden:${table}`,!result.error&&result.data.length===0,['P2-17']);
    }
    const denied=await sessions.eligible.client.rpc('complete_v2_live_class',{p_batch_id:quant.batchId,p_event_key:quant.eventKey,p_publication_revision:1});ok('student-completion-denied',denied.error?.code==='42501',['P2-14','P2-17']);
    await sessions.eligible.page.goto(`${state.preview}/schedule/v2/${quant.batchId}`,{waitUntil:'domcontentloaded'});
    const visible=await sessions.eligible.page.locator('main').innerText();
    ok('student-course-visible',visible.includes(quant.document.sessions[0].title)&&Object.values(quant.document.sessions[0].content).flat().every(i=>visible.includes(i.title)),['P2-10','P2-11']);
    const positions=['Pre-class read','Recording','Post-class read','Worksheet'].map(label=>visible.indexOf(label));ok('student-session-stage-order',positions.every((n,i)=>n>=0&&(i===0||n>positions[i-1])),['P2-03']);
    await sessions.eligible.page.setViewportSize({width:390,height:844});ok('student-course-mobile-fit',await sessions.eligible.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),['P2-11']);
    const unrelatedReading=await sessions.eligible.context.request.get(`${state.preview}/api/v2/course-reading?batchId=${quant.batchId}&pageId=${'a'.repeat(32)}`);ok('unrelated-reading-api-denied',unrelatedReading.status()===404,['P2-17']);
    const arbitraryFile=await sessions.eligible.context.request.get(`${state.preview}/api/v2/materials/file?batchId=${quant.batchId}&sessionKey=${quant.document.sessions[0].key}&itemKey=${quant.document.sessions[0].content.materials[0].key}&path=unrelated.pdf`);ok('arbitrary-storage-path-denied',arbitraryFile.status()===404,['P2-17']);
    await admin.page.goto(`${state.preview}/admin/v2/templates`,{waitUntil:'domcontentloaded'});await admin.page.getByRole('heading',{name:/session|template/i}).first().waitFor({state:'visible',timeout:30000});ok('admin-authoring-visible',await admin.page.getByRole('heading',{name:'Course session configuration'}).count()>0||await admin.page.getByRole('heading',{name:/session|template/i}).count()>0,['P2-01']);
    await admin.page.goto(`${state.preview}/admin/v2/batches/${quant.batchId}/live`,{waitUntil:'domcontentloaded'});await admin.page.getByRole('heading',{name:'Live registrations',exact:true}).waitFor({state:'visible',timeout:30000});ok('admin-live-operations-visible',await admin.page.getByRole('heading',{name:'Live registrations',exact:true}).count()===1,['P2-13','P2-14']);
    // Global publication scope is confirmed only when every server-selected batch is an exact fixture.
    const scopeInput={requestId:randomUUID(),action:'publish',productCodes:['quant']};
    const scope=await rpc(admin.client,'preview_v2_publication_scope',{p_request:scopeInput});
    if(scope.proposal.items.every(item=>state.courses.some(c=>c.batchId===item.document.batchId))){
      const result=await rpc(admin.client,'save_v2_publication_scope',{p_request:scopeInput,p_fingerprint:scope.fingerprint});
      ok('universal-publication-exact-fixture-scope',result.documents.length===scope.proposal.items.length,['P2-09']);
      const replay=await rpc(admin.client,'save_v2_publication_scope',{p_request:scopeInput,p_fingerprint:scope.fingerprint});ok('universal-publication-replay',replay.replayed===true,['P2-08','P2-09']);
    }else{report.checks.push({id:'universal-publication-confirmation',status:'not-run',gates:['P2-09'],reason:'Server-selected scope includes existing non-fixture batches; only preview was inspected.'});saveReport();}
    const current=(await rpc(admin.client,'list_v2_batch_publications')).find(p=>p.batchId===quant.batchId);
    check(current,'Fixture publication unavailable.');
    const completionArgs={p_batch_id:quant.batchId,p_event_key:quant.eventKey,p_publication_revision:current.revision};
    await admin.page.goto(`${state.preview}/admin/v2/batches/${quant.batchId}/live`,{waitUntil:'domcontentloaded'});
    await admin.page.getByRole('button',{name:'Mark class complete',exact:true}).click();
    await admin.page.getByRole('heading',{name:'Mark this live class complete?',exact:true}).waitFor();
    await admin.page.getByRole('button',{name:'Confirm',exact:true}).click();
    await admin.page.getByText('Class completion recorded. Attendance and feedback remain separate.',{exact:true}).waitFor({timeout:20000});
    const statuses=await rpc(admin.client,'list_v2_live_class_status',{p_batch_id:quant.batchId});
    const completed=statuses.find(event=>event.eventKey===quant.eventKey);const replay=await rpc(admin.client,'complete_v2_live_class',completionArgs);
    ok('audited-class-completion-replay',Boolean(completed?.completedAt)&&replay.replayed===true&&completed.completedAt===replay.completedAt,['P2-14','P2-15']);
    ok('completed-class-join-closed',await rpc(sessions.eligible.client,'get_my_v2_meeting',{p_batch_id:quant.batchId,p_event_key:quant.eventKey})===null,['P2-13','P2-14']);
    ok('completion-preserves-course-content',Boolean(await rpc(sessions.eligible.client,'get_my_v2_published_course',{p_batch_id:quant.batchId})),['P2-15']);
    if(state.realFullCourseBatchId){
      const input=state.privateInputs;
      check(input&&createHash('sha256').update(readFileSync(input.approvedPlanPath)).digest('hex')===input.approvedPlanSha256,'Reviewed real-course plan changed.');
      report.realCourseAcceptance=await verifyRealCourse({state,plan:privateJson(input.approvedPlanPath),sessions,browser,protectionCookies,rpc,ok,note:(entry)=>{report.checks.push(entry);saveReport();}});
      report.limitations=report.limitations.filter(value=>!value.startsWith('Synthetic fixtures prove')&&!value.startsWith('External source sharing'));
    }
    report.status=report.checks.some(c=>c.status==='not-run'||c.status==='inconclusive')?'partial-hosted-acceptance':'hosted-fixture-checks-passed';state.status='verification-completed';
  }catch(error){report.status='failed';report.failure=typeof error.message==='string'&&/^(Hosted check failed:|[A-Za-z_]+ failed; provider|Fixture publication)/.test(error.message)?error.message:'Verification interrupted; private provider details withheld.';state.status='verification-failed';process.exitCode=1;}
  finally{await browser?.close();report.completedAt=new Date().toISOString();saveReport();save();console.log(JSON.stringify({status:report.status,passed:report.checks.filter(c=>c.status==='pass').length,failed:report.checks.filter(c=>c.status==='fail').length,cleanupRequired:true}));}
}
