import {readFileSync,writeFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {privateFile} from './private-files.mjs';
import {PROJECT,ORIGIN,readConfig,check,UUID} from '../phase1-hosted-closeout-config.mjs';

// Independent absence checks follow exact SQL cleanup and removal of the recorded synthetic identities.
const state=JSON.parse(readFileSync(privateFile('hosted-qa-state.json'),'utf8'));
check(state.project===PROJECT&&state.status==='cleaned'&&state.cleanup?.baseline_restored&&state.users.length===9&&state.deletedAccountIds.length===9&&state.uploadsCleaned,'Completed exact fixture cleanup required');
for(const u of state.users)check(UUID.test(u.id)&&u.email===`ace-p5-${u.label}-${state.runId}@example.invalid`&&state.deletedAccountIds.includes(u.id),'Recorded synthetic identity mismatch');
const config=readConfig(privateFile('staging.env'),{database:false});
const service=createClient(ORIGIN,config.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(20000)})}});
const report={check:'phase5_independent_cleanup_verification',project:PROJECT,runId:state.runId,status:'running',checks:[]};
const record=(id,pass)=>{report.checks.push({id,status:pass?'pass':'fail'});check(pass,id);};
try{
 for(const u of state.users){let r;for(let n=0;n<3;n++){r=await service.auth.admin.getUserById(u.id);if(!r.error||r.error.name!=='AuthRetryableFetchError')break;}record(`generated-auth-${u.label}-absent`,r.error?.status===404&&r.error?.code==='user_not_found'&&!r.data?.user);}
 for(const [table,column] of [['profiles','id'],['v2_purchases','student_id']]){const r=await service.from(table).select('id').in(column,state.users.map(u=>u.id));record(`generated-${table}-absent`,!r.error&&r.data?.length===0);}
 for(const [index,path] of state.uploads.entries()){check(/^[a-f0-9-]{36}\.(mp4|pdf)$/.test(path),'Exact synthetic object required');const r=await service.storage.from('v2-course-content').list('',{search:path,limit:100});record(`synthetic-upload-${index+1}-absent`,!r.error&&!r.data.some(o=>o.name===path));}
 record('exact-88-table-baseline-restored',state.cleanup.fingerprint?.md5==='ac53ab317feeb1386221ee45fd623932'&&state.cleanup.fingerprint?.table_count===88);
 report.status='passed';
}catch(error){report.status='failed';writeFileSync(privateFile('cleanup-verification-error.log'),String(error.stack),{mode:0o600});process.exitCode=1;}
finally{writeFileSync('deliverables/phase5-hosted-acceptance/cleanup-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length}));}
