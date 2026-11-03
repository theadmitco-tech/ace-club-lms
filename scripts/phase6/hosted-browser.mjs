import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createServerClient} from '@supabase/ssr';
import {chromium} from 'playwright-core';
import {readConfig,ORIGIN,PROJECT,check} from '../phase1-hosted-closeout-config.mjs';
import {stagingFetch} from './staging-fetch.mjs';

const state=JSON.parse(readFileSync('.env.phase6-private/state.json','utf8'));
const candidate=JSON.parse(readFileSync('deliverables/phase6-staging-acceptance/preview-environment.json','utf8'));
check(state.project===PROJECT&&!state.cleaned&&state.users.length===2&&state.rpcPassed,'Confirmed QA and RPC verification required.');
check(candidate.commit==='bcc0231e51ae93e266a3232aa316ef934b0e825b'&&candidate.stagingProject===PROJECT&&candidate.state==='READY','Exact reviewed Preview required.');
const config=readConfig(process.env.ACE_PHASE6_ENV_FILE,{database:false});
const report={check:'phase6_hosted_browser_conflict',recordedAt:new Date().toISOString(),commit:candidate.commit,preview:candidate.preview,project:PROJECT,status:'running',scope:'Dedicated synthetic Admin/Student; no purchase, enrollment, course edit or payment. A new-template request is deliberately changed to reference a nonexistent revision.',checks:[]};
const record=(id,pass)=>{report.checks.push({id,status:pass?'pass':'fail'});check(pass,id);};
const continuation=process.argv[2]==='--continue';
if(continuation){const previous=JSON.parse(readFileSync('deliverables/phase6-staging-acceptance/hosted-browser-attempt-02.json','utf8'));check(previous.commit===candidate.commit&&previous.checks.length===4&&previous.checks.every(c=>c.status==='pass'),'Exact completed browser evidence required.');report.checks=previous.checks.map(c=>({...c,sourceReport:'hosted-browser-attempt-02.json',recordedAt:previous.recordedAt}));report.resumedFrom='hosted-browser-attempt-02.json';}
let browser;
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const publicContext=await browser.newContext(),publicPage=await publicContext.newPage();publicPage.setDefaultNavigationTimeout(60000);
 const link=readFileSync('.env.phase6-private/preview-access','utf8').trim();check(new URL(link).origin===candidate.preview,'Private link candidate mismatch.');
 await publicPage.goto(link,{waitUntil:'networkidle'});const protectionCookies=await publicContext.cookies();
 if(!continuation){
 await publicPage.goto(candidate.preview+'/qa/phase1',{waitUntil:'networkidle'});
 await publicPage.getByRole('button',{name:'Run read-only staging checks',exact:true}).click();await publicPage.locator('pre').waitFor();const diagnostic=JSON.parse(await publicPage.locator('pre').innerText());record('exact-preview-staging-and-commit',diagnostic.stagingProject===PROJECT&&diagnostic.commit===candidate.commit&&diagnostic.checks.find(c=>c.id==='environment')?.status==='pass');
 await publicPage.goto(candidate.preview+'/courses/v2',{waitUntil:'networkidle'});record('public-course-options-render',await publicPage.getByRole('heading',{name:'A complete curriculum. A package that fits you.',exact:true}).count()===1);
 }
 const contexts={};
 for(const user of state.users){
  let cookies=[];const client=createServerClient(ORIGIN,config.SUPABASE_ANON_KEY,{global:{fetch:stagingFetch},cookies:{getAll:()=>cookies,setAll:items=>{for(const item of items){cookies=cookies.filter(c=>c.name!==item.name);cookies.push(item);}}}});
  const signed=await client.auth.signInWithPassword({email:user.email,password:state.password});check(!signed.error&&signed.data.user.id===user.id&&signed.data.user.user_metadata.phase6_qa_run===state.runId,'Synthetic browser identity mismatch.');
  const context=await browser.newContext();context.setDefaultNavigationTimeout(60000);context.setDefaultTimeout(20000);await context.addCookies([...protectionCookies,...cookies.map(({name,value})=>({name,value,url:candidate.preview,secure:true,sameSite:'Lax'}))]);
  const page=await context.newPage();page.on('dialog',dialog=>dialog.accept());contexts[user.role]={page,client,context};
 }
 const {page:admin,client:adminClient}=contexts.admin;
 const templates=await adminClient.rpc('list_v2_template_drafts');check(!templates.error,'Template snapshot unavailable.');const fingerprint=items=>createHash('sha256').update(JSON.stringify(items)).digest('hex');
 const original=fingerprint(templates.data);const existingIds=new Set(templates.data.map(t=>t.id));
 if(!continuation){
 await admin.goto(candidate.preview+'/admin/v2/templates',{waitUntil:'networkidle'});await admin.getByRole('heading',{name:'V2 course templates',exact:true}).waitFor();record('admin-template-editor-loads',true);
 await admin.getByRole('button',{name:'Quant',exact:true}).click();await admin.locator('#template-title').fill('Synthetic conflict-only browser request');
 let intercepted=0,transportRecognized=true;
 await admin.route('**/admin/v2/templates',async route=>{
  const request=route.request();if(request.method()!=='POST'||!request.headers()['next-action'])return route.continue();
  try{
   const payload=JSON.parse(request.postData());const input=payload[0];
   check(Array.isArray(payload)&&payload.length===1&&input.document.title==='Synthetic conflict-only browser request'&&input.expectedRevision===0&&!existingIds.has(input.id),'Unexpected Server Action payload.');
   input.expectedRevision=1;intercepted++;await route.continue({postData:JSON.stringify(payload)});
  }catch{transportRecognized=false;await route.abort();}
 });
 await admin.getByRole('button',{name:'Save draft',exact:true}).click();
 await admin.getByText('A newer revision exists. Reload the latest draft before saving again.',{exact:true}).waitFor();
 record('stale-server-action-displays-specific-reload-guidance',transportRecognized&&intercepted===1);
 await admin.getByRole('alert').filter({hasText:'A newer revision exists.'}).screenshot({path:'deliverables/phase6-staging-acceptance/stale-template-message.png'});
 await admin.unroute('**/admin/v2/templates');
 }
 const after=await adminClient.rpc('list_v2_template_drafts');record('rejected-browser-action-created-no-template',!after.error&&(continuation?!after.data.some(t=>t.document.title==='Synthetic conflict-only browser request'):fingerprint(after.data)===original));
 await admin.goto(candidate.preview+'/admin/v2/batches',{waitUntil:'networkidle'});await admin.getByRole('heading',{name:'V2 batch drafts',exact:true}).waitFor();record('admin-batch-editor-loads',true);
 await admin.goto(candidate.preview+'/admin/v2/content',{waitUntil:'networkidle'});await admin.getByRole('heading',{name:'Readings, recordings & materials',exact:true}).waitFor();record('admin-content-workspace-loads',true);
 const student=contexts.student.page;
 await student.goto(candidate.preview+'/account/access',{waitUntil:'networkidle'});await student.getByText('No active course purchase',{exact:true}).waitFor();record('student-empty-access-state',true);await student.locator('main').screenshot({path:'deliverables/phase6-staging-acceptance/student-empty-access.png'});
 await student.goto(candidate.preview+'/account/access/upgrade',{waitUntil:'networkidle'});await student.getByText('There is no active individual package to upgrade.',{exact:true}).waitFor();record('student-ineligible-upgrade-state',true);
 await student.goto(candidate.preview+'/admin/v2/templates',{waitUntil:'networkidle'});record('student-admin-editor-denied',await student.getByRole('heading',{name:'V2 course templates',exact:true}).count()===0);
 const protectedResponse=await student.request.get(candidate.preview+'/api/v2/content/file?batchId=2b19ea33-150c-5ddd-aae7-134831603408&sessionKey=00000000-0000-4000-8000-000000000001&itemKey=00000000-0000-4000-8000-000000000002&format=pdf');record('student-unentitled-direct-resource-denied',[401,403,404].includes(protectedResponse.status()));
 report.status='passed';
}catch(error){report.status='failed';writeFileSync('.env.phase6-private/browser-error.log',String(error?.stack??error),{mode:0o600});process.exitCode=1;}
finally{await browser?.close();report.scriptSha256=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');writeFileSync('deliverables/phase6-staging-acceptance/hosted-browser-results.json',JSON.stringify(report,null,2)+'\n');console.info(JSON.stringify({status:report.status,checks:report.checks.length,failed:report.checks.filter(c=>c.status==='fail').map(c=>c.id)}));}
