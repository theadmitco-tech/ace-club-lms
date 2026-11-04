import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createServerClient} from '@supabase/ssr';
import {chromium} from 'playwright-core';
import {readConfig,ORIGIN,PROJECT,check} from '../phase1-hosted-closeout-config.mjs';
import {stagingFetch} from '../phase6/staging-fetch.mjs';
const scriptSha256=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');
const directory='.env.admin_workflow-private',evidence='deliverables/admin-workflow-integration-2026-11-04';
const state=JSON.parse(readFileSync(directory+'/state.json','utf8'));
const candidate=JSON.parse(readFileSync(evidence+'/preview-environment.json','utf8'));
check(state.project===PROJECT&&!state.cleaned&&state.users.length===2,'Dedicated QA identities required.');
check(candidate.branch==='intern/v2-admin-workflow-review'&&candidate.stagingProject===PROJECT&&candidate.state==='READY','Reviewed Preview required.');
const config=readConfig(process.env.ACE_ADMIN_ENV_FILE,{database:false});
const report={check:'admin_workflow_hosted_browser',recordedAt:new Date().toISOString(),commit:candidate.commit,preview:candidate.preview,project:PROJECT,status:'running',scope:'Read-only application journeys in dedicated synthetic Admin/Student sessions; no purchase, enrollment, publication, schedule or learning writes.',checks:[]};
const record=(id,pass)=>{report.checks.push({id,status:pass?'pass':'fail'});console.info(JSON.stringify({check:id,status:pass?'pass':'fail'}));check(pass,id);};
let browser;let adminPage;const runtimeErrors=[];
try {
 const sessions=[];
 for(const user of state.users){let cookies=[];const client=createServerClient(ORIGIN,config.SUPABASE_ANON_KEY,{global:{fetch:stagingFetch},cookies:{getAll:()=>cookies,setAll:items=>{for(const item of items){cookies=cookies.filter(c=>c.name!==item.name);cookies.push(item);}}}});
  const signed=await client.auth.signInWithPassword({email:user.email,password:state.password});check(!signed.error&&signed.data.user.id===user.id&&signed.data.user.user_metadata.admin_workflow_qa_run===state.runId,'Dedicated identity mismatch.');
  sessions.push({user,client,cookies});
 }
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const publicContext=await browser.newContext(),page=await publicContext.newPage();page.setDefaultNavigationTimeout(60000);page.setDefaultTimeout(20000);
 const link=readFileSync(directory+'/preview-access','utf8').trim();check(new URL(link).origin===candidate.preview,'Private link candidate mismatch.');
 await page.goto(link,{waitUntil:'domcontentloaded'});const protection=await publicContext.cookies();
 await page.goto(candidate.preview+'/qa/phase1',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Run read-only staging checks',exact:true}).click();await page.locator('pre').waitFor();const diagnostic=JSON.parse(await page.locator('pre').innerText());record('preview-commit-and-staging-match',diagnostic.commit===candidate.commit&&diagnostic.stagingProject===PROJECT&&diagnostic.checks.find(c=>c.id==='environment')?.status==='pass');
 const contexts={};
 for(const {user,client,cookies} of sessions){  const context=await browser.newContext({viewport:{width:1440,height:1000}});context.setDefaultNavigationTimeout(60000);context.setDefaultTimeout(20000);await context.addCookies([...protection,...cookies.map(({name,value})=>({name,value,url:candidate.preview,secure:true,sameSite:'Lax'}))]);contexts[user.role]={context,page:await context.newPage(),client};
 }
 const {page:admin,client}=contexts.admin;adminPage=admin;admin.on('pageerror',error=>runtimeErrors.push(error.message));
 const snapshot=async()=>{const results=await Promise.all(['list_v2_template_drafts','list_v2_batch_drafts','list_v2_batch_publications'].map(name=>client.rpc(name)));check(results.every(result=>!result.error),'Read-only source snapshot required.');return createHash('sha256').update(JSON.stringify(results.map(result=>result.data))).digest('hex');};
 const original=await snapshot();
 await admin.goto(candidate.preview+'/admin',{waitUntil:'networkidle'});await admin.getByRole('heading',{name:'A clear place to start',exact:true}).waitFor();record('admin-home-loads',true);record('four-primary-destinations',await admin.getByRole('navigation',{name:'Admin navigation',exact:true}).getByRole('button').count()===4);
 await admin.goto(candidate.preview+'/admin/v2/content',{waitUntil:'networkidle'});await admin.getByRole('heading',{name:'Course content',exact:true}).waitFor();record('real-content-workspace-loads',await admin.getByRole('button').filter({hasText:'published course'}).count()>0);
 const course=admin.getByRole('button').filter({hasText:'published course'}).first();await course.click();await admin.getByRole('combobox',{name:'Choose a session',exact:true}).waitFor();record('course-session-outline-loads',await admin.getByRole('combobox',{name:'Choose a session',exact:true}).locator('option').count()>0);
 for(const title of ['Pre-class read','Recording','Post-class read','Worksheet'])record('ordered-resource-'+title.toLowerCase().replaceAll(' ','-'),await admin.getByRole('heading',{name:new RegExp(title,'i')}).count()>0);
 const preview=admin.getByRole('link',{name:'Preview as student ↗',exact:true});record('student-preview-is-separate-tab',await preview.getAttribute('target')==='_blank');
 const previewPath=await preview.getAttribute('href');const previewPage=await contexts.admin.context.newPage();const response=await previewPage.goto(candidate.preview+previewPath,{waitUntil:'domcontentloaded'});await previewPage.getByText('Student presentation of the selected content revision.',{exact:false}).waitFor();record('real-student-preview-renders',response.status()===200);await previewPage.close();
 await admin.goto(candidate.preview+'/admin/v2/batches',{waitUntil:'networkidle'});await admin.getByRole('heading',{name:'Batches',exact:true}).waitFor();await admin.getByRole('button',{name:'Open batch',exact:true}).first().click();await admin.getByRole('button',{name:'Review & publish',exact:true}).waitFor();record('batch-task-workspace-loads',true);await admin.getByRole('button',{name:'Review & publish',exact:true}).click();await admin.getByRole('button',{name:'Preview publication',exact:true}).waitFor();record('publication-remains-explicit',await admin.getByRole('button',{name:'Confirm publish',exact:true}).count()===0);
 await admin.goto(candidate.preview+'/admin/v2/students',{waitUntil:'networkidle'});await admin.getByRole('heading',{name:'Students',exact:true}).waitFor();await admin.getByLabel('Search student name').fill('Workflow QA student');await admin.getByRole('button',{name:'Search',exact:true}).click();await admin.waitForURL(/q=/);await admin.getByRole('link',{name:'View access',exact:true}).first().click();await admin.getByText('No V2 purchase is recorded.',{exact:false}).waitFor();record('student-search-and-empty-access-load',true);
 await admin.setViewportSize({width:390,height:844});await admin.goto(candidate.preview+'/admin',{waitUntil:'networkidle'});await admin.getByRole('button',{name:'Open admin navigation',exact:true}).click();await admin.getByRole('button',{name:'Students',exact:true}).waitFor();await admin.keyboard.press('Escape');record('mobile-navigation-dismisses',await admin.getByRole('button',{name:'Open admin navigation',exact:true}).getAttribute('aria-expanded')==='false');record('mobile-has-no-horizontal-overflow',await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const student=contexts.student.page;
 await student.goto(candidate.preview+'/admin/v2/students',{waitUntil:'networkidle'});record('student-denied-admin-search',await student.getByLabel('Search student name').count()===0);
 const denied=await student.request.post(candidate.preview+'/api/admin/v2/content',{headers:{Origin:candidate.preview},data:{action:'workspace',input:{}}});const deniedBody=await denied.json();record('student-denied-content-api',denied.status()===400&&deniedBody.error==='Active Admin content access required.'&&!deniedBody.items);
 record('templates-batches-publications-unchanged',await snapshot()===original);report.status='passed';
} catch(error){report.status='failed';if(adminPage){await adminPage.screenshot({path:directory+'/browser-failure.png',fullPage:true}).catch(()=>{});writeFileSync(directory+'/browser-runtime.json',JSON.stringify({errors:runtimeErrors,url:adminPage.url(),body:await adminPage.locator('body').innerText().catch(()=>null)}),{mode:0o600});}writeFileSync(directory+'/browser-error.log',String(error?.stack??error),{mode:0o600});process.exitCode=1;}
finally{await browser?.close();report.scriptSha256=scriptSha256;writeFileSync(evidence+'/hosted-browser-results.json',JSON.stringify(report,null,2)+'\n');console.info(JSON.stringify({status:report.status,checks:report.checks.length,failed:report.checks.filter(item=>item.status==='fail').map(item=>item.id)}));}
