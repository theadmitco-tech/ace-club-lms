import {readFileSync,writeFileSync,mkdirSync,existsSync,statSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {stagingFetch} from './staging-fetch.mjs';
import {createClient} from '@supabase/supabase-js';
import {readConfig,PROJECT,ORIGIN,check} from '../phase1-hosted-closeout-config.mjs';

// Dedicated generated identities receive no purchases, enrollment or authored content.
const directory='.env.phase6-private';mkdirSync(directory,{recursive:true,mode:0o700});
check((statSync(directory).mode&0o077)===0,'Private directory requires owner-only access.');
const statePath=directory+'/state.json',mode=process.argv[2];
check(['prepare','rpc','cleanup'].includes(mode),'An explicit operation is required.');
const config=readConfig(process.env.ACE_PHASE6_ENV_FILE,{database:false});
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:stagingFetch}};
const service=createClient(ORIGIN,config.SUPABASE_SERVICE_ROLE_KEY,options);
const safe=result=>{check(!result.error,'Staging request failed; private diagnostics withheld.');return result.data;};
const state=existsSync(statePath)?JSON.parse(readFileSync(statePath,'utf8')):{project:PROJECT,runId:randomUUID(),createdAt:new Date().toISOString(),password:`Qa!${randomUUID()}Aa9`,users:[]};
check(state.project===PROJECT,'Staging project mismatch.');
const save=()=>writeFileSync(statePath,JSON.stringify(state,null,2)+'\n',{mode:0o600});
const verify=async user=>{
 check(user.email===`ace-p6-${user.role}-${state.runId}@example.invalid`,'Generated email mismatch.');
 const identity=safe(await service.auth.admin.getUserById(user.id)).user;
 check(identity.email===user.email&&identity.user_metadata.phase6_qa_run===state.runId&&Date.parse(identity.created_at)>=Date.parse(state.createdAt)-1000,'Generated identity ownership mismatch.');
};
const receipt=JSON.parse(readFileSync('deliverables/phase6-staging-acceptance/repair-receipt.json','utf8'));
check(receipt.check==='phase6_integration_conflict_repair'&&receipt.sourceSha256==='c921797533b1761a634729e6997712dc7b8389cbf5a50996280a323b813a9eb4','Applied repair receipt required before hosted stale requests.');
const report={check:`phase6_hosted_${mode}`,project:PROJECT,runId:state.runId,recordedAt:new Date().toISOString(),migration:receipt.migrationVersion,status:'running',scope:'Dedicated synthetic identities; deliberately rejected requests; no purchases, course edits or payment provider calls.',checks:[]};
const record=(id,pass,extra={})=>{report.checks.push({id,status:pass?'pass':'fail',...extra});check(pass,id);};
try{
 if(mode==='prepare'){
  check(!state.cleaned,'Completed QA run cannot be reused.');save();
  if(state.creationPending){
   let match=null;for(let page=1;page<=100;page++){
    const data=safe(await service.auth.admin.listUsers({page,perPage:100}));
    match=data.users.find(u=>u.email===state.creationPending.email)??match;
    if(data.users.length<100)break;check(page<100,'Identity reconciliation pagination limit reached.');
   }
   if(match){check(match.user_metadata.phase6_qa_run===state.runId,'Pending identity ownership mismatch.');state.users.push({id:match.id,email:match.email,role:state.creationPending.role});}
   delete state.creationPending;save();
  }
  for(const role of ['admin','student']){
   let user=state.users.find(u=>u.role===role);
   if(!user){
    check(!state.creationPending,'An uncertain account creation requires reconciliation.');
    const email=`ace-p6-${role}-${state.runId}@example.invalid`;state.creationPending={role,email};save();
    const result=safe(await service.auth.admin.createUser({email,password:state.password,email_confirm:true,user_metadata:{full_name:`Phase 6 QA ${role}`,phase6_qa_run:state.runId}}));
    user={id:result.user.id,email,role};state.users.push(user);delete state.creationPending;save();
   }
   await verify(user);
   safe(await service.from('profiles').upsert({id:user.id,email:user.email,full_name:`Phase 6 QA ${role}`,role,is_active:true}));
   record(`${role}-generated-identity-ready`,true);
  }
 }else if(mode==='rpc'){
  check(state.users.length===2&&!state.cleaned,'Prepared synthetic identities required.');
  const clients={};for(const user of state.users){await verify(user);const client=createClient(ORIGIN,config.SUPABASE_ANON_KEY,options);const signed=safe(await client.auth.signInWithPassword({email:user.email,password:state.password}));check(signed.user.id===user.id,'Authenticated identity mismatch.');clients[user.role]={client,token:signed.session.access_token};}
  const rpc=async(name,args={})=>safe(await clients.admin.client.rpc(name,args));
  const snapshot=async()=>({templates:await rpc('list_v2_template_drafts'),batches:await rpc('list_v2_batch_drafts'),publications:await rpc('list_v2_batch_publications')});
  const original=await snapshot(),hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const batch=original.batches.find(b=>b.id==='2b19ea33-150c-5ddd-aae7-134831603408');check(batch?.productCode==='full_course','Expected published library unavailable.');
  state.templateProbe={p_id:randomUUID(),p_product_code:'quant',p_expected_revision:1,p_request_id:randomUUID(),p_document:{title:'Synthetic conflict-only template',summary:'Rejected QA request',durationDays:8,events:[],sessions:[]}};save();
  const student=state.users.find(u=>u.role==='student');
  const probes=[
   ['template','save_v2_template_draft',state.templateProbe],
   ['enrollment','set_v2_batch_enrollment',{p_batch_id:batch.id,p_student_id:student.id,p_active:false,p_expected_revision:1}],
   ['registration','set_v2_live_registration',{p_batch_id:batch.id,p_student_id:student.id,p_active:false,p_expected_revision:1}],
   ['publication','preview_v2_batch_publication',{p_request:{batchId:batch.id,batchRevision:batch.revision,expectedRevision:2147483646,requestId:randomUUID(),action:'publish'}}],
  ];
  for(const [label,name,args] of probes){
   const started=Date.now();const response=await stagingFetch(`${ORIGIN}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:config.SUPABASE_ANON_KEY,Authorization:`Bearer ${clients.admin.token}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(10000)});
   const data=await response.json();record(`${label}-bounded-postgrest-conflict`,response.status===409&&data.code==='PT409',{httpStatus:response.status,code:data.code,durationMs:Date.now()-started});
  }
  for(const [label,name,args] of probes){const result=await clients.student.client.rpc(name,args);record(`${label}-student-denied`,result.error?.code==='42501');}
  record('authoring-and-publications-unchanged',hash(await snapshot())===hash(original));
  record('synthetic-student-has-no-access',safe(await clients.student.client.rpc('get_my_v2_access')).length===0);
  for(const table of ['v2_purchases','v2_product_grants','v2_batch_enrollments','v2_live_registrations']){
   const result=table==='v2_product_grants'
    ? await clients.student.client.from(table).select('*',{head:true,count:'exact'})
    : await clients.admin.client.from(table).select('*',{head:true,count:'exact'}).eq('student_id',student.id);
   record(`no-generated-${table}`,!result.error&&result.count===0);
  }
  state.rpcPassed=true;save();
 }else{
  check(!state.creationPending,'Uncertain creation requires reconciliation before cleanup.');
  for(const user of state.users){
   if(!user.removed){await verify(user);safe(await service.auth.admin.deleteUser(user.id));user.removed=true;save();}
   const absent=await service.auth.admin.getUserById(user.id);record(`${user.role}-auth-absent`,absent.error?.status===404);
   const profile=await service.from('profiles').select('id').eq('id',user.id);record(`${user.role}-profile-absent`,!profile.error&&profile.data.length===0);
  }
  state.cleaned=true;delete state.password;save();
 }
 report.status='passed';
}catch(error){report.status='failed';writeFileSync(directory+`/${mode}-error.log`,String(error?.stack??error),{mode:0o600});process.exitCode=1;}
finally{report.scriptSha256=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');writeFileSync(`deliverables/phase6-staging-acceptance/hosted-${mode}-results.json`,JSON.stringify(report,null,2)+'\n');console.info(JSON.stringify({status:report.status,checks:report.checks.length,failed:report.checks.filter(c=>c.status==='fail').map(c=>c.id)}));}
