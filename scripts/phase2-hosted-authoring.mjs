import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import {chromium} from 'playwright-core';
import {readConfig,ORIGIN,PROJECT,check} from './phase1-hosted-closeout-config.mjs';
const resume=process.argv[2]==='--resume-lifecycle';
check(process.argv.length===(resume?3:2),'Only the explicit lifecycle-resume option is accepted.');
const privateJson=path=>{const s=statSync(path);check(s.isFile()&&s.uid===process.getuid()&&(s.mode&0o077)===0,'Private fixture ownership required.');return JSON.parse(readFileSync(path,'utf8'));};
const state=privateJson('/tmp/ace-phase2-hosted-qa-state.json'),config=readConfig('/tmp/ace-phase1-staging.env',{database:false});
check(state.project===PROJECT&&state.baseline&&['ready-for-verification','verification-running','verification-completed','verification-failed'].includes(state.status),'Confirmed fixture setup is required.');
const target=state.courses.find(c=>c.label==='verbal'),admin=state.users.find(u=>u.label==='admin');
check(target?.product==='verbal'&&admin?.email===`ace-p2-admin-${state.runId}@example.invalid`,'Exact synthetic authoring scope is required.');
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(u,i)=>fetch(u,{...i,signal:AbortSignal.timeout(20000)})}};
const service=createClient(ORIGIN,config.SUPABASE_SERVICE_ROLE_KEY,options);
const safe=r=>{check(!r.error,'Hosted authoring request failed; provider details withheld.');return r.data;};
const identity=safe(await service.auth.admin.getUserById(admin.id)).user;
check(identity.email===admin.email&&identity.user_metadata.phase2_qa_run===state.runId,'QA identity ownership mismatch.');
let cookies=[];
const client=createServerClient(ORIGIN,config.SUPABASE_ANON_KEY,{...options,cookies:{getAll:()=>cookies,setAll:items=>{for(const c of items){cookies=cookies.filter(v=>v.name!==c.name);cookies.push(c);}}}});
const rpc=async(name,args={})=>safe(await client.rpc(name,args));
const report={check:'phase2_hosted_authoring_lifecycle',project:PROJECT,commit:state.commit,runId:state.runId,scope:'Exact synthetic Verbal template and batch only; real library content is excluded.',checks:[],status:'running'};
const save=()=>writeFileSync('deliverables/phase2-hosted-acceptance/authoring-results.json',JSON.stringify(report,null,2)+'\n');
const ok=(id,value)=>{report.checks.push({id,status:value?'pass':'fail'});save();console.log(id,value?'pass':'fail');check(value,`Authoring check failed: ${id}`);};
if(resume){const previous=JSON.parse(readFileSync('deliverables/phase2-hosted-acceptance/authoring-first-attempt.json','utf8'));check(previous.runId===state.runId&&previous.commit===state.commit&&previous.status==='failed'&&previous.checks.length===3&&previous.checks.every(c=>c.status==='pass'),'Exact completed UI evidence is required for lifecycle resume.');report.checks=previous.checks;report.resumedFrom='authoring-first-attempt.json';}
let browser;
try{
 safe(await client.auth.signInWithPassword({email:admin.email,password:state.password}));
 const original=(await rpc('list_v2_template_drafts')).find(t=>t.id===target.templateId);
 check(original?.revision===(resume?2:1)&&original.document.title===target.document.title&&original.productCode==='verbal','The generated fixture must match the expected authoring stage.');
 const baselinePublication=(await rpc('list_v2_batch_publications')).find(p=>p.batchId===target.batchId);
 check(baselinePublication?.revision===1&&baselinePublication.state==='published','Expected initial fixture publication required.');
 const session=target.document.sessions[0];const expected=structuredClone(target.document);expected.sessions[0].title='QA revised session heading';
 for(const kind of Object.keys(session.content)){expected.sessions[0].content[kind][0].title=`QA revised ${kind} title`;expected.sessions[0].content[kind][0].url=`https://example.test/phase2/revised/${kind}`;}
 if(!resume){
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(30000);
 const share=readFileSync('/tmp/ace-phase2-preview-access','utf8').trim();check(new URL(share).origin===state.preview,'Exact Preview protection scope required.');
 await page.goto(share,{waitUntil:'domcontentloaded'});await context.addCookies(cookies.map(({name,value})=>({name,value,url:state.preview,secure:true,sameSite:'Lax'})));
 await page.goto(`${state.preview}/admin/v2/templates`,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:`${target.document.title} · Verbal · revision 1`,exact:true}).click();
 await page.locator(`[id="${session.key}-title"]`).fill(expected.sessions[0].title);
 for(const [kind,items] of Object.entries(session.content)){
  expected.sessions[0].content[kind][0].title=`QA revised ${kind} title`;
  expected.sessions[0].content[kind][0].url=`https://example.test/phase2/revised/${kind}`;
  await page.locator(`[id="${items[0].key}-title"]`).fill(expected.sessions[0].content[kind][0].title);
  await page.locator(`[id="${items[0].key}-url"]`).fill(expected.sessions[0].content[kind][0].url);
 }
 await page.getByRole('button',{name:'Save draft',exact:true}).click();
 await page.getByText('Draft revision 2 saved.',{exact:true}).waitFor();
 const revised=(await rpc('list_v2_template_drafts')).find(t=>t.id===target.templateId);
 ok('five-session-fields-saved-through-hosted-ui',revised?.revision===2&&revised.document.sessions[0].title===expected.sessions[0].title&&Object.keys(session.content).every(k=>revised.document.sessions[0].content[k][0].title===expected.sessions[0].content[k][0].title&&revised.document.sessions[0].content[k][0].url===expected.sessions[0].content[k][0].url));
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:`${target.document.title} · Verbal · revision 2`,exact:true}).click();
 ok('saved-session-heading-reopens',await page.locator(`[id="${session.key}-title"]`).inputValue()===expected.sessions[0].title);
 }
 const before=(await rpc('list_v2_batch_publications')).find(p=>p.batchId===target.batchId);
 ok('template-edit-leaves-publication-pinned',JSON.stringify(before)===JSON.stringify(baselinePublication));
 const draft=(await rpc('list_v2_batch_drafts')).find(b=>b.id===target.batchId);
 check(draft?.revision===1&&draft.templateId===target.templateId,'Exact untouched batch fixture required.');
 const input={id:target.batchId,templateId:target.templateId,templateRevision:draft.templateRevision,expectedRevision:1,requestId:randomUUID(),title:draft.title,startDate:'',timeZone:'Asia/Kolkata',events:[],sessions:expected.sessions};
 const preview=await rpc('preview_v2_batch_draft',{p_request:input});const saved=await rpc('save_v2_batch_draft',{p_request:input,p_fingerprint:preview.fingerprint});
 ok('undated-batch-revision-retains-independent-content',saved.draft.revision===2&&saved.draft.events.length===0&&saved.draft.sessions[0].title===expected.sessions[0].title);
 let publication=before;
 for(const action of ['publish','unpublish','publish']){
  const request={batchId:target.batchId,batchRevision:2,expectedRevision:publication.revision,requestId:randomUUID(),action};
  const review=await rpc('preview_v2_batch_publication',{p_request:request});
  const result=await rpc('save_v2_batch_publication',{p_request:request,p_fingerprint:review.fingerprint});
  publication=(await rpc('list_v2_batch_publications')).find(p=>p.batchId===target.batchId);
  ok(`${action}-revision-${publication.revision}`,publication.revision===request.expectedRevision+1&&publication.state===(action==='publish'?'published':'unpublished'));
  const replay=await rpc('save_v2_batch_publication',{p_request:request,p_fingerprint:review.fingerprint});
  ok(`${action}-retry-${publication.revision}`,replay.replayed===true);
  void result;
 }
 ok('outline-and-edited-session-published-together',publication.sessions[0].title===expected.sessions[0].title&&publication.batchRevision===2);
 const stale=await client.rpc('preview_v2_batch_publication',{p_request:{batchId:target.batchId,batchRevision:1,expectedRevision:1,requestId:randomUUID(),action:'publish'}});
 ok('stale-publication-review-rejected',!!stale.error);
 const history=safe(await client.from('v2_course_template_revisions').select('revision,document,actor_id').eq('template_id',target.templateId));
 ok('original-template-revision-remains-immutable',history.length===2&&history.every(r=>r.actor_id===admin.id)&&history.find(r=>r.revision===1)?.document.sessions[0].title===session.title);
 report.status='passed';
}catch(e){report.status='failed';report.reason=e.message.startsWith('Authoring check failed:')?e.message:'Hosted authoring interrupted; private provider details withheld.';process.exitCode=1;}
finally{await browser?.close();await client.auth.signOut({scope:'local'});save();console.log(JSON.stringify({status:report.status,checks:report.checks.length,failed:report.checks.filter(c=>c.status==='fail').length}));}
