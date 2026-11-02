import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import {chromium} from 'playwright-core';
import {readConfig,ORIGIN,PROJECT,check} from './phase1-hosted-closeout-config.mjs';
import {verifyRealCourse,describeApprovedFullCourse} from './phase2-real-course-acceptance.mjs';
const readPrivate=path=>{const s=statSync(path);check(s.isFile()&&s.uid===process.getuid()&&(s.mode&0o077)===0,'Owned private QA state required.');return JSON.parse(readFileSync(path,'utf8'));};
const readingOnly=process.argv[2]==='--reading-viewport';
check(process.argv.length===(readingOnly?3:2),'Only the explicit reading-viewport option is accepted.');
const state=readPrivate('/tmp/ace-phase2-hosted-qa-state.json'),config=readConfig('/tmp/ace-phase1-staging.env',{database:false});
check(state.project===PROJECT&&state.status==='verification-failed'&&state.baseline,'An inspected interrupted fixture verification is required.');
const previous=JSON.parse(readFileSync('deliverables/phase2-hosted-acceptance/hosted-results.json','utf8'));
check(previous.commit===state.commit&&previous.runId===state.runId&&previous.checks.some(c=>c.id==='audited-class-completion-replay'&&c.status==='pass')&&previous.checks.some(c=>c.id==='real-notion-original-source:1'&&c.status==='pass'),'Earlier lifecycle and real-source evidence must match.');
check(createHash('sha256').update(readFileSync(state.privateInputs.approvedPlanPath)).digest('hex')===state.privateInputs.approvedPlanSha256,'The approved source plan must remain unchanged.');
const plan=readPrivate(state.privateInputs.approvedPlanPath);
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(u,i)=>fetch(u,{...i,signal:AbortSignal.timeout(20000)})}};
const service=createClient(ORIGIN,config.SUPABASE_SERVICE_ROLE_KEY,options);
const safe=r=>{check(!r.error,'Resource recheck request failed; provider details withheld.');return r.data;};
const report={check:'phase2_hosted_resource_recheck',commit:state.commit,runId:state.runId,project:PROJECT,checks:[],status:'running',mutations:false,scope:readingOnly?'Second original reading viewport and denial checks; earlier PDF and first-reading evidence remains separate.':'Complete real-course resource recheck'};
const save=()=>writeFileSync('deliverables/phase2-hosted-acceptance/resource-recheck.json',JSON.stringify(report,null,2)+'\n');
const ok=(id,value,gates=[])=>{report.checks.push({id,status:value?'pass':'fail',gates});save();console.log(id,value?'pass':'fail');check(value,'Resource acceptance assertion failed.');};
const note=value=>{report.checks.push(value);save();};
let browser;const sessions={};
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const anon=await browser.newContext();const page=await anon.newPage();const share=readFileSync('/tmp/ace-phase2-preview-access','utf8').trim();check(new URL(share).origin===state.preview,'Preview protection scope mismatch.');
 await page.goto(share,{waitUntil:'domcontentloaded'});const protectionCookies=await anon.cookies();await anon.close();
 for(const label of ['full','wrong_subject']){
  const u=state.users.find(u=>u.label===label),identity=safe(await service.auth.admin.getUserById(u.id)).user;
  check(identity.email===u.email&&identity.user_metadata.phase2_qa_run===state.runId,'QA ownership mismatch.');let cookies=[];
  const client=createServerClient(ORIGIN,config.SUPABASE_ANON_KEY,{...options,cookies:{getAll:()=>cookies,setAll:items=>{for(const c of items){cookies=cookies.filter(v=>v.name!==c.name);cookies.push(c);}}}});
  safe(await client.auth.signInWithPassword({email:u.email,password:state.password}));
  const context=await browser.newContext();await context.addCookies([...protectionCookies,...cookies.map(({name,value})=>({name,value,url:state.preview,secure:true,sameSite:'Lax'}))]);
  sessions[label]={client,context,page:await context.newPage()};
 }
 if(!readingOnly){report.realCourse=await verifyRealCourse({state,plan,sessions,browser,protectionCookies,rpc:async(c,n,a)=>safe(await c.rpc(n,a)),ok,note});}else{
  const item=describeApprovedFullCourse(plan).readings[1],p=sessions.full.page;
  await p.setViewportSize({width:390,height:844});await p.goto(`${state.preview}/schedule/v2/${state.realFullCourseBatchId}`,{waitUntil:'domcontentloaded'});
  const article=p.locator('main article[aria-label^="Session content:"]').filter({has:p.getByRole('heading',{name:item.sessionTitle,level:3,exact:true})});
  const resource=article.getByRole('heading',{name:item.title,level:5,exact:true}).locator('..');
  await resource.getByRole('button',{name:'Read here',exact:true}).click();
  const frame=resource.locator('iframe');await frame.waitFor({state:'visible',timeout:30000});await frame.scrollIntoViewIfNeeded();
  ok('real-notion-original-source:1',await frame.getAttribute('src')===item.url&&await frame.getAttribute('title')===item.title,['P2-11','P2-12']);
  const contents=resource.frameLocator('iframe');await contents.locator('[data-block-id],.notion-page-content').first().waitFor({state:'visible',timeout:30000});
  const visibleText=(await contents.locator('body').innerText()).trim();
  ok('real-notion-original-rendered:1',visibleText.length>20&&!/page not found|this page couldn.t be found|you (?:do not|don.t) have access/i.test(visibleText),['P2-11']);
  ok('real-notion-mobile-fit:1',await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),['P2-11']);
  const path=`${state.preview}/api/v2/course-reading?batchId=${state.realFullCourseBatchId}&pageId=${item.pageId}`;
  const denied=await sessions.wrong_subject.context.request.get(path);const anonymous=await browser.newContext();await anonymous.addCookies(protectionCookies);const unauthenticated=await anonymous.request.get(path);await anonymous.close();
  ok('real-notion-negative:1',denied.status()===404&&unauthenticated.status()===404,['P2-17']);
  report.originalEmbedVerified=true;report.apiPageIdentityClaimed=false;
 }report.status='passed';
}catch(e){report.status='failed';report.failureType=e.name;report.reason='Read-only resource verification interrupted; private provider details withheld.';process.exitCode=1;
 if(sessions.full){const p=sessions.full.page;report.frameDiagnostics=await p.locator('iframe').evaluateAll(frames=>frames.map(f=>({visible:f.getBoundingClientRect().height>0,sourceKind:(()=>{try{return /\.notion\.(site|so)$/.test(new URL(f.src).hostname)?'approved-notion-source':'other';}catch{return 'unavailable';}})()}))).catch(()=>[]);}
}finally{await browser?.close();for(const s of Object.values(sessions))await s.client.auth.signOut({scope:'local'});save();console.log(JSON.stringify({status:report.status,passed:report.checks.filter(c=>c.status==='pass').length,failed:report.checks.filter(c=>c.status==='fail').length}));}
