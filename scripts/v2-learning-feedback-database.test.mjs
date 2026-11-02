import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import {withDisposablePostgres} from './helpers/disposable-postgres.mjs';
const lit=v=>`'${String(v).replaceAll("'","''")}'`,json=v=>`${lit(JSON.stringify(v))}::jsonb`;
const as=(id,sql,role='authenticated')=>`begin;set local role ${role};set local request.jwt.claim.sub=${lit(id??'')};${sql};commit;`;
const migration='20261102170000_add_v2_learning_feedback.sql';
function setup(db){
 const {query,apply}=db;
 query(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
 create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
 alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
 for(const name of ['20260731051000_production_baseline.sql','20260731062700_enforce_material_release.sql','20260731110000_require_provisioned_portal_access.sql','20261018090000_add_v2_product_entitlements.sql',
 '20261019090000_add_v2_template_drafts.sql','20261019100000_add_v2_batch_drafts.sql','20261019110000_add_v2_private_meeting_drafts.sql','20261020090000_add_v2_outline_schedules.sql','20261020100000_add_v2_batch_publication.sql','20261025100000_add_v2_enrolled_schedules.sql','20261102100000_add_v2_programme_content.sql','20261102110000_add_v2_student_delivery.sql','20261102120000_add_v2_content_imports.sql','20261102130000_add_v2_publication_scopes.sql'])apply(name);
 const user=(role='student',paid=true)=>{const id=randomUUID();query(`insert into auth.users(id,email) values('${id}','${id}@example.invalid');update public.profiles set is_active=true,role='${role}' where id='${id}'`);if(paid&&role==='student')query(`select public.grant_v2_purchase('${id}',array['full_batch'],'qa-${id}',now()-interval '1 day','a1000000-0000-4000-8000-000000000001',2500000,'INR')`);return id;};
 const admin=user('admin');
 const makeBatch=()=>{
  const templateId=randomUUID(),id=randomUUID();
  const sessions=['Quant 1','Quant 4','Quant 5','Verbal 1','DI 1'].map(title=>({key:randomUUID(),title,section:title.startsWith('Quant')?'quant':title.startsWith('Verbal')?'verbal':'di',content:Object.fromEntries(['preSessionReads','recordings','postSessionReads','materials'].map(kind=>[kind,[{key:randomUUID(),title:kind,url:kind==='recordings'?'https://drive.google.com/file/d/example/preview':`https://private.example.test/${kind}/${title.replaceAll(' ','-')}`}]]))}));
  const events=sessions.filter(s=>s.title==='Quant 4'||s.title==='Quant 5').map(s=>({key:randomUUID(),title:s.title+' live',section:s.section,kind:'live',dayOffset:0,localStartTime:'19:00',durationMinutes:60,capacity:8,instructor:''}));
  const document={title:'Learning course',summary:'',durationDays:1,sessions,events};
  query(as(admin,`select public.save_v2_template_draft('${templateId}','full_course',0,'${randomUUID()}',${json(document)})`));
  const request={id,templateId,templateRevision:1,expectedRevision:0,requestId:randomUUID(),title:'Learning batch',startDate:'2026-11-10',timeZone:'Asia/Kolkata',events:null};
  const preview=JSON.parse(query(as(admin,`select public.preview_v2_batch_draft(${json(request)})`)));query(as(admin,`select public.save_v2_batch_draft(${json(request)},${lit(preview.fingerprint)})`));
  query(as(admin,`select public.save_v2_meeting_draft(${json({batchId:id,batchRevision:1,expectedRevision:0,requestId:randomUUID(),links:events.map(e=>({key:e.key,url:'https://meet.google.com/abc-defg-hij'}))})})`));
  const input={batchId:id,batchRevision:1,expectedRevision:0,requestId:randomUUID(),action:'publish'};
  const pub=JSON.parse(query(as(admin,`select public.preview_v2_batch_publication(${json(input)})`)));query(as(admin,`select public.save_v2_batch_publication(${json(input)},${lit(pub.fingerprint)})`));
  return {id,sessions,events};
 };
 const enroll=(s,b)=>query(as(admin,`select public.set_v2_batch_enrollment('${b.id}','${s}',true,0)`));
 const register=(s,b)=>query(as(admin,`select public.set_v2_live_registration('${b.id}','${s}',true,0)`));
 const state=(s,b)=>JSON.parse(query(as(s,`select coalesce(public.get_my_v2_learning_state('${b.id}'),'null'::jsonb)`)));
 const course=(s,b)=>JSON.parse(query(as(s,`select coalesce(public.get_my_v2_published_course('${b.id}'),'null'::jsonb)`)));
 const watched=(s,b,session)=>JSON.parse(query(as(s,`select public.report_v2_recording_watched('${b.id}','${session.key}','${session.content.recordings[0].key}',1)`)));
 const submit=(s,id,response={attendance:'recording',usefulness:4,clarity:5,comment:''},requestId=randomUUID())=>query(as(s,`select public.submit_v2_session_feedback('${id}','${requestId}',${json(response)})`));
 return {admin,user,makeBatch,enroll,register,state,course,watched,submit};
}
test('Phase 4 learning authorization and feedback state transitions',{timeout:120000},()=>withDisposablePostgres(async db=>{
 const {query,apply,rejects,concurrentQuery}=db,f=setup(db),b=f.makeBatch(),otherBatch=f.makeBatch();
 const baseline=query(`select jsonb_build_object('purchases',(select jsonb_agg(to_jsonb(p) order by id) from public.v2_purchases p),'publications',(select jsonb_agg(to_jsonb(p) order by batch_id,revision) from public.v2_batch_publication_revisions p),'legacyEnrollments',(select count(*) from public.enrollments))`);
 apply(migration);
 assert.equal(query(`select jsonb_build_object('purchases',(select jsonb_agg(to_jsonb(p) order by id) from public.v2_purchases p),'publications',(select jsonb_agg(to_jsonb(p) order by batch_id,revision) from public.v2_batch_publication_revisions p),'legacyEnrollments',(select count(*) from public.enrollments))`),baseline);
 const s=f.user(),other=f.user(),unpaid=f.user('student',false);f.enroll(s,b);f.enroll(s,otherBatch);f.enroll(other,b);
 assert.equal(f.state(unpaid,b),null);assert.equal(f.state(f.admin,b),null);assert.equal(f.state(null,b),null);
 assert.equal(f.state(s,b).sessions.length,5);assert.deepEqual(f.state(s,b).obligations,[]);
 assert.deepEqual(f.state(s,b).liveEvents,[]);assert.equal(f.state(s,b).liveRegistered,false);
 const schedule=JSON.parse(query(as(s,'select public.get_my_v2_batch_schedules()')));assert.equal(schedule[0].events.length,0);assert.equal(schedule[0].liveRegistrationLimit,null);
 const q4=b.sessions[1],q5=b.sessions[2],v=b.sessions[3];
 query(as(s,`select public.mark_v2_learning_progress('${b.id}','${q4.key}',null,'opened',1)`));
 query(as(s,`select public.mark_v2_learning_progress('${b.id}','${q4.key}','${q4.content.preSessionReads[0].key}','read',1)`));
 assert.equal(f.state(s,b).lastSessionKey,q4.key);assert.deepEqual(f.state(s,b).obligations,[]);
 const recording=f.watched(s,b,q4);assert.equal(recording.due,true);assert.equal(f.watched(s,b,q4).obligationId,recording.obligationId);
 assert.deepEqual(f.state(s,b).sessions.filter(x=>x.locked).map(x=>x.title),['Quant 1','Quant 5']);
 assert.deepEqual(f.course(s,b).sessions.map(x=>x.title),['Quant 4','Verbal 1','DI 1']);
 query(as(s,`select public.mark_v2_learning_progress('${b.id}','${q4.key}',null,'opened',1);select public.mark_v2_learning_progress('${b.id}','${q4.key}','${q4.content.preSessionReads[0].key}','read',1)`));
 assert.equal(f.state(s,b).obligations.length,1);assert.ok(!f.course(s,b).sessions.some(x=>x.key===q5.key));
 assert.doesNotMatch(JSON.stringify(f.course(s,b)),/Quant-1|Quant-5/);assert.equal(f.course(other,b).sessions.length,5);
 assert.equal(f.course(s,otherBatch).sessions.filter(x=>x.section==='quant').length,0);
 rejects(as(other,`select public.submit_v2_session_feedback('${recording.obligationId}','${randomUUID()}',${json({attendance:'recording',usefulness:5,clarity:5,comment:''})})`),/obligation unavailable/);
 rejects(as(s,`select public.mark_v2_learning_progress('${b.id}','${q5.key}',null,'opened',1)`),/Session unavailable/);
 rejects(as(s,`select public.v2_store_session_feedback('${recording.obligationId}','${s}','${randomUUID()}',${json({attendance:'recording',usefulness:5,clarity:5,comment:''})},'browser-forged')`),/permission denied/);
 const response={attendance:'recording',usefulness:4,clarity:5,comment:''},requestId=randomUUID();
 const retrySql=as(s,`select public.submit_v2_session_feedback('${recording.obligationId}','${requestId}',${json(response)})`);
 const results=await Promise.all([concurrentQuery(retrySql),concurrentQuery(retrySql)]);assert.deepEqual(results.map(x=>JSON.parse(x).replayed).sort(),[false,true]);
 assert.equal(f.course(s,b).sessions.length,5);assert.equal(f.watched(s,b,q4).due,false);
 f.register(s,b);assert.equal(f.state(s,b).liveEvents.length,2);
 const [e4,e5]=b.events;
 rejects(as(f.admin,`select public.complete_v2_learning_live_class('${b.id}','${e4.key}',1)`),/mapping is required/);
 rejects(as(f.admin,`select public.set_v2_live_session_mapping('${b.id}','${e4.key}','${v.key}',1)`),/live class subject/);
 for(const [e,session] of [[e4,q4],[e5,q5]])query(as(f.admin,`select public.set_v2_live_session_mapping('${b.id}','${e.key}','${session.key}',1)`));
 query(as(f.admin,`select public.complete_v2_learning_live_class('${b.id}','${e4.key}',1)`));
 assert.equal(f.state(s,b).obligations.length,0);assert.equal(query(`select count(*) from public.v2_feedback_obligations where student_id='${s}' and session_key='${q4.key}'`),'2');
 query(as(f.admin,`select public.complete_v2_live_class('${b.id}','${e5.key}',1)`));
 assert.equal(f.state(s,b).obligations.length,1);assert.equal(f.state(other,b).obligations.length,0);
 assert.deepEqual(f.course(s,b).sessions.map(x=>x.title),['Quant 5','Verbal 1','DI 1']);
 f.submit(s,f.state(s,b).obligations[0].id,{attendance:'missed',usefulness:null,clarity:null,comment:'Recording remains available.'});
 assert.equal(f.course(s,b).sessions.length,5);assert.equal(query(`select response->>'attendance' from public.v2_session_feedback where student_id='${s}' and session_key='${q5.key}'`),'missed');
 const multi=f.user(),mb=f.makeBatch();f.enroll(multi,mb);f.register(multi,mb);const mq4=mb.sessions[1],mq5=mb.sessions[2];
 f.watched(multi,mb,mq4);query(as(f.admin,`select public.set_v2_live_session_mapping('${mb.id}','${mb.events[1].key}','${mq5.key}',1);select public.complete_v2_learning_live_class('${mb.id}','${mb.events[1].key}',1)`));
 assert.equal(f.state(multi,mb).obligations.length,2);assert.deepEqual(f.course(multi,mb).sessions.map(x=>x.title),['Quant 4','Quant 5','Verbal 1','DI 1']);
 const first=f.state(multi,mb).obligations.find(o=>o.sessionKey===mq4.key),second=f.state(multi,mb).obligations.find(o=>o.sessionKey===mq5.key);
 rejects(as(multi,`select public.submit_v2_session_feedback('${first.id}','${randomUUID()}',${json({attendance:null,usefulness:4,clarity:4,comment:''})})`),/Invalid feedback/);
 f.submit(multi,first.id);assert.deepEqual(f.course(multi,mb).sessions.map(x=>x.title),['Quant 5','Verbal 1','DI 1']);
 f.submit(multi,second.id,{attendance:'missed',usefulness:null,clarity:null,comment:''});assert.equal(f.course(multi,mb).sessions.length,5);
 const expiredOwner=f.user();f.enroll(expiredOwner,b);const expiredObligation=f.watched(expiredOwner,b,q4);
 query(`update public.v2_purchases set revoked_at=now() where student_id='${expiredOwner}';update public.v2_batch_enrollments set active=false where student_id='${expiredOwner}'`);
 f.submit(expiredOwner,expiredObligation.obligationId);assert.equal(f.course(expiredOwner,b),null);assert.equal(query(`select count(*) from public.v2_feedback_obligations where student_id='${expiredOwner}' and feedback_id is null`),'0');
 for(const table of ['v2_learning_progress','v2_session_feedback','v2_feedback_obligations','v2_live_session_mappings','v2_recording_watch_sessions','v2_recording_watch_samples']){
  rejects(as(s,`select * from public.${table}`),/permission denied/);rejects(as(f.admin,`delete from public.${table}`),/permission denied/);
 }
 for(const signature of [`public.v2_learning_course_base('${b.id}')`,`public.v2_learning_session_open('${s}','${b.id}','${q4.key}','quant')`])rejects(as(s,`select ${signature}`),/permission denied/);
 for(const mutation of [`update public.profiles set is_active=false where id='${s}'`,`update public.v2_purchases set revoked_at=now() where student_id='${s}'`,`update public.v2_purchases set confirmed_at=now()-interval '7 months' where student_id='${s}'`,`update public.v2_batch_enrollments set active=false where student_id='${s}'`]){
  const result=JSON.parse(query(`begin;${mutation};set local role authenticated;set local request.jwt.claim.sub='${s}';select jsonb_build_array(public.get_my_v2_learning_state('${b.id}'),public.get_my_v2_published_course('${b.id}'));rollback;`));assert.deepEqual(result,[null,null]);
 }
}));
test('recording observations reject seeks, stale revisions, foreign watches and replayed credit',{timeout:120000},()=>withDisposablePostgres(async db=>{
 const {query,apply,rejects,concurrentQuery}=db,f=setup(db),b=f.makeBatch();apply(migration);const s=f.user(),other=f.user();f.enroll(s,b);f.enroll(other,b);
 const q4=b.sessions[1],key=q4.content.recordings[0].key;
 query(`update public.v2_course_batch_revisions set document=jsonb_set(document,'{sessions,1,content,recordings,0,url}','"https://www.youtube.com/watch?v=abcdefghijk"') where batch_id='${b.id}'`);
 const watch=JSON.parse(query(as(s,`select public.begin_v2_recording_watch('${b.id}','${q4.key}','${key}',1)`)));
 const sample=(position,duration=10,playing=true,id=randomUUID())=>JSON.parse(query(as(s,`select public.record_v2_recording_sample('${watch.watchId}','${id}',${position},${duration},${playing})`)));
 rejects(as(other,`select public.record_v2_recording_sample('${watch.watchId}','${randomUUID()}',0,10,true)`),/observation unavailable/);
 rejects(as(s,`select public.report_v2_recording_watched('${b.id}','${q4.key}','${key}',1)`),/Supported players/);
 sample(0);assert.equal(sample(9).watchedSeconds,0);
 sample(0);query(`update public.v2_recording_watch_sessions set last_seen_at=now()-interval '4 seconds' where id='${watch.watchId}'`);
 const requestId=randomUUID(),result=sample(8,10,true,requestId);assert.equal(result.watchedSeconds,8);assert.equal(result.due,true);assert.deepEqual(sample(8,10,true,requestId),result);
 rejects(as(s,`select public.record_v2_recording_sample('${watch.watchId}','${requestId}',9,10,true)`),/already used/);
 const concurrent=await Promise.all([concurrentQuery(as(s,`select public.record_v2_recording_sample('${watch.watchId}','${requestId}',8,10,true)`)),concurrentQuery(as(s,`select public.record_v2_recording_sample('${watch.watchId}','${requestId}',8,10,true)`))]);
 assert.ok(concurrent.every(r=>JSON.parse(r).watchedSeconds===8));

 sample(0);query(`update public.v2_recording_watch_sessions set last_seen_at=now()-interval '4 seconds' where id='${watch.watchId}'`);assert.equal(sample(8).watchedSeconds,8);
 rejects(as(s,`select public.record_v2_recording_sample('${watch.watchId}','${randomUUID()}',1,100,true)`),/duration changed/);
 const fractional=JSON.parse(query(as(other,`select public.begin_v2_recording_watch('${b.id}','${q4.key}','${key}',1)`)));
 const fractionalSample=position=>JSON.parse(query(as(other,`select public.record_v2_recording_sample('${fractional.watchId}','${randomUUID()}',${position},20,true)`)));
 fractionalSample(0.2);
 for(const [position,expected,due] of [[5.2,5,false],[10.2,10,false],[15.2,15,false],[16.2,16,true]]){
  query(`update public.v2_recording_watch_sessions set last_seen_at=now()-interval '5 seconds' where id='${fractional.watchId}'`);
  const observation=fractionalSample(position);assert.equal(observation.watchedSeconds,expected);assert.equal(observation.due,due);
 }
 const resumed=JSON.parse(query(as(other,`select public.begin_v2_recording_watch('${b.id}','${q4.key}','${key}',1)`)));assert.equal(resumed.watchedSeconds,16);
 fractionalSample(0.2);query(`update public.v2_recording_watch_sessions set last_seen_at=now()-interval '5 seconds' where id='${fractional.watchId}'`);assert.equal(fractionalSample(5.2).watchedSeconds,16);
 const unavailable=JSON.parse(query(`begin;update public.v2_batch_publication_revisions set document=jsonb_set(document,'{state}','"unpublished"'::jsonb) where batch_id='${b.id}';set local role authenticated;set local request.jwt.claim.sub='${s}';select jsonb_build_array(public.get_my_v2_learning_state('${b.id}'),public.get_my_v2_published_course('${b.id}'));rollback;`));assert.deepEqual(unavailable,[null,null]);
 rejects(as(s,`select public.begin_v2_recording_watch('${b.id}','${q4.key}','${key}',2)`),/Published recording unavailable/);
 query(`update public.v2_course_batch_revisions set document=jsonb_set(document,'{sessions,1,content,recordings,0,url}','"https://www.youtube.com/watch?v=lmnopqrstuv"') where batch_id='${b.id}'`);
 rejects(as(s,`select public.record_v2_recording_sample('${watch.watchId}','${randomUUID()}',8,10,true)`),/Recording changed/);
}));
