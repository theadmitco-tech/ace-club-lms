import {randomUUID} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {PROJECT,ORIGIN,check,readConfig} from '../phase1-hosted-closeout-config.mjs';
import {QA_CASES,REAL_COURSE_ID,createCoursePlan,buildSetupSql,buildCleanupSql} from './fixtures.mjs';
import {verifyPhase5Hosted} from './hosted-verification.mjs';
const mode=process.argv[2],modes=['prepare','accept-baseline','verify','accept-cleanup','cleanup-accounts'];
if(!modes.includes(mode)){console.log('Modes: prepare <Preview URL> <commit>; accept-baseline <setup JSON>; verify; accept-cleanup <cleanup JSON>; cleanup-accounts. SQL Editor setup and cleanup remain separate required actions.');process.exit(0);}
const privatePath='/tmp/ace-phase5-hosted-qa-state.json',output=resolve('deliverables/phase5-hosted-acceptance');
mkdirSync(output,{recursive:true});
function privateJson(path){const info=statSync(path);check(info.isFile()&&(info.mode&0o077)===0&&info.uid===process.getuid(),'Private QA state must be owned by the current user and chmod 600.');return JSON.parse(readFileSync(path,'utf8'));}
function parseReport(path){let result=JSON.parse(readFileSync(path,'utf8'));if(Array.isArray(result)&&result.length===1)result=result[0];if(!result.check&&Object.keys(result).length===1)result=Object.values(result)[0];return result;}
const validPreview=value=>{const url=new URL(value);return url.protocol==='https:'&&/^ace-club(?:-lms)?-[a-z0-9-]+-theadmitco-techs-projects\.vercel\.app$/.test(url.hostname)&&url.pathname==='/'&&!url.search&&!url.hash&&!url.username&&!url.password;};
let state=mode==='prepare'?null:privateJson(privatePath);
const save=()=>{writeFileSync(privatePath,JSON.stringify(state,null,2),{mode:0o600});const {password,...manifest}=state;void password;writeFileSync(`${output}/fixture-manifest.json`,JSON.stringify(manifest,null,2));};
const saveSql=()=>{writeFileSync(`${output}/01-SETUP-FIXTURES.sql`,buildSetupSql(state));writeFileSync(`${output}/02-CLEANUP-FIXTURES.sql`,buildCleanupSql(state));};
if(state)check(state.project===PROJECT&&validPreview(state.preview)&&/^[a-f0-9]{40}$/.test(state.commit),'QA state does not identify the designated staging Preview.');
if(mode==='accept-baseline'){
 const result=parseReport(process.argv[3]);check(state.status==='accounts-created-awaiting-sql'&&result.check==='phase5_qa_fixture_setup'&&result.run_id===state.runId&&result.qa_accounts===9&&result.batches===2&&result.purchases===7&&result.real_course_enrollments===1&&/^[a-f0-9]{32}$/.test(result.baseline?.md5)&&Number.isInteger(result.baseline.table_count)&&result.baseline.excluded_generated_profiles===9,'Setup report does not match this generated QA run.');
 state.baseline=result.baseline;state.status='ready-for-verification';save();saveSql();console.log(JSON.stringify({status:state.status,runId:state.runId}));process.exit(0);
}
if(mode==='accept-cleanup'){
 const result=parseReport(process.argv[3]);check(result.check==='phase5_qa_fixture_cleanup'&&result.run_id===state.runId&&result.baseline_restored===true&&result.fingerprint?.md5===state.baseline?.md5&&result.fingerprint?.table_count===state.baseline?.table_count,'Cleanup did not restore the recorded application baseline.');
 state.cleanup=result;state.status='sql-cleaned';save();console.log(JSON.stringify({status:state.status,runId:state.runId}));process.exit(0);
}
const config=readConfig('/tmp/ace-phase1-staging.env',{database:false});
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(20000)})}};
const service=createClient(ORIGIN,config.SUPABASE_SERVICE_ROLE_KEY,options);
const safe=(result,label)=>{check(!result.error,`${label} failed; private provider diagnostics withheld.`);return result.data;};
const rpc=async(client,name,args)=>safe(await client.rpc(name,args),name);
const verifyOwned=async u=>{const data=safe(await service.auth.admin.getUserById(u.id),'QA identity verification');check(data.user.email===u.email&&data.user.user_metadata.phase5_qa_run===state.runId,'Generated account ownership mismatch.');};
async function signIn(u){
 await verifyOwned(u);let cookies=[];
 const client=createServerClient(ORIGIN,config.SUPABASE_ANON_KEY,{...options,cookies:{getAll:()=>cookies,setAll:items=>{for(const c of items){cookies=cookies.filter(old=>old.name!==c.name);cookies.push(c);}}}});
 safe(await client.auth.signInWithPassword({email:u.email,password:state.password}),'Dedicated QA sign-in');return {...u,client,cookies};
}
if(mode==='prepare'){
 check(!existsSync(privatePath),'A Phase 5 QA state already exists; inspection and exact cleanup must precede another run.');
 check(validPreview(process.argv[3]??''),'An explicit LMS Preview URL is required.');check(/^[a-f0-9]{40}$/.test(process.argv[4]??''),'An exact candidate commit is required.');
 safe(await service.auth.admin.listUsers({page:1,perPage:1}),'Staging Auth preflight');
 state={project:PROJECT,runId:randomUUID(),preview:new URL(process.argv[3]).origin,commit:process.argv[4],createdAt:new Date().toISOString(),status:'creating-accounts',password:`Qa!${randomUUID()}Aa9`,users:[],courses:createCoursePlan(),realCourse:{batchId:REAL_COURSE_ID},databasePasswordUsed:false};save();
 try{
  for(const c of QA_CASES){
   const email=`ace-p5-${c.label}-${state.runId}@example.invalid`;
   const created=safe(await service.auth.admin.createUser({email,password:state.password,email_confirm:true,user_metadata:{full_name:`Phase 5 QA ${c.label}`,phase5_qa_run:state.runId}}),'Create dedicated QA identity');
   const u={id:created.user.id,label:c.label,email};state.users.push(u);save();await verifyOwned(u);
   safe(await service.from('profiles').upsert({id:u.id,email,full_name:`Phase 5 QA ${c.label}`,role:c.role??'student',is_active:true}),'Prepare dedicated QA profile');
  }
  state.status='accounts-created-awaiting-sql';save();saveSql();console.log(JSON.stringify({status:state.status,accounts:state.users.length,runId:state.runId}));
 }catch{
  state.status='prepare-failed';state.deletedAccountIds=[];
  for(const u of [...state.users].reverse()){try{await verifyOwned(u);safe(await service.auth.admin.deleteUser(u.id),'Remove partial QA identity');state.deletedAccountIds.push(u.id);}catch{break;}}
  if(state.deletedAccountIds.length===state.users.length)delete state.password;save();console.log(JSON.stringify({status:state.status,accountsRemoved:state.deletedAccountIds.length}));process.exitCode=1;
 }
}else if(mode==='cleanup-accounts'){
 check(state.status==='sql-cleaned'&&state.cleanup?.baseline_restored,'Verified SQL cleanup is required before deleting QA identities.');
 for(const u of state.users){const purchases=safe(await service.from('v2_purchases').select('id').eq('student_id',u.id).limit(1),'Purchase cleanup check');check(purchases.length===0,'Fixture purchases remain.');}
 state.deletedAccountIds??=[];
 for(const u of [...state.users].reverse()){if(state.deletedAccountIds.includes(u.id))continue;await verifyOwned(u);safe(await service.auth.admin.deleteUser(u.id),'Remove exact QA identity');state.deletedAccountIds.push(u.id);save();}
 state.status='cleaned';state.cleanedAt=new Date().toISOString();delete state.password;save();console.log(JSON.stringify({status:state.status,accountsRemoved:state.deletedAccountIds.length}));
}else {
 check(state.status==='ready-for-verification','Recorded setup is required before hosted acceptance.');
 await verifyPhase5Hosted({state,save,saveSql,output,signIn,rpc,service,config});
}
