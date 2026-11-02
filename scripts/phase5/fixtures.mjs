import {randomUUID} from 'node:crypto';
import {PROJECT,UUID,check,literal} from '../phase1-hosted-closeout-config.mjs';
export const REAL_COURSE_ID='2b19ea33-150c-5ddd-aae7-134831603408';
export const QA_CASES=[{label:'admin',role:'admin',products:[]},{label:'full',products:['full_batch']},{label:'quant',products:['quant_crash']},
 {label:'unregistered',products:['quant_crash']},{label:'expired',products:['quant_crash']},{label:'revoked',products:['quant_crash']},
 {label:'inactive',products:['quant_crash']},{label:'wrong_subject',products:['di_crash']},{label:'empty',products:[]}];
const json=v=>`${literal(JSON.stringify(v))}::jsonb`;
export function createCoursePlan(){
 return ['full_course','quant'].map(product=>{
  const sessions=['Quant 1','Quant 4','Quant 5',...(product==='full_course'?['Verbal 1','DI 1']:[])].map(title=>{
   const section=title.startsWith('Quant')?'quant':title.startsWith('Verbal')?'verbal':'di';
   return {key:randomUUID(),title:`Phase 5 QA ${title}`,section,content:Object.fromEntries(['preSessionReads','recordings','postSessionReads','materials'].map(kind=>[kind,[{key:randomUUID(),title:`QA ${title} ${kind}`,url:`https://example.test/phase5/${section}/${title.replaceAll(' ','-')}/${kind}`}]]))};
  });
  const events=sessions.filter(s=>/Quant [45]$/.test(s.title)).map(s=>({key:randomUUID(),title:`${s.title} live`,section:s.section,kind:'live',dayOffset:0,localStartTime:'19:00',durationMinutes:60,capacity:8,instructor:''}));
  return {label:product,product,templateId:randomUUID(),batchId:randomUUID(),startDate:new Date(Date.now()+14*86400000).toISOString().slice(0,10),document:{title:`Phase 5 QA ${product}`,summary:'Synthetic acceptance fixture',durationDays:1,sessions,events}};
 });
}
function validate(state){
 check(state.project===PROJECT&&UUID.test(state.runId),'Only a designated staging QA run is accepted.');
 check(state.users.length===QA_CASES.length&&new Set(state.users.map(u=>u.id)).size===QA_CASES.length,'Incomplete generated QA identities.');
 for(const c of QA_CASES){const u=state.users.find(u=>u.label===c.label);check(u&&UUID.test(u.id)&&u.email===`ace-p5-${c.label}-${state.runId}@example.invalid`,'QA identity mismatch.');}
 check(state.courses.length===2&&['full_course','quant'].every(label=>state.courses.some(c=>c.label===label&&c.product===label&&UUID.test(c.batchId)&&UUID.test(c.templateId))),'Invalid generated course scope.');
 check(new Set(state.courses.flatMap(c=>[c.batchId,c.templateId])).size===4,'Duplicate fixture identifiers.');
 check((state.contentIds??[]).every(id=>UUID.test(id))&&new Set(state.contentIds??[]).size===(state.contentIds??[]).length,'Invalid generated content IDs.');
 if(state.realCourse)check(state.realCourse.batchId===REAL_COURSE_ID&&!state.courses.some(c=>c.batchId===REAL_COURSE_ID),'Only the designated existing Full Course may be attached.');
}
const user=(state,label)=>state.users.find(u=>u.label===label);
const purchasePlan=state=>QA_CASES.filter(c=>c.products.length).map(c=>({...c,userId:user(state,c.label).id,reference:`phase5-qa:${state.runId}:${c.label}`}));
function header(state){
 validate(state);
 return `-- STAGING ONLY: https://supabase.com/dashboard/project/${PROJECT}/sql/new
-- The dashboard project must match the designated staging project before execution.
-- Only exact generated QA identities and fixture IDs belong to this run.
begin;
set local statement_timeout='60s';set local lock_timeout='3s';
create temporary table phase5_qa_users(label text primary key,id uuid unique,email text) on commit drop;
insert into phase5_qa_users values ${state.users.map(u=>`(${literal(u.label)},'${u.id}',${literal(u.email)})`).join(',')};
create temporary table phase5_qa_courses(label text primary key,template_id uuid unique,batch_id uuid unique) on commit drop;
insert into phase5_qa_courses values ${state.courses.map(c=>`(${literal(c.label)},'${c.templateId}','${c.batchId}')`).join(',')};
do $$begin
 if (select count(*) from phase5_qa_users q join auth.users u on u.id=q.id and u.email=q.email and u.raw_user_meta_data->>'phase5_qa_run'=${literal(state.runId)})<>${QA_CASES.length} then raise exception 'QA account ownership mismatch';end if;
 if (select count(*) from phase5_qa_users q join public.profiles p on p.id=q.id and p.email=q.email and p.role=case when q.label='admin' then 'admin' else 'student' end)<>${QA_CASES.length} then raise exception 'QA profile ownership mismatch';end if;
 if to_regprocedure('public.save_v2_content_item(uuid,integer,uuid,jsonb)') is null then raise exception 'Phase 5 activation is required';end if;
end $$;
${state.realCourse?`do $$begin
 if not exists(select 1 from public.v2_course_batches b join lateral(select document from public.v2_batch_publication_revisions where batch_id=b.id order by revision desc limit 1) p on true where b.id='${REAL_COURSE_ID}' and b.product_code='full_course' and p.document->>'state'='published') then raise exception 'The designated existing Full Course must remain published';end if;
end $$;`:''}
create or replace function pg_temp.phase5_public_fingerprint() returns jsonb language plpgsql as $$
declare t record;h text;hashes text:='';n integer:=0;
begin
 for t in select tablename from pg_tables where schemaname='public' order by tablename loop
  if t.tablename='profiles' then select md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'')) into h from public.profiles r where id not in(select id from phase5_qa_users);
  else execute format('select md5(coalesce(string_agg(md5(to_jsonb(r)::text),'''' order by md5(to_jsonb(r)::text)),'''')) from public.%I r',t.tablename) into h;end if;
  hashes:=hashes||t.tablename||':'||h||';';n:=n+1;
 end loop;
 return jsonb_build_object('md5',md5(hashes),'table_count',n,'excluded_generated_profiles',${QA_CASES.length});
end $$;
`;
}
export function buildSetupSql(state){
 const admin=user(state,'admin').id,full=state.courses.find(c=>c.label==='full_course'),quant=state.courses.find(c=>c.label==='quant');
 const grants=purchasePlan(state).map(p=>`perform public.grant_v2_purchase('${p.userId}',array[${p.products.map(literal).join(',')}],${literal(p.reference)},statement_timestamp()-interval '1 second',(public.quote_v2_products(array[${p.products.map(literal).join(',')}])->>'price_version_id')::uuid,(public.quote_v2_products(array[${p.products.map(literal).join(',')}])->>'amount_paise')::integer,'INR');`).join('\n');
 const authoring=state.courses.map(c=>{
  const batch={id:c.batchId,templateId:c.templateId,templateRevision:1,expectedRevision:0,requestId:randomUUID(),title:`Phase 5 QA ${c.label} batch`,startDate:c.startDate,timeZone:'Asia/Kolkata',events:null};
  const meeting={batchId:c.batchId,batchRevision:1,expectedRevision:0,requestId:randomUUID(),links:c.document.events.map(e=>({key:e.key,url:'https://meet.google.com/abc-defg-hij'}))};
  const pub={batchId:c.batchId,batchRevision:1,expectedRevision:0,requestId:randomUUID(),action:'publish'};
  return `perform public.save_v2_template_draft('${c.templateId}',${literal(c.product)},0,'${randomUUID()}',${json(c.document)});
 v_request:=${json(batch)};v_preview:=public.preview_v2_batch_draft(v_request);perform public.save_v2_batch_draft(v_request,v_preview->>'fingerprint');
 perform public.save_v2_meeting_draft(${json(meeting)});
 v_request:=${json(pub)};v_preview:=public.preview_v2_batch_publication(v_request);perform public.save_v2_batch_publication(v_request,v_preview->>'fingerprint');
 ${c.document.events.map((e,i)=>`perform public.set_v2_live_session_mapping('${c.batchId}','${e.key}','${c.document.sessions[i+1].key}',1);`).join('\n')}`;
 }).join('\n');
 const enrollments=['quant','unregistered','expired','revoked','inactive'].map(label=>`perform public.set_v2_batch_enrollment('${quant.batchId}','${user(state,label).id}',true,0);${label!=='unregistered'?`perform public.set_v2_live_registration('${quant.batchId}','${user(state,label).id}',true,0);`:''}`).join('\n');
 return header(state)+`
create temporary table phase5_qa_baseline on commit drop as select pg_temp.phase5_public_fingerprint() fingerprint;
do $$declare v_request jsonb;v_preview jsonb;v_table text;v_found boolean;begin
 if exists(select 1 from public.v2_course_templates t join phase5_qa_courses q on q.template_id=t.id)
 or exists(select 1 from public.v2_course_batches b join phase5_qa_courses q on q.batch_id=b.id)
 or exists(select 1 from public.v2_purchases p join phase5_qa_users q on q.id=p.student_id) then raise exception 'QA fixtures already exist; setup must not repeat';end if;
 ${state.realCourse?`foreach v_table in array array['v2_batch_enrollments','v2_live_registrations','v2_learning_progress','v2_session_feedback','v2_feedback_obligations','v2_recording_watch_sessions'] loop
 execute format('select exists(select 1 from public.%I where batch_id=$1 and student_id in(select id from phase5_qa_users))',v_table) into v_found using '${REAL_COURSE_ID}'::uuid;
 if v_found then raise exception 'QA account already contains existing-course activity';end if;
 end loop;`:''}
 ${grants}
 perform set_config('request.jwt.claim.sub','${admin}',true);
 ${authoring}
 ${enrollments}
 perform public.set_v2_batch_enrollment('${full.batchId}','${user(state,'full').id}',true,0);
 perform public.set_v2_live_registration('${full.batchId}','${user(state,'full').id}',true,0);
 ${state.realCourse?`perform public.set_v2_batch_enrollment('${REAL_COURSE_ID}','${user(state,'full').id}',true,0);`:''}
end $$;
update public.v2_purchases set confirmed_at=statement_timestamp()-interval '7 months' where student_id='${user(state,'expired').id}' and payment_reference=${literal(`phase5-qa:${state.runId}:expired`)};
update public.v2_purchases set revoked_at=statement_timestamp() where student_id='${user(state,'revoked').id}' and payment_reference=${literal(`phase5-qa:${state.runId}:revoked`)};
update public.profiles set is_active=false where id='${user(state,'inactive').id}';
select jsonb_build_object('check','phase5_qa_fixture_setup','run_id',${literal(state.runId)},'qa_accounts',${QA_CASES.length},'batches',2,'purchases',7,'real_course_enrollments',${state.realCourse?1:0},'baseline',(select fingerprint from phase5_qa_baseline));
commit;
`;
}
export function buildCleanupSql(state){
 const expected=state.baseline?.md5??'SETUP_BASELINE_REQUIRED',admin=user(state,'admin').id;
 const predicate=purchasePlan(state).map(p=>`(p.student_id='${p.userId}' and p.payment_reference=${literal(p.reference)})`).join(' or ');
 return header(state)+`
create temporary table phase5_qa_content(id uuid primary key) on commit drop;
${(state.contentIds??[]).length?`insert into phase5_qa_content values ${state.contentIds.map(id=>`('${id}')`).join(',')};`:''}
do $$begin
 if exists(select 1 from public.v2_content_item_revisions r join phase5_qa_content q on q.id=r.item_id where r.actor_id<>'${admin}')
 or exists(select 1 from public.v2_content_publication_audit r join phase5_qa_content q on q.id=r.item_id where r.actor_id<>'${admin}')
 or exists(select 1 from public.v2_content_item_revisions r join phase5_qa_content q on q.id=r.item_id cross join lateral jsonb_array_elements(r.document->'targets') t where (t->>'batchId')::uuid not in(select batch_id from phase5_qa_courses)) then raise exception 'Generated content ownership or scope mismatch';end if;
end $$;
delete from public.v2_content_publication_audit where item_id in(select id from phase5_qa_content);
delete from public.v2_content_item_revisions where item_id in(select id from phase5_qa_content);
delete from public.v2_content_items where id in(select id from phase5_qa_content);
do $$declare v_table text;v_foreign boolean;begin
 if ${literal(expected)} !~ '^[0-9a-f]{32}$' then raise exception 'Recorded setup baseline required';end if;
 if exists(select 1 from public.v2_course_template_revisions r join phase5_qa_courses q on q.template_id=r.template_id where r.actor_id<>'${admin}')
 or exists(select 1 from public.v2_course_batch_revisions r join phase5_qa_courses q on q.batch_id=r.batch_id where r.actor_id<>'${admin}')
 or exists(select 1 from public.v2_batch_publication_revisions r join phase5_qa_courses q on q.batch_id=r.batch_id where r.actor_id<>'${admin}') then raise exception 'Fixture revisions have unexpected ownership';end if;
 if exists(select 1 from public.v2_purchases p where p.student_id in(select id from phase5_qa_users) and not(${predicate})) then raise exception 'Generated accounts contain unexpected purchases';end if;
 if exists(select 1 from public.v2_batch_enrollments e where e.batch_id in(select batch_id from phase5_qa_courses) and e.student_id not in(select id from phase5_qa_users)) then raise exception 'Fixture batch contains a non-fixture Student';end if;
 if exists(select 1 from public.v2_learning_progress p where p.student_id in(select id from phase5_qa_users) and p.batch_id not in(select batch_id from phase5_qa_courses) ${state.realCourse?`and not(p.batch_id='${REAL_COURSE_ID}' and p.student_id='${user(state,'full').id}')`:''})
 or exists(select 1 from public.v2_feedback_obligations o where o.student_id in(select id from phase5_qa_users) and o.batch_id not in(select batch_id from phase5_qa_courses)) then raise exception 'QA learning activity escaped fixture scope';end if;
 foreach v_table in array array['v2_learning_progress','v2_session_feedback','v2_feedback_obligations','v2_recording_watch_sessions','v2_live_registrations'] loop
  execute format('select exists(select 1 from public.%I where batch_id in(select batch_id from phase5_qa_courses) and student_id not in(select id from phase5_qa_users))',v_table) into v_foreign;
  if v_foreign then raise exception 'Fixture learning data contains a non-fixture Student';end if;
 end loop;
${state.realCourse?`foreach v_table in array array['v2_batch_enrollments','v2_learning_progress','v2_recording_watch_sessions'] loop
 execute format('select exists(select 1 from public.%I where batch_id=$1 and student_id in(select id from phase5_qa_users) and student_id<>$2)',v_table) into v_foreign using '${REAL_COURSE_ID}'::uuid,'${user(state,'full').id}'::uuid;
 if v_foreign then raise exception 'Unexpected QA identity used the existing course';end if;
 end loop;
 foreach v_table in array array['v2_live_registrations','v2_feedback_obligations','v2_session_feedback'] loop
 execute format('select exists(select 1 from public.%I where batch_id=$1 and student_id in(select id from phase5_qa_users))',v_table) into v_foreign using '${REAL_COURSE_ID}'::uuid;
 if v_foreign then raise exception 'Existing-course QA scope exceeded read-only learning checks';end if;
 end loop;`:''}
end $$;
${state.realCourse?`-- Only the generated Full Course QA identity loses its temporary learning state and enrollment.
delete from public.v2_recording_watch_samples s using public.v2_recording_watch_sessions w where s.watch_id=w.id and w.batch_id='${REAL_COURSE_ID}' and w.student_id='${user(state,'full').id}';
delete from public.v2_recording_watch_sessions where batch_id='${REAL_COURSE_ID}' and student_id='${user(state,'full').id}';
delete from public.v2_learning_progress where batch_id='${REAL_COURSE_ID}' and student_id='${user(state,'full').id}';
delete from public.v2_batch_enrollments where batch_id='${REAL_COURSE_ID}' and student_id='${user(state,'full').id}';`:''}
delete from public.v2_recording_watch_samples s using public.v2_recording_watch_sessions w where s.watch_id=w.id and w.batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_recording_watch_sessions where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_feedback_obligations where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_session_feedback where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_learning_progress where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_live_session_mapping_audit where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_live_session_mappings where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_live_registration_audit where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_live_registrations where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_live_class_completions where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_published_meetings where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_batch_enrollments where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_batch_publication_revisions where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_batch_meeting_revisions where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_course_batch_revisions where batch_id in(select batch_id from phase5_qa_courses);
delete from public.v2_course_batches where id in(select batch_id from phase5_qa_courses);
delete from public.v2_course_template_revisions where template_id in(select template_id from phase5_qa_courses);
delete from public.v2_course_templates where id in(select template_id from phase5_qa_courses);
delete from public.v2_product_grants g using public.v2_purchases p where g.purchase_id=p.id and (${predicate});
delete from public.v2_purchases p where ${predicate};
do $$begin
 if pg_temp.phase5_public_fingerprint()->>'md5'<>${literal(expected)} then raise exception 'Existing public data fingerprint changed; cleanup rolled back';end if;
end $$;
select jsonb_build_object('check','phase5_qa_fixture_cleanup','run_id',${literal(state.runId)},'baseline_restored',true,'fingerprint',pg_temp.phase5_public_fingerprint());
commit;
`;
}
