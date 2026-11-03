import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {privateFile} from './private-files.mjs';
import {PROJECT,ORIGIN,check,readConfig} from '../phase1-hosted-closeout-config.mjs';

// Only the two recorded synthetic identities needed for the remaining checks receive new QA passwords.
const path=privateFile('hosted-qa-state.json'),state=JSON.parse(readFileSync(path,'utf8'));
check(state.project===PROJECT&&state.runId==='93a9ab13-1986-4124-9370-ea86b4355823'
 &&state.status==='verification-failed'&&state.baseline?.md5==='ac53ab317feeb1386221ee45fd623932','Unexpected QA recovery scope.');
const config=readConfig(privateFile('staging.env'),{database:false});
const service=createClient(ORIGIN,config.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const readRetry=async task=>{let result;for(let attempt=0;attempt<3;attempt++){result=await task();if(!result.error||!(result.status===0||result.error.status===0||result.error.name==='AuthRetryableFetchError'))break;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,1000));}return result;};
const users=['admin','full'].map(label=>state.users.find(u=>u.label===label));
for(const user of users){
 check(user&&user.email===`ace-p5-${user.label}-${state.runId}@example.invalid`,'Generated identity mismatch.');
 const result=await readRetry(()=>service.auth.admin.getUserById(user.id));
 check(!result.error,'QA identity read unavailable; no credential change performed.');
 check(!result.error&&result.data.user.email===user.email&&result.data.user.user_metadata.phase5_qa_run===state.runId,'Hosted QA identity mismatch.');
 const elapsed=Date.parse(result.data.user.created_at)-Date.parse(state.createdAt);
 check(elapsed>=-1000&&elapsed<15*60*1000,'Generated identity creation time mismatch.');
 const profile=await readRetry(()=>service.from('profiles').select('id,email,role,is_active').eq('id',user.id).single());
 check(!profile.error&&profile.data.email===user.email&&profile.data.is_active&&profile.data.role===(user.label==='admin'?'admin':'student'),'QA profile mismatch.');
}
state.password??=`Qa!${randomUUID()}Aa9`;state.passwordRestoredFor??=[];
const save=()=>writeFileSync(path,JSON.stringify(state,null,2)+'\n',{mode:0o600});save();
for(const user of users){
 if(state.passwordRestoredFor.includes(user.label))continue;
 const result=await service.auth.admin.updateUserById(user.id,{password:state.password});
 check(!result.error,'QA credential recovery failed; provider details withheld.');
 state.passwordRestoredFor.push(user.label);save();
}
console.log(JSON.stringify({check:'phase5_private_qa_recovery',recoveredRoles:state.passwordRestoredFor,existingStudentAccountsChanged:false}));
