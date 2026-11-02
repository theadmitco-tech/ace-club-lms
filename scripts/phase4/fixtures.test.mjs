import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {withDisposablePostgres} from '../helpers/disposable-postgres.mjs';
import {PROJECT,literal} from '../phase1-hosted-closeout-config.mjs';
import {REAL_COURSE_ID,QA_CASES,createCoursePlan,buildSetupSql,buildCleanupSql} from './fixtures.mjs';
const as=(id,sql)=>`begin;set local role authenticated;set local request.jwt.claim.sub='${id}';${sql};commit;`;
function bootstrap({query,apply}){
 query(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
 alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
 for(const file of ['20260731051000_production_baseline.sql','20260731062700_enforce_material_release.sql','20260731110000_require_provisioned_portal_access.sql','20261018090000_add_v2_product_entitlements.sql','20261019090000_add_v2_template_drafts.sql','20261019100000_add_v2_batch_drafts.sql','20261019110000_add_v2_private_meeting_drafts.sql','20261020090000_add_v2_outline_schedules.sql','20261020100000_add_v2_batch_publication.sql','20261025100000_add_v2_enrolled_schedules.sql','20261102100000_add_v2_programme_content.sql','20261102110000_add_v2_student_delivery.sql','20261102120000_add_v2_content_imports.sql','20261102130000_add_v2_publication_scopes.sql','20261102170000_add_v2_learning_feedback.sql'])apply(file);
}
for(const withReal of [false,true])test(`Phase 4 fixture cleanup preserves existing rows with real-course attachment ${withReal}`,{timeout:120000},()=>withDisposablePostgres(async db=>{
 const {query,rejects}=db;bootstrap(db);
 const runId=randomUUID(),state={project:PROJECT,runId,users:QA_CASES.map(c=>({id:randomUUID(),label:c.label,email:`ace-p4-${c.label}-${runId}@example.invalid`})),courses:createCoursePlan(),...(withReal?{realCourse:{batchId:REAL_COURSE_ID}}:{})};
 for(const u of state.users){query(`insert into auth.users(id,email,raw_user_meta_data) values('${u.id}',${literal(u.email)},${literal(JSON.stringify({phase4_qa_run:runId}))}::jsonb);update public.profiles set is_active=true,role='${u.label==='admin'?'admin':'student'}' where id='${u.id}'`);}
 const operator=randomUUID(),existingTemplate=randomUUID(),existingBatch=REAL_COURSE_ID;
 query(`insert into auth.users(id,email) values('${operator}','existing-operator@example.invalid');update public.profiles set role='admin',is_active=true where id='${operator}'`);
 const value=v=>`${literal(JSON.stringify(v))}::jsonb`;
 const existingDocument={title:'Existing published course',summary:'',durationDays:null,events:[],sessions:[{key:randomUUID(),title:'Existing Quant session',section:'quant',content:{materials:[],recordings:[{key:randomUUID(),title:'Existing recording',url:'https://www.youtube.com/watch?v=abcdefghijk'}],preSessionReads:[],postSessionReads:[]}}]};
 query(as(operator,`select public.save_v2_template_draft('${existingTemplate}','full_course',0,'${randomUUID()}',${value(existingDocument)})`));
 const existingRequest={id:existingBatch,templateId:existingTemplate,templateRevision:1,expectedRevision:0,requestId:randomUUID(),title:'Existing published course',startDate:'',timeZone:'Asia/Kolkata',events:null};
 const existingPreview=JSON.parse(query(as(operator,`select public.preview_v2_batch_draft(${value(existingRequest)})`)));query(as(operator,`select public.save_v2_batch_draft(${value(existingRequest)},${literal(existingPreview.fingerprint)})`));
 const existingPublication={batchId:existingBatch,batchRevision:1,expectedRevision:0,requestId:randomUUID(),action:'publish'};
 const existingProposal=JSON.parse(query(as(operator,`select public.preview_v2_batch_publication(${value(existingPublication)})`)));query(as(operator,`select public.save_v2_batch_publication(${value(existingPublication)},${literal(existingProposal.fingerprint)})`));
 query(`insert into public.v2_learning_progress(student_id,batch_id,session_key,resource_key,state) values('${operator}','${existingBatch}','${existingDocument.sessions[0].key}','session','opened')`);
 const originalPublication=query(`select to_jsonb(p) from public.v2_batch_publication_revisions p where batch_id='${existingBatch}'`);
 query(`create table public.qa_existing_sentinel(id integer primary key,value text);insert into public.qa_existing_sentinel values(1,'Existing private application row remains unchanged')`);
 if(withReal){
  const qaFull=state.users.find(u=>u.label==='full').id;
  query(`insert into public.v2_learning_progress(student_id,batch_id,session_key,resource_key,state) values('${qaFull}','${existingBatch}','${existingDocument.sessions[0].key}','session','opened')`);
  rejects(buildSetupSql(state),/already contains existing-course activity/);query(`delete from public.v2_learning_progress where student_id='${qaFull}'`);
  query(`update public.v2_batch_publication_revisions set document=jsonb_set(document,'{state}','"unpublished"') where batch_id='${existingBatch}'`);rejects(buildSetupSql(state),/must remain published/);query(`update public.v2_batch_publication_revisions set document=jsonb_set(document,'{state}','"published"') where batch_id='${existingBatch}'`);
 }
 const setup=JSON.parse(query(buildSetupSql(state)));assert.equal(setup.qa_accounts,9);assert.equal(setup.purchases,7);assert.equal(setup.batches,2);assert.equal(setup.real_course_enrollments,withReal?1:0);
 rejects(buildSetupSql(state),/fixtures already exist/);rejects(buildCleanupSql(state),/Recorded setup baseline required/);
 state.baseline=setup.baseline;const admin=state.users.find(u=>u.label==='admin').id,student=state.users.find(u=>u.label==='full').id;
 if(withReal){
  const realSession=existingDocument.sessions[0];
  query(as(student,`select public.mark_v2_learning_progress('${existingBatch}','${realSession.key}',null,'opened',1)`));
  const watch=JSON.parse(query(as(student,`select public.begin_v2_recording_watch('${existingBatch}','${realSession.key}','${realSession.content.recordings[0].key}',1)`)));
  query(as(student,`select public.record_v2_recording_sample('${watch.watchId}','${randomUUID()}',0,60,false)`));
  assert.equal(query(`select count(*) from public.v2_batch_enrollments where batch_id='${existingBatch}' and student_id='${student}'`),'1');
 }
 const full=state.courses.find(c=>c.label==='full_course'),q4=full.document.sessions[1],q5=full.document.sessions[2];
 query(as(student,`select public.mark_v2_learning_progress('${full.batchId}','${q4.key}',null,'opened',1);select public.report_v2_recording_watched('${full.batchId}','${q4.key}','${q4.content.recordings[0].key}',1)`));
 query(as(admin,`select public.complete_v2_learning_live_class('${full.batchId}','${full.document.events[1].key}',1)`));
 const learning=JSON.parse(query(as(student,`select public.get_my_v2_learning_state('${full.batchId}')`)));assert.equal(learning.obligations.length,2);
 const first=learning.obligations.find(o=>o.sessionKey===q4.key);
 query(as(student,`select public.submit_v2_session_feedback('${first.id}','${randomUUID()}','{"usefulness":4,"clarity":5,"comment":"Synthetic QA response","attendance":"recording"}')`));
 const watchId=randomUUID();query(`insert into public.v2_recording_watch_sessions(id,student_id,batch_id,session_key,recording_key,publication_revision,url_hash) values('${watchId}','${student}','${full.batchId}','${q5.key}','${q5.content.recordings[0].key}',1,'synthetic-resource-hash');insert into public.v2_recording_watch_samples(watch_id,request_id,request,result) values('${watchId}','${randomUUID()}','{}','{}')`);
 const bad={...state,baseline:{...state.baseline,md5:'0'.repeat(32)}};rejects(buildCleanupSql(bad),/fingerprint changed/);assert.equal(query('select count(*) from public.v2_course_batches'),'3');
 query(`update public.v2_course_template_revisions set actor_id='${student}' where template_id='${full.templateId}'`);rejects(buildCleanupSql(state),/unexpected ownership/);
 query(`update public.v2_course_template_revisions set actor_id='${admin}' where template_id='${full.templateId}'`);
 query(`insert into public.v2_learning_progress(student_id,batch_id,session_key,resource_key,state) values('${operator}','${full.batchId}','${q4.key}','session','opened')`);rejects(buildCleanupSql(state),/non-fixture Student/);query(`delete from public.v2_learning_progress where student_id='${operator}' and batch_id='${full.batchId}'`);
 if(withReal){
  const otherQa=state.users.find(u=>u.label==='quant').id;
  query(`insert into public.v2_learning_progress(student_id,batch_id,session_key,resource_key,state) values('${otherQa}','${existingBatch}','${existingDocument.sessions[0].key}','session','opened')`);rejects(buildCleanupSql(state),/escaped fixture scope|Unexpected QA identity/);query(`delete from public.v2_learning_progress where student_id='${otherQa}' and batch_id='${existingBatch}'`);
  query(`insert into public.v2_feedback_obligations(student_id,batch_id,session_key,session_title,section,source,source_key,publication_revision) values('${student}','${existingBatch}','${existingDocument.sessions[0].key}','Existing session','quant','recording','${randomUUID()}',1)`);rejects(buildCleanupSql(state),/escaped fixture scope|scope exceeded/);query(`delete from public.v2_feedback_obligations where student_id='${student}' and batch_id='${existingBatch}'`);
 }
 const cleaned=JSON.parse(query(buildCleanupSql(state)));assert.equal(cleaned.baseline_restored,true);assert.equal(cleaned.fingerprint.md5,state.baseline.md5);
 for(const table of ['v2_purchases','v2_product_grants','v2_course_templates','v2_course_batches','v2_learning_progress','v2_session_feedback','v2_feedback_obligations','v2_live_session_mappings','v2_live_session_mapping_audit','v2_recording_watch_sessions','v2_recording_watch_samples'])assert.equal(query(`select count(*) from public.${table}`),['v2_course_templates','v2_course_batches','v2_learning_progress'].includes(table)?'1':'0');
 assert.equal(query(`select to_jsonb(p) from public.v2_batch_publication_revisions p where batch_id='${existingBatch}'`),originalPublication);
 assert.equal(query('select value from public.qa_existing_sentinel'),'Existing private application row remains unchanged');
 const wrong={...state,users:state.users.map((u,i)=>i?u:{...u,email:'unrelated@example.invalid'})};assert.throws(()=>buildCleanupSql(wrong),/identity mismatch/);
}));
