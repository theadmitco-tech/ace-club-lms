import {readFileSync,writeFileSync} from 'node:fs';
import {createServerClient} from '@supabase/ssr';
import {chromium} from 'playwright-core';
import {privateFile} from './private-files.mjs';
import {readConfig,ORIGIN,PROJECT,check} from '../phase1-hosted-closeout-config.mjs';

// The read-only preview matrix uses the recorded QA content without changing publication or learning state.
const state=JSON.parse(readFileSync(privateFile('hosted-qa-state.json'),'utf8'));
const candidate=JSON.parse(readFileSync('deliverables/phase5-preview-activation/preview-environment.json','utf8'));
check(state.runId==='93a9ab13-1986-4124-9370-ea86b4355823'&&state.project===PROJECT&&state.contentIds.length===8,'Recorded QA scope required');
check(candidate.status==='pass'&&candidate.stagingProject===PROJECT,'Verified candidate required');
const config=readConfig(privateFile('staging.env'),{database:false});
let cookies=[];
const client=createServerClient(ORIGIN,config.SUPABASE_ANON_KEY,{cookies:{getAll:()=>cookies,setAll:items=>{for(const item of items){cookies=cookies.filter(c=>c.name!==item.name);cookies.push(item);}}}});
const admin=state.users.find(u=>u.label==='admin');
const signed=await client.auth.signInWithPassword({email:admin.email,password:state.password});
check(!signed.error&&signed.data.user.id===admin.id&&signed.data.user.user_metadata.phase5_qa_run===state.runId,'QA Admin identity mismatch');
const report={check:'phase5_hosted_admin_preview_matrix',runId:state.runId,commit:candidate.commit,preview:candidate.preview,status:'running',checks:[]};
const record=(id,pass)=>{report.checks.push({id,status:pass?'pass':'fail'});check(pass,id);};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const context=await browser.newContext();context.setDefaultNavigationTimeout(60000);context.setDefaultTimeout(30000);const page=await context.newPage();
 const access=readFileSync(privateFile('preview-access'),'utf8').trim();check(new URL(access).origin===candidate.preview,'Exact candidate access required');
 await page.goto(access,{waitUntil:'domcontentloaded'});await context.addCookies(cookies.map(({name,value})=>({name,value,url:candidate.preview,secure:true,sameSite:'Lax'})));
 let learningWrites=0;page.on('request',r=>{if(new URL(r.url()).pathname==='/api/v2/learning')learningWrites++;});
 await page.goto(`${candidate.preview}/admin/v2/content/preview/${state.courses[0].batchId}?item=${state.contentIds[0]}&revision=1`,{waitUntil:'domcontentloaded'});
 for(const title of ['QA independent reading','QA area_top','QA before_video','QA after_video','QA after_course']){await page.getByRole('heading',{name:title,exact:true}).waitFor();record(`preview-placement-${title.replaceAll(' ','-')}`,true);}
 const order=await page.locator('h5').allTextContents();record('preview-reading-order-surrounds-current-recording',order.indexOf('QA before_video')<order.indexOf('QA private recording')&&order.indexOf('QA private recording')<order.indexOf('QA after_video'));
 await page.setViewportSize({width:390,height:844});record('preview-placement-matrix-mobile-width',await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
 record('preview-placement-matrix-no-learning-writes',learningWrites===0);
 await page.screenshot({path:privateFile('preview-matrix.png'),fullPage:true});
 report.status='passed';
}catch(error){report.status='failed';writeFileSync(privateFile('preview-matrix-error.log'),String(error.stack),{mode:0o600});process.exitCode=1;}
finally{await browser.close();writeFileSync('deliverables/phase5-hosted-acceptance/preview-matrix-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,commit:report.commit}));}
