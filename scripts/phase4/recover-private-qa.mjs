import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {PROJECT,ORIGIN,UUID,check,readConfig} from '../phase1-hosted-closeout-config.mjs';

// Recovery rotates passwords only for the two designated, independently verified QA identities.
const path='/tmp/ace-phase4-hosted-qa-state.json',info=statSync(path);
check(info.isFile()&&(info.mode&0o077)===0&&info.uid===process.getuid(),'Private QA state must be owned by the current user with mode 600.');
const state=JSON.parse(readFileSync(path,'utf8'));
check(state.project===PROJECT&&UUID.test(state.runId)&&state.status==='verification-completed'
  &&state.baseline?.md5==='27145d216badf73e85ee4a42930499a2','Only the recorded completed QA workflow can resume.');
const config=readConfig('/tmp/ace-phase1-staging.env',{database:false});
const service=createClient(ORIGIN,config.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(20000)})}});
const selected=['full','admin'].map(label=>{
  const user=state.users.find(user=>user.label===label);
  check(user&&UUID.test(user.id)&&user.email===`ace-p4-${label}-${state.runId}@example.invalid`,'Generated QA identity mismatch.');
  return user;
});
for(const user of selected){
  const {data,error}=await service.auth.admin.getUserById(user.id);
  check(!error&&data.user.id===user.id&&data.user.email===user.email&&data.user.user_metadata.phase4_qa_run===state.runId,'Hosted QA ownership verification failed.');
  const created=Date.parse(data.user.created_at)-Date.parse(state.createdAt);
  check(Number.isFinite(created)&&created>=-1000&&created<15*60*1000,'QA creation time differs from the recorded run.');
  const profile=await service.from('profiles').select('id,email,role,is_active').eq('id',user.id).single();
  check(!profile.error&&profile.data.email===user.email&&profile.data.is_active===true
    &&profile.data.role===(user.label==='admin'?'admin':'student'),'QA profile no longer matches its designated role.');
}
state.password??=`Qa!${randomUUID()}Aa9`;
state.passwordRestoredFor??=[];
const save=()=>writeFileSync(path,JSON.stringify(state,null,2),{mode:0o600});
save();
for(const user of selected){
  if(state.passwordRestoredFor.includes(user.label))continue;
  const {error}=await service.auth.admin.updateUserById(user.id,{password:state.password});
  check(!error,'Dedicated QA password recovery failed; provider details withheld.');
  state.passwordRestoredFor.push(user.label);save();
}
console.log(JSON.stringify({check:'phase4_private_qa_recovery',project:PROJECT,recoveredRoles:state.passwordRestoredFor,existingStudentsChanged:false}));
