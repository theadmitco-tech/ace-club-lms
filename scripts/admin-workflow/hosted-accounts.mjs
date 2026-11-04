import {readFileSync,writeFileSync,mkdirSync,existsSync,statSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {stagingFetch} from '../phase6/staging-fetch.mjs';
import {createClient} from '@supabase/supabase-js';
import {readConfig,PROJECT,ORIGIN,check} from '../phase1-hosted-closeout-config.mjs';

// Dedicated generated identities receive no purchases, enrollment or authored content.
const directory='.env.admin_workflow-private';mkdirSync(directory,{recursive:true,mode:0o700});
check((statSync(directory).mode&0o077)===0,'Private directory requires owner-only access.');
const statePath=directory+'/state.json',mode=process.argv[2];
check(['prepare','cleanup'].includes(mode),'An explicit operation is required.');
const config=readConfig(process.env.ACE_ADMIN_ENV_FILE,{database:false});
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:stagingFetch}};
const service=createClient(ORIGIN,config.SUPABASE_SERVICE_ROLE_KEY,options);
const safe=result=>{if(result.error)writeFileSync(directory+'/request-error.json',JSON.stringify({status:result.error.status,code:result.error.code,message:result.error.message}),{mode:0o600});check(!result.error,'Staging request failed; private diagnostics withheld.');return result.data;};
const state=existsSync(statePath)?JSON.parse(readFileSync(statePath,'utf8')):{project:PROJECT,runId:randomUUID(),createdAt:new Date().toISOString(),password:`Qa!${randomUUID()}Aa9`,users:[]};
check(state.project===PROJECT,'Staging project mismatch.');
const save=()=>writeFileSync(statePath,JSON.stringify(state,null,2)+'\n',{mode:0o600});
const verify=async user=>{
 check(user.email===`ace-workflow-${user.role}-${state.runId}@example.invalid`,'Generated email mismatch.');
 const identity=safe(await service.auth.admin.getUserById(user.id)).user;
 check(identity.email===user.email&&identity.user_metadata.admin_workflow_qa_run===state.runId&&Date.parse(identity.created_at)>=Date.parse(state.createdAt)-1000,'Generated identity ownership mismatch.');
};
const report={check:`admin_workflow_hosted_${mode}`,project:PROJECT,runId:state.runId,recordedAt:new Date().toISOString(),status:'running',scope:'Dedicated synthetic identities; no purchases, enrollment, course edits or payment provider calls.',checks:[]};
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
   if(match){check(match.user_metadata.admin_workflow_qa_run===state.runId,'Pending identity ownership mismatch.');state.users.push({id:match.id,email:match.email,role:state.creationPending.role});}
   delete state.creationPending;save();
  }
  for(const role of ['admin','student']){
   let user=state.users.find(u=>u.role===role);
   if(!user){
    check(!state.creationPending,'An uncertain account creation requires reconciliation.');
    const email=`ace-workflow-${role}-${state.runId}@example.invalid`;state.creationPending={role,email};save();
    const result=safe(await service.auth.admin.createUser({email,password:state.password,email_confirm:true,user_metadata:{full_name:`Workflow QA ${role}`,admin_workflow_qa_run:state.runId}}));
    user={id:result.user.id,email,role};state.users.push(user);delete state.creationPending;save();
   }
   await verify(user);
   safe(await service.from('profiles').upsert({id:user.id,email:user.email,full_name:`Workflow QA ${role}`,role,is_active:true}));
   record(`${role}-generated-identity-ready`,true);
  }
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
finally{report.scriptSha256=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');writeFileSync(`deliverables/admin-workflow-integration-2026-11-04/hosted-${mode}-results.json`,JSON.stringify(report,null,2)+'\n');console.info(JSON.stringify({status:report.status,checks:report.checks.length,failed:report.checks.filter(c=>c.status==='fail').map(c=>c.id)}));}
