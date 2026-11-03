import {privateFile} from './private-files.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createServerClient} from '@supabase/ssr';
import {chromium} from 'playwright-core';
import {readConfig,ORIGIN,PROJECT,check} from '../phase1-hosted-closeout-config.mjs';
import {buildCleanupSql} from './fixtures.mjs';

// This supplemental run uses only the existing QA batch and records every generated item before creation.
const statePath=privateFile('hosted-qa-state.json'),out='deliverables/phase5-hosted-acceptance';
const state=JSON.parse(readFileSync(statePath,'utf8'));
check(state.project===PROJECT&&state.status==='verified-awaiting-sql-cleanup'&&state.uploadsCleaned&&[9,11].includes(state.contentIds.length),'Completed main hosted run required.');
const config=readConfig(privateFile('staging.env'),{database:false});
const report={check:'phase5_hosted_reorder_and_new_tab_preview',runId:state.runId,commit:state.commit,status:'running',checks:[]};
const save=()=>{writeFileSync(statePath,JSON.stringify(state,null,2)+'\n',{mode:0o600});const {password,...manifest}=state;void password;writeFileSync(`${out}/fixture-manifest.json`,JSON.stringify(manifest,null,2)+'\n');writeFileSync(`${out}/02-CLEANUP-FIXTURES.sql`,buildCleanupSql(state));};
const record=(id,passed)=>{report.checks.push({id,status:passed?'pass':'fail'});writeFileSync(`${out}/reorder-preview-results.json`,JSON.stringify(report,null,2)+'\n');check(passed,id);};
async function identity(label){
 const user=state.users.find(u=>u.label===label);let cookies=[];
 const client=createServerClient(ORIGIN,config.SUPABASE_ANON_KEY,{cookies:{getAll:()=>cookies,setAll:items=>{for(const item of items){cookies=cookies.filter(c=>c.name!==item.name);cookies.push(item);}}}});
 let signed;for(let attempt=0;attempt<3;attempt++){signed=await client.auth.signInWithPassword({email:user.email,password:state.password});if(!signed.error||signed.error.name!=='AuthRetryableFetchError')break;}
 check(!signed.error&&signed.data.user.id===user.id&&signed.data.user.user_metadata.phase5_qa_run===state.runId,'QA identity mismatch');
 return {client,cookies};
}
let browser;
try{
 const admin=await identity('admin'),student=await identity('full');
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext();context.setDefaultNavigationTimeout(60000);context.setDefaultTimeout(30000);const page=await context.newPage();
 const access=readFileSync(privateFile('preview-access'),'utf8').trim();check(new URL(access).origin===state.preview,'Exact Preview access required');await page.goto(access,{waitUntil:'domcontentloaded'});
 await context.addCookies(admin.cookies.map(({name,value})=>({name,value,url:state.preview,secure:true,sameSite:'Lax'})));
 await page.goto(`${state.preview}/admin/v2/content`,{waitUntil:'domcontentloaded'});
 await page.getByLabel(/^Content type/).waitFor();
 const operate=async(action,input)=>{const result=await page.evaluate(async({action,input})=>{const r=await fetch('/api/admin/v2/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,input}),signal:AbortSignal.timeout(60000)});return {status:r.status,data:await r.json()};},{action,input});check(result.status===200,'Content operation failed');return result.data;};
 const batch=state.courses[0],session=batch.document.sessions.find(s=>s.section==='verbal');check(session,'Verbal QA session required');
 const document=(title,order)=>({title,kind:'preSessionReads',url:'https://example.test/phase5/reordering',targets:[{batchId:batch.batchId,sessionKey:session.key,publicationRevision:1,placement:'session',anchorKey:null,replaceKey:null,order}]});
 const publish=async(id,revision)=>{const scope=await operate('scope',{id,revision,action:'publish'});await operate('confirm',{...scope,requestId:randomUUID()});};
 const create=async doc=>{const id=randomUUID();state.contentIds.push(id);save();await operate('save',{id,revision:0,requestId:randomUUID(),document:doc});await publish(id,1);return id;};
 let a;
 if(state.contentIds.length===9){a=await create(document('QA ordering first item',10));await create(document('QA ordering second item',20));}
 else{
  const workspace=await operate('workspace',{});const items=workspace.items.filter(i=>state.contentIds.slice(9).includes(i.id));
  check(items.length===2&&items.every(i=>i.draft_revision===1&&i.published_revision===1&&i.visible&&!i.deleted),'Interrupted reorder state requires inspection');
  for(const [index,title,order] of [[9,'QA ordering first item',10],[10,'QA ordering second item',20]]){const item=items.find(i=>i.id===state.contentIds[index]);check(item&&item.document.title===title&&item.document.kind==='preSessionReads'&&item.document.url==='https://example.test/phase5/reordering'&&item.document.targets.length===1&&Object.entries(document(title,order).targets[0]).every(([key,value])=>item.document.targets[0][key]===value),'Recorded reorder document mismatch');}
  a=state.contentIds[9];
 }
 const readings=async()=>{let result;for(let attempt=0;attempt<3;attempt++){result=await student.client.rpc('get_my_v2_published_course',{p_batch_id:batch.batchId});if(!result.error||result.status!==0)break;}check(!result.error,`Student course read failed: status ${result.status}, code ${result.error?.code??'transport'}`);return result.data.sessions.find(s=>s.key===session.key).content.preSessionReads.map(i=>i.title);};
 const ordered=(items,left,right)=>items.includes(left)&&items.includes(right)&&items.indexOf(left)<items.indexOf(right);
 let order=await readings();record('initial-independent-resource-order',ordered(order,'QA ordering first item','QA ordering second item'));
 await operate('save',{id:a,revision:1,requestId:randomUUID(),document:document('QA ordering first item',30)});await publish(a,2);
 order=await readings();record('edited-resource-order-reaches-student',ordered(order,'QA ordering second item','QA ordering first item'));
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:/^QA ordering first item/}).click();
 const popupPromise=context.waitForEvent('page');await page.getByRole('link',{name:/^Student preview:/}).click();const popup=await popupPromise;
 let learningWrites=0;popup.on('request',r=>{if(new URL(r.url()).pathname==='/api/v2/learning')learningWrites++;});
 await popup.getByRole('button',{name:`Open ${session.title}`,exact:true}).click();
 await popup.getByRole('heading',{name:'QA ordering first item',exact:true}).waitFor();
 record('actual-admin-link-opens-student-preview-in-new-tab',popup!==page&&new URL(popup.url()).pathname===`/admin/v2/content/preview/${batch.batchId}`);
 record('new-tab-navigation-does-not-write-learning',learningWrites===0);
 await popup.setViewportSize({width:390,height:844});await popup.waitForTimeout(400);
 record('hosted-mobile-preview-has-no-horizontal-overflow',await popup.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
 await popup.screenshot({path:'/tmp/ace-phase5-mobile-preview.png',fullPage:true});
 report.status='passed';state.supplementalVerified=true;save();writeFileSync(`${out}/reorder-preview-results.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length}));
}catch(error){report.status='failed';writeFileSync(`${out}/reorder-preview-results.json`,JSON.stringify(report,null,2)+'\n');writeFileSync(privateFile('reorder-error.log'),String(error.stack),{mode:0o600});console.error('Supplemental verification interrupted; private diagnostics retained.');process.exitCode=1;}
finally{await browser?.close();}
