import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createServerClient} from '@supabase/ssr';
import {chromium} from 'playwright-core';
import {readConfig,ORIGIN,PROJECT,check} from '../phase1-hosted-closeout-config.mjs';
import {stagingFetch} from '../phase6/staging-fetch.mjs';
const directory='.env.admin_workflow-private',evidence='deliverables/admin-workflow-integration-2026-11-04';
const state=JSON.parse(readFileSync(directory+'/state.json','utf8')),candidate=JSON.parse(readFileSync(evidence+'/preview-environment.json','utf8'));
check(state.project===PROJECT&&!state.cleaned&&candidate.branch==='intern/v2-admin-workflow-review'&&candidate.stagingProject===PROJECT&&candidate.state==='READY','Dedicated staging Preview required.');
const config=readConfig(process.env.ACE_ADMIN_ENV_FILE,{database:false});
let cookies=[],browser;const report={check:'admin_workflow_protected_material',commit:candidate.commit,preview:candidate.preview,project:PROJECT,recordedAt:new Date().toISOString(),status:'running',scope:'Read-only protected PDF delivery for a dedicated staging Admin; resource references remain private.',checks:[]};
try {
 const client=createServerClient(ORIGIN,config.SUPABASE_ANON_KEY,{global:{fetch:stagingFetch},cookies:{getAll:()=>cookies,setAll:items=>{for(const item of items){cookies=cookies.filter(c=>c.name!==item.name);cookies.push(item);}}}});
 const user=state.users.find(user=>user.role==='admin'),signed=await client.auth.signInWithPassword({email:user.email,password:state.password});check(!signed.error&&signed.data.user.id===user.id,'Dedicated Admin sign-in required.');
 const workspace=await client.rpc('list_v2_content_workspace');check(!workspace.error,'Authorized content workspace required.');
 const resources=workspace.data.courses.flatMap(course=>course.sessions.flatMap(session=>Object.values(session.content).flat()));
 const pdf=resources.find(item=>item.url.startsWith('/api/materials/file?path='));check(pdf,'Existing protected PDF required.');
 const path=pdf.url.replace('/api/materials/file?','/api/admin/v2/materials/file?');
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const context=await browser.newContext();const page=await context.newPage();
 const link=readFileSync(directory+'/preview-access','utf8').trim();check(new URL(link).origin===candidate.preview,'Private link origin mismatch.');await page.goto(link,{waitUntil:'domcontentloaded',timeout:60000});await context.addCookies(cookies.map(({name,value})=>({name,value,url:candidate.preview,secure:true,sameSite:'Lax'})));
 const response=await context.request.get(candidate.preview+path,{timeout:60000});const bytes=await response.body();
 const pass=response.status()===200&&response.headers()['content-type']?.includes('application/pdf')&&bytes.subarray(0,5).toString()==='%PDF-';report.checks.push({id:'admin-protected-pdf-delivery',status:pass?'pass':'fail',httpStatus:response.status()});check(pass,'Protected PDF delivery failed.');report.status='passed';
}catch(error){report.status='failed';writeFileSync(directory+'/material-error.log',String(error?.stack??error),{mode:0o600});process.exitCode=1;}
finally{await browser?.close();report.scriptSha256=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');writeFileSync(evidence+'/hosted-material-results.json',JSON.stringify(report,null,2)+'\n');console.info(JSON.stringify({status:report.status,checks:report.checks.length}));}
